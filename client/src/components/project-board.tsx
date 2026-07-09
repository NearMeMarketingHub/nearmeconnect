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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronLeft,
  GripVertical,
  Calendar,
  LayoutGrid,
  CalendarDays,
  List,
  Loader2,
  Trash2,
  ExternalLink,
  Play,
  Pause,
  X,
  Building2,
  User,
  TableProperties,
  CalendarRange,
  Tag,
  ArrowUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  CheckSquare,
  UserCheck,
  Square,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Task, TaskCategory, TaskChecklistItem, TaskLabel, TaskLabelAssignment } from "@shared/schema";

type BoardViewMode = "board" | "by-month" | "by-due-date" | "list" | "grid" | "calendar";
type OutstandingFilter = null | "overdue" | "this-week" | "in-progress" | "in-review";
type AssigneeFilter = "all" | "me";

export interface ProjectBoardProps {
  companyId: string;
  tasks: Task[];
  categories: TaskCategory[];
  tasksLoading?: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask?: (categoryId?: string) => void;
  showCompanyLabel?: boolean;
  companies?: { id: string; name: string }[];
  disableDnD?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (task.status === "completed" || task.approvalStatus === "rejected") return "text-muted-foreground";
  if (!task.dueDate) return "text-muted-foreground";
  const diff = getDaysDiff(task.dueDate);
  if (diff < 0) return "text-destructive font-medium";
  if (diff === 0) return "text-orange-600 dark:text-orange-400 font-medium";
  if (diff <= 3) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function formatShortDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
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

function getStatusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  if (status === "review") return "In Review";
  if (status === "approved") return "Approved";
  return "Not Started";
}

function getPriorityLabel(priority: string | null): string {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "Important";
  if (priority === "low") return "Low";
  return "Medium";
}

