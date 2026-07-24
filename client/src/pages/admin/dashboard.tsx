import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  ListTodo,
  User,
  Wrench,
} from "lucide-react";
import type { Task } from "@shared/schema";

// ── Types ────────────────────────────────────────────────────────────────────

type CreditHealthRow = {
  companyId: string;
  companyName: string;
  subscriptionTier: string;
  totalMonthlyCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  status: "paused" | "over_budget" | "at_risk" | "healthy";
};

type CreditHealthResponse = {
  companies: CreditHealthRow[];
  totals: {
    totalAvailable: number;
    totalUsedThisMonth: number;
    totalMonthlyAllocation: number;
    activeClients: number;
  };
};

type MyWorkTask = Task & { companyName: string; categoryName: string | null };

type InternalTask = Task & {
  companyName: string | null;
  assigneeName: string | null;
  resource: { id: string; title: string; url: string | null; resourceType: string } | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const tierLabels: Record<string, string> = {
  essentials: "Essentials",
  growth: "Growth",
  accelerator: "Accelerator",
};

const healthStatusConfig: Record<CreditHealthRow["status"], { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
  at_risk: { label: "At Risk", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  over_budget: { label: "Over Budget", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground border-border" },
};

const taskStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  needs_approval: "Needs Approval",
  in_review: "In Review",
  revision_requested: "Revision",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketTasks(tasks: MyWorkTask[]) {
  const today = startOfDay(new Date());
  const in7 = new Date(today.getTime() + 7 * 86400000);
  const in14 = new Date(today.getTime() + 14 * 86400000);

  const overdue: MyWorkTask[] = [];
  const dueToday: MyWorkTask[] = [];
  const dueThisWeek: MyWorkTask[] = [];
  const nextWeek: MyWorkTask[] = [];
  const later: MyWorkTask[] = [];

  for (const t of tasks) {
    if (!t.dueDate) {
      later.push(t);
      continue;
    }
    const due = startOfDay(new Date(t.dueDate + "T00:00:00"));
    if (due < today) overdue.push(t);
    else if (due.getTime() === today.getTime()) dueToday.push(t);
    else if (due < in7) dueThisWeek.push(t);
    else if (due < in14) nextWeek.push(t);
    else later.push(t);
  }

  return { overdue, dueToday, dueThisWeek, nextWeek, later };
}

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: creditHealth, isLoading: healthLoading } = useQuery<CreditHealthResponse>({
    queryKey: ["/api/admin/credit-health"],
  });

  const { data: myWork = [], isLoading: myWorkLoading } = useQuery<MyWorkTask[]>({
    queryKey: ["/api/admin/my-work"],
  });

  const { data: internalTasks = [], isLoading: internalLoading } = useQuery<InternalTask[]>({
    queryKey: ["/api/admin/internal-tasks"],
  });

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setPanelOpen(true);
  };

  const buckets = bucketTasks(Array.isArray(myWork) ? myWork : []);

  const myWorkGroups: Array<{ key: string; label: string; icon: typeof Clock; tasks: MyWorkTask[]; accent?: string }> = [
    { key: "overdue", label: "Overdue", icon: AlertTriangle, tasks: buckets.overdue, accent: "text-red-600 dark:text-red-400" },
    { key: "due-today", label: "Due Today", icon: Clock, tasks: buckets.dueToday, accent: "text-amber-600 dark:text-amber-400" },
    { key: "due-this-week", label: "Due This Week", icon: Calendar, tasks: buckets.dueThisWeek },
    { key: "next-week", label: "Next Week", icon: Calendar, tasks: buckets.nextWeek },
    ...(buckets.later.length > 0
      ? [{ key: "later", label: "Later / No Due Date", icon: ListTodo, tasks: buckets.later } as const]
      : []),
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Agency command center</p>
        </div>

        {/* ── Row 1: Active Retainers & Credit Health ─────────────────────── */}
        <Card data-testid="card-credit-health">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Active Retainers &amp; Credit Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
                <Skeleton className="h-40 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3" data-testid="stat-total-available">
                    <div className="text-xs text-muted-foreground">Total Credits Available</div>
                    <div className="text-xl font-semibold font-mono">{creditHealth?.totals.totalAvailable ?? 0}</div>
                  </div>
                  <div className="rounded-lg border p-3" data-testid="stat-total-used">
                    <div className="text-xs text-muted-foreground">Used This Month</div>
                    <div className="text-xl font-semibold font-mono">{creditHealth?.totals.totalUsedThisMonth ?? 0}</div>
                  </div>
                  <div className="rounded-lg border p-3" data-testid="stat-monthly-allocation">
                    <div className="text-xs text-muted-foreground">Monthly Allocation</div>
                    <div className="text-xl font-semibold font-mono">{creditHealth?.totals.totalMonthlyAllocation ?? 0}</div>
                  </div>
                  <div className="rounded-lg border p-3" data-testid="stat-active-clients">
                    <div className="text-xs text-muted-foreground">Active Clients</div>
                    <div className="text-xl font-semibold font-mono">{creditHealth?.totals.activeClients ?? 0}</div>
                  </div>
                </div>

                {(creditHealth?.companies || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center" data-testid="empty-credit-health">
                    No client companies yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2 pr-3 font-medium">Client</th>
                          <th className="py-2 pr-3 font-medium">Retainer Tier</th>
                          <th className="py-2 pr-3 font-medium text-right">Monthly Credits</th>
                          <th className="py-2 pr-3 font-medium text-right">Used</th>
                          <th className="py-2 pr-3 font-medium text-right">Remaining</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(creditHealth?.companies || []).map((row) => (
                          <tr key={row.companyId} className="border-b last:border-0" data-testid={`row-credit-health-${row.companyId}`}>
                            <td className="py-2.5 pr-3">
                              <Link
                                href={`/admin/companies/${row.companyId}`}
                                className="font-medium hover:underline flex items-center gap-2"
                                data-testid={`link-company-${row.companyId}`}
                              >
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                {row.companyName}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-3 capitalize">{tierLabels[row.subscriptionTier] || row.subscriptionTier}</td>
                            <td className="py-2.5 pr-3 text-right font-mono">{row.totalMonthlyCredits}</td>
                            <td className="py-2.5 pr-3 text-right font-mono">{row.creditsUsed}</td>
                            <td className={cn(
                              "py-2.5 pr-3 text-right font-mono",
                              row.creditsRemaining <= 0 && "text-red-600 dark:text-red-400 font-semibold",
                            )}>
                              {row.creditsRemaining}
                            </td>
                            <td className="py-2.5">
                              <Badge variant="outline" className={cn("text-xs", healthStatusConfig[row.status].className)} data-testid={`status-${row.companyId}`}>
                                {healthStatusConfig[row.status].label}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Row 2: My Work ──────────────────────────────────────────────── */}
        <Card data-testid="card-my-work">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              My Work
              {!myWorkLoading && (
                <Badge variant="secondary" className="text-xs font-normal">{(myWork || []).length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myWorkLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (myWork || []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2" data-testid="empty-my-work">
                <CheckCircle2 className="w-8 h-8 text-green-500/60" />
                Nothing assigned to you right now. Nice and clear!
              </div>
            ) : (
              <div className="space-y-4">
                {myWorkGroups.filter((g) => g.tasks.length > 0).map((group) => (
                  <div key={group.key} data-testid={`group-${group.key}`}>
                    <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2", group.accent || "text-muted-foreground")}>
                      <group.icon className="w-3.5 h-3.5" />
                      {group.label}
                      <span className="font-normal normal-case">({group.tasks.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => openTask(t)}
                          className="w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left hover-elevate"
                          data-testid={`row-my-task-${t.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{t.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {t.companyName}
                              {t.categoryName ? ` · ${t.categoryName}` : ""}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
                            {taskStatusLabels[t.status] || t.status}
                          </Badge>
                          <span className={cn(
                            "text-xs shrink-0 font-mono",
                            group.key === "overdue" ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
                          )}>
                            {formatDue(t.dueDate)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Row 3: Agency Operations & SOPs ─────────────────────────────── */}
        <Card data-testid="card-agency-ops">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              Agency Operations &amp; SOPs
              {!internalLoading && (
                <Badge variant="secondary" className="text-xs font-normal">{(internalTasks || []).length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {internalLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (internalTasks || []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2" data-testid="empty-internal-tasks">
                <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                No internal tasks or SOPs. Mark a task as internal to see it here.
              </div>
            ) : (
              <div className="space-y-1.5">
                {(internalTasks || []).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    data-testid={`row-internal-task-${t.id}`}
                  >
                    <button onClick={() => openTask(t)} className="min-w-0 flex-1 text-left" data-testid={`button-open-internal-${t.id}`}>
                      <div className="font-medium text-sm truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.assigneeName ? `Assigned to ${t.assigneeName}` : "Unassigned"}
                        {t.companyName ? ` · ${t.companyName}` : ""}
                        {t.dueDate ? ` · Due ${formatDue(t.dueDate)}` : ""}
                      </div>
                    </button>
                    {t.resource && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => {
                          if (t.resource?.url) {
                            window.open(t.resource.url, "_blank", "noopener,noreferrer");
                          } else {
                            window.location.href = "/admin/resource-library";
                          }
                        }}
                        data-testid={`button-resource-${t.id}`}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[140px]">{t.resource.title}</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        isAdmin={true}
        companyId={selectedTask?.companyId || ""}
      />
    </AdminLayout>
  );
}
