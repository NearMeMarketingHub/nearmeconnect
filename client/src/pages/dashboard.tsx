import { useQuery } from "@tanstack/react-query";
import { ListTodo, CreditCard, Clock, CheckCircle, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import { Link } from "wouter";
import type { Client, Task } from "@shared/schema";

interface DashboardProps {
  client: Client;
  onRequestTask: () => void;
}

export default function Dashboard({ client, onRequestTask }: DashboardProps) {
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", client.id],
  });

  const activeTasks = tasks?.filter((t) => t.status !== "completed" && t.status !== "cancelled") || [];
  const completedTasks = tasks?.filter((t) => t.status === "completed") || [];
  const pendingTasks = tasks?.filter((t) => t.status === "pending") || [];
  const recentTasks = activeTasks.slice(0, 3);

  const creditUsagePercent = client.monthlyCredits > 0
    ? Math.round(((client.monthlyCredits - client.credits) / client.monthlyCredits) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {((client as any).contactName || client.name || "").split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your account
          </p>
        </div>
        <Button onClick={onRequestTask} data-testid="button-request-task-header">
          <Plus className="w-4 h-4 mr-2" />
          Request Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Tasks"
          value={activeTasks.length}
          subtitle={`${pendingTasks.length} pending`}
          icon={ListTodo}
        />
        <StatsCard
          title="Available Credits"
          value={client.credits}
          subtitle={`of ${client.monthlyCredits} monthly`}
          icon={CreditCard}
        />
        <StatsCard
          title="Pending Requests"
          value={tasks?.filter((t) => t.type === "requested" && t.status === "pending").length || 0}
          subtitle="awaiting review"
          icon={Clock}
        />
        <StatsCard
          title="Completed"
          value={completedTasks.length}
          subtitle="this month"
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-lg">Recent Tasks</CardTitle>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" data-testid="link-view-all-tasks">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ListTodo}
                title="No active tasks"
                description="You don't have any active tasks. Request a new task to get started."
                action={{
                  label: "Request Task",
                  onClick: onRequestTask,
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credit Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold font-mono text-primary">
                {client.credits}
              </p>
              <p className="text-sm text-muted-foreground">
                credits remaining
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage this month</span>
                <span className="font-mono">{creditUsagePercent}%</span>
              </div>
              <Progress value={creditUsagePercent} className="h-2" />
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subscription</span>
                <span className="font-medium capitalize">{client.subscriptionTier}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Allocation</span>
                <span className="font-mono">{client.monthlyCredits}</span>
              </div>
              {client.renewalDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Renews</span>
                  <span>{client.renewalDate}</span>
                </div>
              )}
            </div>
            <Link href="/credits">
              <Button variant="outline" className="w-full" data-testid="link-view-credit-history">
                View Credit History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
