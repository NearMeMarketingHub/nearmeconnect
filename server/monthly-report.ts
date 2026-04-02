import { db } from "./db";
import { 
  companies, tasks, creditTransactions, campaignRequests, 
  meetingRequests, companyMembers, adminUsers, campaignTypes,
  meetingTypes, deliverableNames, notifications, deliverableTypes,
  monthlyReportNotes, monthlyReportTracker
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, and, ne, or, isNull } from "drizzle-orm";
import { getUncachableResendClient, sendOnboardingReminderEmail } from "./email";
import { formatDateShortET } from "./timezone";
import { log } from "./index";

function getNowET(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

function getMonthYearET(): string {
  const et = getNowET();
  return `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}`;
}

let creditResetRunning = false;
let cadenceGenerationRunning = false;

interface CompletedTaskReport {
  title: string;
  deliverableType: string | null;
  creditCost: string;
  completedDate: string;
  completedByName: string | null;
}

interface MonthlyReportData {
  companyName: string;
  reportMonth: string;
  reportYear: number;
  completedTasks: CompletedTaskReport[];
  agencyCompletedTasks: CompletedTaskReport[];
  clientCompletedTasks: CompletedTaskReport[];
  completedDeliverables: Array<{
    type: string;
    count: number;
  }>;
  creditsUsed: number;
  creditsPurchased: number;
  creditPurchaseTransactions: Array<{
    amount: string;
    description: string;
    date: string;
  }>;
  completedCampaigns: Array<{
    name: string;
    type: string;
    estimatedCredits: string;
  }>;
  meetings: Array<{
    title: string;
    date: string;
    time: string;
    duration: number;
    notes: string | null;
    typeName: string;
  }>;
  totalTasksCompleted: number;
  totalMeetingsHeld: number;
  totalCampaignsCompleted: number;
  adminNotes?: string;
}

function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return {
    startDate: start,
    endDate: end,
  };
}

function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  try {
    const d = new Date(dateStr);
    return d >= start && d < end;
  } catch {
    return false;
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}

function formatDate(dateStr: string): string {
  try {
    return formatDateShortET(dateStr);
  } catch {
    return dateStr;
  }
}

async function gatherCompanyReportData(
  companyId: string,
  companyName: string,
  year: number,
  month: number
): Promise<MonthlyReportData> {
  const { startDate, endDate } = getMonthDateRange(year, month);
  const monthName = getMonthName(month);

  const allTasks = await db.select().from(tasks).where(eq(tasks.companyId, companyId));
  const completedTasks = allTasks.filter(t => {
    if (t.status !== 'completed') return false;
    if (t.approvalStatus === 'rejected') return false;
    if (!t.completedAt) return false;
    return isDateInRange(t.completedAt, startDate, endDate);
  });

  const deliverableCounts: Record<string, number> = {};
  for (const task of completedTasks) {
    if (task.deliverableType) {
      const name = deliverableNames[task.deliverableType] || task.deliverableType;
      deliverableCounts[name] = (deliverableCounts[name] || 0) + 1;
    }
  }
  const completedDeliverables = Object.entries(deliverableCounts).map(([type, count]) => ({ type, count }));

  const allCredits = await db.select().from(creditTransactions).where(eq(creditTransactions.companyId, companyId));
  const monthCredits = allCredits.filter(ct => isDateInRange(ct.createdAt, startDate, endDate));

  let creditsUsed = 0;
  let creditsPurchased = 0;
  const creditPurchaseTransactions: MonthlyReportData['creditPurchaseTransactions'] = [];

  for (const ct of monthCredits) {
    const amount = parseFloat(ct.amount);
    if (ct.type === 'deduction' || ct.type === 'task_deduction') {
      creditsUsed += Math.abs(amount);
    } else if (ct.type === 'revision_charge') {
      creditsUsed += Math.abs(amount);
    } else if (ct.type === 'purchase' || ct.type === 'stripe_purchase') {
      creditsPurchased += amount;
      creditPurchaseTransactions.push({
        amount: String(amount),
        description: ct.description,
        date: formatDate(ct.createdAt),
      });
    }
  }

  const allCampaigns = await db.select().from(campaignRequests).where(eq(campaignRequests.companyId, companyId));
  const allCampaignTypes = await db.select().from(campaignTypes);
  const campaignTypeMap = new Map(allCampaignTypes.map(ct => [ct.id, ct.name]));

  const completedCampaigns = allCampaigns
    .filter(c => c.status === 'completed' && isDateInRange(c.createdAt, startDate, endDate))
    .map(c => ({
      name: campaignTypeMap.get(c.campaignTypeId) || 'Campaign',
      type: campaignTypeMap.get(c.campaignTypeId) || 'Unknown',
      estimatedCredits: String(c.estimatedCredits),
    }));

  const allMeetings = await db.select().from(meetingRequests).where(eq(meetingRequests.companyId, companyId));
  const allMeetingTypes = await db.select().from(meetingTypes);
  const meetingTypeMap = new Map(allMeetingTypes.map(mt => [mt.id, mt.name]));

  const monthMeetings = allMeetings
    .filter(m => {
      if (m.status !== 'approved' && m.status !== 'completed') return false;
      return isDateInRange(m.proposedDate, startDate, endDate);
    })
    .map(m => ({
      title: m.title,
      date: formatDate(m.proposedDate),
      time: m.proposedTime,
      duration: m.duration,
      notes: m.notes,
      typeName: meetingTypeMap.get(m.meetingTypeId) || 'Meeting',
    }));

  const allCompletedTaskReports = completedTasks.map(t => ({
    title: t.title,
    deliverableType: t.deliverableType ? (deliverableNames[t.deliverableType] || t.deliverableType) : null,
    creditCost: String(t.creditCost),
    completedDate: formatDate(t.completedAt!),
    completedByName: t.completedByName || null,
  }));

  const agencyCompletedTasks = completedTasks
    .filter(t => t.creditsDeducted || t.noCredit)
    .map(t => ({
      title: t.title,
      deliverableType: t.deliverableType ? (deliverableNames[t.deliverableType] || t.deliverableType) : null,
      creditCost: t.noCredit ? "0 (no credit)" : String(t.creditCost),
      completedDate: formatDate(t.completedAt!),
      completedByName: t.completedByName || null,
    }));

  const clientCompletedTasks = completedTasks
    .filter(t => !t.creditsDeducted && !t.noCredit)
    .map(t => ({
      title: t.title,
      deliverableType: t.deliverableType ? (deliverableNames[t.deliverableType] || t.deliverableType) : null,
      creditCost: "0 (self-service)",
      completedDate: formatDate(t.completedAt!),
      completedByName: t.completedByName || null,
    }));

  const [reportNote] = await db.select().from(monthlyReportNotes)
    .where(and(
      eq(monthlyReportNotes.companyId, companyId),
      eq(monthlyReportNotes.month, month + 1),
      eq(monthlyReportNotes.year, year)
    ));

  return {
    companyName,
    reportMonth: monthName,
    reportYear: year,
    completedTasks: allCompletedTaskReports,
    agencyCompletedTasks,
    clientCompletedTasks,
    completedDeliverables,
    creditsUsed: Math.round(creditsUsed * 100) / 100,
    creditsPurchased: Math.round(creditsPurchased * 100) / 100,
    creditPurchaseTransactions,
    completedCampaigns,
    meetings: monthMeetings,
    totalTasksCompleted: completedTasks.length,
    totalMeetingsHeld: monthMeetings.length,
    totalCampaignsCompleted: completedCampaigns.length,
    adminNotes: reportNote?.notes || undefined,
  };
}

