import { ChevronRight, Calendar, Repeat, Users, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task } from "@shared/schema";
import { parseLocalDate } from "@/lib/utils";

interface TaskCategory {
  id: string;
  name: string;
  color?: string | null;
}

interface TaskGroupedViewProps {
  tasks: Task[];
  groupBy: "assignee" | "category";
  categories: TaskCategory[];
  userMap: Record<string, string>;
  onTaskClick: (task: Task) => void;
  getCompanyName?: (companyId: string) => string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  review: "Review",
  approved: "Approved",
  completed: "Completed",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  in_progress: "secondary",
  review: "default",
  approved: "secondary",
  completed: "secondary",
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  high: "destructive",
  medium: "default",
  low: "outline",
};

const CATEGORY_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#22c55e",
  "#ef4444",
];

function formatDueDate(dueDate: string | null | undefined, status: string): string {
  if (!dueDate) return "No due date";
  if (status === "completed") return "Completed";
  const d = parseLocalDate(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function getDueDateColor(dueDate: string | null | undefined, status: string): string {
  if (!dueDate || status === "completed") return "text-muted-foreground";
  const d = parseLocalDate(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return "text-destructive";
  if (diff <= 2) return "text-orange-500";
  return "text-muted-foreground";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function TaskRow({
  task,
  categories,
  userMap,
  onTaskClick,
  getCompanyName,
}: {
  task: Task;
  categories: TaskCategory[];
  userMap: Record<string, string>;
  onTaskClick: (task: Task) => void;
  getCompanyName?: (companyId: string) => string;
}) {
  const category = task.categoryId ? categories.find((c) => c.id === task.categoryId) : null;
  const assigneeName = task.assignedTo ? (userMap[task.assignedTo] || "Unknown") : null;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
      onClick={() => onTaskClick(task)}
      data-testid={`grouped-task-row-${task.id}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
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
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm mt-1 flex-wrap">
            {getCompanyName && (
              <>
                <span className="font-bold text-foreground dark:text-white">
                  {getCompanyName(task.companyId)}
                </span>
                <span className="text-muted-foreground">•</span>
              </>
            )}
            <span className={getDueDateColor(task.dueDate, task.status)}>
              <Calendar className="w-3 h-3 inline mr-1" />
              {formatDueDate(task.dueDate, task.status)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {assigneeName && (
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[10px]">{getInitials(assigneeName)}</AvatarFallback>
          </Avatar>
        )}
        <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>{task.priority}</Badge>
        <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>
          {STATUS_LABEL[task.status] ?? task.status.replace("_", " ")}
        </Badge>
        {category && (
          <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-category-${task.id}`}>
            {category.color && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
            )}
            {category.name}
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
}

export function TaskGroupedView({
  tasks,
  groupBy,
  categories,
  userMap,
  onTaskClick,
  getCompanyName,
}: TaskGroupedViewProps) {
  type Group = { key: string; label: string; color?: string | null; tasks: Task[] };
  const groups: Group[] = [];
  let fallbackGroup: Group | null = null;

  if (groupBy === "assignee") {
    const seen = new Set<string>();
    const assigneeOrder: string[] = [];
    for (const t of tasks) {
      const key = t.assignedTo || "__unassigned__";
      if (!seen.has(key)) {
        seen.add(key);
        if (key !== "__unassigned__") assigneeOrder.push(key);
      }
    }
    for (const userId of assigneeOrder) {
      groups.push({
        key: userId,
        label: userMap[userId] || "Unknown",
        tasks: tasks.filter((t) => t.assignedTo === userId),
      });
    }
    const unassigned = tasks.filter((t) => !t.assignedTo);
    if (unassigned.length > 0) {
      fallbackGroup = { key: "__unassigned__", label: "Unassigned", tasks: unassigned };
    }
  } else {
    const usedCatIds = new Set(tasks.filter((t) => t.categoryId).map((t) => t.categoryId as string));
    const usedCats = categories.filter((c) => usedCatIds.has(c.id));
    usedCats.forEach((cat, idx) => {
      groups.push({
        key: cat.id,
        label: cat.name,
        color: cat.color || CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
        tasks: tasks.filter((t) => t.categoryId === cat.id),
      });
    });
    const uncategorized = tasks.filter((t) => !t.categoryId);
    if (uncategorized.length > 0) {
      fallbackGroup = { key: "__no_category__", label: "No Category", tasks: uncategorized };
    }
  }

  const allGroups = fallbackGroup ? [...groups, fallbackGroup] : groups;

  if (allGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="grouped-view-empty">
        {groupBy === "assignee" ? (
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        ) : (
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
        )}
        <p>No tasks to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid={`grouped-view-${groupBy}`}>
      {allGroups.map((group) => (
        <div key={group.key} data-testid={`grouped-section-${group.key}`}>
          <div className="flex items-center gap-2 mb-3 px-1">
            {groupBy === "category" && group.color ? (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color }}
              />
            ) : groupBy === "assignee" ? (
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[9px]">{getInitials(group.label)}</AvatarFallback>
              </Avatar>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-muted-foreground/40" />
            )}
            <span className="text-sm font-semibold">{group.label}</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {group.tasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                categories={categories}
                userMap={userMap}
                onTaskClick={onTaskClick}
                getCompanyName={getCompanyName}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
