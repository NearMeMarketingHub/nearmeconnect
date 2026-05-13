import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { parseLocalDate } from "@/lib/utils";
import { ClientLayout } from "@/components/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeliverableTypePicker } from "@/components/deliverable-type-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileTabMenu } from "@/components/mobile-tab-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, ListTodo, Circle, CheckCircle2, Users, User, ImageUp, Clock, AlertTriangle, Building2, Zap, Target, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { CampaignDetailPanel } from "@/components/campaign-detail-panel";
import type { Task, Company, DeliverableType, CampaignRequest } from "@shared/schema";

interface UserInfo {
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  companyRole: string | null;
}

interface ClientTasksProps {
  companyId: string;
  embedded?: boolean;
}

export default function ClientTasks({ companyId, embedded = false }: ClientTasksProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [deliverableType, setDeliverableType] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRequest | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(true);
  const [taskTab, setTaskTab] = useState("all");
  const [taskMonthDate, setTaskMonthDate] = useState(() => new Date());

  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ["/api/auth/user"],
  });

  const userRole = userInfo?.companyRole || "team_member";
  const userId = userInfo?.userId;
  const isAdminOrOwner = userRole === "company_owner" || userRole === "company_admin";

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    enabled: !!companyId,
  });

  const { data: allTasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { companyId }],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?companyId=${companyId}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: taskCategoriesData } = useQuery<any[]>({
    queryKey: ["/api/companies", companyId, "task-categories"],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await fetch(`/api/companies/${companyId}/task-categories`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: deliverableTypes } = useQuery<DeliverableType[]>({
    queryKey: ["/api/deliverable-types"],
  });

  const { data: campaignRequests } = useQuery<CampaignRequest[]>({
    queryKey: ["/api/companies", companyId, "campaign-requests"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/campaign-requests`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!companyId,
  });

  const getCampaignForTask = (campaignRequestId: string | null) => {
    if (!campaignRequestId || !campaignRequests) return null;
    return campaignRequests.find(c => c.id === campaignRequestId) || null;
  };

  const activeDeliverables = deliverableTypes?.filter(d => d.isActive) || [];

  const isRushDetected = (() => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    const diffMs = dueDateObj.getTime() - today.getTime();
    const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 14 && daysUntilDue >= 1;
  })();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeliverableType("");
      setDueDate("");
      toast({ title: "Task requested successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request task",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const actualDeliverableType = deliverableType === "other" ? null : deliverableType;
    const selectedDeliverable = activeDeliverables.find(d => d.key === actualDeliverableType);
    const creditCost = selectedDeliverable ? parseFloat(selectedDeliverable.credits) : 0;
    
    createMutation.mutate({
      companyId,
      title,
      description,
      priority,
      creditCost: String(creditCost),
      type: "requested",
      deliverableType: actualDeliverableType || null,
      dueDate: dueDate || undefined,
    });
  };

  const tasks = showAllTasks || !isAdminOrOwner
    ? allTasks
    : allTasks?.filter((t) => t.assignedBy === userId || t.assignedTo === userId);

  const monthFilteredTasks = useMemo(() => {
    if (!tasks) return [];
    const year = taskMonthDate.getFullYear();
    const month = taskMonthDate.getMonth() + 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => {
      if (t.status === "cadence_parent") return false;
      // Overdue + incomplete tasks are always visible regardless of selected month
      const isIncomplete = t.status !== "completed" && t.approvalStatus !== "rejected";
      if (isIncomplete && t.dueDate && t.dueDate.slice(0, 10) < todayStr) return true;
      if (!t.dueDate) {
        if (t.status === "completed" && t.completedAt) {
          const cd = new Date(t.completedAt);
          return cd.getFullYear() === year && cd.getMonth() + 1 === month;
        }
        return true;
      }
      const d = parseLocalDate(t.dueDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }).sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
    });
  }, [tasks, taskMonthDate]);

  const normalTasks = monthFilteredTasks.filter((t) => t.approvalStatus !== "rejected");
  const rejectedTasks = monthFilteredTasks.filter((t) => t.approvalStatus === "rejected");
  
  const activeTasks = normalTasks.filter((t) => t.status !== "completed");
  const pendingTasks = normalTasks.filter((t) => t.status === "pending");
  const inProgressTasks = normalTasks.filter((t) => t.status === "in_progress");
  const reviewTasks = normalTasks.filter((t) => t.status === "review");
  const completedTasks = normalTasks.filter((t) => t.status === "completed");

  const content = (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground">
            View your marketing tasks and request new work.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTaskMonthDate(new Date(taskMonthDate.getFullYear(), taskMonthDate.getMonth() - 1, 1))}
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
              onClick={() => setTaskMonthDate(new Date(taskMonthDate.getFullYear(), taskMonthDate.getMonth() + 1, 1))}
              data-testid="button-task-month-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isAdminOrOwner && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg" data-testid="task-view-toggle">
              <User className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="task-view-switch" className="text-sm cursor-pointer">
                {showAllTasks ? "All Tasks" : "My Tasks"}
              </Label>
              <Switch
                id="task-view-switch"
                checked={showAllTasks}
                onCheckedChange={setShowAllTasks}
                data-testid="switch-task-view"
              />
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-request-task">
              <Plus className="w-4 h-4 mr-2" />
              Request Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deliverable">Deliverable Type (Optional)</Label>
                <DeliverableTypePicker
                  deliverableTypes={activeDeliverables}
                  value={deliverableType}
                  onValueChange={setDeliverableType}
                  placeholder="Select deliverable or leave blank"
                  includeOther
                  data-testid="select-deliverable"
                />
                <p className="text-xs text-muted-foreground">
                  If you're not sure which deliverable type applies, leave this blank and we'll assign one during review.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you need?"
                  data-testid="input-task-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about your request..."
                  data-testid="input-task-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <DatePicker
                  value={dueDate}
                  onChange={(value) => setDueDate(value)}
                  placeholder="Select due date"
                  fromDate={new Date()}
                  data-testid="input-due-date"
                />
                <p className="text-xs text-muted-foreground">
                  Requests with a due date within 14 days are considered rush orders (2x credits).
                </p>
              </div>
              {isRushDetected && (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Rush Order Detected</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Due date is within 14 days — 2x credit cost will be applied automatically</p>
                  </div>
                </div>
              )}
              {deliverableType && activeDeliverables.find(d => d.key === deliverableType) && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    {isRushDetected ? (
                      <>
                        This will use <span className="font-mono font-medium line-through text-muted-foreground">{activeDeliverables.find(d => d.key === deliverableType)?.credits}</span>{" "}
                        <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{parseFloat(activeDeliverables.find(d => d.key === deliverableType)?.credits || "0") * 2}</span> credits
                      </>
                    ) : (
                      <>
                        This will use <span className="font-mono font-medium">{activeDeliverables.find(d => d.key === deliverableType)?.credits}</span> credits
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available: {company?.credits || 0} credits
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-request">
                {createMutation.isPending ? "Requesting..." : "Submit Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs value={taskTab} onValueChange={setTaskTab}>
        <MobileTabMenu
          tabs={[
            { value: "all", label: "All", count: activeTasks.length },
            { value: "pending", label: "Pending", count: pendingTasks.length },
            { value: "in_progress", label: "In Progress", count: inProgressTasks.length },
            { value: "review", label: "Needs Review", count: reviewTasks.length },
            { value: "completed", label: "Completed", count: completedTasks.length },
            { value: "rejected", label: "Rejected", count: rejectedTasks.length, hidden: rejectedTasks.length === 0 },
          ]}
          activeTab={taskTab}
          onTabChange={setTaskTab}
          title="Tasks"
        />
        <TabsList className="hidden md:inline-flex h-auto flex-wrap gap-1">
          <TabsTrigger value="all" data-testid="tab-all">All ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-in-progress">In Progress ({inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="review" data-testid="tab-review">Needs Review ({reviewTasks.length})</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed ({completedTasks.length})</TabsTrigger>
          {rejectedTasks.length > 0 && (
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedTasks.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <TaskList tasks={activeTasks} isLoading={isLoading} onTaskClick={setSelectedTask} campaignRequests={campaignRequests} onCampaignClick={setSelectedCampaign} taskCategories={taskCategoriesData} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <TaskList tasks={pendingTasks} isLoading={isLoading} onTaskClick={setSelectedTask} campaignRequests={campaignRequests} onCampaignClick={setSelectedCampaign} taskCategories={taskCategoriesData} />
        </TabsContent>
        <TabsContent value="in_progress" className="mt-4">
          <TaskList tasks={inProgressTasks} isLoading={isLoading} onTaskClick={setSelectedTask} campaignRequests={campaignRequests} onCampaignClick={setSelectedCampaign} taskCategories={taskCategoriesData} />
        </TabsContent>
        <TabsContent value="review" className="mt-4">
          {reviewTasks.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tasks awaiting your review.</p>
              </CardContent>
            </Card>
          ) : (
            <TaskList tasks={reviewTasks} isLoading={isLoading} onTaskClick={setSelectedTask} campaignRequests={campaignRequests} onCampaignClick={setSelectedCampaign} taskCategories={taskCategoriesData} />
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <TaskList tasks={completedTasks} isLoading={isLoading} onTaskClick={setSelectedTask} campaignRequests={campaignRequests} onCampaignClick={setSelectedCampaign} taskCategories={taskCategoriesData} />
        </TabsContent>
        {rejectedTasks.length > 0 && (
          <TabsContent value="rejected" className="mt-4">
            <TaskList tasks={rejectedTasks} isLoading={isLoading} onTaskClick={setSelectedTask} showRejectedBadge campaignRequests={campaignRequests} onCampaignClick={setSelectedCampaign} taskCategories={taskCategoriesData} />
          </TabsContent>
        )}
      </Tabs>

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        isAdmin={false}
        companyId={companyId}
        onNavigateToChat={(threadId) => {
          setLocation(`/client/chat?thread=${threadId}`);
        }}
        onNavigateToMediaUploads={() => {
          setLocation(`/client/media-uploads`);
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
        isAdmin={false}
        companyId={companyId}
        onTaskClick={(task) => {
          setSelectedCampaign(null);
          setSelectedTask(task);
        }}
      />
    </>
  );

  if (embedded) {
    return <div className="space-y-6" data-testid="tasks-page">{content}</div>;
  }

  return (
    <ClientLayout companyId={companyId}>
      <div className="p-6 space-y-6" data-testid="tasks-page">
        {content}
      </div>
    </ClientLayout>
  );
}

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onTaskClick: (task: Task) => void;
  showRejectedBadge?: boolean;
  campaignRequests?: CampaignRequest[];
  onCampaignClick?: (campaign: CampaignRequest) => void;
  taskCategories?: any[];
}

function TaskList({ tasks, isLoading, onTaskClick, showRejectedBadge, campaignRequests, onCampaignClick, taskCategories }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tasks in this category.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDueDate = (dueDate: string | null, status?: string) => {
    if (!dueDate) return "No due date";
    const date = parseLocalDate(dueDate);
    
    if (status === "completed") {
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
    if (status === "completed") return "text-muted-foreground";
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "review":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className="hover-elevate cursor-pointer"
          onClick={() => onTaskClick(task)}
          data-testid={`task-card-${task.id}`}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(task.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {showRejectedBadge && task.approvalStatus === "rejected" && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                  {task.approvalStatus === "pending_internal_approval" && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                      Awaiting Internal Approval
                    </Badge>
                  )}
                  {!showRejectedBadge && (
                    <Badge variant="outline" className="capitalize">
                      {task.status.replace("_", " ")}
                    </Badge>
                  )}
                  <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"}>
                    {task.priority}
                  </Badge>
                  {task.categoryId && (() => {
                    const cat = (taskCategories || []).find((c: any) => c.id === task.categoryId);
                    if (!cat) return null;
                    return (
                      <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-category-${task.id}`}>
                        {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                        {cat.name}
                      </Badge>
                    );
                  })()}
                  {task.campaignRequestId && campaignRequests && (() => {
                    const campaign = campaignRequests.find(c => c.id === task.campaignRequestId);
                    if (!campaign) return null;
                    return (
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCampaignClick?.(campaign);
                        }}
                        data-testid={`badge-campaign-${task.id}`}
                      >
                        <Target className="w-3 h-3 mr-1" />
                        {campaign.name || "Campaign"}
                      </Badge>
                    );
                  })()}
                  {task.noCredit && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      No Credit
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <TaskAssigneeAvatars taskId={task.id} />
                <div className="text-right">
                  <span className="font-mono text-sm font-medium">{task.creditCost} cr</span>
                  <p className={`text-xs mt-1 ${getDueDateColor(task.dueDate, task.status)}`}>
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {formatDueDate(task.dueDate, task.status)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