function buildReportEmailHtml(data: MonthlyReportData): string {
  const buildTaskRows = (taskList: CompletedTaskReport[], emptyMsg: string) => {
    if (taskList.length === 0) return `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #9ca3af;">${emptyMsg}</td></tr>`;
    return taskList.map(t => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${t.title}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${t.deliverableType || '-'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${t.completedByName || '-'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${t.creditCost}</td>
        </tr>
      `).join('');
  };

  const agencyTaskRows = buildTaskRows(data.agencyCompletedTasks, 'No agency-completed tasks this month');
  const clientTaskRows = buildTaskRows(data.clientCompletedTasks, 'No self-service tasks this month');

  const deliverableSection = data.completedDeliverables.length > 0
    ? data.completedDeliverables.map(d => `
        <div style="display: inline-block; background: #ede9fe; color: #5b21b6; padding: 6px 14px; border-radius: 20px; margin: 4px; font-size: 13px; font-weight: 500;">
          ${d.type} <span style="background: #5b21b6; color: white; padding: 2px 8px; border-radius: 12px; margin-left: 6px; font-size: 12px;">${d.count}</span>
        </div>
      `).join('')
    : '<p style="color: #9ca3af; margin: 0;">No deliverables this month</p>';

  const campaignSection = data.completedCampaigns.length > 0
    ? data.completedCampaigns.map(c => `
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
          <strong>${c.name}</strong>
          <span style="color: #6b7280; font-size: 13px; margin-left: 8px;">${c.estimatedCredits} credits</span>
        </div>
      `).join('')
    : '<p style="color: #9ca3af; margin: 0;">No campaigns completed this month</p>';

  const meetingSection = data.meetings.length > 0
    ? data.meetings.map(m => `
        <div style="background: #f5f3ff; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
          <strong>${m.title}</strong>
          <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">${m.typeName} &middot; ${m.date} at ${m.time} &middot; ${m.duration} min</p>
          ${m.notes ? `<div style="background: #ede9fe; padding: 8px 12px; border-radius: 4px; margin-top: 6px; font-size: 13px; color: #374151;"><strong>Notes:</strong> ${m.notes}</div>` : ''}
        </div>
      `).join('')
    : '<p style="color: #9ca3af; margin: 0;">No meetings held this month</p>';

  const creditPurchaseSection = data.creditPurchaseTransactions.length > 0
    ? data.creditPurchaseTransactions.map(cp => `
        <div style="background: #fef3c7; padding: 8px 12px; border-radius: 4px; margin-bottom: 4px; font-size: 13px;">
          +${cp.amount} credits &middot; ${cp.description} &middot; ${cp.date}
        </div>
      `).join('')
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0 0 8px 0; font-size: 26px;">Monthly Report</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">${data.companyName}</p>
          <p style="color: rgba(255,255,255,0.75); margin: 4px 0 0 0; font-size: 14px;">${data.reportMonth} ${data.reportYear}</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

          <div style="display: flex; gap: 12px; margin-bottom: 30px;">
            <div style="flex: 1; background: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #2563eb;">${data.totalTasksCompleted}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Tasks Completed</div>
            </div>
            <div style="flex: 1; background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #16a34a;">${data.totalMeetingsHeld}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Meetings Held</div>
            </div>
          </div>

          <div style="margin-bottom: 28px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 8px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Deliverables Summary</h2>
            <div style="padding: 8px 0;">
              ${deliverableSection}
            </div>
          </div>

          <div style="margin-bottom: 28px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Completed by Agency (${data.agencyCompletedTasks.length})</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Task</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Type</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Completed By</th>
                  <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Credits</th>
                </tr>
              </thead>
              <tbody>
                ${agencyTaskRows}
              </tbody>
            </table>
          </div>

          <div style="margin-bottom: 28px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Completed by Client — Self-Service (${data.clientCompletedTasks.length})</h2>
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">No credits charged for self-service completions.</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Task</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Type</th>
                  <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Completed By</th>
                  <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Credits</th>
                </tr>
              </thead>
              <tbody>
                ${clientTaskRows}
              </tbody>
            </table>
          </div>

          <div style="margin-bottom: 28px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Credit Usage</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Credits Used:</span>
                <strong style="color: #dc2626;">${data.creditsUsed}</strong>
              </div>
              ${data.creditsPurchased > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Extra Credits Purchased:</span>
                <strong style="color: #16a34a;">+${data.creditsPurchased}</strong>
              </div>
              ${creditPurchaseSection}
              ` : ''}
            </div>
          </div>

          <div style="margin-bottom: 28px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Completed Campaigns (${data.totalCampaignsCompleted})</h2>
            ${campaignSection}
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Meetings (${data.totalMeetingsHeld})</h2>
            ${meetingSection}
          </div>

          ${data.adminNotes ? `
          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Notes from Your Team</h2>
            <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #374151; white-space: pre-wrap;">${data.adminNotes}</div>
          </div>
          ` : ''}

        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Near Me Marketing Hub</p>
          <p style="margin: 4px 0 0 0;">This is an automated monthly report from your client portal.</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

async function getReportRecipients(companyId: string): Promise<Array<{ email: string; name: string }>> {
  const members = await db.select().from(companyMembers).where(eq(companyMembers.companyId, companyId));
  const ownerAdminMembers = members.filter(m => m.role === 'company_owner' || m.role === 'company_admin');

  const recipients: Array<{ email: string; name: string }> = [];

  for (const member of ownerAdminMembers) {
    const [user] = await db.select().from(users).where(eq(users.id, member.userId));
    if (user && user.email) {
      recipients.push({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      });
    }
  }

  return recipients;
}

async function getAdminRecipients(): Promise<Array<{ email: string; name: string }>> {
  const admins = await db.select().from(adminUsers);
  const recipients: Array<{ email: string; name: string }> = [];

  for (const admin of admins) {
    const [user] = await db.select().from(users).where(eq(users.id, admin.userId));
    if (user && user.email) {
      recipients.push({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      });
    }
  }

  return recipients;
}

export async function generateAndSendMonthlyReports(targetYear?: number, targetMonth?: number): Promise<{ success: boolean; companiesSent: number; totalEmails: number; errors: string[] }> {
  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? (now.getMonth() - 1);
  
  const actualYear = month < 0 ? year - 1 : year;
  const actualMonth = month < 0 ? 11 : month;

  const monthName = getMonthName(actualMonth);
  const isDevelopment = !process.env.REPLIT_DEPLOYMENT;

  log(`Starting monthly report generation for ${monthName} ${actualYear}${isDevelopment ? ' [DEV MODE - emails suppressed]' : ''}`, 'monthly-report');

  const allCompanies = await db.select().from(companies);
  const errors: string[] = [];
  let companiesSent = 0;
  let totalEmails = 0;

  const adminRecipients = await getAdminRecipients();
  log(`Agency admin recipients: ${adminRecipients.map(r => `${r.name} <${r.email}>`).join(', ')}`, 'monthly-report');

  const { client, fromEmail } = await getUncachableResendClient();

  for (const company of allCompanies) {
    try {
      const reportData = await gatherCompanyReportData(company.id, company.name, actualYear, actualMonth);
      const html = buildReportEmailHtml(reportData);
      const subject = `Monthly Report: ${company.name} - ${monthName} ${actualYear}`;

      const companyRecipients = await getReportRecipients(company.id);
      const allRecipients = [...companyRecipients];

      for (const admin of adminRecipients) {
        if (!allRecipients.some(r => r.email === admin.email)) {
          allRecipients.push(admin);
        }
      }

      if (allRecipients.length === 0) {
        log(`No recipients found for ${company.name}, skipping`, 'monthly-report');
        continue;
      }

      const companyMemberEmails = companyRecipients.map(r => `${r.name} <${r.email}>`).join(', ');
      const adminEmails = adminRecipients.filter(a => !companyRecipients.some(c => c.email === a.email)).map(r => `${r.name} <${r.email}>`).join(', ');
      log(`${company.name}: ${allRecipients.length} recipients — Company: [${companyMemberEmails}] | Admins: [${adminEmails}]`, 'monthly-report');

      if (isDevelopment) {
        log(`[DEV] Skipping actual email sends for ${company.name} (${allRecipients.length} would be sent)`, 'monthly-report');
        companiesSent++;
        continue;
      }

      for (const recipient of allRecipients) {
        try {
          const result = await client.emails.send({
            from: fromEmail,
            to: recipient.email,
            subject,
            html,
          });
          totalEmails++;
          log(`  ✓ Sent to ${recipient.name} <${recipient.email}> (id: ${(result as any)?.data?.id || 'ok'})`, 'monthly-report');
          await new Promise(r => setTimeout(r, 1000));
        } catch (emailError: any) {
          const errMsg = `Failed to send to ${recipient.email} for ${company.name}: ${emailError.message}`;
          errors.push(errMsg);
          log(`  ✗ ${errMsg}`, 'monthly-report');
        }
      }

      companiesSent++;
      log(`Report sent for ${company.name} to ${allRecipients.length} recipients`, 'monthly-report');

      await new Promise(r => setTimeout(r, 2000));
    } catch (companyError: any) {
      errors.push(`Failed to generate report for ${company.name}: ${companyError.message}`);
      log(`Error generating report for ${company.name}: ${companyError.message}`, 'monthly-report');
    }
  }

  log(`Monthly report generation complete: ${companiesSent} companies, ${totalEmails} emails sent${isDevelopment ? ' [DEV - no emails actually sent]' : ''}`, 'monthly-report');
  return { success: errors.length === 0, companiesSent, totalEmails, errors };
}

const DAY_NAME_TO_NUM: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function getDatesForCadence(
  cadence: { frequency: string; scheduledDays: string[] | null; monthDays: number[] | null },
  year: number,
  month: number,
  afterDate?: Date
): Date[] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dates: Date[] = [];

  if (cadence.frequency === "monthly") {
    const days = cadence.monthDays?.length ? cadence.monthDays : [15];
    for (const monthDay of days) {
      const day = Math.min(monthDay, lastDay);
      const d = new Date(year, month, day);
      if (!afterDate || d > afterDate) {
        dates.push(d);
      }
    }
  } else {
    const targetDayNums = (cadence.scheduledDays || [])
      .map(name => DAY_NAME_TO_NUM[name.toLowerCase()])
      .filter(n => n !== undefined);

    if (targetDayNums.length === 0) {
      if (cadence.frequency === "weekly") {
        for (let w = 0; w < 4; w++) {
          const day = Math.min(7 * (w + 1), lastDay);
          const d = new Date(year, month, day);
          if (!afterDate || d > afterDate) dates.push(d);
        }
      } else {
        for (let w = 0; w < 2; w++) {
          const day = Math.min(14 * (w + 1), lastDay);
          const d = new Date(year, month, day);
          if (!afterDate || d > afterDate) dates.push(d);
        }
      }
      return dates;
    }

    if (cadence.frequency === "weekly") {
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(year, month, day);
        if (targetDayNums.includes(d.getDay())) {
          if (!afterDate || d > afterDate) dates.push(d);
        }
      }
    } else {
      // Biweekly: every OTHER week. Collect all matching days, grouped by
      // their Monday-based week number, then keep only alternating weeks
      // (week 0, skip week 1, week 2, skip week 3).
      const weekBuckets: Map<number, Date[]> = new Map();
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(year, month, day);
        const dow = d.getDay();
        if (!targetDayNums.includes(dow)) continue;
        const mondayOffset = dow === 0 ? -6 : 1 - dow;
        const weekMonday = day + mondayOffset;
        if (!weekBuckets.has(weekMonday)) weekBuckets.set(weekMonday, []);
        weekBuckets.get(weekMonday)!.push(d);
      }

      // Sort weeks chronologically and pick every other one.
      // When afterDate is set (Start Now), begin the alternating pattern
      // from the first week that still has future dates.
      const sortedWeeks = [...weekBuckets.keys()].sort((a, b) => a - b);

      let startIdx = 0;
      if (afterDate) {
        // Find the first week that has at least one date after afterDate
        startIdx = sortedWeeks.findIndex(wk => {
          const wkDates = weekBuckets.get(wk)!;
          return wkDates.some(d => d > afterDate);
        });
        if (startIdx === -1) startIdx = sortedWeeks.length;
      }

      for (let i = startIdx; i < sortedWeeks.length; i += 2) {
        const weekDates = weekBuckets.get(sortedWeeks[i])!;
        for (const d of weekDates) {
          if (!afterDate || d > afterDate) dates.push(d);
        }
      }
    }
  }

  return dates;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function createTasksForCadenceDates(cadence: any, dates: Date[], billingPeriodStart: string, billingPeriodEnd: string) {
  const { storage } = await import('./storage');
  let created = 0;

  let resolvedCreditCost = cadence.creditCost;
  if (!cadence.noCredit && cadence.deliverableTypeId) {
    try {
      const deliverableType = await db.select().from(deliverableTypes).where(eq(deliverableTypes.id, cadence.deliverableTypeId));
      if (deliverableType.length > 0 && deliverableType[0].credits) {
        resolvedCreditCost = String(deliverableType[0].credits);
      }
    } catch (err) {
      log(`Failed to look up deliverable type ${cadence.deliverableTypeId} for cadence ${cadence.id}, using cadence creditCost`, 'cadence-generator');
    }
  }

  for (const dueDate of dates) {
    await storage.createTask({
      companyId: cadence.companyId,
      title: cadence.title,
      description: null,
      notes: null,
      status: "pending",
      priority: "medium",
      creditCost: cadence.noCredit ? "0" : resolvedCreditCost,
      type: "assigned",
      deliverableType: cadence.deliverableTypeId || null,
      dueDate: formatDateStr(dueDate),
      startDate: billingPeriodStart,
      assignedBy: cadence.createdBy,
      assignedTo: cadence.assignedTo || null,
      creditsDeducted: false,
      noCredit: cadence.noCredit,
      taskOwnership: cadence.taskOwnership,
      cadenceId: cadence.id,
      billingPeriodStart,
      billingPeriodEnd,
      approvalStatus: "approved",
    });
    created++;
  }
  return created;
}

export async function generateCadenceTasks() {
  if (cadenceGenerationRunning) {
    log('Cadence generation already in progress, skipping', 'cadence-generator');
    return { tasksCreated: 0, cadencesProcessed: 0, skipped: 0 };
  }
  cadenceGenerationRunning = true;
  try {
    const { storage } = await import('./storage');
    const activeCadences = await storage.getAllActiveCadences();
    
    if (activeCadences.length === 0) {
      log('No active cadences to process', 'cadence-generator');
      return { tasksCreated: 0, cadencesProcessed: 0, skipped: 0 };
    }

    let tasksCreated = 0;
    let cadencesProcessed = 0;
    let skipped = 0;
    const et = getNowET();
    const year = et.getFullYear();
    const month = et.getMonth();
    const currentMonthYear = `${year}-${String(month + 1).padStart(2, '0')}`;
    const now = new Date();
    
    const billingPeriodStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const billingPeriodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    for (const cadence of activeCadences) {
      try {
        if (cadence.lastGeneratedAt) {
          const lastGen = new Date(cadence.lastGeneratedAt);
          const lastGenET = new Date(lastGen.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const lastGenMonth = `${lastGenET.getFullYear()}-${String(lastGenET.getMonth() + 1).padStart(2, '0')}`;
          if (lastGenMonth === currentMonthYear) {
            skipped++;
            continue;
          }
        }

        const company = await storage.getCompany(cadence.companyId);
        if (!company) {
          log(`Skipping cadence ${cadence.id}: company ${cadence.companyId} not found`, 'cadence-generator');
          continue;
        }

        const dates = getDatesForCadence(cadence, year, month);
        const count = await createTasksForCadenceDates(cadence, dates, billingPeriodStart, billingPeriodEnd);
        tasksCreated += count;

        await storage.updateCadence(cadence.id, {
          lastGeneratedAt: now.toISOString(),
        });
        cadencesProcessed++;
      } catch (error: any) {
        log(`Failed to generate tasks for cadence ${cadence.id}: ${error.message}`, 'cadence-generator');
      }
    }

    log(`Cadence generation complete: ${tasksCreated} tasks created for ${cadencesProcessed} cadences (${skipped} already done this month)`, 'cadence-generator');
    return { tasksCreated, cadencesProcessed, skipped };
  } finally {
    cadenceGenerationRunning = false;
  }
}

export async function generateCadenceTasksForRemainingMonth(cadence: any) {
  const { storage } = await import('./storage');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const billingPeriodStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const billingPeriodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const dates = getDatesForCadence(cadence, year, month, now);
  const tasksCreated = await createTasksForCadenceDates(cadence, dates, billingPeriodStart, billingPeriodEnd);

  await storage.updateCadence(cadence.id, {
    lastGeneratedAt: now.toISOString(),
  });

  log(`Start-now generation for cadence ${cadence.id}: ${tasksCreated} tasks created for remaining month`, 'cadence-generator');
  return { tasksCreated, cadenceId: cadence.id };
}

export async function generateCadenceTasksForEntireMonth(cadence: any) {
  const { storage } = await import('./storage');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const billingPeriodStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const billingPeriodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const dates = getDatesForCadence(cadence, year, month);
  const tasksCreated = await createTasksForCadenceDates(cadence, dates, billingPeriodStart, billingPeriodEnd);

  await storage.updateCadence(cadence.id, {
    lastGeneratedAt: now.toISOString(),
  });

  log(`Entire-month generation for cadence ${cadence.id}: ${tasksCreated} tasks created for entire month`, 'cadence-generator');
  return { tasksCreated, cadenceId: cadence.id };
}

export async function sendOnboardingReminders(): Promise<{ sent: number; skipped: number; errors: number }> {
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const isDevelopment = !process.env.REPLIT_DEPLOYMENT;

  if (isDevelopment) {
    log('[DEV] Onboarding reminders suppressed in development environment', 'onboarding-reminder');
    return { sent: 0, skipped: 0, errors: 0 };
  }

  try {
    const allCompanies = await db.select().from(companies).where(eq(companies.onboardingComplete, false));

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const company of allCompanies) {
      try {
        if (company.lastOnboardingReminderSent) {
          const lastSent = new Date(company.lastOnboardingReminderSent);
          if (lastSent > sevenDaysAgo) {
            skipped++;
            continue;
          }
        }

        const members = await db.select().from(companyMembers).where(eq(companyMembers.companyId, company.id));
        const ownerAndAdminMembers = members.filter(m => m.role === 'company_owner' || m.role === 'company_admin');

        if (ownerAndAdminMembers.length === 0) {
          skipped++;
          continue;
        }

        const createdDate = new Date(company.createdAt);
        const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        const portalUrl = `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'https://nearmemarketinghub.com'}/onboarding`;
        let companySentCount = 0;

        for (const member of ownerAndAdminMembers) {
          const [user] = await db.select().from(users).where(eq(users.id, member.userId));
          if (!user || !user.email) continue;

          const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
          try {
            await sendOnboardingReminderEmail({
              recipientEmail: user.email,
              recipientName: userName,
              companyName: company.name,
              portalUrl,
              daysSinceCreation,
            });
            await db.insert(notifications).values({
              userId: user.id,
              type: 'system',
              title: 'Onboarding Reminder',
              message: `Please complete onboarding for ${company.name}. It's been ${daysSinceCreation} days since the account was created.`,
              isRead: false,
              createdAt: now.toISOString(),
            });
            sent++;
            companySentCount++;
          } catch (e: any) {
            log(`Failed to send onboarding reminder to ${user.email}: ${e.message}`, 'onboarding-reminder');
            errors++;
          }
        }

        const allAdmins = await db.select().from(adminUsers);
        for (const admin of allAdmins) {
          const [adminUser] = await db.select().from(users).where(eq(users.id, admin.userId));
          if (!adminUser || !adminUser.email) continue;

          const adminName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || adminUser.email;
          try {
            await sendOnboardingReminderEmail({
              recipientEmail: adminUser.email,
              recipientName: adminName,
              companyName: company.name,
              portalUrl: `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'https://nearmemarketinghub.com'}/admin/companies/${company.id}`,
              daysSinceCreation,
            });
            await db.insert(notifications).values({
              userId: adminUser.id,
              type: 'system',
              title: 'Onboarding Reminder',
              message: `${company.name} has not completed onboarding yet (${daysSinceCreation} days since creation).`,
              isRead: false,
              createdAt: now.toISOString(),
            });
            sent++;
            companySentCount++;
          } catch (e: any) {
            log(`Failed to send onboarding reminder to admin ${adminUser.email}: ${e.message}`, 'onboarding-reminder');
            errors++;
          }
        }

        if (companySentCount > 0) {
          await db.update(companies)
            .set({ lastOnboardingReminderSent: now.toISOString() })
            .where(eq(companies.id, company.id));
        }

      } catch (companyError: any) {
        log(`Error processing onboarding reminder for company ${company.name}: ${companyError.message}`, 'onboarding-reminder');
        errors++;
      }
    }

    return { sent, skipped, errors };
  } catch (error: any) {
    log(`Failed to process onboarding reminders: ${error.message}`, 'onboarding-reminder');
    return { sent, skipped, errors: errors + 1 };
  }
}

async function getLastReportSentMonth(): Promise<string | null> {
  try {
    const rows = await db.select().from(monthlyReportTracker);
    if (rows.length === 0) return null;
    rows.sort((a, b) => (b.sentAt > a.sentAt ? 1 : -1));
    return rows[0].monthYear || null;
  } catch (err) {
    log(`Failed to read report tracker from DB (failing closed to prevent duplicate sends): ${err}`, 'monthly-report');
    throw err;
  }
}

async function setLastReportSentMonth(monthYear: string): Promise<void> {
  try {
    await db.insert(monthlyReportTracker)
      .values({ monthYear, sentAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: monthlyReportTracker.monthYear,
        set: { sentAt: new Date().toISOString() },
      });
  } catch (err) {
    log(`Failed to persist report tracker to DB: ${err}`, 'monthly-report');
  }
}

export async function markReportSent(): Promise<void> {
  const currentMonth = getMonthYearET();
  await setLastReportSentMonth(currentMonth);
}

export async function getMonthlyReportStatus(): Promise<{ sent: boolean; lastSentMonth: string | null; lastSentAt: string | null; currentMonth: string }> {
  const currentMonth = getMonthYearET();
  const lastSentMonth = await getLastReportSentMonth();
  let lastSentAt: string | null = null;
  try {
    const rows = await db.select().from(monthlyReportTracker);
    if (rows.length > 0) {
      rows.sort((a, b) => (b.sentAt > a.sentAt ? 1 : -1));
      lastSentAt = rows[0].sentAt || null;
    }
  } catch {}
  return {
    sent: lastSentMonth === currentMonth,
    lastSentMonth,
    lastSentAt,
    currentMonth,
  };
}

async function runCreditReset(): Promise<{ resetCount: number }> {
  if (creditResetRunning) {
    log('Credit reset already in progress, skipping', 'credit-reset');
    return { resetCount: 0 };
  }
  creditResetRunning = true;
  try {
    const currentMonthYear = getMonthYearET();
    const now = new Date();
    
    const allCompanies = await db.select().from(companies);
    let resetCount = 0;

    for (const company of allCompanies) {
      if (!company.creditsLastReset || company.creditsLastReset !== currentMonthYear) {
        await db.transaction(async (tx) => {
          const [updated] = await tx.update(companies)
            .set({
              credits: company.monthlyCredits,
              bonusCredits: 0,
              creditsLastReset: currentMonthYear,
            })
            .where(and(
              eq(companies.id, company.id),
              or(
                isNull(companies.creditsLastReset),
                ne(companies.creditsLastReset, currentMonthYear)
              )
            ))
            .returning({ id: companies.id });

          if (updated) {
            await tx.insert(creditTransactions).values({
              id: crypto.randomUUID(),
              companyId: company.id,
              taskId: null,
              amount: String(company.monthlyCredits),
              type: 'credit',
              description: 'Monthly Allocation',
              createdAt: now.toISOString(),
              balanceAfter: String(company.monthlyCredits),
            });
            log(`Reset credits for ${company.name}: ${company.monthlyCredits} credits, bonus cleared`, 'credit-reset');
            resetCount++;
          }
        });
      }
    }

    return { resetCount };
  } finally {
    creditResetRunning = false;
  }
}

export async function setupMonthlyReportScheduler() {
  try {
    const cron = await import('node-cron');

    // --- Credit reset: 1st of each month at midnight ET ---
    cron.schedule('0 0 1 * *', async () => {
      log('Running scheduled credit reset job', 'credit-reset');
      try {
        const result = await runCreditReset();
        log(`Credit reset complete: ${result.resetCount} companies reset`, 'credit-reset');
      } catch (error: any) {
        log(`Credit reset failed: ${error.message}`, 'credit-reset');
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Credit reset scheduler started (1st of each month at midnight ET)', 'credit-reset');

    // --- Cadence task generation: 1st of each month at 6 AM ET ---
    cron.schedule('0 6 1 * *', async () => {
      log('Running cadence task generation job', 'cadence-generator');
      try {
        const result = await generateCadenceTasks();
        log(`Cadence generation result: ${result.tasksCreated} tasks, ${result.cadencesProcessed} cadences`, 'cadence-generator');
      } catch (error: any) {
        log(`Cadence generation failed: ${error.message}`, 'cadence-generator');
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Cadence task generator started (1st of each month at 6:00 AM ET)', 'cadence-generator');

    // --- Monthly reports: 1st of each month at 8 AM ET ---
    cron.schedule('0 8 1 * *', async () => {
      log('Running scheduled monthly report job', 'monthly-report');
      try {
        const result = await generateAndSendMonthlyReports();
        const now = new Date();
        await setLastReportSentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        log(`Scheduled report result: ${result.companiesSent} companies, ${result.totalEmails} emails, ${result.errors.length} errors`, 'monthly-report');
      } catch (error: any) {
        log(`Scheduled report failed: ${error.message}`, 'monthly-report');
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Monthly report scheduler started (1st of each month at 8:00 AM ET)', 'monthly-report');

    // --- HOURLY CATCH-UP: Resilient fallback for all monthly 1st-of-month jobs ---
    // If the server was sleeping at midnight/6AM/8AM, this ensures catch-up
    // within 1 hour of the server waking up. All functions are idempotent.
    cron.schedule('0 * * * *', async () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const dayOfMonth = now.getDate();

      try {
        const resetResult = await runCreditReset();
        if (resetResult.resetCount > 0) {
          log(`Hourly catch-up: credit reset applied to ${resetResult.resetCount} companies`, 'credit-reset');
        }
      } catch (error: any) {
        log(`Hourly catch-up credit reset failed: ${error.message}`, 'credit-reset');
      }

      if (dayOfMonth <= 3) {
        try {
          const cadenceResult = await generateCadenceTasks();
          if (cadenceResult.tasksCreated > 0) {
            log(`Hourly catch-up: cadence generation created ${cadenceResult.tasksCreated} tasks for ${cadenceResult.cadencesProcessed} cadences`, 'cadence-generator');
          }
        } catch (error: any) {
          log(`Hourly catch-up cadence generation failed: ${error.message}`, 'cadence-generator');
        }
      }

      if (dayOfMonth <= 5) {
        try {
          const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const lastSent = await getLastReportSentMonth();
          if (lastSent !== currentMonthYear) {
            log('Hourly catch-up: monthly report not yet sent, sending now...', 'monthly-report');
            const reportResult = await generateAndSendMonthlyReports();
            await setLastReportSentMonth(currentMonthYear);
            log(`Hourly catch-up report result: ${reportResult.companiesSent} companies, ${reportResult.totalEmails} emails, ${reportResult.errors.length} errors`, 'monthly-report');
          }
        } catch (error: any) {
          log(`Hourly catch-up monthly report failed: ${error.message}`, 'monthly-report');
        }
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Hourly catch-up scheduler started (runs every hour to catch missed monthly jobs)', 'catch-up');

    // --- Startup catch-up: immediately run all monthly jobs if missed ---
    try {
      const result = await runCreditReset();
      if (result.resetCount > 0) {
        log(`Startup credit reset catch-up: ${result.resetCount} companies reset`, 'credit-reset');
      }
    } catch (error: any) {
      log(`Startup credit reset catch-up failed: ${error.message}`, 'credit-reset');
    }

    {
      const etDay = getNowET().getDate();
      if (etDay <= 3) {
        try {
          const cadenceResult = await generateCadenceTasks();
          if (cadenceResult.tasksCreated > 0) {
            log(`Startup cadence catch-up: ${cadenceResult.tasksCreated} tasks created for ${cadenceResult.cadencesProcessed} cadences`, 'cadence-generator');
          }
        } catch (error: any) {
          log(`Startup cadence catch-up failed: ${error.message}`, 'cadence-generator');
        }
      }
    }

    setTimeout(async () => {
      try {
        const etNow = getNowET();
        const currentMonthYear = getMonthYearET();
        const lastSent = await getLastReportSentMonth();
        if (lastSent !== currentMonthYear) {
          const dayOfMonth = etNow.getDate();
          if (dayOfMonth <= 5) {
            log('Startup catch-up (delayed): monthly report not yet sent this month, sending now...', 'monthly-report');
            const result = await generateAndSendMonthlyReports();
            await setLastReportSentMonth(currentMonthYear);
            log(`Startup report catch-up result: ${result.companiesSent} companies, ${result.totalEmails} emails, ${result.errors.length} errors`, 'monthly-report');
          } else {
            log(`Startup catch-up: past the 5-day window (day ${dayOfMonth}), skipping monthly report`, 'monthly-report');
          }
        } else {
          log('Startup catch-up: monthly report already sent this month, skipping', 'monthly-report');
        }
      } catch (error: any) {
        log(`Startup report catch-up failed: ${error.message}. Will retry on next hourly catch-up.`, 'monthly-report');
      }
    }, 30000);

    cron.schedule('0 9 * * *', async () => {
      log('Running onboarding reminder check', 'onboarding-reminder');
      try {
        const result = await sendOnboardingReminders();
        log(`Onboarding reminders: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`, 'onboarding-reminder');
      } catch (error: any) {
        log(`Onboarding reminder failed: ${error.message}`, 'onboarding-reminder');
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Onboarding reminder scheduler started (daily at 9:00 AM ET, weekly reminders for incomplete onboarding)', 'onboarding-reminder');

    cron.schedule('0 10 * * *', async () => {
      try {
        const now = new Date();
        const dayOfMonth = now.getDate();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysUntilEnd = lastDay - dayOfMonth;

        if (daysUntilEnd === 7 || daysUntilEnd === 2) {
          log(`Running report notes reminder (${daysUntilEnd} days until month end)`, 'report-reminder');
          const allCompanies = await db.select().from(companies);
          const admins = await db.select().from(adminUsers);
          const reportMonth = now.getMonth() + 1;
          const reportYear = now.getFullYear();

          const existingNotes = await db.select().from(monthlyReportNotes)
            .where(and(
              eq(monthlyReportNotes.month, reportMonth),
              eq(monthlyReportNotes.year, reportYear)
            ));
          const notedCompanyIds = new Set(existingNotes.map(n => n.companyId));
          const companiesMissingNotes = allCompanies.filter(c => !notedCompanyIds.has(c.id) && !c.isPaused);

          if (companiesMissingNotes.length > 0) {
            const companyNames = companiesMissingNotes.map(c => c.name).join(', ');
            const timeLabel = daysUntilEnd === 7 ? 'one week' : '2 days';
            for (const admin of admins) {
              await db.insert(notifications).values({
                id: crypto.randomUUID(),
                userId: admin.userId,
                type: 'system',
                title: 'Monthly Report Notes Reminder',
                message: `The monthly report goes out in ${timeLabel}. ${companiesMissingNotes.length} company(ies) still need notes: ${companyNames}`,
                link: '/admin/reporting',
                isRead: false,
                createdAt: now.toISOString(),
              });
            }
            log(`Report notes reminder sent to ${admins.length} admins for ${companiesMissingNotes.length} companies`, 'report-reminder');
          } else {
            log('All companies have report notes for this month', 'report-reminder');
          }
        }
      } catch (error: any) {
        log(`Report notes reminder failed: ${error.message}`, 'report-reminder');
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Report notes reminder scheduler started (daily at 10:00 AM ET, checks 7 and 2 days before month end)', 'report-reminder');

    cron.schedule('0 3 * * *', async () => {
      log('Running cleanup job (60-day auto-delete)', 'task-cleanup');
      try {
        const { storage } = await import('./storage');
        const taskCount = await storage.deleteOldCompletedTasks(60);
        log(`Task cleanup complete: ${taskCount} tasks deleted`, 'task-cleanup');
        const campaignCount = await storage.deleteOldCompletedCampaigns(60);
        log(`Campaign cleanup complete: ${campaignCount} campaigns deleted`, 'task-cleanup');
        const meetingCount = await storage.deleteOldCompletedMeetings(60);
        log(`Meeting cleanup complete: ${meetingCount} meetings deleted`, 'task-cleanup');
      } catch (error: any) {
        log(`Cleanup failed: ${error.message}`, 'task-cleanup');
      }
    }, {
      timezone: 'America/New_York'
    });
    log('Cleanup scheduler started (daily at 3:00 AM ET, deletes 60+ day old completed/rejected tasks, campaigns, and meetings)', 'task-cleanup');
  } catch (error: any) {
    log(`Failed to setup schedulers: ${error.message}`, 'monthly-report');
  }
}
