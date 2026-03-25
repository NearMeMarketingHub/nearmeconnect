import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListTodo, Plus, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/task-card";
import { EmptyState } from "@/components/empty-state";
import type { Client, Task, TaskStatus } from "@shared/schema";

interface TasksPageProps {
  client: Client;
  onRequestTask: () => void;
}

export default function TasksPage({ client, onRequestTask }: TasksPageProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", client.id],
  });

  const filterTasks = (taskList: Task[] | undefined, type?: "assigned" | "requested") => {
    if (!taskList) return [];

    let filtered = taskList;

    if (type) {
      filtered = filtered.filter((t) => t.type === type);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "priority") {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder]
        );
      }
      return 0;
    });
  };

  const assignedTasks = filterTasks(tasks, "assigned");
  const requestedTasks = filterTasks(tasks, "requested");
  const allTasks = filterTasks(tasks);

  const TaskList = ({ taskList }: { taskList: Task[] }) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      );
    }

    if (taskList.length === 0) {
      return (
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description={
            statusFilter !== "all"
              ? "No tasks match your current filter. Try changing the filter."
              : "You don't have any tasks yet. Request a new task to get started."
          }
          action={
            statusFilter === "all"
              ? { label: "Request Task", onClick: onRequestTask }
              : undefined
          }
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {taskList.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="tasks-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your assigned and requested tasks
          </p>
        </div>
        <Button onClick={onRequestTask} data-testid="button-request-task">
          <Plus className="w-4 h-4 mr-2" />
          Request Task
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">All Tasks</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]" data-testid="select-sort">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({allTasks.length})
              </TabsTrigger>
              <TabsTrigger value="assigned" data-testid="tab-assigned">
                Assigned ({assignedTasks.length})
              </TabsTrigger>
              <TabsTrigger value="requested" data-testid="tab-requested">
                Requested ({requestedTasks.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <TaskList taskList={allTasks} />
            </TabsContent>
            <TabsContent value="assigned">
              <TaskList taskList={assignedTasks} />
            </TabsContent>
            <TabsContent value="requested">
              <TaskList taskList={requestedTasks} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
