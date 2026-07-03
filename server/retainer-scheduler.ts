import { storage } from "./storage";
import cron from "node-cron";

const log = (msg: string) => console.log(`[retainer-scheduler] ${msg}`);

// ── Billing period helpers ─────────────────────────────────────────────────

function getCurrentBillingPeriodStart(billingDay: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (day >= billingDay) {
    // Current period started this month
    return new Date(year, month, billingDay).toISOString().split("T")[0];
  } else {
    // Current period started last month
    const prev = new Date(year, month - 1, billingDay);
    return prev.toISOString().split("T")[0];
  }
}

function getCurrentBillingPeriodEnd(billingDay: number): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  let endDate: Date;
  if (day >= billingDay) {
    // Period ends the day before next month's billing day
    endDate = new Date(year, month + 1, billingDay - 1);
  } else {
    // Period ends the day before this month's billing day
    endDate = new Date(year, month, billingDay - 1);
  }
  return endDate.toISOString().split("T")[0];
}

function ymd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

// Billing period (start/end) that contains a given date
function getBillingPeriodForDate(billingDay: number, date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  let start: Date;
  if (day >= billingDay) {
    start = new Date(year, month, billingDay);
  } else {
    start = new Date(year, month - 1, billingDay);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, billingDay - 1);
  return { start: ymd(start), end: ymd(end) };
}

// How many days between occurrences for day-stepped cadences
const CADENCE_STEP_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
};

// How many months between occurrences for month-stepped cadences
const CADENCE_STEP_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

// Minimum forward-generation horizon: templates always generate at least
// 90 days into the future so future month buckets are pre-populated.
export const GENERATION_HORIZON_DAYS = 90;

// Safety cap on occurrences per template per run (daily cadence over 90
// days with quantity multipliers could otherwise explode).
const MAX_OCCURRENCES_PER_TEMPLATE = 120;

/**
 * Compute all occurrence dates for a template between today and the horizon.
 * The anchor is the current billing period start plus the template's due
 * offset; occurrences before today are advanced forward by cadence steps.
 */
function computeOccurrences(cadence: string, anchor: Date, today: Date, horizon: Date): Date[] {
  const occurrences: Date[] = [];
  if (CADENCE_STEP_DAYS[cadence]) {
    const step = CADENCE_STEP_DAYS[cadence];
    let d = new Date(anchor);
    while (d < today) d = new Date(d.getTime() + step * 86400000);
    while (d <= horizon && occurrences.length < MAX_OCCURRENCES_PER_TEMPLATE) {
      occurrences.push(new Date(d));
      d = new Date(d.getTime() + step * 86400000);
    }
  } else if (CADENCE_STEP_MONTHS[cadence]) {
    const step = CADENCE_STEP_MONTHS[cadence];
    let d = new Date(anchor);
    while (d < today) d = addMonthsClamped(d, step);
    while (d <= horizon && occurrences.length < MAX_OCCURRENCES_PER_TEMPLATE) {
      occurrences.push(new Date(d));
      d = addMonthsClamped(d, step);
    }
  } else {
    // "once" / "custom" / unknown → single occurrence, never in the past
    occurrences.push(anchor < today ? new Date(today) : new Date(anchor));
  }
  return occurrences;
}

// ── Core generation function ───────────────────────────────────────────────

