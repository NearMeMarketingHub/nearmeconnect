import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Globe,
  ListTodo,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  Zap,
  BookOpen,
  ImagePlay,
  Activity,
  BarChart3,
  Filter,
} from "lucide-react";
import type { Company, Task } from "@shared/schema";

// ── Types ────────────────────────────────────────────────────────────────────

type WorkloadPerson = {
  userId: string;
  name: string;
  email: string;
  stats: { total: number; pending: number; inProgress: number; overdue: number; dueToday: number; dueThisWeek?: number; creditValue: number };
  tasks: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; priority: string; dueDate: string | null }>;
};

type CompanyHealth = {
  id: string;
  name: string;
  subscriptionTier: string;
  onboardingComplete: boolean;
  hubspotConnected: boolean;
  tasksThisMonth: number;
  completed: number;
  overdue: number;
  lastActivity: string | null;
  credits: number;
};

type ContentProductionStatus = {
  matrix: Record<string, Record<string, number>>;
  byStatus: Record<string, number>;
  total: number;
  platforms: string[];
  statuses: string[];
};

type AgencyOverview = {
  approvalQueue: {
    tasks: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; approvalStatus: string; dueDate: string | null; createdAt: string; priority: string }>;
    campaigns: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; dueDate: string; createdAt: string; isRush: boolean }>;
    content: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; platform: string; scheduledDate: string | null }>;
  };
  campaignHealth: {
    active: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; dueDate: string; isRush: boolean; launchDate: string | null; ownerName: string | null }>;
    atRisk: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; dueDate: string; isRush: boolean }>;
    launchingSoon: Array<{ id: string; title: string; companyId: string; companyName: string; status: string; launchDate: string | null; dueDate: string }>;
  };
  seoQueue: {
    byStatus: Record<string, number>;
    overdue: Array<{ id: string; name: string; companyId: string; companyName: string; status: string; dueDate: string }>;
    total: number;
  };
  readiness: Array<{ companyId: string; companyName: string; contentNext30: number; contentNext60: number; campaignsActive: number; status: "well_planned" | "under_planned" | "no_schedule" }>;
  recentActivity: Array<{ type: string; id: string; title: string; companyId: string; companyName: string; ts: string; meta?: string }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtRelative(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

const PLATFORM_LABELS: Record<string, string> = {
  google_business: "Google Business", facebook: "Facebook", instagram: "Instagram",
  linkedin: "LinkedIn", email: "Email", blog: "Blog", other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count, linkHref, linkLabel }: {
  icon: React.ReactNode; title: string; count?: number; linkHref?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-semibold text-sm">{title}</h2>
        {count !== undefined && count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">{count}</Badge>}
      </div>
      {linkHref && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" asChild>
          <Link href={linkHref}>{linkLabel || "View All"} <ArrowRight className="h-3 w-3" /></Link>
        </Button>
      )}
    </div>
  );
}

