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

        const windowDays = assignment.generationWindowDaysOverride ?? template.generationWindowDays ?? 30;

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

          // Determine instances based on cadence
          const cadence = tpl.cadence ?? "once";
          let instances = 1;
          if (cadence === "monthly") {
            instances = link.monthlyQuantity ?? 1;
          } else if (cadence === "weekly") {
            instances = Math.floor(windowDays / 7) * (link.monthlyQuantity ?? 1);
          } else if (cadence === "quarterly") {
            instances = link.quarterlyQuantity ?? 1;
          } else if (cadence === "annual") {
            instances = link.annualQuantity ?? 1;
          }

          const creditCost = parseFloat(String(link.creditOverride ?? tpl.defaultCreditCost ?? 0));
          const dueOffsetDays = tpl.defaultDueOffsetDays ?? Math.floor(windowDays / 2);
          const periodStartDate = new Date(periodStart);

          for (let i = 0; i < instances; i++) {
            // Dedup: one task per (company, template, periodStart)
            const dedupKey = i > 0 ? `${periodStart}-${i}` : periodStart;
            const existing = await storage.getRetainerGeneratedTaskByDedup(companyId, tpl.id, dedupKey).catch(() => null);
            if (existing) {
              companySkipped++;
              continue;
            }

            const dueDate = new Date(periodStartDate.getTime() + (dueOffsetDays + i * 7) * 86400000);
            const dueDateStr = dueDate.toISOString().split("T")[0];

            if (isDryRun) {
              details.push(`[DRY RUN] Would create: "${tpl.title}" for company ${companyId}, due ${dueDateStr}`);
              companyCreated++;
              continue;
            }

            const task = await storage.createTask({
              companyId,
              title: tpl.title,
              description: tpl.defaultInstructions ?? tpl.description ?? null,
              status: "pending",
              priority: tpl.defaultPriority ?? "medium",
              creditCost: String(creditCost),
              type: "assigned",
              dueDate: dueDateStr,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
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
              periodEnd,
            });

            if (creditCost > 0) {
              await storage.createCreditReservation({
                companyId,
                generatedTaskId: task.id,
                billingPeriodStart: periodStart,
                billingPeriodEnd: periodEnd,
                reservedCredits: String(creditCost),
                status: "reserved",
              });
            }

            companyCreated++;
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
