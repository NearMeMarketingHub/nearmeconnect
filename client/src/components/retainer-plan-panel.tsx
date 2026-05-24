import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Layers,
  Lock,
  Megaphone,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

// ─── API Response Types ────────────────────────────────────────────────────────

interface RetainerServiceTrack {
  serviceTrackId: string;
  isActive: boolean;
  notes: string | null;
  track: { id: string; name: string; description: string | null } | null;
}

interface RetainerAssignmentData {
  id: string;
  companyId: string;
  retainerTemplateId: string;
  status: string;
  startDate: string;
  billingDayOfMonth: number;
  monthlyCreditAllocationOverride: number | null;
  monthlyPriceOverride: string | null;
  generationWindowDaysOverride: number | null;
  notes: string | null;
  template: {
    id: string;
    name: string;
    description: string | null;
    suggestedMonthlyPrice: string | null;
    monthlyCreditAllocation: number | null;
    recommendedClientType: string | null;
    includedScopeSummary: string | null;
    excludedScopeSummary: string | null;
    overageRules: string | null;
    reportingCadence: string | null;
    meetingCadence: string | null;
    generationWindowDays: number;
  } | null;
  serviceTracks: RetainerServiceTrack[];
}

interface UpcomingRetainerTask {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  approvalStatus: string | null;
  serviceTrackId: string | null;
  serviceTrackName: string | null;
  assignedTo: string | null;
  creditCost: string;
  campaignRequestId: string | null;
}

