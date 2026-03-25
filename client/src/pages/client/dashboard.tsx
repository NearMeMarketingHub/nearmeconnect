import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ListTodo, CheckCircle, Clock } from "lucide-react";
import type { Company, Task, MeetingRequest, CampaignRequest } from "@shared/schema";
import { getBillingPeriod, isDateInBillingPeriod } from "@shared/billing";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useRef, useState } from "react";
import { TaskDetailPanel } from "@/components/task-detail-panel";

interface ClientDashboardProps {
  companyId: string;
  embedded?: boolean;
}

export default function ClientDashboard({ companyId, embedded = false }: ClientDashboardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const creditResetChecked = useRef(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  // Check and reset credits if new month has started
  const creditResetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/check-credit-reset`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.wasReset) {
        queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      }
    },
  });

  useEffect(() => {
    if (companyId && !creditResetChecked.current) {
      creditResetChecked.current = true;
      creditResetMutation.mutate();
    }
  }, [companyId]);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { companyId }],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?companyId=${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: meetingRequests } = useQuery<MeetingRequest[]>({
    queryKey: ["/api/companies", companyId, "meeting-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/meeting-requests`);
      if (!res.ok) throw new Error("Failed to fetch meeting requests");
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: campaignRequests } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/companies", companyId, "campaign-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/campaign-requests`);
      if (!res.ok) throw new Error("Failed to fetch campaign requests");
      return res.json();
    },
    enabled: !!companyId,
  });

  const billingPeriod = company ? getBillingPeriod(company.billingStartDay) : null;
  
  const currentPeriodTasks = tasks?.filter((task) => {
    if (!billingPeriod) return true;
    if (task.billingPeriodStart && task.billingPeriodEnd) {
      return task.billingPeriodStart === billingPeriod.startStr;
    }
    if (task.dueDate) {
      return isDateInBillingPeriod(parseLocalDate(task.dueDate), billingPeriod);
    }
    return isDateInBillingPeriod(new Date(task.createdAt), billingPeriod);
  }) || [];

  const activeTasks = currentPeriodTasks.filter((t) => t.status === "in_progress").length;
  const pendingTasks = currentPeriodTasks.filter((t) => t.status === "pending").length;
  const completedTasks = currentPeriodTasks.filter((t) => t.status === "completed").length;
  const projectedTaskCredits = currentPeriodTasks.reduce((sum, task) => {
    if (task.status === "cancelled" || task.status === "rejected" || task.noCredit) return sum;
    if (task.status === "completed" && !task.creditsDeducted) return sum;
    if (task.status === "completed" && task.completedAt && billingPeriod) {
      if (!isDateInBillingPeriod(new Date(task.completedAt), billingPeriod)) return sum;
    }
    return sum + parseFloat(task.creditCost);
  }, 0);

  const projectedMeetingCredits = (meetingRequests || [])
    .filter(m => {
      if (m.status === "cancelled" || m.status === "rejected") return false;
      if (!billingPeriod) return true;
      const meetingDate = m.proposedDate ? parseLocalDate(m.proposedDate) : new Date(m.createdAt);
      return isDateInBillingPeriod(meetingDate, billingPeriod);
    })
    .reduce((sum, m) => sum + parseFloat(m.creditCost), 0);

  const projectedCampaignCredits = (campaignRequests || [])
    .filter(c => {
      if (c.status !== "pending") return false;
      if (!billingPeriod) return true;
      const campaignDate = new Date(c.createdAt);
      return isDateInBillingPeriod(campaignDate, billingPeriod);
    })
    .reduce((sum, c) => sum + parseFloat(c.estimatedCredits), 0);

  const projectedCredits = projectedTaskCredits + projectedMeetingCredits + projectedCampaignCredits;

  const content = (
      <div className="space-y-6" data-testid="dashboard-page">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your marketing.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold font-mono">{company?.credits || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    of {company?.monthlyCredits} • resets {(() => {
                      const now = new Date();
                      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                      return nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    })()}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projected Usage</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold font-mono" data-testid="text-projected-credits">{projectedCredits.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">tasks, meetings & campaigns this period</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono">{activeTasks}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono">{pendingTasks}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono">{completedTasks}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-3 border rounded-lg gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedTask(task)}
                    data-testid={`dashboard-task-${task.id}`}
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="capitalize">
                        {task.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-mono">
                        {task.creditCost} cr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No tasks yet. Your agency will assign work here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  );

  if (embedded) {
    return (
      <>
        {content}
        <TaskDetailPanel
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          isAdmin={false}
          companyId={companyId}
        />
      </>
    );
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6">
        {content}
      </div>
      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={false}
        companyId={companyId}
      />
    </ClientLayout>
  );
}
