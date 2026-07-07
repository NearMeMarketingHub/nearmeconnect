import { useState, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseLocalDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Calendar,
  LayoutGrid,
  CalendarDays,
  List,
  ArrowUp,
  Zap,
  Loader2,
  Trash2,
  ExternalLink,
  Play,
  Pause,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskCategory, TaskChecklistItem } from "@shared/schema";

type BoardViewMode = "board" | "by-month" | "by-due-date" | "list";
type OutstandingFilter = null | "overdue" | "this-week" | "in-progress" | "in-review";

interface ProjectBoardProps {
  companyId: string;
  tasks: Task[];
  categories: TaskCategory[];
  tasksLoading?: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask: (categoryId?: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysDiff(dateStr: string): number {
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function getDueDateLabel(task: Task): string {
  if (!task.dueDate) return "";
  const diff = getDaysDiff(task.dueDate);
  if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7) return `Due in ${diff}d`;
  return parseLocalDate(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDueDateClass(task: Task): string {
  if (task.status === "completed" || task.status === "rejected") return "text-muted-foreground";
  if (!task.dueDate) return "text-muted-foreground";
  const diff = getDaysDiff(task.dueDate);
  if (diff < 0) return "text-destructive font-medium";
  if (diff === 0) return "text-orange-600 dark:text-orange-400 font-medium";
  if (diff <= 3) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function getStatusChip(status: string, approvalStatus?: string | null) {
  if (approvalStatus === "rejected")
    return <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" /> Rejected</span>;
  if (status === "completed")
    return <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Done</span>;
  if (status === "in_progress")
    return <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"><Clock className="h-3 w-3" /> In Progress</span>;
  if (status === "review")
    return <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400"><AlertTriangle className="h-3 w-3" /> In Review</span>;
  if (status === "approved")
    return <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Circle className="h-3 w-3" /> Pending</span>;
}

function getDueDateBucket(task: Task): "overdue" | "today" | "this-week" | "this-month" | "later" | "none" {
  if (!task.dueDate) return "none";
  const diff = getDaysDiff(task.dueDate);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 6) return "this-week";
  if (diff <= 30) return "this-month";
  return "later";
}

function getMonthLabel(dateStr: string | null): string {
  if (!dateStr) return "No Due Date";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Inline Checklist ────────────────────────────────────────────────────────

function InlineChecklist({ taskId, companyId }: { taskId: string; companyId: string }) {
  const { toast } = useToast();
  const [newItem, setNewItem] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = useQuery<TaskChecklistItem[]>({
    queryKey: ["/api/tasks", taskId, "checklist"],
    queryFn: async () => {
      const r = await fetch(`/api/tasks/${taskId}/checklist`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiRequest("PATCH", `/api/checklist-items/${id}`, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "checklist"] }),
    onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: (title: string) =>
      apiRequest("POST", `/api/tasks/${taskId}/checklist`, { title, isCompleted: false, sortOrder: items.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "checklist"] });
      setNewItem("");
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/checklist-items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "checklist"] }),
  });

  const completed = items.filter((i) => i.isCompleted).length;

  if (isLoading) return <div className="mt-2 text-xs text-muted-foreground">Loading...</div>;

  return (
    <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
      {items.length > 0 && (
        <div className="flex items-center gap-1 mb-1">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{completed}/{items.length}</span>
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5 group">
          <Checkbox
            checked={item.isCompleted}
            onCheckedChange={(checked) => toggleMutation.mutate({ id: item.id, isCompleted: !!checked })}
            className="h-3.5 w-3.5"
            data-testid={`checkbox-checklist-${item.id}`}
          />
          <span className={`text-xs flex-1 truncate ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {item.title}
          </span>
          <button
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            onClick={() => deleteMutation.mutate(item.id)}
            data-testid={`button-delete-checklist-${item.id}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
          className="h-6 text-xs px-1.5 py-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              addMutation.mutate(newItem.trim());
            }
          }}
          data-testid={`input-checklist-new-${taskId}`}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => newItem.trim() && addMutation.mutate(newItem.trim())}
          disabled={addMutation.isPending}
          data-testid={`button-add-checklist-${taskId}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Task Assignee Avatars (self-contained) ──────────────────────────────────

function BoardTaskAvatars({ taskId }: { taskId: string }) {
  const { data: assignees = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", taskId, "assignees"],
    queryFn: async () => {
      const r = await fetch(`/api/tasks/${taskId}/assignees`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30000,
  });

  if (!assignees.length) return null;
  const visible = assignees.slice(0, 2);
  const overflow = assignees.length - 2;

  return (
    <div className="flex items-center -space-x-1">
      {visible.map((a: any) => (
        <Tooltip key={a.userId}>
          <TooltipTrigger asChild>
            <Avatar className="h-5 w-5 border border-background">
              <AvatarFallback className="text-[8px]">
                {(a.userName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{a.userName || a.userEmail}</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Avatar className="h-5 w-5 border border-background">
          <AvatarFallback className="text-[8px]">+{overflow}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// ─── Quick Action Menu ───────────────────────────────────────────────────────

interface QuickActionMenuProps {
  task: Task;
  companyId: string;
  onOpen: () => void;
}

function QuickActionMenu({ task, companyId, onOpen }: QuickActionMenuProps) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => apiRequest("PATCH", `/api/tasks/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
      toast({ title: "Task deleted" });
    },
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-task-actions-${task.id}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={() => updateMutation.mutate({ status: "in_progress" })}
            disabled={task.status === "in_progress"}
            data-testid={`action-in-progress-${task.id}`}
          >
            <Play className="h-3.5 w-3.5 mr-2 text-blue-500" />
            Mark In Progress
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateMutation.mutate({ status: "review" })}
            disabled={task.status === "review"}
            data-testid={`action-review-${task.id}`}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-2 text-yellow-500" />
            Mark In Review
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateMutation.mutate({ status: "pending" })}
            disabled={task.status === "pending"}
            data-testid={`action-pending-${task.id}`}
          >
            <Pause className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Mark Pending
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateMutation.mutate({ status: "completed" })}
            disabled={task.status === "completed"}
            data-testid={`action-complete-${task.id}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" />
            Mark Completed
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpen} data-testid={`action-open-${task.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            Open Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmDelete(true)}
            data-testid={`action-delete-${task.id}`}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{task.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              data-testid={`confirm-delete-${task.id}`}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Board Card ──────────────────────────────────────────────────────────────

interface BoardCardProps {
  task: Task;
  companyId: string;
  onTaskClick: (task: Task) => void;
  isDragging?: boolean;
  categories: TaskCategory[];
}

function BoardCard({ task, companyId, onTaskClick, isDragging, categories }: BoardCardProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging: selfDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: selfDragging ? 0.3 : 1 }
    : undefined;

  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;

  return (
    <div ref={setNodeRef} style={style} data-testid={`board-card-${task.id}`}>
      <Card
        className={`group cursor-pointer hover:shadow-md transition-shadow border ${
          isDragging ? "shadow-lg ring-2 ring-primary" : ""
        }`}
        onClick={() => onTaskClick(task)}
      >
        <CardContent className="p-3 space-y-2">
          {/* Header row */}
          <div className="flex items-start gap-1">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
              data-testid={`drag-handle-${task.id}`}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium leading-snug line-clamp-2 ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </span>
            </div>
            <QuickActionMenu task={task} companyId={companyId} onOpen={() => onTaskClick(task)} />
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {getStatusChip(task.status, task.approvalStatus)}
            {task.dueDate && (
              <span className={`text-xs flex items-center gap-0.5 ${getDueDateClass(task)}`}>
                <Clock className="h-3 w-3" />
                {getDueDateLabel(task)}
              </span>
            )}
          </div>

          {/* Footer: assignees + credit + category */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <BoardTaskAvatars taskId={task.id} />
            </div>
            <div className="flex items-center gap-1.5">
              {cat && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || "#888" }}
                  title={cat.name}
                />
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {task.creditCost}cr
              </Badge>
            </div>
          </div>

          {/* Checklist toggle */}
          <button
            className="w-full flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1 border-t"
            onClick={(e) => {
              e.stopPropagation();
              setShowChecklist((v) => !v);
            }}
            data-testid={`button-toggle-checklist-${task.id}`}
          >
            {showChecklist ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Checklist
          </button>

          {showChecklist && <InlineChecklist taskId={task.id} companyId={companyId} />}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Board Column ────────────────────────────────────────────────────────────

interface BoardColumnProps {
  id: string;
  label: string;
  color?: string | null;
  tasks: Task[];
  companyId: string;
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
  onAddTask?: () => void;
  isCompleted?: boolean;
}

function BoardColumn({ id, label, color, tasks, companyId, categories, onTaskClick, onAddTask, isCompleted }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px]" data-testid={`board-column-${id}`}>
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 ${
          isOver ? "bg-primary/10 border-primary" : "bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-2">
          {color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          )}
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          <span className="text-sm font-semibold truncate">{label}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tasks.length}</Badge>
        </div>
        {onAddTask && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onAddTask}
            data-testid={`button-add-task-${id}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] p-2 space-y-2 rounded-b-lg border overflow-y-auto max-h-[65vh] ${
          isOver ? "bg-primary/5 border-primary" : "bg-muted/20"
        }`}
      >
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            companyId={companyId}
            onTaskClick={onTaskClick}
            categories={categories}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No tasks"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Outstanding Summary Bar ─────────────────────────────────────────────────

interface OutstandingBarProps {
  tasks: Task[];
  activeFilter: OutstandingFilter;
  onFilter: (f: OutstandingFilter) => void;
}

function OutstandingBar({ tasks, activeFilter, onFilter }: OutstandingBarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const active = tasks.filter((t) => t.status !== "completed" && t.approvalStatus !== "rejected");

  const overdue = active.filter((t) => t.dueDate && getDaysDiff(t.dueDate) < 0).length;
  const thisWeek = active.filter((t) => t.dueDate && getDaysDiff(t.dueDate) >= 0 && getDaysDiff(t.dueDate) <= 7).length;
  const inProgress = active.filter((t) => t.status === "in_progress").length;
  const inReview = active.filter((t) => t.status === "review").length;

  const items: { key: OutstandingFilter; label: string; count: number; icon: any; color: string }[] = [
    { key: "overdue", label: "Overdue", count: overdue, icon: AlertTriangle, color: "text-destructive" },
    { key: "this-week", label: "Due This Week", count: thisWeek, icon: Calendar, color: "text-orange-600 dark:text-orange-400" },
    { key: "in-progress", label: "In Progress", count: inProgress, icon: Clock, color: "text-blue-600 dark:text-blue-400" },
    { key: "in-review", label: "In Review", count: inReview, icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(({ key, label, count, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onFilter(activeFilter === key ? null : key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            activeFilter === key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted border-border"
          }`}
          data-testid={`outstanding-${key}`}
        >
          <Icon className={`h-3.5 w-3.5 ${activeFilter === key ? "" : color}`} />
          <span>{label}</span>
          <Badge
            variant={activeFilter === key ? "secondary" : "outline"}
            className="text-[10px] px-1.5 py-0 ml-0.5"
          >
            {count}
          </Badge>
        </button>
      ))}
    </div>
  );
}

// ─── Task List Row (for list view) ───────────────────────────────────────────

function TaskListRow({ task, companyId, categories, onTaskClick }: {
  task: Task;
  companyId: string;
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
}) {
  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
  return (
    <Card
      className="cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => onTaskClick(task)}
      data-testid={`list-task-${task.id}`}
    >
      <CardContent className="py-3 px-4 flex items-center gap-3">
        {getStatusChip(task.status, task.approvalStatus)}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.dueDate && (
            <span className={`text-xs ${getDueDateClass(task)}`}>{getDueDateLabel(task)}</span>
          )}
          {cat && (
            <Badge variant="outline" className="text-xs gap-1">
              {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
              {cat.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">{task.creditCost}cr</Badge>
          <BoardTaskAvatars taskId={task.id} />
          <QuickActionMenu task={task} companyId={companyId} onOpen={() => onTaskClick(task)} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ProjectBoard ───────────────────────────────────────────────────────

export function ProjectBoard({ companyId, tasks, categories, tasksLoading, onTaskClick, onAddTask }: ProjectBoardProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<BoardViewMode>("board");
  const [outstandingFilter, setOutstandingFilter] = useState<OutstandingFilter>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Category update mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ taskId, categoryId }: { taskId: string; categoryId: string | null }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
    },
    onError: () => toast({ title: "Failed to move task", variant: "destructive" }),
  });

  // 90-day window filter
  const windowedTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() + 90);
    const cutoffCompleted = new Date(now);
    cutoffCompleted.setDate(now.getDate() - 45);

    return tasks.filter((t) => {
      if (t.status === "cadence_parent") return false;
      if (t.status === "completed") {
        if (!t.completedAt) return false;
        return new Date(t.completedAt) >= cutoffCompleted;
      }
      if (t.approvalStatus === "rejected") return false;
      if (!t.dueDate) return true;
      const d = parseLocalDate(t.dueDate);
      return d <= cutoff;
    });
  }, [tasks]);

  // Apply outstanding filter
  const filteredTasks = useMemo(() => {
    if (!outstandingFilter) return windowedTasks;
    return windowedTasks.filter((t) => {
      if (outstandingFilter === "overdue") return t.status !== "completed" && t.dueDate != null && getDaysDiff(t.dueDate) < 0;
      if (outstandingFilter === "this-week") return t.status !== "completed" && t.dueDate != null && getDaysDiff(t.dueDate) >= 0 && getDaysDiff(t.dueDate) <= 7;
      if (outstandingFilter === "in-progress") return t.status === "in_progress";
      if (outstandingFilter === "in-review") return t.status === "review";
      return true;
    });
  }, [windowedTasks, outstandingFilter]);

  // Build columns for board view
  const columns = useMemo(() => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
    const completedTasks = filteredTasks.filter((t) => t.status === "completed");

    const byCategory = (catId: string | null) =>
      activeTasks
        .filter((t) => t.categoryId === catId)
        .sort((a, b) => {
          const da = a.dueDate ? getDaysDiff(a.dueDate) : 9999;
          const db = b.dueDate ? getDaysDiff(b.dueDate) : 9999;
          return da - db;
        });

    const cols = [
      ...sorted.map((cat) => ({
        id: cat.id,
        label: cat.name,
        color: cat.color,
        tasks: byCategory(cat.id),
      })),
      { id: "uncategorized", label: "Uncategorized", color: null, tasks: byCategory(null) },
      {
        id: "completed",
        label: "Completed",
        color: null,
        tasks: completedTasks.sort((a, b) => {
          if (!a.completedAt || !b.completedAt) return 0;
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        }),
        isCompleted: true,
      },
    ];

    return cols;
  }, [categories, filteredTasks]);

  // By-month grouping
  const byMonthGroups = useMemo(() => {
    const groups = new Map<string, { label: string; tasks: Task[]; sortKey: string }>();

    filteredTasks.filter((t) => t.status !== "completed").forEach((t) => {
      let key: string;
      let sortKey: string;
      if (t.dueDate && getDaysDiff(t.dueDate) < 0) {
        key = "__overdue__";
        sortKey = "0000-00";
      } else if (!t.dueDate) {
        key = "__none__";
        sortKey = "9999-99";
      } else {
        const d = parseLocalDate(t.dueDate);
        sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        key = sortKey;
      }
      if (!groups.has(key)) {
        groups.set(key, {
          label: key === "__overdue__" ? "⚠ Overdue" : key === "__none__" ? "No Due Date" : getMonthLabel(t.dueDate),
          tasks: [],
          sortKey,
        });
      }
      groups.get(key)!.tasks.push(t);
    });

    return [...groups.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredTasks]);

  // By-due-date grouping
  const byDueDateGroups = useMemo(() => {
    const buckets: Record<string, { label: string; tasks: Task[]; order: number }> = {
      overdue: { label: "⚠ Overdue", tasks: [], order: 0 },
      today: { label: "Today", tasks: [], order: 1 },
      "this-week": { label: "This Week", tasks: [], order: 2 },
      "this-month": { label: "This Month", tasks: [], order: 3 },
      later: { label: "Later", tasks: [], order: 4 },
      none: { label: "No Due Date", tasks: [], order: 5 },
    };

    filteredTasks.filter((t) => t.status !== "completed").forEach((t) => {
      const bucket = getDueDateBucket(t);
      buckets[bucket].tasks.push(t);
    });

    return Object.values(buckets)
      .filter((b) => b.tasks.length > 0)
      .sort((a, b) => a.order - b.order);
  }, [filteredTasks]);

  // List view tasks
  const listTasks = useMemo(() => {
    let t = filteredTasks.filter((task) => task.status !== "cadence_parent");
    if (statusFilter === "active") t = t.filter((task) => task.status !== "completed");
    else if (statusFilter === "completed") t = t.filter((task) => task.status === "completed");
    else if (statusFilter !== "all") t = t.filter((task) => task.status === statusFilter);
    return t.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return getDaysDiff(a.dueDate) - getDaysDiff(b.dueDate);
    });
  }, [filteredTasks, statusFilter]);

  // DnD handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newColumnId = over.id as string;

    if (newColumnId === "completed") return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newCategoryId: string | null;
    if (newColumnId === "uncategorized") {
      newCategoryId = null;
    } else {
      newCategoryId = newColumnId;
    }

    if (task.categoryId === newCategoryId) return;
    updateCategoryMutation.mutate({ taskId, categoryId: newCategoryId });
  }

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  if (tasksLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Outstanding Bar */}
      <OutstandingBar tasks={windowedTasks} activeFilter={outstandingFilter} onFilter={setOutstandingFilter} />

      {/* View Toggle */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center border rounded-lg overflow-hidden">
          {([
            { mode: "board" as const, icon: LayoutGrid, label: "Board" },
            { mode: "by-month" as const, icon: Calendar, label: "By Month" },
            { mode: "by-due-date" as const, icon: CalendarDays, label: "By Due Date" },
            { mode: "list" as const, icon: List, label: "List" },
          ]).map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 h-8"
              onClick={() => setViewMode(mode)}
              data-testid={`view-toggle-${mode}`}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {label}
            </Button>
          ))}
        </div>
        {viewMode === "list" && (
          <div className="flex items-center gap-1">
            {(["active", "all", "pending", "in_progress", "review", "completed"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter(s)}
                data-testid={`list-filter-${s}`}
              >
                {s === "active" ? "Active" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        )}
        {outstandingFilter && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOutstandingFilter(null)}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear filter
          </Button>
        )}
      </div>

      {/* ── Board View ─────────────────────────────────────────────────── */}
      {viewMode === "board" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                id={col.id}
                label={col.label}
                color={col.color}
                tasks={col.tasks}
                companyId={companyId}
                categories={categories}
                onTaskClick={onTaskClick}
                onAddTask={col.id !== "completed" ? () => onAddTask(col.id === "uncategorized" ? undefined : col.id) : undefined}
                isCompleted={(col as any).isCompleted}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90">
                <BoardCard
                  task={activeTask}
                  companyId={companyId}
                  onTaskClick={() => {}}
                  isDragging
                  categories={categories}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── By Month View ─────────────────────────────────────────────── */}
      {viewMode === "by-month" && (
        <div className="space-y-6">
          {byMonthGroups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No tasks in the 90-day window.</div>
          ) : (
            byMonthGroups.map((group) => (
              <div key={group.sortKey} data-testid={`month-group-${group.sortKey}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <Badge variant="secondary" className="text-xs">{group.tasks.length}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <TaskListRow key={task.id} task={task} companyId={companyId} categories={categories} onTaskClick={onTaskClick} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── By Due Date View ──────────────────────────────────────────── */}
      {viewMode === "by-due-date" && (
        <div className="space-y-6">
          {byDueDateGroups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No tasks in the 90-day window.</div>
          ) : (
            byDueDateGroups.map((group) => (
              <div key={group.label} data-testid={`due-date-group-${group.label}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <Badge variant="secondary" className="text-xs">{group.tasks.length}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <TaskListRow key={task.id} task={task} companyId={companyId} categories={categories} onTaskClick={onTaskClick} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── List View ─────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {listTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No tasks found.</div>
          ) : (
            listTasks.map((task) => (
              <TaskListRow key={task.id} task={task} companyId={companyId} categories={categories} onTaskClick={onTaskClick} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