function MetricTile({ value, label, color, href, icon, loading }: {
  value: number; label: string; color: string; href: string; icon?: React.ReactNode; loading?: boolean;
}) {
  return (
    <Link href={href} data-testid={`metric-tile-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Card className={cn("cursor-pointer hover:shadow-md transition-all border hover:border-primary/40", color)}>
        <CardContent className="p-3 flex items-center gap-2.5">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="flex-1 min-w-0">
            {loading ? <Skeleton className="h-7 w-12 mb-1" /> : (
              <p className={cn("text-2xl font-bold font-mono leading-none mb-0.5", value > 0 ? "" : "text-muted-foreground")}>{value}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

function CompactTaskList({ items, loading, emptyLabel }: {
  items: Array<{ id: string; title: string; companyName: string; status: string; dueDate?: string | null; priority?: string; meta?: string }>;
  loading?: boolean;
  emptyLabel: string;
}) {
  if (loading) return <div className="space-y-1.5">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (items.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">{emptyLabel}</p>;
  return (
    <div className="space-y-1">
      {items.slice(0, 8).map(item => (
        <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors" data-testid={`compact-item-${item.id}`}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{item.companyName}</span>
              {item.meta && <span className="text-[10px] text-muted-foreground">· {PLATFORM_LABELS[item.meta] ?? item.meta}</span>}
              {item.dueDate && (() => {
                const d = new Date(item.dueDate + "T00:00:00");
                d.setHours(0,0,0,0);
                const isOver = d < todayStart();
                return <span className={cn("text-[10px]", isOver ? "text-destructive font-medium" : "text-muted-foreground")}>{isOver ? "Overdue" : fmtDate(item.dueDate)}</span>;
              })()}
            </div>
          </div>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0", STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground")}>
            {item.status.replace(/_/g, " ")}
          </span>
          {item.priority === "urgent" && <span className="text-[10px] text-destructive font-bold shrink-0">!</span>}
        </div>
      ))}
    </div>
  );
}

function PersonCard({ person }: { person: WorkloadPerson }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card data-testid={`person-card-${person.userId}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(person.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{person.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{person.email}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{person.stats.total}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
          <div className="rounded bg-muted/50 p-1.5">
            <p className="text-base font-bold font-mono text-muted-foreground">{person.stats.pending}</p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </div>
          <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-1.5">
            <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">{person.stats.inProgress}</p>
            <p className="text-[9px] text-muted-foreground">In Progress</p>
          </div>
          <div className={cn("rounded p-1.5", person.stats.overdue > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50")}>
            <p className={cn("text-base font-bold font-mono", person.stats.overdue > 0 ? "text-destructive" : "text-muted-foreground")}>{person.stats.overdue}</p>
            <p className="text-[9px] text-muted-foreground">Overdue</p>
          </div>
        </div>
        {person.stats.dueToday > 0 && (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mb-2">{person.stats.dueToday} due today</p>
        )}
        <div className="flex items-center gap-1.5 justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">{person.stats.creditValue} credits</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" asChild>
              <Link href={`/admin/tasks?assignedTo=${person.userId}`}>Tasks <ExternalLink className="ml-1 h-2.5 w-2.5" /></Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-2 pt-2 border-t space-y-1">
            {person.tasks.length === 0 ? <p className="text-[11px] text-muted-foreground text-center py-1">No active tasks</p> : (
              person.tasks.slice(0, 6).map(t => (
                <div key={t.id} className="text-[11px] px-1 py-1 rounded hover:bg-muted/40">
                  <p className="font-medium truncate">{t.title}</p>
                  <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                    <span>{t.companyName}</span>
                    <span className={cn("px-1 rounded", STATUS_COLORS[t.status] ?? "")}>{t.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [campaignTab, setCampaignTab] = useState<"active" | "atRisk" | "launchingSoon">("active");
  const [readinessFilter, setReadinessFilter] = useState<"all" | "no_schedule" | "under_planned" | "well_planned">("all");
  const [healthSort, setHealthSort] = useState<"overdue" | "tasks" | "name">("overdue");

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: companies } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: workload = [], isLoading: workloadLoading } = useQuery<WorkloadPerson[]>({ queryKey: ["/api/admin/workload"] });
  const { data: companyHealth = [], isLoading: healthLoading } = useQuery<CompanyHealth[]>({ queryKey: ["/api/admin/company-health"] });
  const { data: contentStatus } = useQuery<ContentProductionStatus>({ queryKey: ["/api/admin/content-production-status"] });
  const { data: overview, isLoading: overviewLoading } = useQuery<AgencyOverview>({ queryKey: ["/api/admin/agency-overview"] });

  // ── Computed priority counts ──────────────────────────────────────────────
  const today = todayStart();
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);

  const activeTasks = useMemo(() => tasks?.filter(t => !["completed", "rejected", "cancelled"].includes(t.status)) ?? [], [tasks]);

  const overdueCount = useMemo(() => activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseLocalDate(t.dueDate); d.setHours(0,0,0,0); return d < today;
  }).length, [activeTasks]);

  const dueTodayCount = useMemo(() => activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseLocalDate(t.dueDate); d.setHours(0,0,0,0); return d.getTime() === today.getTime();
  }).length, [activeTasks]);

  const dueThisWeekCount = useMemo(() => activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseLocalDate(t.dueDate); d.setHours(0,0,0,0);
    return d > today && d <= in7;
  }).length, [activeTasks]);

  const urgentCount = useMemo(() => activeTasks.filter(t => t.priority === "urgent").length, [activeTasks]);

  const staleCount = useMemo(() => {
    const ago7 = new Date(today); ago7.setDate(today.getDate() - 7);
    return activeTasks.filter(t => ["pending", "in_progress"].includes(t.status) && new Date(t.createdAt) < ago7).length;
  }, [activeTasks]);

  const awaitingClientCount = useMemo(() => activeTasks.filter(t => t.status === "review").length, [activeTasks]);

  // ── My tasks ──────────────────────────────────────────────────────────────
  const myTaskCount = tasks?.filter(t => t.assignedTo === user?.id && !["completed", "rejected", "cancelled"].includes(t.status)).length ?? 0;

  // ── Readiness filtered ────────────────────────────────────────────────────
  const filteredReadiness = useMemo(() =>
    (overview?.readiness ?? []).filter(r => readinessFilter === "all" || r.status === readinessFilter)
      .sort((a, b) => {
        const order = { no_schedule: 0, under_planned: 1, well_planned: 2 };
        return order[a.status] - order[b.status];
      }),
    [overview?.readiness, readinessFilter]
  );

  // ── Sorted health ─────────────────────────────────────────────────────────
  const sortedHealth = useMemo(() => [...companyHealth].sort((a, b) => {
    if (healthSort === "overdue") return b.overdue - a.overdue;
    if (healthSort === "tasks") return b.tasksThisMonth - a.tasksThisMonth;
    return a.name.localeCompare(b.name);
  }), [companyHealth, healthSort]);

  // ── Saved views ───────────────────────────────────────────────────────────
  const savedViews: Array<{ label: string; href: string; count?: number; variant?: "default" | "destructive" | "outline" }> = [
    { label: "My Work", href: `/admin/tasks?assignedTo=${user?.id}`, count: myTaskCount },
    { label: "Due This Week", href: "/admin/tasks?filter=due_this_week", count: dueThisWeekCount },
    { label: "Awaiting Client", href: "/admin/tasks?filter=awaiting_client", count: awaitingClientCount },
    { label: "Stale Tasks", href: "/admin/tasks?filter=stale", count: staleCount },
    { label: "Campaigns at Risk", href: "/admin/campaigns?filter=at_risk", count: overview?.campaignHealth.atRisk.length },
    { label: "Content Needing Review", href: "/admin/content-calendar?filter=in_review", count: overview?.approvalQueue.content.length },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-screen-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Agency Command Center
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {user?.firstName ? ` · Welcome back, ${user.firstName}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => window.location.reload()} data-testid="btn-refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* ── Saved Views ── */}
        <div className="flex flex-wrap gap-2 -mt-2">
          {savedViews.map(v => (
            <Link key={v.label} href={v.href}>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-normal" data-testid={`saved-view-${v.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Filter className="h-3 w-3 text-muted-foreground" />
                {v.label}
                {v.count !== undefined && v.count > 0 && (
                  <Badge variant="secondary" className="h-4 text-[10px] px-1 ml-0.5 font-mono">{v.count}</Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 1: Today's Priorities                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={<Zap className="h-4 w-4" />} title="Today's Priorities" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricTile value={overdueCount} label="Overdue" href="/admin/tasks?filter=overdue" loading={tasksLoading}
              color={overdueCount > 0 ? "border-destructive/30 bg-destructive/5" : ""}
              icon={<AlertTriangle className={cn("h-4 w-4", overdueCount > 0 ? "text-destructive" : "text-muted-foreground")} />} />
            <MetricTile value={dueTodayCount} label="Due Today" href="/admin/tasks?filter=due_today" loading={tasksLoading}
              color={dueTodayCount > 0 ? "border-orange-300/40 bg-orange-50 dark:bg-orange-950/20" : ""}
              icon={<Clock className={cn("h-4 w-4", dueTodayCount > 0 ? "text-orange-500" : "text-muted-foreground")} />} />
            <MetricTile value={dueThisWeekCount} label="Due This Week" href="/admin/tasks?filter=due_this_week" loading={tasksLoading}
              color=""
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
            <MetricTile value={urgentCount} label="Urgent" href="/admin/tasks?filter=urgent" loading={tasksLoading}
              color={urgentCount > 0 ? "border-red-300/40" : ""}
              icon={<AlertTriangle className={cn("h-4 w-4", urgentCount > 0 ? "text-red-500" : "text-muted-foreground")} />} />
            <MetricTile value={staleCount} label="Stale (7d+)" href="/admin/tasks?filter=stale" loading={tasksLoading}
              color={staleCount > 0 ? "border-yellow-300/40 bg-yellow-50/40 dark:bg-yellow-950/10" : ""}
              icon={<ListTodo className={cn("h-4 w-4", staleCount > 0 ? "text-yellow-600" : "text-muted-foreground")} />} />
            <MetricTile value={awaitingClientCount} label="Awaiting Client" href="/admin/tasks?filter=awaiting_client" loading={tasksLoading}
              color={awaitingClientCount > 0 ? "border-blue-300/40 bg-blue-50/40 dark:bg-blue-950/10" : ""}
              icon={<Users className={cn("h-4 w-4", awaitingClientCount > 0 ? "text-blue-500" : "text-muted-foreground")} />} />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 2: Approval Queue                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={<CheckCircle2 className="h-4 w-4" />} title="Approval Queue"
            count={(overview?.approvalQueue.tasks.length ?? 0) + (overview?.approvalQueue.campaigns.length ?? 0) + (overview?.approvalQueue.content.length ?? 0)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Task Approvals */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5" /> Task Approvals
                  </CardTitle>
                  {overview && <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1.5">{overview.approvalQueue.tasks.length}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <CompactTaskList
                  loading={overviewLoading}
                  emptyLabel="No tasks pending approval"
                  items={(overview?.approvalQueue.tasks ?? []).map(t => ({
                    id: t.id, title: t.title, companyName: t.companyName, status: t.approvalStatus === "pending_internal_approval" ? "internal review" : "awaiting client",
                    dueDate: t.dueDate, priority: t.priority,
                  }))}
                />
                {(overview?.approvalQueue.tasks.length ?? 0) > 0 && (
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-2" asChild>
                    <Link href="/admin/tasks?filter=pending_approval">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Campaign Approvals */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" /> Campaign Approvals
                  </CardTitle>
                  {overview && <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1.5">{overview.approvalQueue.campaigns.length}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <CompactTaskList
                  loading={overviewLoading}
                  emptyLabel="No campaigns pending"
                  items={(overview?.approvalQueue.campaigns ?? []).map(c => ({
                    id: c.id, title: c.title + (c.isRush ? " 🔴" : ""), companyName: c.companyName, status: c.status, dueDate: c.dueDate,
                  }))}
                />
                {(overview?.approvalQueue.campaigns.length ?? 0) > 0 && (
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-2" asChild>
                    <Link href="/admin/campaigns?filter=pending">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Content Reviews */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <ImagePlay className="h-3.5 w-3.5" /> Content Reviews
                  </CardTitle>
                  {overview && <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1.5">{overview.approvalQueue.content.length}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <CompactTaskList
                  loading={overviewLoading}
                  emptyLabel="No content in review"
                  items={(overview?.approvalQueue.content ?? []).map(c => ({
                    id: c.id, title: c.title, companyName: c.companyName, status: c.status, meta: c.platform,
                  }))}
                />
                {(overview?.approvalQueue.content.length ?? 0) > 0 && (
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-2" asChild>
                    <Link href="/admin/content-calendar?filter=in_review">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 3: Campaign Health + SEO Queue                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Campaign Health */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" /> Campaign Health
                </CardTitle>
                <div className="flex gap-1">
                  {(["active", "atRisk", "launchingSoon"] as const).map(tab => (
                    <Button key={tab} variant={campaignTab === tab ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => setCampaignTab(tab)} data-testid={`campaign-tab-${tab}`}>
                      {tab === "active" ? `Active (${overview?.campaignHealth.active.length ?? 0})` :
                       tab === "atRisk" ? `At Risk (${overview?.campaignHealth.atRisk.length ?? 0})` :
                       `Launching (${overview?.campaignHealth.launchingSoon.length ?? 0})`}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {overviewLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <>
                  {campaignTab === "active" && (
                    <CompactTaskList
                      emptyLabel="No active campaigns"
                      items={(overview?.campaignHealth.active ?? []).map(c => ({
                        id: c.id, title: c.title + (c.isRush ? " 🔴" : ""), companyName: c.companyName,
                        status: c.status, dueDate: c.dueDate, meta: c.ownerName ?? undefined,
                      }))}
                    />
                  )}
                  {campaignTab === "atRisk" && (
                    overview?.campaignHealth.atRisk.length === 0 ? (
                      <div className="flex items-center gap-2 py-6 justify-center text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" /><span className="text-sm">No at-risk campaigns</span>
                      </div>
                    ) : (
                      <CompactTaskList
                        emptyLabel="No at-risk campaigns"
                        items={(overview?.campaignHealth.atRisk ?? []).map(c => ({
                          id: c.id, title: c.title, companyName: c.companyName, status: c.status, dueDate: c.dueDate,
                        }))}
                      />
                    )
                  )}
                  {campaignTab === "launchingSoon" && (
                    <CompactTaskList
                      emptyLabel="No campaigns launching in the next 14 days"
                      items={(overview?.campaignHealth.launchingSoon ?? []).map(c => ({
                        id: c.id, title: c.title, companyName: c.companyName, status: c.status, dueDate: c.launchDate,
                      }))}
                    />
                  )}
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-2" asChild>
                    <Link href="/admin/campaigns">All Campaigns <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* SEO / Directory Queue */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" /> SEO / Directory Queue
                </CardTitle>
                {overview && <Badge variant="secondary" className="text-[10px] font-mono">{overview.seoQueue.total} total</Badge>}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {overviewLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>
              ) : overview && overview.seoQueue.total === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No SEO directories tracked yet</p>
              ) : (
                <>
                  {/* Status chips grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {["submitted", "pending_verification", "live", "needs_update", "not_started", "in_progress"].map(s => {
                      const count = overview?.seoQueue.byStatus[s] ?? 0;
                      if (count === 0) return null;
                      const colorMap: Record<string, string> = {
                        live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        submitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                        pending_verification: "bg-orange-100 text-orange-700",
                        needs_update: "bg-amber-100 text-amber-700",
                        in_progress: "bg-blue-100 text-blue-700",
                        not_started: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                      };
                      return (
                        <div key={s} className={cn("rounded-lg px-2 py-1.5 text-center", colorMap[s] ?? "bg-muted")}>
                          <p className="text-base font-bold font-mono">{count}</p>
                          <p className="text-[9px] font-medium leading-tight">{s.replace(/_/g, " ")}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overdue items */}
                  {(overview?.seoQueue.overdue.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive mb-1.5">
                        Overdue ({overview?.seoQueue.overdue.length})
                      </p>
                      <div className="space-y-1">
                        {overview?.seoQueue.overdue.slice(0, 5).map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-xs px-1 py-0.5 hover:bg-muted/30 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                            <span className="flex-1 truncate font-medium">{item.name}</span>
                            <span className="text-muted-foreground shrink-0">{item.companyName}</span>
                            <span className="text-destructive font-medium shrink-0">{fmtDate(item.dueDate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs" asChild>
                    <Link href="/admin/seo">SEO Tracker <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 4: Content Pipeline                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={<ImagePlay className="h-4 w-4" />} title="Content Pipeline" linkHref="/admin/content-calendar" linkLabel="Calendar" />
          {!contentStatus ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {contentStatus.statuses.map(s => (
                  <Link key={s} href={`/admin/content-calendar?status=${s}`}>
                    <Card className="cursor-pointer hover:border-primary/30 transition-all">
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold font-mono">{contentStatus.byStatus[s] || 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{s.replace(/_/g, " ")}</p>
                        <div className={cn("h-1 rounded-full mt-1.5", STATUS_COLORS[s]?.split(" ")[0] || "bg-gray-200")} />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Platform</th>
                        {contentStatus.statuses.map(s => <th key={s} className="text-center px-2 py-2 font-medium text-muted-foreground capitalize">{s.replace(/_/g, " ")}</th>)}
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentStatus.platforms.map(p => {
                        const row = contentStatus.matrix[p] || {};
                        const total = contentStatus.statuses.reduce((sum, s) => sum + (row[s] || 0), 0);
                        if (total === 0) return null;
                        return (
                          <tr key={p} className="border-b last:border-0 hover:bg-muted/20 transition-colors" data-testid={`platform-row-${p}`}>
                            <td className="px-3 py-2 font-medium">{PLATFORM_LABELS[p] || p}</td>
                            {contentStatus.statuses.map(s => (
                              <td key={s} className="px-2 py-2 text-center">
                                {row[s] > 0 ? <span className={cn("inline-block min-w-[22px] px-1.5 py-0.5 rounded font-mono text-center font-bold", STATUS_COLORS[s] || "bg-gray-100")}>{row[s]}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                            ))}
                            <td className="px-2 py-2 text-center font-mono font-semibold">{total}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-3 py-2 text-xs font-semibold">Total</td>
                        {contentStatus.statuses.map(s => <td key={s} className="px-2 py-2 text-center font-mono">{contentStatus.byStatus[s] || 0}</td>)}
                        <td className="px-2 py-2 text-center font-mono">{contentStatus.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 5: 30/60-Day Readiness                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground"><Target className="h-4 w-4" /></span>
              <h2 className="font-semibold text-sm">30/60-Day Readiness</h2>
              {overview && (
                <div className="flex items-center gap-1 ml-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">{overview.readiness.filter(r => r.status === "well_planned").length} ready</span>
                  <span className="w-2 h-2 rounded-full bg-yellow-400 ml-2" />
                  <span className="text-[10px] text-muted-foreground">{overview.readiness.filter(r => r.status === "under_planned").length} under-planned</span>
                  <span className="w-2 h-2 rounded-full bg-red-500 ml-2" />
                  <span className="text-[10px] text-muted-foreground">{overview.readiness.filter(r => r.status === "no_schedule").length} no schedule</span>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {(["all", "no_schedule", "under_planned", "well_planned"] as const).map(f => (
                <Button key={f} variant={readinessFilter === f ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2"
                  onClick={() => setReadinessFilter(f)} data-testid={`readiness-filter-${f}`}>
                  {f === "all" ? "All" : f === "no_schedule" ? "No Schedule" : f === "under_planned" ? "Under-Planned" : "Well Planned"}
                </Button>
              ))}
            </div>
          </div>
          {overviewLoading ? (
            <div className="space-y-1.5">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Client</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">30-Day Content</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">60-Day Content</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Active Campaigns</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReadiness.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted-foreground text-xs py-8">No clients match this filter.</td></tr>
                    ) : filteredReadiness.map(r => (
                      <tr key={r.companyId} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer",
                        r.status === "no_schedule" ? "bg-red-50/40 dark:bg-red-950/10" :
                        r.status === "under_planned" ? "bg-yellow-50/30 dark:bg-yellow-950/10" : ""
                      )} onClick={() => setLocation(`/admin/companies/${r.companyId}?tab=marketing`)} data-testid={`readiness-row-${r.companyId}`}>
                        <td className="px-3 py-2.5 font-medium">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shrink-0",
                              r.status === "well_planned" ? "bg-green-500" :
                              r.status === "under_planned" ? "bg-yellow-400" : "bg-red-500"
                            )} />
                            {r.companyName}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <span className={cn("font-semibold", r.contentNext30 === 0 ? "text-destructive" : r.contentNext30 < 3 ? "text-yellow-600" : "text-green-600")}>{r.contentNext30}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <span className={cn("font-semibold", r.contentNext60 === 0 ? "text-destructive" : r.contentNext60 < 5 ? "text-yellow-600" : "text-muted-foreground")}>{r.contentNext60}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono hidden sm:table-cell">
                          <span className={r.campaignsActive > 0 ? "text-blue-600 font-semibold" : "text-muted-foreground"}>{r.campaignsActive}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                            r.status === "well_planned" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            r.status === "under_planned" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {r.status === "well_planned" ? "Well Planned" : r.status === "under_planned" ? "Under-Planned" : "No Schedule"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell">
                          {r.status !== "well_planned" && (
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={e => { e.stopPropagation(); setLocation(`/admin/companies/${r.companyId}?tab=marketing&sub=marketing`); }}>
                              Plan Content
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 6: Workload by Assignee                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={<Users className="h-4 w-4" />} title="Workload by Assignee" linkHref="/admin/tasks" linkLabel="All Tasks" />
          {workloadLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : workload.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No team members with assigned tasks.</p></CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workload.map(p => <PersonCard key={p.userId} person={p} />)}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 7: Client Health                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground"><Activity className="h-4 w-4" /></span>
              <h2 className="font-semibold text-sm">Client Health</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sort:</span>
              {(["overdue", "tasks", "name"] as const).map(s => (
                <Button key={s} variant={healthSort === s ? "default" : "outline"} size="sm" className="h-6 text-[10px] px-2 capitalize"
                  onClick={() => setHealthSort(s)} data-testid={`sort-health-${s}`}>
                  {s === "overdue" ? "Overdue" : s === "tasks" ? "Tasks" : "Name"}
                </Button>
              ))}
            </div>
          </div>
          {healthLoading ? (
            <div className="space-y-1.5">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-11" />)}</div>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Client</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Tasks / Month</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Done</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Overdue</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">HubSpot</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Onboarding</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Credits</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHealth.map(c => (
                      <tr key={c.id} className={cn("border-b last:border-0 transition-colors cursor-pointer hover:bg-muted/20",
                        c.overdue > 0 ? "bg-red-50/40 dark:bg-red-950/10" : !c.onboardingComplete ? "bg-yellow-50/30 dark:bg-yellow-950/10" : ""
                      )} onClick={() => setLocation(`/admin/companies/${c.id}`)} data-testid={`health-row-${c.id}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", c.overdue > 0 ? "bg-red-500" : !c.onboardingComplete ? "bg-yellow-400" : "bg-green-500")} />
                            <div>
                              <p className="font-medium">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{c.subscriptionTier}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono hidden sm:table-cell">{c.tasksThisMonth}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-green-600 dark:text-green-400 hidden sm:table-cell">{c.completed}</td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          {c.overdue > 0 ? <span className="text-destructive font-semibold">{c.overdue}</span> : <span className="text-muted-foreground">0</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell">
                          {c.hubspotConnected ? <Wifi className="h-4 w-4 text-green-500 mx-auto" /> : <WifiOff className="h-4 w-4 text-muted-foreground mx-auto" />}
                        </td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                            c.onboardingComplete ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                          )}>{c.onboardingComplete ? "Done" : "Incomplete"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-sm hidden lg:table-cell">{c.credits}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground hidden lg:table-cell">{fmtRelative(c.lastActivity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Section 8: Recent Activity                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="Recent Activity" />
          {overviewLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : !overview || overview.recentActivity.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm"><TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No recent activity.</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {overview.recentActivity.map(item => {
                  const iconMap: Record<string, React.ReactNode> = {
                    task_completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                    content_published: <ImagePlay className="h-4 w-4 text-blue-500" />,
                    campaign_approved: <Megaphone className="h-4 w-4 text-orange-500" />,
                    meeting_scheduled: <Calendar className="h-4 w-4 text-purple-500" />,
                  };
                  const labelMap: Record<string, string> = {
                    task_completed: "Task completed",
                    content_published: "Content published",
                    campaign_approved: "Campaign approved",
                    meeting_scheduled: "Meeting scheduled",
                  };
                  return (
                    <div key={item.id + item.type} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors" data-testid={`activity-${item.id}`}>
                      <div className="shrink-0">{iconMap[item.type] ?? <Sparkles className="h-4 w-4 text-muted-foreground" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span>{item.companyName}</span>
                          <span>·</span>
                          <span className="capitalize">{labelMap[item.type] ?? item.type.replace(/_/g, " ")}</span>
                          {item.meta && <span>· {PLATFORM_LABELS[item.meta] ?? item.meta}</span>}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{fmtRelative(item.ts)}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>

      </div>
    </AdminLayout>
  );
}
