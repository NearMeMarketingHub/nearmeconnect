import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import {
  Building2,
  ListTodo,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Users,
  LayoutGrid,
  ImagePlay,
  Activity,
  CheckCircle2,
  CircleDot,
  Tag,
  ExternalLink,
  Wifi,
  WifiOff,
  TrendingUp,
} from "lucide-react";
import type { Company, Task } from "@shared/schema";

// ── Types ───────────────────────────────────────────────────────────────────

type WorkloadTask = {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  status: string;
  priority: string;
  dueDate: string | null;
  categoryId: string | null;
  creditCost: string | number;
};

type WorkloadPerson = {
  userId: string;
  name: string;
  email: string;
  stats: { total: number; pending: number; inProgress: number; overdue: number; dueToday: number; creditValue: number };
  tasks: WorkloadTask[];
};

type CategoryGroup = {
  categoryName: string;
  color: string | null;
  taskCount: number;
  assignees: string[];
  tasks: WorkloadTask[];
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueDateLabel(dueDate: string | null): { text: string; color: string } | null {
  if (!dueDate) return null;
  const date = parseLocalDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: "Overdue", color: "text-destructive" };
  if (diffDays === 0) return { text: "Today", color: "text-orange-500 dark:text-orange-400" };
  if (diffDays === 1) return { text: "Tomorrow", color: "text-yellow-600 dark:text-yellow-400" };
  return { text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-muted-foreground" };
}

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
  published: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const PLATFORM_LABELS: Record<string, string> = {
  google_business: "Google Business",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  email: "Email",
  blog: "Blog",
  other: "Other",
};

function initials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PersonCard({ person }: { person: WorkloadPerson }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid={`person-card-${person.userId}`} className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials(person.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{person.name}</p>
            <p className="text-xs text-muted-foreground truncate">{person.email}</p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs shrink-0">{person.stats?.total ?? 0} tasks</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-lg font-bold font-mono text-muted-foreground">{person.stats.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-2">
            <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{person.stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">In Progress</p>
          </div>
          <div className={`rounded-md p-2 ${person.stats.overdue > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50"}`}>
            <p className={`text-lg font-bold font-mono ${person.stats.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}>{person.stats.overdue}</p>
            <p className="text-[10px] text-muted-foreground">Overdue</p>
          </div>
        </div>
        {person.stats.dueToday > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-sm text-orange-600 dark:text-orange-400">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{person.stats.dueToday} due today</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{person.stats.creditValue} credits in queue</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href={`/admin/tasks?assignedTo=${person.userId}`} data-testid={`link-view-tasks-${person.userId}`}>
                View All
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(!expanded)} data-testid={`btn-expand-${person.userId}`}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Expanded task list */}
        {expanded && (
          <div className="border-t pt-3 space-y-1.5 mt-1">
            {person.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No active tasks</p>
            ) : (
              person.tasks.map(task => {
                const due = dueDateLabel(task.dueDate);
                return (
                  <div key={task.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-xs" data-testid={`task-item-${task.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{task.companyName}</Badge>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[task.status] || "bg-gray-100 text-gray-700"}`}>
                          {task.status.replace("_", " ")}
                        </span>
                        {due && <span className={`text-[10px] ${due.color}`}>{due.text}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategorySection({ group }: { group: CategoryGroup }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card data-testid={`category-group-${group.categoryName}`}>
      <CardHeader
        className="pb-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {group.color && (
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: group.color }} />
            )}
            <span className="font-semibold truncate">{group.categoryName}</span>
            <Badge variant="secondary" className="font-mono text-xs shrink-0">{group.taskCount}</Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {group.assignees.length > 0 && (
              <span className="text-xs text-muted-foreground">{group.assignees.slice(0, 2).join(", ")}{group.assignees.length > 2 ? ` +${group.assignees.length - 2}` : ""}</span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-medium text-muted-foreground">Company</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Task</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden sm:table-cell">Due</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden lg:table-cell">Priority</th>
                </tr>
              </thead>
              <tbody>
                {group.tasks.map((task, i) => {
                  const due = dueDateLabel(task.dueDate);
                  return (
                    <tr key={task.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] h-4 px-1 whitespace-nowrap">{task.companyName}</Badge>
                      </td>
                      <td className="p-2 font-medium max-w-[200px] truncate">{task.title}</td>
                      <td className="p-2 hidden sm:table-cell">
                        {due ? <span className={due.color}>{due.text}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[task.status] || "bg-gray-100 text-gray-700"}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-2 hidden lg:table-cell">
                        <span className={`text-[10px] capitalize ${task.priority === "urgent" ? "text-destructive font-semibold" : task.priority === "high" ? "text-orange-600" : "text-muted-foreground"}`}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
              <Link href={`/admin/tasks?category=${encodeURIComponent(group.categoryName)}`} data-testid={`link-category-tasks-${group.categoryName}`}>
                Open in Tasks
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("workload");
  const [healthSort, setHealthSort] = useState<"name" | "overdue" | "tasks">("overdue");

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: workload = [], isLoading: workloadLoading } = useQuery<WorkloadPerson[]>({
    queryKey: ["/api/admin/workload"],
  });

  const { data: categoryGroups = [], isLoading: categoryLoading } = useQuery<CategoryGroup[]>({
    queryKey: ["/api/admin/tasks-by-category"],
  });

  const { data: companyHealth = [], isLoading: healthLoading } = useQuery<CompanyHealth[]>({
    queryKey: ["/api/admin/company-health"],
  });

  const { data: contentStatus, isLoading: contentLoading } = useQuery<ContentProductionStatus>({
    queryKey: ["/api/admin/content-production-status"],
  });

  // ── Computed alert stats ────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTasks = tasks?.filter(t => !["completed", "rejected", "cancelled"].includes(t.status)) || [];

  const overdueCount = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseLocalDate(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }).length;

  const dueTodayCount = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseLocalDate(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;

  const awaitingClientCount = activeTasks.filter(t => t.status === "review").length;

  const pendingApprovalCount = activeTasks.filter(t => t.status === "approved").length;

  const noPillarCount = activeTasks.filter(t => !(t as any).categoryId).length;

  // My tasks (current user)
  const myTasks = tasks?.filter(t =>
    t.assignedTo === user?.id && !["completed", "rejected", "cancelled"].includes(t.status)
  ) || [];

  const myTasksToday = myTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseLocalDate(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  // Sorted company health
  const sortedHealth = [...companyHealth].sort((a, b) => {
    if (healthSort === "overdue") return b.overdue - a.overdue;
    if (healthSort === "tasks") return b.tasksThisMonth - a.tasksThisMonth;
    return a.name.localeCompare(b.name);
  });

  const pendingTasks = tasks?.filter(t => t.status === "pending") || [];
  const inProgressTasks = tasks?.filter(t => t.status === "in_progress") || [];
  const urgentTasks = tasks?.filter(t => t.priority === "urgent" && t.status !== "completed") || [];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm">
            Full cross-client view — batched by person and by category.
          </p>
        </div>

        {/* ── Section 4: Alert Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link href="/admin/tasks?filter=overdue" data-testid="alert-overdue">
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${overdueCount > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-lg">🔴</span>
                <div>
                  <p className={`text-xl font-bold font-mono ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>{tasksLoading ? "…" : overdueCount}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Overdue Tasks</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/tasks?filter=today" data-testid="alert-due-today">
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${dueTodayCount > 0 ? "border-orange-400/40 bg-orange-50 dark:bg-orange-950/20" : ""}`}>
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-lg">🟡</span>
                <div>
                  <p className={`text-xl font-bold font-mono ${dueTodayCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>{tasksLoading ? "…" : dueTodayCount}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Due Today</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/tasks?status=review" data-testid="alert-awaiting-client">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-lg">🟠</span>
                <div>
                  <p className="text-xl font-bold font-mono text-muted-foreground">{tasksLoading ? "…" : awaitingClientCount}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Awaiting Client</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/tasks?status=approved" data-testid="alert-pending-approval">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-lg">🔵</span>
                <div>
                  <p className="text-xl font-bold font-mono text-muted-foreground">{tasksLoading ? "…" : pendingApprovalCount}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Pending Approval</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/tasks" data-testid="alert-no-pillar">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-lg">⚫</span>
                <div>
                  <p className="text-xl font-bold font-mono text-muted-foreground">{tasksLoading ? "…" : noPillarCount}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">No Category</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companiesLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold font-mono" data-testid="stat-companies">{companies?.length || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold font-mono" data-testid="stat-pending">{pendingTasks.length}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold font-mono" data-testid="stat-in-progress">{inProgressTasks.length}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold font-mono text-destructive" data-testid="stat-urgent">{urgentTasks.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Main Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="admin-dashboard-tabs">
          <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-list-dashboard">
            <TabsTrigger value="workload" className="gap-1.5" data-testid="tab-workload">
              <Users className="h-3.5 w-3.5" />
              Workload
            </TabsTrigger>
            <TabsTrigger value="by-category" className="gap-1.5" data-testid="tab-by-category">
              <LayoutGrid className="h-3.5 w-3.5" />
              By Category
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5" data-testid="tab-content">
              <ImagePlay className="h-3.5 w-3.5" />
              Content Pipeline
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5" data-testid="tab-health">
              <Activity className="h-3.5 w-3.5" />
              Company Health
            </TabsTrigger>
            <TabsTrigger value="my-tasks" className="gap-1.5" data-testid="tab-my-tasks">
              <CheckCircle2 className="h-3.5 w-3.5" />
              My Tasks
              {myTasks.length > 0 && (
                <Badge variant="secondary" className="h-4 text-[10px] px-1 font-mono ml-1">{myTasks.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Section 1: Workload By Person ── */}
          <TabsContent value="workload" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Workload by Team Member</h2>
                <p className="text-sm text-muted-foreground">Click a card to expand task details</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/tasks" data-testid="link-all-tasks-workload">All Tasks <ExternalLink className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            {workloadLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : workload.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No team members have assigned tasks.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workload.map(person => (
                  <PersonCard key={person.userId} person={person} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Section 2: By Category ── */}
          <TabsContent value="by-category" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Work Batched by Category</h2>
                <p className="text-sm text-muted-foreground">Same-type tasks across all clients — click to expand</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/tasks" data-testid="link-all-tasks-category">All Tasks <ExternalLink className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            {categoryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : categoryGroups.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No categorized tasks found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {categoryGroups.map(group => (
                  <CategorySection key={group.categoryName} group={group} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Section 3: Content Pipeline ── */}
          <TabsContent value="content" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Content Production Status</h2>
                <p className="text-sm text-muted-foreground">Cross-client content pipeline — current month</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/content-calendar" data-testid="link-content-calendar">Content Calendar <ExternalLink className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
            {contentLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
                <Skeleton className="h-48 w-full" />
              </div>
            ) : !contentStatus ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <ImagePlay className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No content data available.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Status summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="content-status-summary">
                  {contentStatus.statuses.map(status => (
                    <Card key={status}>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold font-mono">{contentStatus.byStatus[status] || 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 capitalize">{status.replace("_", " ")}</p>
                        <div className={`h-1 rounded-full mt-2 ${STATUS_COLORS[status]?.split(" ")[0] || "bg-gray-200"}`} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Platform × Status matrix */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-3 font-medium text-muted-foreground w-36">Platform</th>
                            {contentStatus.statuses.map(s => (
                              <th key={s} className="text-center py-2 px-2 font-medium text-muted-foreground capitalize">{s.replace("_", " ")}</th>
                            ))}
                            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contentStatus.platforms.map(platform => {
                            const row = contentStatus.matrix[platform] || {};
                            const rowTotal = contentStatus.statuses.reduce((sum, s) => sum + (row[s] || 0), 0);
                            if (rowTotal === 0) return null;
                            return (
                              <tr key={platform} className="border-b last:border-0 hover:bg-muted/20 transition-colors" data-testid={`platform-row-${platform}`}>
                                <td className="py-2 pr-3 font-medium">{PLATFORM_LABELS[platform] || platform}</td>
                                {contentStatus.statuses.map(s => (
                                  <td key={s} className="py-2 px-2 text-center">
                                    {row[s] > 0 ? (
                                      <span className={`inline-block min-w-[22px] px-1.5 py-0.5 rounded font-mono font-bold text-center ${STATUS_COLORS[s] || "bg-gray-100"}`}>
                                        {row[s]}
                                      </span>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </td>
                                ))}
                                <td className="py-2 px-2 text-center font-mono font-semibold">{rowTotal}</td>
                              </tr>
                            );
                          })}
                          {/* Total row */}
                          <tr className="bg-muted/30 font-semibold">
                            <td className="py-2 pr-3 text-xs font-semibold">Total</td>
                            {contentStatus.statuses.map(s => (
                              <td key={s} className="py-2 px-2 text-center font-mono">{contentStatus.byStatus[s] || 0}</td>
                            ))}
                            <td className="py-2 px-2 text-center font-mono">{contentStatus?.total ?? 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Section 5: Company Health ── */}
          <TabsContent value="health" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Company Health Overview</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Green = on track</span>
                  <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Yellow = onboarding incomplete</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Red = overdue or not onboarded</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort:</span>
                {(["overdue", "tasks", "name"] as const).map(s => (
                  <Button key={s} variant={healthSort === s ? "default" : "outline"} size="sm" className="h-7 text-xs capitalize" onClick={() => setHealthSort(s)} data-testid={`sort-health-${s}`}>
                    {s === "overdue" ? "Overdue" : s === "tasks" ? "Tasks" : "Name"}
                  </Button>
                ))}
              </div>
            </div>
            {healthLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : sortedHealth.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No companies found.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                        <th className="text-center p-3 font-medium text-muted-foreground hidden sm:table-cell">Tasks This Month</th>
                        <th className="text-center p-3 font-medium text-muted-foreground hidden sm:table-cell">Completed</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Overdue</th>
                        <th className="text-center p-3 font-medium text-muted-foreground hidden md:table-cell">HubSpot</th>
                        <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">Onboarding</th>
                        <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHealth.map(company => {
                        const isRed = company.overdue > 0 || !company.onboardingComplete;
                        const isYellow = company.onboardingComplete === false;
                        const rowBg = company.overdue > 0
                          ? "bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30"
                          : !company.onboardingComplete
                          ? "bg-yellow-50/60 dark:bg-yellow-950/20 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                          : "hover:bg-muted/20";
                        return (
                          <tr key={company.id} className={`border-b last:border-0 transition-colors cursor-pointer ${rowBg}`} onClick={() => window.location.href = `/admin/companies/${company.id}`} data-testid={`health-row-${company.id}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${company.overdue > 0 ? "bg-red-500" : !company.onboardingComplete ? "bg-yellow-400" : "bg-green-500"}`} />
                                <div>
                                  <p className="font-medium">{company.name}</p>
                                  <p className="text-[11px] text-muted-foreground capitalize">{company.subscriptionTier}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono hidden sm:table-cell">{company.tasksThisMonth}</td>
                            <td className="p-3 text-center font-mono text-green-600 dark:text-green-400 hidden sm:table-cell">{company.completed}</td>
                            <td className="p-3 text-center font-mono">
                              {company.overdue > 0 ? (
                                <span className="text-destructive font-semibold">{company.overdue}</span>
                              ) : <span className="text-muted-foreground">0</span>}
                            </td>
                            <td className="p-3 text-center hidden md:table-cell">
                              {company.hubspotConnected
                                ? <Wifi className="h-4 w-4 text-green-500 mx-auto" />
                                : <WifiOff className="h-4 w-4 text-muted-foreground mx-auto" />}
                            </td>
                            <td className="p-3 text-center hidden lg:table-cell">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${company.onboardingComplete ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
                                {company.onboardingComplete ? "Complete" : "Incomplete"}
                              </span>
                            </td>
                            <td className="p-3 text-right text-xs text-muted-foreground hidden lg:table-cell">{formatRelativeDate(company.lastActivity)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Section 6: My Tasks ── */}
          <TabsContent value="my-tasks" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">My Tasks</h2>
                <p className="text-sm text-muted-foreground">Tasks assigned to you across all clients</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/tasks?assignedTo=${user?.id}`} data-testid="link-my-tasks-all">
                  View All <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            {tasksLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (
              <div className="space-y-4">
                {/* Tasks for Today */}
                {myTasksToday.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Tasks for Today ({myTasksToday.length})
                    </h3>
                    <div className="space-y-2">
                      {myTasksToday.map(task => {
                        const company = companies?.find(c => c.id === task.companyId);
                        return (
                          <Card key={task.id} className="border-orange-200 dark:border-orange-800" data-testid={`my-task-today-${task.id}`}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <CircleDot className="h-4 w-4 text-orange-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{task.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                  <span>{company?.name || "Unknown"}</span>
                                  <span className={`px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[task.status] || ""}`}>
                                    {task.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                              <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"} className="text-xs shrink-0">
                                {task.priority}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All my tasks, grouped by company */}
                {myTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No tasks assigned to you.</p>
                    </CardContent>
                  </Card>
                ) : (
                  (() => {
                    const grouped = myTasks.reduce<Record<string, Task[]>>((acc, t) => {
                      const key = t.companyId;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(t);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(([companyId, cTasks]) => {
                      const company = companies?.find(c => c.id === companyId);
                      return (
                        <div key={companyId} data-testid={`my-tasks-group-${companyId}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{company?.name || "Unknown Company"}</span>
                            <Badge variant="secondary" className="text-xs">{cTasks.length}</Badge>
                          </div>
                          <div className="space-y-1.5 ml-6">
                            {cTasks.map(task => {
                              const due = dueDateLabel(task.dueDate);
                              return (
                                <div key={task.id} className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/30 transition-colors text-sm" data-testid={`my-task-${task.id}`}>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[task.status] || ""}`}>
                                        {task.status.replace("_", " ")}
                                      </span>
                                      {due && <span className={`text-[11px] ${due.color}`}>{due.text}</span>}
                                    </div>
                                  </div>
                                  <Badge variant={task.priority === "urgent" ? "destructive" : "outline"} className="text-xs shrink-0">{task.priority}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
