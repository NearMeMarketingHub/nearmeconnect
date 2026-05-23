import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { parseLocalDate } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  MessageSquare,
  Megaphone,
  Pause,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  BarChart2,
  Layers,
  BookOpen,
  Image,
  Mail,
  Linkedin,
  Facebook,
  Instagram,
} from "lucide-react";
import type {
  Company,
  Task,
  CampaignRequest,
  MeetingRequest,
  CreditTransaction,
  ClientOnboarding,
  ChatThread,
  BrandProfile,
  ContentCalendarItem,
  CompanyKnowledgeItem,
} from "@shared/schema";

// ─── helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date();
const todayStr = () => today().toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function isOverdue(task: Task) {
  return (
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    task.approvalStatus !== "rejected" &&
    !!task.dueDate &&
    task.dueDate.slice(0, 10) < todayStr()
  );
}

function isDueToday(task: Task) {
  return (
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    task.approvalStatus !== "rejected" &&
    !!task.dueDate &&
    task.dueDate.slice(0, 10) === todayStr()
  );
}

function isDueThisWeek(task: Task) {
  const t = today();
  const end = addDays(t, 7).toISOString().slice(0, 10);
  const ts = todayStr();
  return (
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    task.approvalStatus !== "rejected" &&
    !!task.dueDate &&
    task.dueDate.slice(0, 10) > ts &&
    task.dueDate.slice(0, 10) <= end
  );
}

function isDueNextWeek(task: Task) {
  const t = today();
  const start = addDays(t, 7).toISOString().slice(0, 10);
  const end = addDays(t, 14).toISOString().slice(0, 10);
  return (
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    task.approvalStatus !== "rejected" &&
    !!task.dueDate &&
    task.dueDate.slice(0, 10) > start &&
    task.dueDate.slice(0, 10) <= end
  );
}

function healthScore(
  tasks: Task[],
  company: Company,
  onboarding: ClientOnboarding | null | undefined
): { score: number; label: string; color: string } {
  let pts = 0;
  if (!company.isPaused) pts += 20;
  if (company.onboardingComplete || onboarding?.completedAt) pts += 20;
  const overdue = tasks.filter(isOverdue).length;
  if (overdue === 0) pts += 20;
  else if (overdue <= 2) pts += 10;
  const active = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled" && t.approvalStatus !== "rejected"
  );
  if (active.length > 0) pts += 20;
  const hasAssignees = active.filter((t) => t.assignedTo).length;
  if (active.length === 0 || hasAssignees / active.length >= 0.8) pts += 20;

  if (pts >= 80) return { score: pts, label: "Healthy", color: "text-green-600 dark:text-green-400" };
  if (pts >= 50) return { score: pts, label: "Needs Attention", color: "text-yellow-600 dark:text-yellow-500" };
  return { score: pts, label: "At Risk", color: "text-red-600 dark:text-red-400" };
}

function platformIcon(platform: string) {
  switch (platform) {
    case "facebook": return <Facebook className="h-3.5 w-3.5" />;
    case "instagram": return <Instagram className="h-3.5 w-3.5" />;
    case "linkedin": return <Linkedin className="h-3.5 w-3.5" />;
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "google_business": return <Globe className="h-3.5 w-3.5" />;
    default: return <Globe className="h-3.5 w-3.5" />;
  }
}

function platformLabel(p: string) {
  const m: Record<string, string> = {
    google_business: "GBP",
    facebook: "FB",
    instagram: "IG",
    linkedin: "LI",
    email: "Email",
    blog: "Blog",
    other: "Other",
  };
  return m[p] ?? p;
}

const SECTION_LABEL: Record<string, string> = {
  website: "Website",
  analytics: "Analytics",
  social: "Social",
  design: "Design",
  ads: "Ads",
  email: "Email",
  tools: "Tools",
  docs: "Documents",
  directory: "Directory",
  other: "Other",
  ideas: "Ideas",
  sharepoint: "SharePoint",
};

// ─── sub-cards ────────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
      <Icon className="h-8 w-8 opacity-30" />
      <p className="text-sm text-center">{text}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {children}
    </p>
  );
}

