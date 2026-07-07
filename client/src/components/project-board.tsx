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
  Loader2,
  Trash2,
  ExternalLink,
  Play,
  Pause,
  X,
  Building2,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Task, TaskCategory, TaskChecklistItem } from "@shared/schema";

type BoardViewMode = "board" | "by-month" | "by-due-date" | "list";
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

// Group tasks by category within a set of tasks
function groupByCategory(
  tasks: Task[],
  categories: TaskCategory[]
): { id: string; name: string; color: string | null; tasks: Task[] }[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<string, { id: string; name: string; color: string | null; tasks: Task[] }>();

  // Ensure each category appears (sorted by sortOrder)
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
            variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Delete "{task.title}"? This cannot be undone.</AlertDialogDescription>
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

// ─── Board Card ───────────────────────────────────────────────────────────────

interface BoardCardProps {
  task: Task;
  companyId: string;
  onTaskClick: (task: Task) => void;
  isDragging?: boolean;
  categories: TaskCategory[];
  draggable?: boolean;
  companyName?: string;
}

function BoardCard({ task, companyId, onTaskClick, isDragging, categories, draggable = true, companyName }: BoardCardProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging: selfDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: selfDragging ? 0.3 : 1 }
    : undefined;

  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;

  return (
    <div ref={setNodeRef} style={style} data-testid={`board-card-${task.id}`}>
      <Card
        className={`group cursor-pointer hover:shadow-md transition-shadow border ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
        onClick={() => onTaskClick(task)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-1">
            {draggable && (
              <button
                {...attributes}
                {...listeners}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                data-testid={`drag-handle-${task.id}`}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium leading-snug line-clamp-2 ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </span>
            </div>
            <QuickActionMenu task={task} companyId={companyId} onOpen={() => onTaskClick(task)} />
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {getStatusChip(task.status, task.approvalStatus)}
            {task.dueDate && (
              <span className={`text-xs flex items-center gap-0.5 ${getDueDateClass(task)}`}>
                <Clock className="h-3 w-3" />
                {getDueDateLabel(task)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <BoardTaskAvatars taskId={task.id} />
              {companyName && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {companyName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {cat && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#888" }} title={cat.name} />
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{task.creditCost}cr</Badge>
            </div>
          </div>

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
}

function BoardColumn({ id, label, color, tasks, companyId, categories, onTaskClick, onAddTask, isCompleted, draggable, companies }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const createInlineMutation = useMutation({
    mutationFn: async ({ title, dueDate }: { title: string; dueDate?: string }) => {
      const response = await apiRequest("POST", "/api/tasks", {
        companyId,
        title,
        status: "pending",
        type: "assigned",
        creditCost: "1",
        priority: "medium",
        categoryId: id !== "uncategorized" && id !== "completed" && !companies?.find((c) => c.id === id) ? id : null,
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

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px]" data-testid={`board-column-${id}`}>
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 ${isOver ? "bg-primary/10 border-primary" : "bg-muted/40"}`}>
        <div className="flex items-center gap-2">
          {color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
          {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          <span className="text-sm font-semibold truncate">{label}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tasks.length}</Badge>
        </div>
        {onAddTask && !isCompleted && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddTask()} data-testid={`button-add-task-header-${id}`}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col min-h-[120px] rounded-b-lg border overflow-hidden ${isOver ? "bg-primary/5 border-primary" : "bg-muted/20"}`}
      >
        <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
          {tasks.map((task) => (
            <BoardCard
              key={task.id}
              task={task}
              companyId={task.companyId || companyId}
              onTaskClick={onTaskClick}
              categories={categories}
              draggable={draggable && !isCompleted}
              companyName={companies ? getCompanyName(task.companyId) : undefined}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
              {isOver ? "Drop here" : "No tasks"}
            </div>
          )}
        </div>

        {!isCompleted && (
          <div className="border-t bg-background/50">
            <InlineAddTask
              onAdd={(title, dueDate) => createInlineMutation.mutate({ title, dueDate })}
              isPending={createInlineMutation.isPending}
            />
          </div>
        )}
      </div>
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

function TaskListRow({ task, companyId, categories, onTaskClick, companyName }: {
  task: Task; companyId: string; categories: TaskCategory[]; onTaskClick: (task: Task) => void; companyName?: string;
}) {
  const cat = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
  return (
    <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onTaskClick(task)} data-testid={`list-task-${task.id}`}>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        {getStatusChip(task.status, task.approvalStatus)}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          )}
          {companyName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />{companyName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
  const [viewMode, setViewMode] = useState<BoardViewMode>("board");
  const [outstandingFilter, setOutstandingFilter] = useState<OutstandingFilter>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [boardStatusFilter, setBoardStatusFilter] = useState<string>("active");
  const [listStatusFilter, setListStatusFilter] = useState<string>("active");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const updateCategoryMutation = useMutation({
    mutationFn: ({ taskId, categoryId }: { taskId: string; categoryId: string | null }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", { companyId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to move task", variant: "destructive" }),
  });

  // 90-day window:
  // - Non-completed tasks: ALWAYS included (no dueDate cutoff)
  // - Completed tasks: shown if completedAt within last 90 days
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

  // Apply outstanding filter
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

  // Apply assignee filter
  const assigneeFiltered = useMemo(() => {
    if (assigneeFilter === "me" && user?.id) {
      return outstandingFiltered.filter((t) => t.assignedTo === user.id || t.assignedBy === user.id);
    }
    return outstandingFiltered;
  }, [outstandingFiltered, assigneeFilter, user?.id]);

  // Apply board status filter
  const boardFilteredTasks = useMemo(() => {
    if (boardStatusFilter === "active") return assigneeFiltered.filter((t) => t.status !== "completed");
    if (boardStatusFilter === "all") return assigneeFiltered;
    return assigneeFiltered.filter((t) => t.status === boardStatusFilter);
  }, [assigneeFiltered, boardStatusFilter]);

  const sortByDue = (arr: Task[]) =>
    arr.slice().sort((a, b) => {
      const da = a.dueDate ? getDaysDiff(a.dueDate) : 9999;
      const db = b.dueDate ? getDaysDiff(b.dueDate) : 9999;
      return da - db;
    });

  // Build kanban columns
  // - Single company: category swimlanes + Uncategorized + Completed
  // - All companies: company swimlanes + Completed
  const isAllCompanies = companyId === "all" || disableDnD;

  const columns = useMemo(() => {
    const activeTasks = boardFilteredTasks.filter((t) => t.status !== "completed");
    const completedTasks = boardFilteredTasks.filter((t) => t.status === "completed");

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

    if (isAllCompanies && companies && companies.length > 0) {
      // Company swimlanes
      return [
        ...companies.map((company) => ({
          id: company.id,
          label: company.name,
          color: null as string | null,
          tasks: sortByDue(activeTasks.filter((t) => t.companyId === company.id)),
          isCompleted: false,
        })).filter((col) => col.tasks.length > 0 || true), // show all companies
        completedCol,
      ];
    }

    // Category swimlanes
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    return [
      ...sorted.map((cat) => ({
        id: cat.id,
        label: cat.name,
        color: cat.color,
        tasks: sortByDue(activeTasks.filter((t) => t.categoryId === cat.id)),
        isCompleted: false,
      })),
      {
        id: "uncategorized",
        label: "Uncategorized",
        color: null as string | null,
        tasks: sortByDue(activeTasks.filter((t) => !t.categoryId)),
        isCompleted: false,
      },
      completedCol,
    ];
  }, [categories, boardFilteredTasks, isAllCompanies, companies]);

  // By-month column grouping with category sub-groups
  const byMonthColumns = useMemo(() => {
    const activeTasks = assigneeFiltered.filter((t) => t.status !== "completed");
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
        // Sub-group by category within each month
        categoryGroups: isAllCompanies
          ? [{ id: "all", name: "", color: null, tasks: sortByDue(monthTasks) }]
          : groupByCategory(monthTasks, categories),
      }));
  }, [assigneeFiltered, categories, isAllCompanies]);

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
    assigneeFiltered.filter((t) => t.status !== "completed").forEach((t) => {
      buckets[getDueDateBucket(t)].tasks.push(t);
    });
    return Object.values(buckets).filter((b) => b.tasks.length > 0).sort((a, b) => a.order - b.order);
  }, [assigneeFiltered]);

  // List view tasks
  const listTasks = useMemo(() => {
    let t = assigneeFiltered.filter((task) => task.status !== "cadence_parent");
    if (listStatusFilter === "active") t = t.filter((task) => task.status !== "completed");
    else if (listStatusFilter !== "all") t = t.filter((task) => task.status === listStatusFilter);
    return t.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return getDaysDiff(a.dueDate) - getDaysDiff(b.dueDate);
    });
  }, [assigneeFiltered, listStatusFilter]);

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
    // Don't allow dropping onto company columns (no-op for category)
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

      {/* View Toggle + Assignee Filter */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2">
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

          {/* Assignee filter — always visible */}
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
        </div>

        <div className="flex items-center gap-1">
          {/* Board status filter */}
          {viewMode === "board" && (
            <div className="flex items-center gap-1">
              {(["active", "pending", "in_progress", "review", "approved"] as const).map((s) => (
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
            <div className="flex items-center gap-1">
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
          {(outstandingFilter || assigneeFilter === "me") && (
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { setOutstandingFilter(null); setAssigneeFilter("all"); }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
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
                companyId={col.isCompleted ? companyId : (isAllCompanies && !col.isCompleted ? col.id : companyId)}
                categories={categories}
                onTaskClick={onTaskClick}
                onAddTask={!col.isCompleted && !isAllCompanies && onAddTask
                  ? () => onAddTask(col.id === "uncategorized" ? undefined : col.id)
                  : undefined}
                isCompleted={col.isCompleted}
                draggable={canDnD}
                companies={showCompanyLabel ? companies : undefined}
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
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── By Month View (horizontal month columns, with category sub-groups) ─ */}
      {viewMode === "by-month" && (
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="by-month-columns">
          {byMonthColumns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm w-full">No tasks in window.</div>
          ) : (
            byMonthColumns.map((group) => (
              <div key={group.key} className="flex flex-col min-w-[280px] max-w-[320px]" data-testid={`month-col-${group.key}`}>
                <div className="flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 bg-muted/40">
                  <span className="text-sm font-semibold truncate">{group.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{group.total}</Badge>
                </div>
                <div className="rounded-b-lg border bg-muted/20 overflow-y-auto max-h-[60vh]">
                  {group.categoryGroups.map((catGroup) => (
                    <div key={catGroup.id} className="p-2">
                      {/* Category sub-header (omit when only one group or no label) */}
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

      {/* ── By Due Date View ──────────────────────────────────────────── */}
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
                    />
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
              <TaskListRow
                key={task.id}
                task={task}
                companyId={task.companyId || companyId}
                categories={categories}
                onTaskClick={onTaskClick}
                companyName={showCompanyLabel ? getCompanyName(task.companyId) : undefined}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