export interface RetainerOverviewData {
  assignment: RetainerAssignmentData | null;
  credits: {
    monthlyAllowance: number;
    usedCredits: number;
    reservedCredits: number;
    remainingCredits: number;
    hasOverage: boolean;
  };
  taskCounts: { next30: number; next60: number; next90: number };
  campaigns: { active: number };
  contentItems: { scheduled: number };
  upcomingRetainerTasks: UpcomingRetainerTask[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "paused": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
    case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

function taskStatusBadge(status: string) {
  switch (status) {
    case "in_progress": return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">In Progress</span>;
    case "in_review": return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium">In Review</span>;
    case "completed": return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium">Done</span>;
    default: return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">Pending</span>;
  }
}

function approvalBadge(approval: string | null) {
  if (!approval || approval === "approved") return null;
  if (approval === "pending_approval") return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">Needs Approval</span>;
  return null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function scopeLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text.split(/\n+/).map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

// ─── Retainer Overview Card ────────────────────────────────────────────────────

export function RetainerOverviewCard({
  companyId,
  onNavigate,
}: {
  companyId: string;
  onNavigate?: (tab: string) => void;
}) {
  const { data, isLoading } = useQuery<RetainerOverviewData>({
    queryKey: [`/api/companies/${companyId}/retainer-overview`],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.assignment) {
    return (
      <Card data-testid="card-retainer-overview">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" /> Retainer Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Layers className="h-8 w-8 opacity-30" />
            <p className="text-sm text-center">No retainer plan configured yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { assignment, credits, taskCounts, campaigns, contentItems } = data;
  const tpl = assignment.template;
  const activeTracks = assignment.serviceTracks.filter(st => st.isActive !== false && st.track);
  const allowance = assignment.monthlyCreditAllocationOverride ?? tpl?.monthlyCreditAllocation ?? credits.monthlyAllowance;
  const usedPct = allowance > 0 ? Math.min(100, (credits.usedCredits / allowance) * 100) : 0;
  const reservedPct = allowance > 0 ? Math.min(100 - usedPct, (credits.reservedCredits / allowance) * 100) : 0;

  return (
    <Card data-testid="card-retainer-overview">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" /> Retainer Plan
          </CardTitle>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor(assignment.status)}`}>
            {assignment.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Package name + meta */}
        <div>
          <p className="text-base font-semibold leading-tight">{tpl?.name ?? "Retainer Plan"}</p>
          {tpl?.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Started {formatDate(assignment.startDate)}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Billing: {ordinal(assignment.billingDayOfMonth)} of month
            </span>
            {tpl?.reportingCadence && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Reports: {tpl.reportingCadence}
              </span>
            )}
            {tpl?.meetingCadence && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Meetings: {tpl.meetingCadence}
              </span>
            )}
          </div>
        </div>

        {/* Service tracks */}
        {activeTracks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Service Tracks</p>
            <div className="flex flex-wrap gap-1.5">
              {activeTracks.map(st => (
                <span
                  key={st.serviceTrackId}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium"
                  data-testid={`badge-track-${st.serviceTrackId}`}
                >
                  {st.track!.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Credit health */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Credit Health</p>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono font-semibold">{allowance} cr / month</span>
            {credits.hasOverage ? (
              <span className="text-destructive font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Overage projected
              </span>
            ) : (
              <span className="text-muted-foreground font-mono">{credits.remainingCredits.toFixed(1)} free</span>
            )}
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-orange-500 transition-all rounded-l-full" style={{ width: `${usedPct}%` }} />
            <div className="h-full bg-orange-300 transition-all" style={{ width: `${reservedPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-orange-500" />
              {credits.usedCredits.toFixed(1)} used
            </span>
            {credits.reservedCredits > 0 && (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {credits.reservedCredits.toFixed(1)} reserved
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-muted border border-border" />
              {credits.remainingCredits.toFixed(1)} remaining
            </span>
          </div>
        </div>

        {/* Pipeline + stats row */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pipeline</p>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="rounded-lg bg-muted/50 px-2 py-2">
              <p className="text-lg font-bold font-mono">{taskCounts.next30}</p>
              <p className="text-[10px] text-muted-foreground">Next 30 days</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-2 py-2">
              <p className="text-lg font-bold font-mono">{taskCounts.next60}</p>
              <p className="text-[10px] text-muted-foreground">Next 60 days</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-2 py-2">
              <p className="text-lg font-bold font-mono">{taskCounts.next90}</p>
              <p className="text-[10px] text-muted-foreground">Next 90 days</p>
            </div>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => onNavigate?.("campaigns")}
              data-testid="link-retainer-campaigns"
            >
              <Megaphone className="h-3 w-3" />
              {campaigns.active} campaign{campaigns.active !== 1 ? "s" : ""} active
            </button>
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => onNavigate?.("content-calendar")}
              data-testid="link-retainer-content"
            >
              <TrendingUp className="h-3 w-3" />
              {contentItems.scheduled} content scheduled
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Scope of Work Card ────────────────────────────────────────────────────────

export function ScopeOfWorkCard({
  companyId,
  onNavigate,
}: {
  companyId: string;
  onNavigate?: (tab: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading } = useQuery<RetainerOverviewData>({
    queryKey: [`/api/companies/${companyId}/retainer-overview`],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </CardContent>
      </Card>
    );
  }

  const tpl = data?.assignment?.template;

  if (!data?.assignment || !tpl) {
    return (
      <Card data-testid="card-scope-of-work">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Scope of Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-sm text-center">Scope details will appear once a retainer is configured.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const includedLines = scopeLines(tpl.includedScopeSummary);
  const excludedLines = scopeLines(tpl.excludedScopeSummary);
  const overageLines = scopeLines(tpl.overageRules);

  return (
    <Card data-testid="card-scope-of-work">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Scope of Work
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(e => !e)}
            data-testid="button-scope-toggle"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {includedLines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Included Monthly Work
              </p>
              <ul className="space-y-1">
                {includedLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {excludedLines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" /> Exclusions
              </p>
              <ul className="space-y-1">
                {excludedLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {overageLines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" /> Overage Rules
              </p>
              <ul className="space-y-1">
                {overageLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {includedLines.length === 0 && excludedLines.length === 0 && overageLines.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No scope details added to this retainer template yet.</p>
          )}

          {(tpl.reportingCadence || tpl.meetingCadence) && (
            <div className="pt-1 border-t flex gap-4 text-[11px] text-muted-foreground">
              {tpl.reportingCadence && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {tpl.reportingCadence} reports
                </span>
              )}
              {tpl.meetingCadence && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {tpl.meetingCadence} meetings
                </span>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Retainer Tasks Card ───────────────────────────────────────────────────────

export function RetainerTasksCard({
  companyId,
  onNavigate,
}: {
  companyId: string;
  onNavigate?: (tab: string) => void;
}) {
  const { data, isLoading } = useQuery<RetainerOverviewData>({
    queryKey: [`/api/companies/${companyId}/retainer-overview`],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-52" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const tasks = data?.upcomingRetainerTasks ?? [];

  if (!data?.assignment) return null;

  // Group by service track
  const groups: Record<string, UpcomingRetainerTask[]> = {};
  const UNTRACKED_KEY = "_untracked";
  for (const task of tasks) {
    const key = task.serviceTrackName ?? UNTRACKED_KEY;
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }

  const groupEntries = Object.entries(groups).sort(([a], [b]) => {
    if (a === UNTRACKED_KEY) return 1;
    if (b === UNTRACKED_KEY) return -1;
    return a.localeCompare(b);
  });

  return (
    <Card data-testid="card-retainer-tasks">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" /> Upcoming Retainer Tasks
            <span className="text-[10px] font-normal text-muted-foreground">(next 90 days)</span>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-6 px-2"
            onClick={() => onNavigate?.("tasks")}
            data-testid="button-retainer-tasks-view-all"
          >
            View All <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Target className="h-8 w-8 opacity-30" />
            <p className="text-sm text-center">No upcoming retainer tasks in the next 90 days.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupEntries.map(([trackName, groupTasks]) => (
              <div key={trackName} data-testid={`group-track-${trackName}`}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {trackName === UNTRACKED_KEY ? "General" : trackName}
                  </p>
                  <span className="text-[10px] text-muted-foreground">({groupTasks.length})</span>
                </div>
                <div className="space-y-1">
                  {groupTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                      onClick={() => onNavigate?.("tasks")}
                      data-testid={`item-retainer-task-${task.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {approvalBadge(task.approvalStatus)}
                        {taskStatusBadge(task.status)}
                        <span className="text-[10px] text-muted-foreground font-mono w-14 text-right">
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
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