// ── 1. Client Snapshot ────────────────────────────────────────────────────────
function ClientSnapshotCard({
  company,
  tasks,
  onboardingData,
  companyUsers,
  agencyAdmins,
  onNavigate,
}: {
  company: Company;
  tasks: Task[];
  onboardingData: ClientOnboarding | null | undefined;
  companyUsers: any[];
  agencyAdmins: any[];
  onNavigate: (tab: string) => void;
}) {
  const health = healthScore(tasks, company, onboardingData);
  const internalOwner = agencyAdmins[0];
  const ownerName = internalOwner
    ? `${internalOwner.firstName} ${internalOwner.lastName}`.trim()
    : "Unassigned";

  const totalSteps = 6;
  const stepsComplete = onboardingData
    ? Math.min(
        [
          !!onboardingData.website,
          !!onboardingData.primaryContactName,
          !!onboardingData.socialPlatforms,
          !!onboardingData.loginCredentials,
          !!onboardingData.brandAssetLinks,
          !!onboardingData.completedAt,
        ].filter(Boolean).length,
        totalSteps
      )
    : 0;

  return (
    <Card data-testid="card-client-snapshot">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              {company.logoUrl && <AvatarImage src={company.logoUrl} alt={company.name} />}
              <AvatarFallback className="text-sm font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {company.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold leading-tight" data-testid="text-snapshot-name">
                  {company.name}
                </h3>
                <Badge variant="outline" className="text-xs capitalize">
                  {company.subscriptionTier}
                </Badge>
                {company.isPaused && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Pause className="h-3 w-3" /> Paused
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {company.industry || "Industry not set"} · Owner: {ownerName}
              </p>
            </div>
          </div>
          <div className={`text-right shrink-0 ${health.color}`}>
            <p className="text-xs font-medium">{health.label}</p>
            <p className="text-2xl font-bold leading-tight">{health.score}</p>
            <p className="text-[10px] text-muted-foreground">health score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <SectionLabel>Account Status</SectionLabel>
            <div className="flex items-center gap-1.5">
              {company.isPaused ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {company.isPaused ? "Paused" : "Active"}
              </span>
            </div>
          </div>
          <div>
            <SectionLabel>Credits</SectionLabel>
            <p className="text-sm font-semibold">
              {company.credits}
              <span className="text-muted-foreground font-normal text-xs"> / {company.monthlyCredits} mo</span>
            </p>
          </div>
          <div>
            <SectionLabel>Active Tasks</SectionLabel>
            <p className="text-sm font-semibold">
              {tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled" && t.approvalStatus !== "rejected").length}
              <span className="text-muted-foreground font-normal text-xs"> tasks</span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <SectionLabel>Onboarding</SectionLabel>
            <span className="text-[10px] text-muted-foreground">
              {company.onboardingComplete ? "Complete" : `${stepsComplete} / ${totalSteps} steps`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${company.onboardingComplete ? 100 : (stepsComplete / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onNavigate("users")} data-testid="button-snapshot-users">
            <Users className="h-3 w-3 mr-1" /> Team
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onNavigate("credit-history")} data-testid="button-snapshot-credits">
            <TrendingUp className="h-3 w-3 mr-1" /> Credits
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onNavigate("onboarding")} data-testid="button-snapshot-onboarding">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Onboarding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 2. Integration Health ─────────────────────────────────────────────────────
function IntegrationHealthCard({
  company,
  knowledgeItems,
  contentItems,
}: {
  company: Company;
  knowledgeItems: CompanyKnowledgeItem[];
  contentItems: ContentCalendarItem[];
}) {
  const hubspotOk = !!company.hubspotCompanyId;
  const sharepointOk = knowledgeItems.some((k) => k.url?.toLowerCase().includes("sharepoint"));
  const gbpOk = contentItems.some((c) => c.platform === "google_business");

  const integrations = [
    {
      name: "HubSpot",
      ok: hubspotOk,
      label: hubspotOk ? "Connected" : "Not linked",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      name: "SharePoint",
      ok: sharepointOk,
      label: sharepointOk ? "Folder linked" : "No folder",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      name: "Resend Email",
      ok: true,
      label: "Active",
      icon: <Mail className="h-4 w-4" />,
    },
    {
      name: "Google Business",
      ok: gbpOk,
      label: gbpOk ? "Content active" : "No content",
      icon: <Globe className="h-4 w-4" />,
    },
  ];

  return (
    <Card data-testid="card-integration-health">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" /> Integration Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {integrations.map((i) => (
          <div key={i.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{i.icon}</span>
              <span>{i.name}</span>
            </div>
            <Badge
              variant={i.ok ? "default" : "secondary"}
              className={`text-xs ${i.ok ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" : ""}`}
            >
              {i.ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
              {i.label}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── 3. This Week / Next Week ──────────────────────────────────────────────────
function ThisWeekCard({
  tasks,
  meetings,
  onNavigate,
}: {
  tasks: Task[];
  meetings: MeetingRequest[];
  onNavigate: (tab: string) => void;
}) {
  const ts = todayStr();
  const overdueTasks = tasks.filter(isOverdue);
  const dueTodayTasks = tasks.filter(isDueToday);
  const thisWeekTasks = tasks.filter(isDueThisWeek);
  const nextWeekTasks = tasks.filter(isDueNextWeek);
  const pendingApprovals = tasks.filter((t) => t.approvalStatus === "pending_approval");
  const rejected = tasks.filter((t) => t.approvalStatus === "rejected" && t.status !== "cancelled");

  const upcomingMeetings = meetings.filter((m) => {
    if (m.status === "cancelled" || m.status === "rejected") return false;
    const d = m.proposedDate ? m.proposedDate.slice(0, 10) : null;
    return d && d >= ts;
  });

  const thisWeekMeetings = upcomingMeetings.filter((m) => {
    const d = m.proposedDate!.slice(0, 10);
    const end = addDays(today(), 7).toISOString().slice(0, 10);
    return d <= end;
  });

  const nextWeekMeetings = upcomingMeetings.filter((m) => {
    const d = m.proposedDate!.slice(0, 10);
    const start = addDays(today(), 7).toISOString().slice(0, 10);
    const end = addDays(today(), 14).toISOString().slice(0, 10);
    return d > start && d <= end;
  });

  function CountChip({ count, color, label }: { count: number; color: string; label: string }) {
    return (
      <div className={`flex items-center gap-1 rounded-md px-2 py-1 ${color} text-xs font-medium`}>
        <span className="text-base font-bold leading-none">{count}</span>
        <span className="opacity-80">{label}</span>
      </div>
    );
  }

  return (
    <Card data-testid="card-this-week">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" /> This Week / Next Week
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigate("tasks")}>
            All tasks <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <SectionLabel>This Week</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {overdueTasks.length > 0 && (
              <CountChip count={overdueTasks.length} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" label="overdue" />
            )}
            <CountChip count={dueTodayTasks.length} color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" label="due today" />
            <CountChip count={thisWeekTasks.length} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" label="this week" />
            <CountChip count={thisWeekMeetings.length} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" label="meetings" />
          </div>
        </div>

        <div>
          <SectionLabel>Next Week</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <CountChip count={nextWeekTasks.length} color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" label="tasks" />
            <CountChip count={nextWeekMeetings.length} color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" label="meetings" />
          </div>
        </div>

        {(pendingApprovals.length > 0 || rejected.length > 0) && (
          <div>
            <SectionLabel>Needs Attention</SectionLabel>
            <div className="space-y-1.5">
              {pendingApprovals.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] shrink-0">approval</Badge>
                </div>
              ))}
              {rejected.slice(0, 2).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] shrink-0">rejected</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdueTasks.length === 0 && dueTodayTasks.length === 0 && thisWeekTasks.length === 0 && pendingApprovals.length === 0 && (
          <EmptyState icon={CalendarDays} text="No tasks due this week — great work!" />
        )}
      </CardContent>
    </Card>
  );
}

// ── 4. 30/60-Day Plan ─────────────────────────────────────────────────────────
function PlanCard({
  tasks,
  campaigns,
  contentItems,
  onNavigate,
}: {
  tasks: Task[];
  campaigns: CampaignRequest[];
  contentItems: ContentCalendarItem[];
  onNavigate: (tab: string) => void;
}) {
  const t = today();
  const in30 = addDays(t, 30).toISOString().slice(0, 10);
  const in60 = addDays(t, 60).toISOString().slice(0, 10);
  const ts = todayStr();

  const campaigns30 = campaigns.filter((c) => {
    if (c.status === "cancelled" || c.status === "completed") return false;
    const d = c.dueDate || c.createdAt;
    return d.slice(0, 10) >= ts && d.slice(0, 10) <= in30;
  });
  const campaigns60 = campaigns.filter((c) => {
    if (c.status === "cancelled" || c.status === "completed") return false;
    const d = c.dueDate || c.createdAt;
    return d.slice(0, 10) >= ts && d.slice(0, 10) <= in60;
  });

  const content30 = contentItems.filter((c) => {
    if (!c.scheduledDate) return false;
    return c.scheduledDate >= ts && c.scheduledDate <= in30;
  });
  const content60 = contentItems.filter((c) => {
    if (!c.scheduledDate) return false;
    return c.scheduledDate >= ts && c.scheduledDate <= in60;
  });

  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled" && t.approvalStatus !== "rejected"
  );
  const cadenceTasks = activeTasks.filter((t) => !!t.cadenceId);
  const unscheduled = activeTasks.filter((t) => !t.dueDate);

  const withDueAndAssignee = activeTasks.filter((t) => t.dueDate && t.assignedTo).length;
  const readiness = activeTasks.length === 0 ? 100 : Math.round((withDueAndAssignee / activeTasks.length) * 100);

  const rows = [
    { label: "Planned Campaigns", v30: campaigns30.length, v60: campaigns60.length, tab: "campaigns" },
    { label: "Content Items", v30: content30.length, v60: content60.length, tab: "content-calendar" },
    { label: "Cadence Tasks", v30: cadenceTasks.length, v60: cadenceTasks.length, tab: "cadences" },
    { label: "Unscheduled", v30: unscheduled.length, v60: unscheduled.length, tab: "tasks" },
  ];

  return (
    <Card data-testid="card-plan">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" /> 30/60-Day Plan
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigate("campaigns")}>
            Campaigns <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-muted-foreground font-medium pb-2 w-1/2"></th>
              <th className="text-center text-xs text-muted-foreground font-medium pb-2">30d</th>
              <th className="text-center text-xs text-muted-foreground font-medium pb-2">60d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label} className="hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate(r.tab)}>
                <td className="py-2 text-sm">{r.label}</td>
                <td className="py-2 text-center font-semibold">{r.v30}</td>
                <td className="py-2 text-center font-semibold text-muted-foreground">{r.v60}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <SectionLabel>Plan Readiness</SectionLabel>
            <span className="text-xs font-semibold">{readiness}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${readiness >= 70 ? "bg-green-500" : readiness >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${readiness}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {activeTasks.length === 0 ? "No active tasks" : `${withDueAndAssignee} of ${activeTasks.length} tasks have due dates & assignees`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── 5. Active Campaigns ───────────────────────────────────────────────────────
function ActiveCampaignsCard({
  campaigns,
  tasks,
  onNavigate,
}: {
  campaigns: CampaignRequest[];
  tasks: Task[];
  onNavigate: (tab: string) => void;
}) {
  const active = campaigns.filter((c) => c.status === "in_progress" || c.status === "approved");

  return (
    <Card data-testid="card-active-campaigns">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" /> Active Campaigns
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigate("campaigns")} data-testid="button-campaigns-all">
            View all <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <EmptyState icon={Megaphone} text='No active campaigns. Click "Create campaign" to get started.' />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {active.map((c) => {
              const linkedTasks = tasks.filter(
                (t) => t.campaignRequestId === c.id && t.status !== "completed" && t.status !== "cancelled"
              );
              const totalLinked = tasks.filter((t) => t.campaignRequestId === c.id);
              const completedLinked = totalLinked.filter((t) => t.status === "completed");
              const progress = totalLinked.length > 0 ? Math.round((completedLinked.length / totalLinked.length) * 100) : 0;
              const nextTask = linkedTasks[0];

              return (
                <div
                  key={c.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onNavigate("campaigns")}
                  data-testid={`card-campaign-${c.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight line-clamp-2">{c.name || "Untitled Campaign"}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${c.status === "in_progress" ? "border-blue-300 text-blue-700 dark:text-blue-400" : "border-green-300 text-green-700 dark:text-green-400"}`}
                    >
                      {c.status === "in_progress" ? "In Progress" : "Approved"}
                    </Badge>
                  </div>
                  {c.dueDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Due {new Date(c.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                  {totalLinked.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">{completedLinked.length}/{totalLinked.length} tasks</span>
                        <span className="text-[10px] font-medium">{progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {nextTask && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 shrink-0" /> {nextTask.title}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 6. Content Pipeline ───────────────────────────────────────────────────────
function ContentPipelineCard({
  contentItems,
  onNavigate,
}: {
  contentItems: ContentCalendarItem[];
  onNavigate: (tab: string) => void;
}) {
  const statuses = [
    { key: "draft", label: "Draft", color: "bg-slate-400" },
    { key: "in_review", label: "Review", color: "bg-yellow-400" },
    { key: "approved", label: "Approved", color: "bg-blue-400" },
    { key: "scheduled", label: "Scheduled", color: "bg-purple-400" },
    { key: "published", label: "Published", color: "bg-green-400" },
  ];

  const platforms = ["google_business", "facebook", "instagram", "linkedin", "email", "blog"] as const;

  const platformCounts = platforms
    .map((p) => ({ key: p, count: contentItems.filter((c) => c.platform === p).length }))
    .filter((p) => p.count > 0);

  return (
    <Card data-testid="card-content-pipeline">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" /> Content Pipeline
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigate("content-calendar")} data-testid="button-content-all">
            View all <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {contentItems.length === 0 ? (
          <EmptyState icon={Layers} text='No content items yet. Schedule content to see the pipeline.' />
        ) : (
          <>
            <div>
              <SectionLabel>By Status</SectionLabel>
              <div className="flex items-end gap-1 h-16">
                {statuses.map((s) => {
                  const count = contentItems.filter((c) => c.status === s.key).length;
                  const max = Math.max(...statuses.map((ss) => contentItems.filter((c) => c.status === ss.key).length), 1);
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">{count}</span>
                      <div className="w-full rounded-t" style={{ height: `${Math.max(4, (pct / 100) * 40)}px` }}>
                        <div className={`w-full h-full rounded-t ${s.color} opacity-80`} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {platformCounts.length > 0 && (
              <div>
                <SectionLabel>By Platform</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {platformCounts.map((p) => (
                    <div key={p.key} className="flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1">
                      {platformIcon(p.key)}
                      <span>{platformLabel(p.key)}</span>
                      <span className="font-semibold ml-0.5">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── 7. Client Approvals ───────────────────────────────────────────────────────
function ClientApprovalsCard({
  tasks,
  contentItems,
  campaigns,
  onNavigate,
}: {
  tasks: Task[];
  contentItems: ContentCalendarItem[];
  campaigns: CampaignRequest[];
  onNavigate: (tab: string) => void;
}) {
  const pendingTasks = tasks.filter((t) => t.approvalStatus === "pending_approval");
  const reviewContent = contentItems.filter((c) => c.status === "in_review");
  const pendingCampaigns = campaigns.filter((c) => c.status === "pending");

  const total = pendingTasks.length + reviewContent.length + pendingCampaigns.length;

  return (
    <Card data-testid="card-client-approvals">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Client Approvals
            {total > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {total}
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState icon={CheckCircle2} text="Nothing awaiting approval — all clear!" />
        ) : (
          <div className="space-y-1.5">
            {pendingTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onNavigate("pending_approval")}
                data-testid={`item-approval-task-${t.id}`}
              >
                <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">Task approval</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
            {reviewContent.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onNavigate("content-calendar")}
                data-testid={`item-approval-content-${c.id}`}
              >
                <Image className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">Content review · {platformLabel(c.platform)}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
            {pendingCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onNavigate("campaigns")}
                data-testid={`item-approval-campaign-${c.id}`}
              >
                <Megaphone className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">Campaign approval</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 8. Resources & Links ──────────────────────────────────────────────────────
function ResourcesCard({
  companyId,
  knowledgeItems,
  onNavigate,
}: {
  companyId: string;
  knowledgeItems: CompanyKnowledgeItem[];
  onNavigate: (tab: string) => void;
}) {
  const { data: clientResources = [] } = useQuery<Array<{ id: string; title: string; resourceType: string; status: string; url: string | null }>>({
    queryKey: [`/api/companies/${companyId}/resources`],
  });

  const keyResources = clientResources.filter(r => ["sharepoint_main_folder", "brand_kit", "logo_creative_assets"].includes(r.resourceType)).slice(0, 4);
  const missingCount = clientResources.filter(r => r.status === "missing" || r.status === "needs_update").length;

  const grouped = knowledgeItems.reduce<Record<string, CompanyKnowledgeItem[]>>((acc, item) => {
    const key = item.section ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const hasClientResources = clientResources.length > 0;
  const hasKnowledgeItems = knowledgeItems.length > 0;

  return (
    <Card data-testid="card-resources">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" /> Resources & Links
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigate("marketing")} data-testid="button-resources-all">
            Manage <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Resource Library summary */}
        {hasClientResources && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resource Library</span>
              {missingCount > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{missingCount} need attention
                </span>
              )}
            </div>
            {keyResources.map(r => (
              r.url ? (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  data-testid={`link-client-resource-${r.id}`}>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{r.title}</span>
                </a>
              ) : (
                <p key={r.id} className="text-sm text-muted-foreground truncate pl-5">{r.title}</p>
              )
            ))}
          </div>
        )}

        {/* Knowledge / Links */}
        {!hasKnowledgeItems && !hasClientResources ? (
          <EmptyState icon={Link2} text='No resources added yet. Add links in the Marketing Hub.' />
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped)
              .slice(0, 4)
              .map(([section, items]) => (
                <div key={section}>
                  <SectionLabel>{SECTION_LABEL[section] ?? section}</SectionLabel>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((item) => (
                      item.url ? (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          data-testid={`link-resource-${item.id}`}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </a>
                      ) : (
                        <p key={item.id} className="text-sm text-muted-foreground truncate pl-5">
                          {item.title}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 9. Brand Voice Snapshot ───────────────────────────────────────────────────
function BrandVoiceCard({
  brandProfile,
  onNavigate,
}: {
  brandProfile: BrandProfile | null | undefined;
  onNavigate: (tab: string) => void;
}) {
  const hasData =
    brandProfile &&
    (brandProfile.tagline ||
      brandProfile.targetAudienceDescription ||
      brandProfile.uniqueValueProposition ||
      brandProfile.brandVoiceSummary);

  return (
    <Card data-testid="card-brand-voice">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" /> Brand Voice
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigate("marketing")} data-testid="button-brand-edit">
            Edit <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState icon={Sparkles} text='No brand profile yet. Complete the brand profile in Marketing Hub.' />
        ) : (
          <div className="space-y-3">
            {brandProfile.tagline && (
              <div>
                <SectionLabel>Tagline</SectionLabel>
                <p className="text-sm italic text-muted-foreground">"{brandProfile.tagline}"</p>
              </div>
            )}
            {brandProfile.targetAudienceDescription && (
              <div>
                <SectionLabel>Target Audience</SectionLabel>
                <p className="text-sm line-clamp-2">{brandProfile.targetAudienceDescription}</p>
              </div>
            )}
            {brandProfile.uniqueValueProposition && (
              <div>
                <SectionLabel>UVP</SectionLabel>
                <p className="text-sm line-clamp-2">{brandProfile.uniqueValueProposition}</p>
              </div>
            )}
            {brandProfile.doNotUsePhrases && (
              <div>
                <SectionLabel>Avoid</SectionLabel>
                <p className="text-xs text-muted-foreground line-clamp-1">{brandProfile.doNotUsePhrases}</p>
              </div>
            )}
            {brandProfile.brandGuidelinesUrl && (
              <a
                href={brandProfile.brandGuidelinesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                data-testid="link-brand-guidelines"
              >
                <BookOpen className="h-3 w-3" /> Brand Guidelines
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 10. Recent Activity ───────────────────────────────────────────────────────
function RecentActivityCard({
  tasks,
  threads,
  contentItems,
  onNavigate,
}: {
  tasks: Task[];
  threads: ChatThread[];
  contentItems: ContentCalendarItem[];
  onNavigate: (tab: string) => void;
}) {
  type ActivityItem = {
    id: string;
    label: string;
    sub: string;
    ts: string;
    icon: React.ReactNode;
    tab: string;
  };

  const items: ActivityItem[] = [
    ...tasks
      .filter((t) => t.status === "completed" && t.completedAt)
      .slice(0, 3)
      .map((t) => ({
        id: `task-${t.id}`,
        label: t.title,
        sub: "Task completed",
        ts: t.completedAt!,
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
        tab: "tasks",
      })),
    ...threads
      .slice(0, 2)
      .map((th) => ({
        id: `thread-${th.id}`,
        label: th.name || "Direct Message",
        sub: "Chat thread",
        ts: th.createdAt,
        icon: <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
        tab: "chat",
      })),
    ...contentItems
      .filter((c) => c.status === "published" || c.status === "scheduled")
      .slice(0, 2)
      .map((c) => ({
        id: `content-${c.id}`,
        label: c.title,
        sub: `${c.status === "published" ? "Published" : "Scheduled"} · ${platformLabel(c.platform)}`,
        ts: c.scheduledDate || c.createdAt,
        icon: <BarChart2 className="h-3.5 w-3.5 text-purple-500" />,
        tab: "content-calendar",
      })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 6);

  return (
    <Card data-testid="card-recent-activity">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={Clock} text="No recent activity yet." />
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onNavigate(item.tab)}
                data-testid={`item-activity-${item.id}`}
              >
                <div className="mt-0.5 shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {new Date(item.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface CompanyCommandCenterProps {
  companyId: string;
  company: Company;
  tasks: Task[];
  campaigns: CampaignRequest[];
  meetings: MeetingRequest[];
  transactions: CreditTransaction[];
  onboardingData: ClientOnboarding | null | undefined;
  threads: ChatThread[];
  companyUsers: any[];
  agencyAdmins: any[];
  onNavigate: (tab: string) => void;
}

export function CompanyCommandCenter({
  companyId,
  company,
  tasks,
  campaigns,
  meetings,
  transactions,
  onboardingData,
  threads,
  companyUsers,
  agencyAdmins,
  onNavigate,
}: CompanyCommandCenterProps) {
  const { data: brandProfile } = useQuery<BrandProfile | null>({
    queryKey: ["/api/companies", companyId, "brand-profile"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/brand-profile`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
  });

  const { data: contentItems = [] } = useQuery<ContentCalendarItem[]>({
    queryKey: ["/api/content-calendar", { companyId }],
    queryFn: async () => {
      const r = await fetch(`/api/content-calendar?companyId=${companyId}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: knowledgeItems = [] } = useQuery<CompanyKnowledgeItem[]>({
    queryKey: ["/api/companies", companyId, "knowledge"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/knowledge`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  return (
    <div className="space-y-5">
      {/* Row 1: Client Snapshot + Integration Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ClientSnapshotCard
            company={company}
            tasks={tasks}
            onboardingData={onboardingData}
            companyUsers={companyUsers}
            agencyAdmins={agencyAdmins}
            onNavigate={onNavigate}
          />
        </div>
        <IntegrationHealthCard
          company={company}
          knowledgeItems={knowledgeItems}
          contentItems={contentItems}
        />
      </div>

      {/* Row 2: This Week/Next Week + 30/60-Day Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ThisWeekCard tasks={tasks} meetings={meetings} onNavigate={onNavigate} />
        <PlanCard tasks={tasks} campaigns={campaigns} contentItems={contentItems} onNavigate={onNavigate} />
      </div>

      {/* Row 3: Active Campaigns (full width) */}
      <ActiveCampaignsCard campaigns={campaigns} tasks={tasks} onNavigate={onNavigate} />

      {/* Row 4: Content Pipeline + Client Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ContentPipelineCard contentItems={contentItems} onNavigate={onNavigate} />
        <ClientApprovalsCard tasks={tasks} contentItems={contentItems} campaigns={campaigns} onNavigate={onNavigate} />
      </div>

      {/* Row 5: Resources + Brand Voice + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ResourcesCard companyId={companyId} knowledgeItems={knowledgeItems} onNavigate={onNavigate} />
        <BrandVoiceCard brandProfile={brandProfile} onNavigate={onNavigate} />
        <RecentActivityCard tasks={tasks} threads={threads} contentItems={contentItems} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