export async function runRetainerAutoGeneration(opts: {
  dryRunOverride?: boolean;
  triggeredBy?: string;
  runType?: "scheduled" | "manual";
  companyIdFilter?: string;
}): Promise<{
  companiesProcessed: number;
  tasksCreated: number;
  tasksSkipped: number;
  status: "success" | "partial" | "failed" | "dry_run" | "skipped";
  details: string;
}> {
  const runType = opts.runType ?? "scheduled";
  const details: string[] = [];

  try {
    // ── Check global enabled flag ──────────────────────────────────────────
    const globalEnabled = await storage.getSystemSetting("retainer.autoGenerationEnabled");
    if (globalEnabled === "false") {
      log("Auto-generation is globally disabled — skipping.");
      await storage.createRetainerGenerationLog({
        runType,
        status: "skipped",
        companiesProcessed: 0,
        tasksCreated: 0,
        tasksSkipped: 0,
        dryRun: false,
        details: "Globally disabled via settings.",
        triggeredBy: opts.triggeredBy ?? null,
      });
      return { companiesProcessed: 0, tasksCreated: 0, tasksSkipped: 0, status: "skipped", details: "Globally disabled." };
    }

    const dryRunSetting = await storage.getSystemSetting("retainer.dryRun");
    const isDryRun = opts.dryRunOverride !== undefined ? opts.dryRunOverride : dryRunSetting === "true";

    if (isDryRun) log("Running in DRY-RUN mode — no tasks will be created.");

    // ── Load all active assignments with auto-gen enabled ──────────────────
    let assignments = await storage.getAllActiveRetainerAssignments();
    if (opts.companyIdFilter) {
      assignments = assignments.filter(a => a.companyId === opts.companyIdFilter);
    }

    log(`Found ${assignments.length} active assignment(s) with auto-generation enabled.`);

    let totalCreated = 0;
    let totalSkipped = 0;
    let companiesProcessed = 0;
    let anyError = false;

    for (const assignment of assignments) {
      try {
        const companyId = assignment.companyId;
        const periodStart = getCurrentBillingPeriodStart(assignment.billingDayOfMonth);
        const periodEnd = getCurrentBillingPeriodEnd(assignment.billingDayOfMonth);

        const template = await storage.getRetainerTemplate(assignment.retainerTemplateId);
        if (!template) {
          details.push(`Company ${companyId}: retainer template ${assignment.retainerTemplateId} not found, skipping.`);
          continue;
        }

        const windowDays = Math.max(
          assignment.generationWindowDaysOverride ?? template.generationWindowDays ?? GENERATION_HORIZON_DAYS,
          GENERATION_HORIZON_DAYS,
        );

        // ── Load linked task templates ────────────────────────────────────
        const linked = await storage.getRetainerTemplateTaskTemplates(assignment.retainerTemplateId);
        if (linked.length === 0) {
          details.push(`Company ${companyId}: no task templates linked to retainer, skipping.`);
          continue;
        }

        // ── Get active service tracks for this assignment ─────────────────
        const assignmentTracks = await storage.getClientRetainerServiceTracks(assignment.id);
        const activeTrackIds = new Set(
          assignmentTracks.filter(t => t.isActive).map(t => t.serviceTrackId)
        );

        let companyCreated = 0;
        let companySkipped = 0;

        for (const link of linked) {
          const tpl = link.template;
          if (!tpl || !tpl.isActive) { companySkipped++; continue; }

          // Filter by active service tracks (only if assignment has tracks configured)
          if (activeTrackIds.size > 0 && tpl.serviceTrackId) {
            if (!activeTrackIds.has(tpl.serviceTrackId)) { companySkipped++; continue; }
          }

          // ── Occurrence-based generation: step forward from the current
          // billing period start through the horizon (>= 90 days out) ──────
          const cadence = tpl.cadence ?? "once";

          // Quantity of tasks per occurrence (spaced a week apart for
          // month-stepped cadences, suffixed dedup keys otherwise)
          let perOccurrenceQty = 1;
          if (cadence === "monthly") {
            perOccurrenceQty = link.monthlyQuantity ?? 1;
          } else if (cadence === "quarterly") {
            perOccurrenceQty = link.quarterlyQuantity ?? 1;
          } else if (cadence === "annual") {
            perOccurrenceQty = link.annualQuantity ?? 1;
          } else if (cadence === "weekly" || cadence === "biweekly" || cadence === "daily") {
            perOccurrenceQty = link.monthlyQuantity ?? 1;
          }

          const creditCost = parseFloat(String(link.creditOverride ?? tpl.defaultCreditCost ?? 0));
          const dueOffsetDays = tpl.defaultDueOffsetDays ?? 0;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const horizon = new Date(today.getTime() + windowDays * 86400000);
          const anchor = new Date(new Date(`${periodStart}T00:00:00`).getTime() + dueOffsetDays * 86400000);

          const occurrences = computeOccurrences(cadence, anchor, today, horizon);

          // Legacy dedup keys (pre-occurrence engine) so existing generated
          // tasks for the current period are not duplicated
          let legacyIdx = 0;

          for (const occurrence of occurrences) {
            for (let q = 0; q < perOccurrenceQty; q++) {
              // Month-stepped cadences space multiple instances a week apart
              const isMonthStepped = !!CADENCE_STEP_MONTHS[cadence];
              const dueDate = isMonthStepped
                ? new Date(occurrence.getTime() + q * 7 * 86400000)
                : occurrence;
              const dueDateStr = ymd(dueDate);
              const targetMonth = dueDateStr.slice(0, 7);

              // Dedup: one task per (company, template, occurrence date [+qty suffix])
              const dedupKey = q === 0 ? dueDateStr : `${dueDateStr}-q${q}`;
              const existing = await storage.getRetainerGeneratedTaskByDedup(companyId, tpl.id, dedupKey).catch(() => null);
              if (existing) {
                legacyIdx++;
                companySkipped++;
                continue;
              }

              // Backwards-compat: check pre-engine key format for tasks that
              // were generated for the current billing period
              if (dueDateStr >= periodStart && dueDateStr <= periodEnd) {
                const legacyKey = legacyIdx > 0 ? `${periodStart}-${legacyIdx}` : periodStart;
                const legacyExisting = await storage.getRetainerGeneratedTaskByDedup(companyId, tpl.id, legacyKey).catch(() => null);
                if (legacyExisting) {
                  legacyIdx++;
                  companySkipped++;
                  continue;
                }
              }
              legacyIdx++;

              if (isDryRun) {
                details.push(`[DRY RUN] Would create: "${tpl.title}" for company ${companyId}, due ${dueDateStr} (target month ${targetMonth})`);
                companyCreated++;
                continue;
              }

              // Billing period that contains this occurrence's due date
              const occPeriod = getBillingPeriodForDate(assignment.billingDayOfMonth, dueDate);

              const task = await storage.createTask({
                companyId,
                title: tpl.title,
                description: tpl.defaultInstructions ?? tpl.description ?? null,
                status: "pending",
                priority: tpl.defaultPriority ?? "medium",
                creditCost: String(creditCost),
                type: "assigned",
                dueDate: dueDateStr,
                targetMonth,
                billingPeriodStart: occPeriod.start,
                billingPeriodEnd: occPeriod.end,
                taskOwnership: "agency",
                approvalStatus: tpl.requiresClientApproval ? "pending" : "approved",
                noCredit: creditCost === 0,
                source: "retainer_template",
                taskTemplateId: tpl.id,
                retainerTemplateId: assignment.retainerTemplateId,
                clientRetainerAssignmentId: assignment.id,
                serviceTrackId: tpl.serviceTrackId ?? null,
                clientVisible: tpl.createsClientVisibleTask,
              } as any);

              await storage.createRetainerGeneratedTask({
                companyId,
                taskTemplateId: tpl.id,
                retainerTemplateId: assignment.retainerTemplateId,
                clientRetainerAssignmentId: assignment.id,
                generatedTaskId: task.id,
                periodStart: dedupKey,
                periodEnd: occPeriod.end,
              });

              if (creditCost > 0) {
                await storage.createCreditReservation({
                  companyId,
                  generatedTaskId: task.id,
                  billingPeriodStart: occPeriod.start,
                  billingPeriodEnd: occPeriod.end,
                  reservedCredits: String(creditCost),
                  status: "reserved",
                });
              }

              companyCreated++;
            }
          }
        }

        if (companyCreated > 0 || companySkipped > 0) {
          details.push(`Company ${companyId}: +${companyCreated} created, ${companySkipped} skipped.`);
        }

        totalCreated += companyCreated;
        totalSkipped += companySkipped;
        companiesProcessed++;
      } catch (err: any) {
        log(`Error processing company ${assignment.companyId}: ${err.message}`);
        details.push(`ERROR for company ${assignment.companyId}: ${err.message}`);
        anyError = true;
      }
    }

    const status: "success" | "partial" | "dry_run" = isDryRun
      ? "dry_run"
      : anyError
        ? "partial"
        : "success";

    log(`Run complete — ${companiesProcessed} companies, +${totalCreated} tasks, ${totalSkipped} skipped. Status: ${status}`);

    await storage.createRetainerGenerationLog({
      runType,
      status,
      companiesProcessed,
      tasksCreated: totalCreated,
      tasksSkipped: totalSkipped,
      dryRun: isDryRun,
      details: details.join("\n") || null,
      triggeredBy: opts.triggeredBy ?? null,
    });

    return { companiesProcessed, tasksCreated: totalCreated, tasksSkipped: totalSkipped, status, details: details.join("\n") };
  } catch (err: any) {
    log(`Fatal error during run: ${err.message}`);
    await storage.createRetainerGenerationLog({
      runType,
      status: "failed",
      companiesProcessed: 0,
      tasksCreated: 0,
      tasksSkipped: 0,
      dryRun: false,
      errorMessage: err.message,
      details: details.join("\n") || null,
      triggeredBy: opts.triggeredBy ?? null,
    }).catch(() => {});
    return { companiesProcessed: 0, tasksCreated: 0, tasksSkipped: 0, status: "failed", details: err.message };
  }
}

// ── Scheduler setup ────────────────────────────────────────────────────────

export function setupRetainerScheduler() {
  // Run daily at 7:00 AM ET
  cron.schedule(
    "0 7 * * *",
    async () => {
      log("Daily retainer auto-generation starting...");
      await runRetainerAutoGeneration({ runType: "scheduled", triggeredBy: "scheduler" });
    },
    { timezone: "America/New_York" },
  );

  log("Retainer auto-generation scheduler started (daily at 7:00 AM ET).");
}
