import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseLocalDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ListTodo, 
  Calendar, 
  Building2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Circle,
  XCircle,
  Repeat,
  ChevronRight,
  ChevronLeft,
  Tag,
  User,
  Loader2,
  List,
  LayoutGrid,
  Kanban,
} from "lucide-react";
import { TaskBoardView } from "@/components/task-board-view";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Company, Task, CampaignRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import { useAuth } from "@/hooks/use-auth";
import { Target } from "lucide-react";

type StatusFilter = "all" | "pending" | "in_progress" | "review" | "approved" | "completed" | "rejected";

type AssignmentFilter = "all_tasks" | "assigned_to_me";

export default function AdminTasks() {
  const [viewMode, setViewMode] = useState<"list" | "category" | "stage">("list");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all_tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [taskMonthDate, setTaskMonthDate] = useState(() => new Date());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRequest | null>(null);
  const TASKS_PER_PAGE = 10;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: campaignRequests } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/admin/campaign-requests"],
  });

  const { data: allCategories } = useQuery<any[]>({
    queryKey: ["/api/all-task-categories"],
    queryFn: async () => {
      if (!companies) return [];
      const results = await Promise.all(
        companies.map(c =>
          fetch(`/api/companies/${c.id}/task-categories`)
            .then(r => r.ok ? r.json() : [])
        )
      );
      return results.flat();
    },
    enabled: !!companies && companies.length > 0,
  });

  const getCampaignName = (campaignRequestId: string | null) => {
    if (!campaignRequestId || !campaignRequests) return null;
    const campaign = campaignRequests.find(c => c.id === campaignRequestId);
    return campaign?.name || "Campaign";
  };

  const getCampaignForTask = (campaignRequestId: string | null) => {
    if (!campaignRequestId || !campaignRequests) return null;
    return campaignRequests.find(c => c.id === campaignRequestId) || null;
  };

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return res.json() as Promise<Task>;
    },
    onMutate: async ({ taskId, updates }) => {
      if (updates.status === undefined) return;
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(["/api/tasks"], previousTasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ));
      }
      return { previousTasks };
    },
    onSuccess: (
      updatedTask: Task,
      { updates }: { taskId: string; updates: Partial<Task> },
      context: { previousTasks?: Task[] } | undefined
    ) => {
      queryClient.setQueryData<Task[]>(["/api/tasks"], (old) =>
        old ? old.map(t => t.id === updatedTask.id ? updatedTask : t) : old
      );
      const creditStatuses = new Set(["in_progress", "completed", "pending", "rejected"]);
      const previousTask = context?.previousTasks?.find(t => t.id === updatedTask.id);
      if (updates.status && creditStatuses.has(updates.status) && updates.status !== previousTask?.status) {
        queryClient.invalidateQueries({ queryKey: ["/api/companies", updatedTask.companyId] });
        queryClient.invalidateQueries({ queryKey: ["/api/companies", updatedTask.companyId, "credits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
      }
      toast({ title: "Task updated successfully" });
      setSelectedTask(null);
    },
    onError: (
      _err: Error,
      _vars: { taskId: string; updates: Partial<Task> },
      context: { previousTasks?: Task[] } | undefined
    ) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/tasks"], context.previousTasks);
      }
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ taskIds, action }: { taskIds: string[]; action: "approve" | "reject" }) => {
      return apiRequest("POST", "/api/admin/tasks/bulk-action", { taskIds, action });
    },
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setSelectedTaskIds(new Set());
      toast({
        title: `Bulk action completed`,
        description: `${data.succeeded} succeeded, ${data.failed} failed out of ${data.total} tasks`,
      });
    },
    onError: () => {
      toast({ title: "Failed to process bulk action", variant: "destructive" });
    },
  });

  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    
    let tasks = allTasks.filter(t => t.status !== "cadence_parent");
    
    if (assignmentFilter === "assigned_to_me" && user) {
      tasks = tasks.filter(t => t.assignedTo === user.id);
    }
    
    if (selectedCompany !== "all") {
      tasks = tasks.filter(t => t.companyId === selectedCompany);
    }
    
    if (statusFilter === "rejected") {
      tasks = tasks.filter(t => t.approvalStatus === "rejected");
    } else if (statusFilter === "all") {
      tasks = tasks.filter(t => t.status !== "completed" && t.approvalStatus !== "rejected");
    } else if (statusFilter === "completed") {
      tasks = tasks.filter(t => t.status === "completed" && t.approvalStatus !== "rejected");
    } else {
      tasks = tasks.filter(t => t.status === statusFilter && t.approvalStatus !== "rejected");
    }

    const year = taskMonthDate.getFullYear();
    const month = taskMonthDate.getMonth() + 1;
    tasks = tasks.filter(t => {
      if (!t.dueDate) {
        if (t.status === "completed" && t.completedAt) {
          const cd = new Date(t.completedAt);
          return cd.getFullYear() === year && cd.getMonth() + 1 === month;
        }
        return true;
      }
      const d = parseLocalDate(t.dueDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
    });
    
    return tasks;
  }, [allTasks, selectedCompany, statusFilter, taskMonthDate, assignmentFilter, user]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * TASKS_PER_PAGE, currentPage * TASKS_PER_PAGE);

  const reviewableOnPage = useMemo(() => {
    return paginatedTasks.filter(t => t.status === "review" || t.approvalStatus === "pending_approval");
  }, [paginatedTasks]);

  const allPageReviewableSelected = reviewableOnPage.length > 0 &&
    reviewableOnPage.every(t => selectedTaskIds.has(t.id));

  const somePageReviewableSelected = reviewableOnPage.some(t => selectedTaskIds.has(t.id));

  const toggleSelectAll = () => {
    if (allPageReviewableSelected) {
      const newSet = new Set(selectedTaskIds);
      reviewableOnPage.forEach(t => newSet.delete(t.id));
      setSelectedTaskIds(newSet);
    } else {
      const newSet = new Set(selectedTaskIds);
      reviewableOnPage.forEach(t => newSet.add(t.id));
      setSelectedTaskIds(newSet);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  // Reset to page 1 when filters change
  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
    setSelectedTaskIds(new Set());
  };
  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
    setCurrentPage(1);
    setSelectedTaskIds(new Set());
  };

  const getCompanyName = (companyId: string) => {
    return companies?.find(c => c.id === companyId)?.name || "Unknown";
  };

  const formatDueDate = (dueDate: string | null, status?: string) => {
    if (!dueDate) return "No due date";
    const date = parseLocalDate(dueDate);
    
    if (status === "completed" || status === "rejected") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const getDueDateColor = (dueDate: string | null, status: string) => {
    if (status === "completed" || status === "rejected") return "text-muted-foreground";
    if (!dueDate) return "text-muted-foreground";
    
    const date = parseLocalDate(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "text-destructive font-medium";
    if (diffDays === 0) return "text-orange-600 dark:text-orange-400 font-medium";
    if (diffDays <= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const getStatusIcon = (status: string, approvalStatus?: string | null) => {
    if (approvalStatus === "rejected") {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "review":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "review": return "outline";
      default: return "secondary";
    }
  };

  const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      default: return "secondary";
    }
  };

  const handleAssignmentFilterChange = (filter: AssignmentFilter) => {
    setAssignmentFilter(filter);
    setCurrentPage(1);
  };

  const taskCounts = useMemo(() => {
    if (!allTasks) return { all: 0, pending: 0, in_progress: 0, completed: 0, review: 0, approved: 0, rejected: 0 };
    
    let tasks = allTasks.filter(t => t.status !== "cadence_parent");
    
    if (assignmentFilter === "assigned_to_me" && user) {
      tasks = tasks.filter(t => t.assignedTo === user.id);
    }
    
    if (selectedCompany !== "all") {
      tasks = tasks.filter(t => t.companyId === selectedCompany);
    }

    const year = taskMonthDate.getFullYear();
    const month = taskMonthDate.getMonth() + 1;
    tasks = tasks.filter(t => {
      if (!t.dueDate) {
        if (t.status === "completed" && t.completedAt) {
          const cd = new Date(t.completedAt);
          return cd.getFullYear() === year && cd.getMonth() + 1 === month;
        }
        return true;
      }
      const d = parseLocalDate(t.dueDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    
    return {
      all: tasks.filter(t => t.status !== "completed" && t.approvalStatus !== "rejected").length,
      pending: tasks.filter(t => t.status === "pending").length,
      in_progress: tasks.filter(t => t.status === "in_progress").length,
      completed: tasks.filter(t => t.status === "completed" && t.approvalStatus !== "rejected").length,
      review: tasks.filter(t => t.status === "review").length,
      approved: tasks.filter(t => t.status === "approved").length,
      rejected: tasks.filter(t => t.approvalStatus === "rejected").length,
    };
  }, [allTasks, selectedCompany, assignmentFilter, user, taskMonthDate]);

  const isLoading = companiesLoading || tasksLoading;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">All Tasks</h1>
            <p className="text-muted-foreground">
              Manage and track all tasks across companies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setTaskMonthDate(new Date(taskMonthDate.getFullYear(), taskMonthDate.getMonth() - 1, 1)); setCurrentPage(1); }}
                data-testid="button-task-month-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center" data-testid="text-task-month">
                {taskMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setTaskMonthDate(new Date(taskMonthDate.getFullYear(), taskMonthDate.getMonth() + 1, 1)); setCurrentPage(1); }}
                data-testid="button-task-month-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select value={selectedCompany} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[200px]" data-testid="select-company-filter">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1">
            <Button
              variant={assignmentFilter === "all_tasks" ? "default" : "outline"}
              size="sm"
              onClick={() => handleAssignmentFilterChange("all_tasks")}
              data-testid="filter-all-tasks"
            >
              <ListTodo className="w-3 h-3 mr-1" />
              All Tasks
            </Button>
            <Button
              variant={assignmentFilter === "assigned_to_me" ? "default" : "outline"}
              size="sm"
              onClick={() => handleAssignmentFilterChange("assigned_to_me")}
              data-testid="filter-assigned-to-me"
            >
              <User className="w-3 h-3 mr-1" />
              Assigned to Me
            </Button>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex gap-2 flex-wrap">
          <Button 
            variant={statusFilter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleStatusFilterChange("all")}
            data-testid="filter-all"
          >
            All ({taskCounts.all})
          </Button>
          <Button 
            variant={statusFilter === "pending" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleStatusFilterChange("pending")}
            data-testid="filter-pending"
          >
            <Circle className="w-3 h-3 mr-1" />
            Pending ({taskCounts.pending})
          </Button>
          <Button 
            variant={statusFilter === "in_progress" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleStatusFilterChange("in_progress")}
            data-testid="filter-in-progress"
          >
            <Clock className="w-3 h-3 mr-1" />
            In Progress ({taskCounts.in_progress})
          </Button>
          <Button 
            variant={statusFilter === "review" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleStatusFilterChange("review")}
            data-testid="filter-review"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Review ({taskCounts.review})
          </Button>
          <Button 
            variant={statusFilter === "approved" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleStatusFilterChange("approved")}
            data-testid="filter-approved"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved ({taskCounts.approved})
          </Button>
          <Button 
            variant={statusFilter === "completed" ? "default" : "outline"} 
            size="sm"
            onClick={() => handleStatusFilterChange("completed")}
            data-testid="filter-completed"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed ({taskCounts.completed})
          </Button>
          {taskCounts.rejected > 0 && (
            <Button 
              variant={statusFilter === "rejected" ? "default" : "outline"} 
              size="sm"
              onClick={() => handleStatusFilterChange("rejected")}
              data-testid="filter-rejected"
            >
              Rejected ({taskCounts.rejected})
            </Button>
          )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1" data-testid="view-mode-toggle">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            data-testid="view-toggle-list"
          >
            <List className="w-4 h-4 mr-1" />
            List
          </Button>
          <Button
            variant={viewMode === "category" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("category")}
            data-testid="view-toggle-category"
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Category
          </Button>
          <Button
            variant={viewMode === "stage" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("stage")}
            data-testid="view-toggle-stage"
          >
            <Kanban className="w-4 h-4 mr-1" />
            Stage
          </Button>
        </div>

        {viewMode !== "list" ? (
          <TaskBoardView
            tasks={filteredTasks}
            categories={allCategories || []}
            mode={viewMode === "category" ? "category" : "stage"}
            onTaskClick={setSelectedTask}
            onStatusChange={(taskId, newStatus) =>
              updateTaskMutation.mutate({ taskId, updates: { status: newStatus } })
            }
            allowDrag={viewMode === "stage"}
            getCompanyName={getCompanyName}
          />
        ) : (

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                Tasks ({filteredTasks.length})
              </CardTitle>
              {selectedTaskIds.size > 0 && (
                <div className="flex items-center gap-2" data-testid="bulk-action-bar">
                  <span className="text-sm text-muted-foreground">{selectedTaskIds.size} selected</span>
                  <Button
                    size="sm"
                    onClick={() => bulkActionMutation.mutate({ taskIds: Array.from(selectedTaskIds), action: "approve" })}
                    disabled={bulkActionMutation.isPending}
                    data-testid="button-bulk-approve"
                  >
                    {bulkActionMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => bulkActionMutation.mutate({ taskIds: Array.from(selectedTaskIds), action: "reject" })}
                    disabled={bulkActionMutation.isPending}
                    data-testid="button-bulk-reject"
                  >
                    {bulkActionMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                    Reject All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="space-y-2">
                {reviewableOnPage.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 border-b">
                    <Checkbox
                      checked={allPageReviewableSelected}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                      className={somePageReviewableSelected && !allPageReviewableSelected ? "opacity-50" : ""}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select all reviewable tasks on this page ({reviewableOnPage.length})
                    </span>
                  </div>
                )}
                {paginatedTasks.map((task) => {
                  const isReviewable = task.status === "review" || task.approvalStatus === "pending_approval";
                  return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                    data-testid={`task-row-${task.id}`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {isReviewable ? (
                        <Checkbox
                          checked={selectedTaskIds.has(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 flex-shrink-0"
                          data-testid={`checkbox-task-${task.id}`}
                        />
                      ) : (
                      <button
                        className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                        data-testid={`button-complete-task-${task.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = task.status === "completed" ? "pending" : "completed";
                          updateTaskMutation.mutate({ taskId: task.id, updates: { status: newStatus } });
                        }}
                        title={task.status === "completed" ? "Mark as pending" : "Mark as completed"}
                      >
                        {getStatusIcon(task.status, task.approvalStatus)}
                      </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{task.title}</p>
                          {task.isRecurring && (
                            <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                          {task.deliverableType && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {task.deliverableType.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm mt-1 flex-wrap">
                          <Link 
                            href={`/admin/companies/${task.companyId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-foreground dark:text-white hover:text-primary hover:underline"
                          >
                            {getCompanyName(task.companyId)}
                          </Link>
                          <span className="text-muted-foreground">•</span>
                          <span className={getDueDateColor(task.dueDate, task.status)}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDueDate(task.dueDate, task.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TaskAssigneeAvatars taskId={task.id} />
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status.replace("_", " ")}
                      </Badge>
                      {task.categoryId && (() => {
                        const cat = (allCategories || []).find((c: any) => c.id === task.categoryId);
                        if (!cat) return null;
                        return (
                          <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-category-${task.id}`}>
                            {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                            {cat.name}
                          </Badge>
                        );
                      })()}
                      {task.campaignRequestId && getCampaignName(task.campaignRequestId) && (
                        <Badge
                          variant="outline"
                          className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 text-xs cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const campaign = getCampaignForTask(task.campaignRequestId);
                            if (campaign) setSelectedCampaign(campaign);
                          }}
                          data-testid={`badge-campaign-${task.id}`}
                        >
                          <Target className="w-3 h-3 mr-1" />
                          {getCampaignName(task.campaignRequestId)}
                        </Badge>
                      )}
                      {task.taskOwnership === "client" && (
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 text-xs">
                          Client
                        </Badge>
                      )}
                      {task.creditCost && parseFloat(task.creditCost.toString()) > 0 && (
                        <Badge variant="outline" className="font-mono">
                          {task.creditCost} cr
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  );
                })}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * TASKS_PER_PAGE + 1}-{Math.min(currentPage * TASKS_PER_PAGE, filteredTasks.length)} of {filteredTasks.length} tasks
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No tasks found matching your filters</p>
                {statusFilter !== "all" && (
                  <Button 
                    variant="ghost" 
                    onClick={() => handleStatusFilterChange("all")}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={true}
        companyId={selectedTask?.companyId || ""}
        onNavigateToChat={(threadId, companyId) => {
          setLocation(`/admin/companies/${companyId}?tab=chat&thread=${threadId}`);
        }}
        onViewCampaign={(campaignRequestId) => {
          const campaign = getCampaignForTask(campaignRequestId);
          if (campaign) {
            setSelectedTask(null);
            setSelectedCampaign(campaign);
          }
        }}
      />

      <CampaignDetailPanel
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        isAdmin={true}
        onTaskClick={(task) => {
          setSelectedCampaign(null);
          setSelectedTask(task);
        }}
      />
    </AdminLayout>
  );
}

function TaskAssigneeAvatars({ taskId }: { taskId: string }) {
  const { data: assignees } = useQuery<any[]>({
    queryKey: ["/api/tasks", taskId, "assignees"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/assignees`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30000,
  });

  if (!assignees || assignees.length === 0) {
    return (
      <span className="text-xs text-muted-foreground" data-testid={`text-unassigned-${taskId}`}>Unassigned</span>
    );
  }

  const visible = assignees.slice(0, 3);
  const overflow = assignees.length - 3;

  return (
    <div className="flex items-center -space-x-1.5" data-testid={`assignee-avatars-${taskId}`}>
      {visible.map((a: any) => (
        <Tooltip key={a.userId}>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarFallback className="text-[9px]">
                {(a.userName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {a.userName || a.userEmail}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Avatar className="h-6 w-6 border-2 border-background">
          <AvatarFallback className="text-[9px]">+{overflow}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
