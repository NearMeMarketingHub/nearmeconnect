import { useQuery } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Building2, ListTodo, Clock, AlertTriangle, Calendar } from "lucide-react";
import type { Company, Task } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const pendingTasks = tasks?.filter((t) => t.status === "pending") || [];
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress") || [];
  const urgentTasks = tasks?.filter((t) => t.priority === "urgent" && t.status !== "completed") || [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your agency's client portal.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
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
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
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
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
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
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono text-destructive" data-testid="stat-urgent">{urgentTasks.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Companies Overview</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/companies" data-testid="link-view-all-companies">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : companies && companies.length > 0 ? (
                <div className="space-y-3">
                  {[...companies]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 6)
                    .map((company) => (
                    <Link key={company.id} href={`/admin/companies/${company.id}`} data-testid={`company-row-${company.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {company.subscriptionTier} tier
                          </p>
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {company.credits} credits
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No companies yet. Create your first company to get started.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Tasks Requiring Attention</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/tasks" data-testid="link-view-all-tasks">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : pendingTasks.length > 0 || urgentTasks.length > 0 ? (
                <div className="space-y-3">
                  {[...urgentTasks, ...pendingTasks.filter(t => t.priority !== "urgent")]
                    .sort((a, b) => {
                      if (!a.dueDate && !b.dueDate) return 0;
                      if (!a.dueDate) return 1;
                      if (!b.dueDate) return -1;
                      return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
                    })
                    .slice(0, 6)
                    .map((task) => {
                      const company = companies?.find(c => c.id === task.companyId);
                      const formatDueDate = (dueDate: string | null) => {
                        if (!dueDate) return null;
                        const date = parseLocalDate(dueDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const taskDate = new Date(date);
                        taskDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) return { text: `Overdue`, color: "text-destructive" };
                        if (diffDays === 0) return { text: "Today", color: "text-orange-600 dark:text-orange-400" };
                        if (diffDays === 1) return { text: "Tomorrow", color: "text-yellow-600 dark:text-yellow-400" };
                        return { text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-muted-foreground" };
                      };
                      const dueDateInfo = formatDueDate(task.dueDate);
                      return (
                        <Link key={task.id} href={`/admin/companies/${task.companyId}`} data-testid={`task-row-${task.id}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{task.title}</p>
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="text-muted-foreground">{company?.name || "Unknown company"}</span>
                                {dueDateInfo && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className={dueDateInfo.color}>
                                      <Calendar className="w-3 h-3 inline mr-1" />
                                      {dueDateInfo.text}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"} className="flex-shrink-0 ml-2">
                              {task.priority}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No tasks requiring attention.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