function getPriorityColor(priority: string | null): string {
  if (priority === "urgent") return "text-destructive";
  if (priority === "high") return "text-orange-600 dark:text-orange-400";
  if (priority === "low") return "text-muted-foreground";
  return "text-foreground";
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

function getMonthKey(dateStr: string | null, isOverdue?: boolean): string {
  if (isOverdue) return "0000-00";
  if (!dateStr) return "9999-99";
  const d = parseLocalDate(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey: string): string {
  if (monthKey === "9999-99") return "No Due Date";
  if (monthKey === "0000-00") return "⚠ Overdue";
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function groupByCategory(
  tasks: Task[],
  categories: TaskCategory[]
): { id: string; name: string; color: string | null; tasks: Task[] }[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<string, { id: string; name: string; color: string | null; tasks: Task[] }>();
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const cat of sorted) {
    groups.set(cat.id, { id: cat.id, name: cat.name, color: cat.color, tasks: [] });
  }
  groups.set("uncategorized", { id: "uncategorized", name: "Uncategorized", color: null, tasks: [] });
  for (const task of tasks) {
    const catId = task.categoryId && catMap.has(task.categoryId) ? task.categoryId : "uncategorized";
    groups.get(catId)!.tasks.push(task);
  }
  return [...groups.values()].filter((g) => g.tasks.length > 0);
}

// ─── Label Pills ──────────────────────────────────────────────────────────────

function LabelPills({ labels, max = 4 }: { labels: TaskLabel[]; max?: number }) {
  if (!labels.length) return null;
  const visible = labels.slice(0, max);
  const overflow = labels.length - max;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((l) => (
        <span
          key={l.id}
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-white leading-none"
          style={{ backgroundColor: l.color }}
          title={l.name}
        >
          {l.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ─── Inline Checklist ─────────────────────────────────────────────────────────

function InlineChecklist({ taskId }: { taskId: string }) {
  const { toast } = useToast();
  const [newItem, setNewItem] = useState("");

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
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
          className="h-6 text-xs px-1.5 py-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) addMutation.mutate(newItem.trim());
          }}
          data-testid={`input-checklist-new-${taskId}`}
        />
        <Button
          size="icon" variant="ghost" className="h-6 w-6"
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

// ─── Checklist Count Badge (for cards) ────────────────────────────────────────

function ChecklistCount({ taskId }: { taskId: string }) {
  const { data: items = [] } = useQuery<TaskChecklistItem[]>({
    queryKey: ["/api/tasks", taskId, "checklist"],
    queryFn: async () => {
      const r = await fetch(`/api/tasks/${taskId}/checklist`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60000,
  });
  if (!items.length) return null;
  const done = items.filter((i) => i.isCompleted).length;
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <CheckCircle2 className="h-3 w-3" />
      {done}/{items.length}
    </span>
  );
}

// ─── Task Assignee Avatars ─────────────────────────────────────────────────────

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

// ─── Quick Action Menu ─────────────────────────────────────────────────────────

function QuickActionMenu({ task, companyId, onOpen }: { task: Task; companyId: string; onOpen: () => void }) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("PATCH", `/api/tasks/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
            variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-task-actions-${task.id}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "in_progress" })} disabled={task.status === "in_progress"} data-testid={`action-in-progress-${task.id}`}>
            <Play className="h-3.5 w-3.5 mr-2 text-blue-500" /> Mark In Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "review" })} disabled={task.status === "review"} data-testid={`action-review-${task.id}`}>
            <AlertTriangle className="h-3.5 w-3.5 mr-2 text-yellow-500" /> Mark In Review
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "pending" })} disabled={task.status === "pending"} data-testid={`action-pending-${task.id}`}>
            <Pause className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Mark Pending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "completed" })} disabled={task.status === "completed"} data-testid={`action-complete-${task.id}`}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> Mark Completed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateMutation.mutate({ approvalStatus: "rejected" })}
            disabled={task.approvalStatus === "rejected"}
            className="text-destructive focus:text-destructive"
            data-testid={`action-reject-${task.id}`}
          >
            <XCircle className="h-3.5 w-3.5 mr-2" /> Reject
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpen} data-testid={`action-open-${task.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)} data-testid={`action-delete-${task.id}`}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Delete "{task.title}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
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

// ─── Board Card (Planner Style) ───────────────────────────────────────────────

interface BoardCardProps {
  task: Task;
  companyId: string;
  onTaskClick: (task: Task) => void;
  isDragging?: boolean;
  categories: TaskCategory[];
  draggable?: boolean;
  companyName?: string;
  taskLabels?: TaskLabel[];
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function BoardCard({ task, companyId, onTaskClick, isDragging, categories, draggable = true, companyName, taskLabels = [], isSelected, onToggleSelect }: BoardCardProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const { toast } = useToast();
  const { attributes, listeners, setNodeRef, transform, isDragging: selfDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: selfDragging ? 0.3 : 1 }
    : undefined;

  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
  const isCompleted = task.status === "completed";
  const isRejected = task.approvalStatus === "rejected";

  const toggleCompleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/tasks/${task.id}`, {
        status: isCompleted ? "pending" : "completed",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  return (
    <div ref={setNodeRef} style={style} data-testid={`board-card-${task.id}`}>
      <Card
        className={`group cursor-pointer hover:shadow-md transition-all border-0 shadow-sm ring-1 ring-border ${isDragging ? "shadow-xl ring-primary" : ""} ${isCompleted ? "opacity-75" : ""}`}
        onClick={() => onTaskClick(task)}
      >
        {/* Colored label strips at top — Planner style */}
        {taskLabels.length > 0 && (
          <div className="flex gap-0 overflow-hidden rounded-t-lg">
            {taskLabels.map((l) => (
              <div
                key={l.id}
                className="h-2 flex-1"
                style={{ backgroundColor: l.color }}
                title={l.name}
              />
            ))}
          </div>
        )}

        <CardContent className="p-3 space-y-2">
          {/* Label pills */}
          {taskLabels.length > 0 && (
            <LabelPills labels={taskLabels} />
          )}

          {/* Title row */}
          <div className="flex items-start gap-2">
            {/* Selection checkbox (visible on hover or when selected) */}
            {onToggleSelect && (
              <button
                className={`mt-0.5 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"}`}
                onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
                data-testid={`checkbox-select-${task.id}`}
              >
                {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>
            )}
            {/* Completion circle */}
            <button
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleCompleteMutation.mutate();
              }}
              data-testid={`button-complete-${task.id}`}
            >
              {isCompleted
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : isRejected
                  ? <XCircle className="h-4 w-4 text-destructive" />
                  : <Circle className="h-4 w-4" />
              }
            </button>

            <span className={`text-sm font-medium leading-snug flex-1 min-w-0 line-clamp-2 ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </span>

            {draggable && (
              <button
                {...attributes}
                {...listeners}
                className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
                data-testid={`drag-handle-${task.id}`}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}

            <QuickActionMenu task={task} companyId={companyId} onOpen={() => onTaskClick(task)} />
          </div>

          {/* Description snippet (2-line preview) */}
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug pl-6">
              {task.description}
            </p>
          )}

          {/* Status chip (only non-pending) */}
          {task.status !== "pending" && task.status !== "completed" && !isRejected && (
            <div className="flex items-center gap-1">
              {getStatusChip(task.status, task.approvalStatus)}
            </div>
          )}

          {/* Company label for all-companies view */}
          {companyName && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {companyName}
            </span>
          )}

          {/* Category + credits row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {cat && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#888" }} />
                {cat.name}
              </span>
            )}
            {task.creditCost && Number(task.creditCost) > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{task.creditCost}cr</Badge>
            )}
          </div>

          {/* Footer: due date + checklist count + avatar */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <span className={`text-[10px] flex items-center gap-0.5 font-medium ${getDueDateClass(task)}`}>
                  <Calendar className="h-3 w-3" />
                  {formatShortDate(task.dueDate)}
                </span>
              )}
              <ChecklistCount taskId={task.id} />
            </div>
            <BoardTaskAvatars taskId={task.id} />
          </div>

          {/* Checklist toggle */}
          <button
            className="w-full flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1 border-t"
            onClick={(e) => { e.stopPropagation(); setShowChecklist((v) => !v); }}
            data-testid={`button-toggle-checklist-${task.id}`}
          >
            {showChecklist ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Checklist
          </button>

          {showChecklist && <InlineChecklist taskId={task.id} />}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inline Quick-Add Form ────────────────────────────────────────────────────

interface InlineAddTaskProps {
  onAdd: (title: string, dueDate?: string) => void;
  isPending?: boolean;
}

function InlineAddTask({ onAdd, isPending }: InlineAddTaskProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), dueDate || undefined);
    setTitle("");
    setDueDate("");
    setOpen(false);
  };

  const cancel = () => {
    setOpen(false);
    setTitle("");
    setDueDate("");
  };

  if (!open) {
    return (
      <button
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        data-testid="button-inline-add-task"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  return (
    <div className="p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        className="h-7 text-xs"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") cancel();
        }}
        data-testid="input-inline-task-title"
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="h-7 text-xs"
        data-testid="input-inline-task-due-date"
      />
      <div className="flex gap-1">
        <Button size="sm" className="h-6 text-xs" onClick={submit} disabled={!title.trim() || isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

interface BoardColumnProps {
  id: string;
  label: string;
  color?: string | null;
  tasks: Task[];
  companyId: string;
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
  onAddTask?: (title?: string) => void;
  isCompleted?: boolean;
  draggable?: boolean;
  companies?: { id: string; name: string }[];
  taskLabelsMap?: Map<string, TaskLabel[]>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const COMPACT_TASK_LIMIT = 4;

function BoardColumn({ id, label, color, tasks, companyId, categories, onTaskClick, onAddTask, isCompleted, draggable, companies, taskLabelsMap, selectedIds, onToggleSelect }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isBodyCollapsed, setIsBodyCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const createInlineMutation = useMutation({
    mutationFn: async ({ title, dueDate }: { title: string; dueDate?: string }) => {
      const response = await apiRequest("POST", "/api/tasks", {
        companyId,
        title,
        status: "pending",
        type: "assigned",
        creditCost: "1",
        priority: "medium",
        categoryId: id !== "uncategorized" && id !== "completed" && id !== "pending" && id !== "in_progress" && id !== "review" && id !== "approved" && !id.startsWith("cat-name:") ? id : null,
        dueDate: dueDate || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const getCompanyName = (cid: string) => companies?.find((c) => c.id === cid)?.name;

  const displayedTasks = showAll ? tasks : tasks.slice(0, COMPACT_TASK_LIMIT);
  const hiddenCount = tasks.length - COMPACT_TASK_LIMIT;

  return (
    <div className="flex flex-col w-[280px] shrink-0" data-testid={`board-column-${id}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-2.5 py-2.5 border ${isBodyCollapsed ? "rounded-lg" : "rounded-t-lg border-b-0"} ${isOver && !isBodyCollapsed ? "bg-primary/10 border-primary" : "bg-muted/30"}`}>
        <button
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          onClick={() => setIsBodyCollapsed(v => !v)}
          data-testid={`button-collapse-column-${id}`}
        >
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isBodyCollapsed ? "" : "rotate-90"}`} />
          {color && <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20" style={{ backgroundColor: color }} />}
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          <span className="text-sm font-semibold truncate">{label}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full shrink-0">{tasks.length}</Badge>
        </button>
        {onAddTask && !isCompleted && !isBodyCollapsed && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onAddTask()} data-testid={`button-add-task-header-${id}`}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Body */}
      {!isBodyCollapsed && (
        <div
          ref={setNodeRef}
          className={`flex flex-col rounded-b-lg border overflow-hidden ${isOver ? "bg-primary/5 border-primary" : "bg-card"}`}
        >
          <div className="p-2 space-y-2">
            {displayedTasks.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                companyId={task.companyId || companyId}
                onTaskClick={onTaskClick}
                categories={categories}
                draggable={draggable && !isCompleted}
                companyName={companies ? getCompanyName(task.companyId) : undefined}
                taskLabels={taskLabelsMap?.get(task.id) || []}
                isSelected={selectedIds?.has(task.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {tasks.length === 0 && (
              <div className="flex items-center justify-center h-14 text-xs text-muted-foreground">
                {isOver ? "Drop here" : "No tasks"}
              </div>
            )}
          </div>

          {/* Expand / collapse task list */}
          {tasks.length > COMPACT_TASK_LIMIT && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t transition-colors text-center"
              data-testid={`button-show-all-${id}`}
            >
              {showAll ? "Show less" : `Show ${hiddenCount} more task${hiddenCount !== 1 ? "s" : ""}`}
            </button>
          )}

          {!isCompleted && companyId !== "all" && (
            <div className="border-t bg-muted/20">
              <InlineAddTask
                onAdd={(title, dueDate) => createInlineMutation.mutate({ title, dueDate })}
                isPending={createInlineMutation.isPending}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Outstanding Summary Bar ──────────────────────────────────────────────────

function OutstandingBar({ tasks, activeFilter, onFilter }: {
  tasks: Task[];
  activeFilter: OutstandingFilter;
  onFilter: (f: OutstandingFilter) => void;
}) {
  const active = tasks.filter((t) => t.status !== "completed" && t.approvalStatus !== "rejected");
  const overdue = active.filter((t) => t.dueDate && getDaysDiff(t.dueDate) < 0).length;
  const thisWeek = active.filter((t) => t.dueDate && getDaysDiff(t.dueDate) >= 0 && getDaysDiff(t.dueDate) <= 7).length;
  const inProgress = active.filter((t) => t.status === "in_progress").length;
  const inReview = active.filter((t) => t.status === "review").length;

  const items = [
    { key: "overdue" as const, label: "Overdue", count: overdue, icon: AlertTriangle, color: "text-destructive" },
    { key: "this-week" as const, label: "Due This Week", count: thisWeek, icon: Calendar, color: "text-orange-600 dark:text-orange-400" },
    { key: "in-progress" as const, label: "In Progress", count: inProgress, icon: Clock, color: "text-blue-600 dark:text-blue-400" },
    { key: "in-review" as const, label: "In Review", count: inReview, icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(({ key, label, count, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onFilter(activeFilter === key ? null : key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            activeFilter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
          }`}
          data-testid={`outstanding-${key}`}
        >
          <Icon className={`h-3.5 w-3.5 ${activeFilter === key ? "" : color}`} />
          <span>{label}</span>
          <Badge variant={activeFilter === key ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 ml-0.5">
            {count}
          </Badge>
        </button>
      ))}
    </div>
  );
}

// ─── Task List Row ────────────────────────────────────────────────────────────

function TaskListRow({ task, companyId, categories, onTaskClick, companyName, taskLabels = [], isSelected, onToggleSelect }: {
  task: Task; companyId: string; categories: TaskCategory[]; onTaskClick: (task: Task) => void; companyName?: string; taskLabels?: TaskLabel[]; isSelected?: boolean; onToggleSelect?: (id: string) => void;
}) {
  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
  return (
    <Card className={`group cursor-pointer hover:shadow-sm transition-shadow ${isSelected ? "ring-2 ring-primary" : ""}`} onClick={() => onTaskClick(task)} data-testid={`list-task-${task.id}`}>
      <CardContent className="py-2.5 px-4 flex items-center gap-3">
        {onToggleSelect && (
          <button
            className={`shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"}`}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
            data-testid={`checkbox-list-select-${task.id}`}
          >
            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
        )}
        {task.status === "completed"
          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          {companyName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />{companyName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {taskLabels.length > 0 && <LabelPills labels={taskLabels} max={2} />}
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

// ─── Grid View (Spreadsheet) ──────────────────────────────────────────────────

function GridRow({ task, categories, taskLabels, companyId, onTaskClick, companyName, isSelected, onToggleSelect }: {
  task: Task; categories: TaskCategory[]; taskLabels: TaskLabel[]; companyId: string; onTaskClick: (task: Task) => void; companyName?: string; isSelected?: boolean; onToggleSelect?: (id: string) => void;
}) {
  const { toast } = useToast();
  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
  const isCompleted = task.status === "completed";

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/tasks/${task.id}`, { status: isCompleted ? "pending" : "completed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  return (
    <tr
      className={`group border-b hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
      onClick={() => onTaskClick(task)}
      data-testid={`grid-task-${task.id}`}
    >
      {/* Selection checkbox */}
      <td className="p-2 w-8">
        {onToggleSelect ? (
          <button
            className={`transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"}`}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
            data-testid={`checkbox-grid-select-${task.id}`}
          >
            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
        ) : null}
      </td>
      {/* Complete toggle */}
      <td className="p-2 w-8">
        <button
          className="text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(); }}
          data-testid={`button-grid-complete-${task.id}`}
        >
          {isCompleted
            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
            : <Circle className="h-4 w-4" />
          }
        </button>
      </td>

      {/* Task name */}
      <td className="p-2 min-w-[220px]">
        <span className={`text-sm font-medium line-clamp-1 ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </span>
        {companyName && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <Building2 className="h-3 w-3" />{companyName}
          </p>
        )}
      </td>

      {/* Assigned to */}
      <td className="p-2 w-28">
        <BoardTaskAvatars taskId={task.id} />
      </td>

      {/* Start date */}
      <td className="p-2 w-24">
        {task.startDate ? (
          <span className="text-xs text-muted-foreground">
            {formatShortDate(task.startDate)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Due date */}
      <td className="p-2 w-24">
        {task.dueDate ? (
          <span className={`text-xs font-medium ${getDueDateClass(task)}`}>
            {formatShortDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Bucket / Category */}
      <td className="p-2 w-36">
        {cat ? (
          <span className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#888" }} />
            <span className="truncate max-w-[110px]">{cat.name}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Status */}
      <td className="p-2 w-28">
        {getStatusChip(task.status, task.approvalStatus)}
      </td>

      {/* Priority */}
      <td className="p-2 w-24">
        <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>
      </td>

      {/* Labels */}
      <td className="p-2 min-w-[100px]">
        <LabelPills labels={taskLabels} max={2} />
      </td>

      {/* Quick look — checklist progress + credits */}
      <td className="p-2 w-28">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ChecklistCount taskId={task.id} />
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{task.creditCost}cr</Badge>
        </div>
      </td>

      {/* Actions */}
      <td className="p-2 w-8">
        <QuickActionMenu task={task} companyId={companyId} onOpen={() => onTaskClick(task)} />
      </td>
    </tr>
  );
}

function GridView({ tasks, categories, taskLabelsMap, companyId, onTaskClick, companies, selectedIds, onToggleSelect, onSelectAll }: {
  tasks: Task[];
  categories: TaskCategory[];
  taskLabelsMap: Map<string, TaskLabel[]>;
  companyId: string;
  onTaskClick: (task: Task) => void;
  companies?: { id: string; name: string }[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
}) {
  const [sortKey, setSortKey] = useState<string>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "dueDate") {
        av = a.dueDate ? getDaysDiff(a.dueDate) : 99999;
        bv = b.dueDate ? getDaysDiff(b.dueDate) : 99999;
      } else if (sortKey === "title") {
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      } else if (sortKey === "priority") {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        av = order[a.priority || "medium"] ?? 2;
        bv = order[b.priority || "medium"] ?? 2;
      } else {
        av = 0; bv = 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [tasks, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ label, sKey }: { label: string; sKey: string }) => (
    <th
      className="text-left p-2 cursor-pointer hover:bg-muted/60 transition-colors select-none whitespace-nowrap"
      onClick={() => toggleSort(sKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === sKey ? "text-primary" : "text-muted-foreground/50"}`} />
      </span>
    </th>
  );

  const getCompanyName = (cid: string) => companies?.find((c) => c.id === cid)?.name;

  const allIds = sorted.map((t) => t.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds?.has(id));

  return (
    <div className="border rounded-lg overflow-auto" data-testid="grid-view">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
            <th className="p-2 w-28">
              {onSelectAll && (
                <button
                  onClick={() => onSelectAll(allSelected ? [] : allIds)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${allSelected ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title={allSelected ? "Deselect all" : "Select all"}
                  data-testid="checkbox-grid-select-all"
                >
                  {allSelected ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                  <span>{allSelected ? "Deselect All" : "Select All"}</span>
                </button>
              )}
            </th>
            <th className="p-2 w-8"></th>
            <SortHeader label="Task Name" sKey="title" />
            <th className="text-left p-2 w-28 whitespace-nowrap">Assigned To</th>
            <th className="text-left p-2 w-24 whitespace-nowrap">Start</th>
            <SortHeader label="Due Date" sKey="dueDate" />
            <th className="text-left p-2 w-36 whitespace-nowrap">Bucket</th>
            <SortHeader label="Status" sKey="status" />
            <SortHeader label="Priority" sKey="priority" />
            <th className="text-left p-2 min-w-[100px]">Labels</th>
            <th className="text-left p-2 w-28 whitespace-nowrap">Quick Look</th>
            <th className="p-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={12} className="text-center py-10 text-muted-foreground text-sm">No tasks found.</td>
            </tr>
          ) : (
            sorted.map((task) => (
              <GridRow
                key={task.id}
                task={task}
                categories={categories}
                taskLabels={taskLabelsMap.get(task.id) || []}
                companyId={task.companyId || companyId}
                onTaskClick={onTaskClick}
                companyName={companies ? getCompanyName(task.companyId) : undefined}
                isSelected={selectedIds?.has(task.id)}
                onToggleSelect={onToggleSelect}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ tasks, onTaskClick, taskLabelsMap, categories }: {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  taskLabelsMap: Map<string, TaskLabel[]>;
  categories: TaskCategory[];
}) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };
  const goToday = () => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDow = firstDay.getDay();
    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(currentYear, currentMonth, -i), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(currentYear, currentMonth, d), inMonth: true });
    }
    while (days.length < 42) {
      days.push({ date: new Date(currentYear, currentMonth + 1, days.length - lastDay.getDate() - startDow + 1), inMonth: false });
    }
    return days;
  }, [currentYear, currentMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.filter((t) => t.dueDate).forEach((t) => {
      const key = t.dueDate!.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  const todayKey = now.toISOString().slice(0, 10);
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div data-testid="calendar-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} data-testid="calendar-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={goToday} data-testid="calendar-today">
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} data-testid="calendar-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold py-2 bg-muted/40 text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const key = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
            const dayTasks = tasksByDate.get(key) || [];
            const isToday = key === todayKey;
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <div
                key={i}
                className={`min-h-[110px] p-1.5 border-b border-r text-xs
                  ${i % 7 === 6 ? "border-r-0" : ""}
                  ${i >= 35 ? "border-b-0" : ""}
                  ${!day.inMonth ? "bg-muted/20" : isWeekend ? "bg-muted/5" : "bg-background"}
                `}
              >
                <div className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 text-xs font-medium
                  ${isToday ? "bg-primary text-primary-foreground" : !day.inMonth ? "text-muted-foreground/50" : ""}
                `}>
                  {day.date.getDate()}
                </div>

                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => {
                    const taskCat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
                    const taskLabels = taskLabelsMap.get(task.id) || [];
                    const bgColor = taskLabels[0]?.color || taskCat?.color || "hsl(var(--primary))";
                    return (
                      <button
                        key={task.id}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate hover:opacity-80 transition-opacity text-white`}
                        style={{ backgroundColor: task.status === "completed" ? "#94a3b8" : bgColor }}
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                        data-testid={`calendar-task-${task.id}`}
                        title={task.title}
                      >
                        {task.status === "completed" ? "✓ " : ""}{task.title}
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1 font-medium">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ProjectBoard ────────────────────────────────────────────────────────

export function ProjectBoard({
  companyId,
  tasks,
  categories,
  tasksLoading,
  onTaskClick,
  onAddTask,
  showCompanyLabel,
  companies,
  disableDnD,
}: ProjectBoardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { toggleSidebar, state: sidebarState } = useSidebar();
  const [viewMode, setViewMode] = useState<BoardViewMode>("board");
  const [outstandingFilter, setOutstandingFilter] = useState<OutstandingFilter>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [boardStatusFilter, setBoardStatusFilter] = useState<string>("active");
  const [listStatusFilter, setListStatusFilter] = useState<string>("active");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState<string>("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const setSelectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

  // Members for reassign (only when single company)
  const { data: members = [] } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ["/api/companies", companyId, "members"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/members`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: companyId !== "all" && reassignOpen,
  });

  // Bulk mutations
  const bulkCompleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selectedIds].map((id) => apiRequest("PATCH", `/api/tasks/${id}`, { status: "completed" })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: `${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} completed` });
      clearSelection();
    },
    onError: () => toast({ title: "Failed to complete tasks", variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selectedIds].map((id) => apiRequest("DELETE", `/api/tasks/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: `${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} deleted` });
      clearSelection();
    },
    onError: () => toast({ title: "Failed to delete tasks", variant: "destructive" }),
  });

  const bulkReassignMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selectedIds].map((id) => apiRequest("PATCH", `/api/tasks/${id}`, { assignedTo: reassignUserId || null })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: `${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} reassigned` });
      setReassignOpen(false);
      clearSelection();
    },
    onError: () => toast({ title: "Failed to reassign tasks", variant: "destructive" }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Label data (per company)
  const { data: labels = [] } = useQuery<TaskLabel[]>({
    queryKey: ["/api/companies", companyId, "task-labels"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/task-labels`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: companyId !== "all",
    staleTime: 30000,
  });

  const { data: labelAssignments = [] } = useQuery<TaskLabelAssignment[]>({
    queryKey: ["/api/companies", companyId, "task-label-assignments"],
    queryFn: async () => {
      const r = await fetch(`/api/companies/${companyId}/task-label-assignments`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: companyId !== "all",
    staleTime: 30000,
  });

  // Build taskId → TaskLabel[] map
  const taskLabelsMap = useMemo(() => {
    const map = new Map<string, TaskLabel[]>();
    for (const a of labelAssignments) {
      const label = labels.find((l) => l.id === a.labelId);
      if (label) {
        if (!map.has(a.taskId)) map.set(a.taskId, []);
        map.get(a.taskId)!.push(label);
      }
    }
    return map;
  }, [labels, labelAssignments]);

  const updateCategoryMutation = useMutation({
    mutationFn: ({ taskId, categoryId }: { taskId: string; categoryId: string | null }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to move task", variant: "destructive" }),
  });

  // 90-day window
  const windowedTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const completedCutoff = new Date(now);
    completedCutoff.setDate(now.getDate() - 90);

    return tasks.filter((t) => {
      if (t.status === "cadence_parent") return false;
      if (t.status === "completed") {
        if (!t.completedAt) return false;
        return new Date(t.completedAt) >= completedCutoff;
      }
      if (t.approvalStatus === "rejected") return false;
      return true;
    });
  }, [tasks]);

  // Outstanding filter
  const outstandingFiltered = useMemo(() => {
    if (!outstandingFilter) return windowedTasks;
    return windowedTasks.filter((t) => {
      if (outstandingFilter === "overdue") return t.status !== "completed" && t.dueDate != null && getDaysDiff(t.dueDate) < 0;
      if (outstandingFilter === "this-week") return t.status !== "completed" && t.dueDate != null && getDaysDiff(t.dueDate) >= 0 && getDaysDiff(t.dueDate) <= 7;
      if (outstandingFilter === "in-progress") return t.status === "in_progress";
      if (outstandingFilter === "in-review") return t.status === "review";
      return true;
    });
  }, [windowedTasks, outstandingFilter]);

  // Assignee filter
  const assigneeFiltered = useMemo(() => {
    if (assigneeFilter === "me" && user?.id) {
      return outstandingFiltered.filter((t) => t.assignedTo === user.id || t.assignedBy === user.id);
    }
    return outstandingFiltered;
  }, [outstandingFiltered, assigneeFilter, user?.id]);

  // Label filter
  const labelFiltered = useMemo(() => {
    if (!activeLabelId) return assigneeFiltered;
    return assigneeFiltered.filter((t) => {
      const tLabels = taskLabelsMap.get(t.id) || [];
      return tLabels.some((l) => l.id === activeLabelId);
    });
  }, [assigneeFiltered, activeLabelId, taskLabelsMap]);

  // Board status filter (for board/grid views)
  const boardFilteredTasks = useMemo(() => {
    if (boardStatusFilter === "active") return labelFiltered.filter((t) => t.status !== "completed");
    if (boardStatusFilter === "all") return labelFiltered;
    return labelFiltered.filter((t) => t.status === boardStatusFilter);
  }, [labelFiltered, boardStatusFilter]);

  const sortByDue = (arr: Task[]) =>
    arr.slice().sort((a, b) => {
      const da = a.dueDate ? getDaysDiff(a.dueDate) : 9999;
      const db = b.dueDate ? getDaysDiff(b.dueDate) : 9999;
      return da - db;
    });

  const isAllCompanies = companyId === "all" || disableDnD;

  // Kanban columns
  const columns = useMemo(() => {
    const activeTasks = boardFilteredTasks.filter((t) => t.status !== "completed");
    const completedTasks = labelFiltered.filter((t) => t.status === "completed");

    const completedCol = {
      id: "completed",
      label: "Completed",
      color: null as string | null,
      tasks: completedTasks.slice().sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      }),
      isCompleted: true,
    };

    // All-companies view: group by category name (deduped across companies)
    if (isAllCompanies && categories.length > 0) {
      // Build a map: categoryId → name for all known categories
      const idToName = new Map(categories.map((c) => [c.id, c.name]));
      // Deduplicate column names; keep first color seen for each name
      const nameToColor = new Map<string, string | null>();
      categories.forEach((c) => {
        if (!nameToColor.has(c.name)) nameToColor.set(c.name, c.color);
      });
      const uniqueNames = [...nameToColor.keys()];
      const categorizedIds = new Set(categories.map((c) => c.id));
      return [
        ...uniqueNames.map((name) => ({
          id: `cat-name:${name}`,
          label: name,
          color: nameToColor.get(name) ?? null,
          tasks: sortByDue(activeTasks.filter((t) => t.categoryId && idToName.get(t.categoryId) === name)),
          isCompleted: false,
        })),
        {
          id: "uncategorized",
          label: "Uncategorized",
          color: null as string | null,
          tasks: sortByDue(activeTasks.filter((t) => !t.categoryId || !categorizedIds.has(t.categoryId))),
          isCompleted: false,
        },
        completedCol,
      ];
    }

    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    return [
      ...sorted.map((cat) => ({
        id: cat.id,
        label: cat.name,
        color: cat.color,
        tasks: sortByDue(activeTasks.filter((t) => t.categoryId === cat.id)),
        isCompleted: false,
      })),
      ...((() => {
        const uncatTasks = sortByDue(activeTasks.filter((t) => !t.categoryId));
        return uncatTasks.length > 0 ? [{ id: "uncategorized", label: "Uncategorized", color: null as string | null, tasks: uncatTasks, isCompleted: false }] : [];
      })()),
      completedCol,
    ];
  }, [categories, boardFilteredTasks, labelFiltered, isAllCompanies]);

  // By-month grouping
  const byMonthColumns = useMemo(() => {
    const activeTasks = labelFiltered.filter((t) => t.status !== "completed");
    const groups = new Map<string, Task[]>();
    activeTasks.forEach((t) => {
      const isOverdue = t.dueDate != null && getDaysDiff(t.dueDate) < 0;
      const key = getMonthKey(t.dueDate, isOverdue);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, monthTasks]) => ({
        key,
        label: getMonthLabel(key),
        total: monthTasks.length,
        categoryGroups: isAllCompanies
          ? [{ id: "all", name: "", color: null, tasks: sortByDue(monthTasks) }]
          : groupByCategory(monthTasks, categories),
      }));
  }, [labelFiltered, categories, isAllCompanies]);

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
    labelFiltered.filter((t) => t.status !== "completed").forEach((t) => {
      buckets[getDueDateBucket(t)].tasks.push(t);
    });
    return Object.values(buckets).filter((b) => b.tasks.length > 0).sort((a, b) => a.order - b.order);
  }, [labelFiltered]);

  // List view tasks
  const listTasks = useMemo(() => {
    let t = labelFiltered.filter((task) => task.status !== "cadence_parent");
    if (listStatusFilter === "active") t = t.filter((task) => task.status !== "completed");
    else if (listStatusFilter !== "all") t = t.filter((task) => task.status === listStatusFilter);
    return t.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return getDaysDiff(a.dueDate) - getDaysDiff(b.dueDate);
    });
  }, [labelFiltered, listStatusFilter]);

  // Grid view tasks (uses board status filter)
  const gridTasks = useMemo(() => {
    return boardFilteredTasks;
  }, [boardFilteredTasks]);

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
    if (isAllCompanies) return;
    const newCategoryId = newColumnId === "uncategorized" ? null : newColumnId;
    if (task.categoryId === newCategoryId) return;
    updateCategoryMutation.mutate({ taskId, categoryId: newCategoryId });
  }

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const getCompanyName = (cid: string) => companies?.find((c) => c.id === cid)?.name;
  const canDnD = !disableDnD && !isAllCompanies;

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

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg flex-wrap" data-testid="bulk-toolbar">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => bulkCompleteMutation.mutate()}
            disabled={bulkCompleteMutation.isPending}
            data-testid="bulk-complete"
          >
            {bulkCompleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Complete
          </Button>
          {companyId !== "all" && (
            <Button
              variant="outline" size="sm" className="h-7 text-xs gap-1.5"
              onClick={() => setReassignOpen(true)}
              data-testid="bulk-reassign"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Reassign
            </Button>
          )}
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
            onClick={() => bulkDeleteMutation.mutate()}
            disabled={bulkDeleteMutation.isPending}
            data-testid="bulk-delete"
          >
            {bulkDeleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection} data-testid="bulk-clear">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* View Toggle + Filters */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode buttons */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            {([
              { mode: "board" as const, icon: LayoutGrid, label: "Board" },
              { mode: "by-month" as const, icon: Calendar, label: "By Month" },
              { mode: "by-due-date" as const, icon: CalendarDays, label: "By Due Date" },
              { mode: "list" as const, icon: List, label: "List" },
              { mode: "grid" as const, icon: TableProperties, label: "Grid" },
              { mode: "calendar" as const, icon: CalendarRange, label: "Calendar" },
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
                <span className="hidden md:inline">{label}</span>
              </Button>
            ))}
          </div>

          {/* Focus mode / sidebar collapse */}
          {viewMode === "board" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={toggleSidebar}
              title={sidebarState === "expanded" ? "Collapse sidebar for more space" : "Expand sidebar"}
              data-testid="button-focus-mode"
            >
              {sidebarState === "expanded"
                ? <PanelLeftClose className="h-3.5 w-3.5" />
                : <PanelLeftOpen className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">{sidebarState === "expanded" ? "Focus" : "Expand"}</span>
            </Button>
          )}

          {/* Assignee filter */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={assigneeFilter === "all" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 h-8"
              onClick={() => setAssigneeFilter("all")}
              data-testid="assignee-filter-all"
            >
              All
            </Button>
            <Button
              variant={assigneeFilter === "me" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 h-8"
              onClick={() => setAssigneeFilter("me")}
              data-testid="assignee-filter-me"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Mine
            </Button>
          </div>

          {/* Label filter pills */}
          {labels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {labels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLabelId(activeLabelId === l.id ? null : l.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold text-white transition-all ${activeLabelId === l.id ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-75 hover:opacity-100"}`}
                  style={{ backgroundColor: l.color, ringColor: l.color }}
                  data-testid={`label-filter-${l.id}`}
                  title={l.name}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {/* Grid select-all button */}
          {viewMode === "grid" && (
            <Button
              variant={selectedIds.size > 0 && selectedIds.size === gridTasks.length ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                if (selectedIds.size > 0 && selectedIds.size === gridTasks.length) {
                  clearSelection();
                } else {
                  setSelectAll(gridTasks.map((t) => t.id));
                }
              }}
              data-testid="button-grid-select-all"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedIds.size > 0 && selectedIds.size === gridTasks.length ? "Deselect All" : "Select All"}
            </Button>
          )}
          {/* Board/Grid status filter */}
          {(viewMode === "board" || viewMode === "grid") && (
            <div className="flex items-center gap-1 flex-wrap">
              {(["active", "pending", "in_progress", "review", "approved", "completed"] as const).map((s) => (
                <Button
                  key={s}
                  variant={boardStatusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setBoardStatusFilter(s)}
                  data-testid={`board-filter-${s}`}
                >
                  {s === "active" ? "Active" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          )}

          {/* List status filter */}
          {viewMode === "list" && (
            <div className="flex items-center gap-1 flex-wrap">
              {(["active", "all", "pending", "in_progress", "review", "completed"] as const).map((s) => (
                <Button
                  key={s}
                  variant={listStatusFilter === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setListStatusFilter(s)}
                  data-testid={`list-filter-${s}`}
                >
                  {s === "active" ? "Active" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          )}

          {(outstandingFilter || assigneeFilter === "me" || activeLabelId) && (
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { setOutstandingFilter(null); setAssigneeFilter("all"); setActiveLabelId(null); }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Board View ──────────────────────────────────────────────── */}
      {viewMode === "board" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-wrap gap-3 pb-4">
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
                onAddTask={!col.isCompleted && !isAllCompanies && onAddTask
                  ? () => onAddTask(col.id === "uncategorized" ? undefined : col.id)
                  : undefined}
                isCompleted={col.isCompleted}
                draggable={canDnD}
                companies={showCompanyLabel ? companies : undefined}
                taskLabelsMap={taskLabelsMap}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
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
                  draggable
                  taskLabels={taskLabelsMap.get(activeTask.id) || []}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── By Month View ─────────────────────────────────────────── */}
      {viewMode === "by-month" && (
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="by-month-columns">
          {byMonthColumns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm w-full">No tasks in window.</div>
          ) : (
            byMonthColumns.map((group) => (
              <div key={group.key} className="flex flex-col min-w-[280px] max-w-[320px]" data-testid={`month-col-${group.key}`}>
                <div className="flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 bg-muted/30">
                  <span className="text-sm font-semibold truncate">{group.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">{group.total}</Badge>
                </div>
                <div className="rounded-b-lg border bg-card overflow-y-auto max-h-[65vh]">
                  {group.categoryGroups.map((catGroup) => (
                    <div key={catGroup.id} className="p-2">
                      {catGroup.name && group.categoryGroups.length > 1 && (
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                          {catGroup.color && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catGroup.color }} />
                          )}
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            {catGroup.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">({catGroup.tasks.length})</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {catGroup.tasks.map((task) => (
                          <BoardCard
                            key={task.id}
                            task={task}
                            companyId={task.companyId || companyId}
                            onTaskClick={onTaskClick}
                            categories={categories}
                            draggable={false}
                            companyName={showCompanyLabel ? getCompanyName(task.companyId) : undefined}
                            taskLabels={taskLabelsMap.get(task.id) || []}
                          />
                        ))}
                      </div>
                      {catGroup.tasks.length === 0 && (
                        <div className="text-center py-2 text-xs text-muted-foreground">Empty</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── By Due Date View ──────────────────────────────────────── */}
      {viewMode === "by-due-date" && (
        <div className="space-y-6">
          {byDueDateGroups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No tasks found.</div>
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
                    <TaskListRow
                      key={task.id}
                      task={task}
                      companyId={task.companyId || companyId}
                      categories={categories}
                      onTaskClick={onTaskClick}
                      companyName={showCompanyLabel ? getCompanyName(task.companyId) : undefined}
                      taskLabels={taskLabelsMap.get(task.id) || []}
                      isSelected={selectedIds.has(task.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── List View ────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {listTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No tasks found.</div>
          ) : (
            listTasks.map((task) => (
              <TaskListRow
                key={task.id}
                task={task}
                companyId={task.companyId || companyId}
                categories={categories}
                onTaskClick={onTaskClick}
                companyName={showCompanyLabel ? getCompanyName(task.companyId) : undefined}
                taskLabels={taskLabelsMap.get(task.id) || []}
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={toggleSelect}
              />
            ))
          )}
        </div>
      )}

      {/* ── Grid View ────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <GridView
          tasks={gridTasks}
          categories={categories}
          taskLabelsMap={taskLabelsMap}
          companyId={companyId}
          onTaskClick={onTaskClick}
          companies={showCompanyLabel ? companies : undefined}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={setSelectAll}
        />
      )}

      {/* ── Calendar View ─────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <CalendarView
          tasks={labelFiltered}
          onTaskClick={onTaskClick}
          taskLabelsMap={taskLabelsMap}
          categories={categories}
        />
      )}

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {selectedIds.size} Task{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={reassignUserId} onValueChange={setReassignUserId}>
              <SelectTrigger data-testid="reassign-user-select">
                <SelectValue placeholder="Pick a team member…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => bulkReassignMutation.mutate()}
              disabled={!reassignUserId || bulkReassignMutation.isPending}
              data-testid="confirm-bulk-reassign"
            >
              {bulkReassignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
