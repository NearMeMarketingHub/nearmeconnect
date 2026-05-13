import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Repeat } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseLocalDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskChecklistItem, TaskCategory, TaskStatus } from "@shared/schema";

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

interface BoardTaskCardProps {
  task: Task;
  categories: TaskCategory[];
  mode: "category" | "stage";
  onTaskClick: (task: Task) => void;
  companyName?: string;
  isDragging?: boolean;
}

export function BoardTaskCard({
  task,
  categories,
  mode,
  onTaskClick,
  companyName,
  isDragging = false,
}: BoardTaskCardProps) {
  const { toast } = useToast();
  const categoryIndex = categories.findIndex((c) => c.id === task.categoryId);
  const category = categoryIndex >= 0 ? categories[categoryIndex] : undefined;
  const categoryColor =
    category?.color || CATEGORY_PALETTE[Math.max(categoryIndex, 0) % CATEGORY_PALETTE.length];

  const { data: checklistItems } = useQuery<TaskChecklistItem[]>({
    queryKey: ["/api/tasks", task.id, "checklist"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${task.id}/checklist`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
    enabled: true,
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      return apiRequest("PATCH", `/api/checklist-items/${id}`, { isCompleted });
    },
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks", task.id, "checklist"] });
      const prev = queryClient.getQueryData<TaskChecklistItem[]>([
        "/api/tasks",
        task.id,
        "checklist",
      ]);
      if (prev) {
        queryClient.setQueryData<TaskChecklistItem[]>(
          ["/api/tasks", task.id, "checklist"],
          prev.map((item) => (item.id === id ? { ...item, isCompleted } : item))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["/api/tasks", task.id, "checklist"], context.prev);
      }
      toast({ title: "Failed to update checklist item", variant: "destructive" });
    },
  });

  const formatDueDate = (
    dueDate: string | null
  ): { text: string; color: string } | null => {
    if (!dueDate) return null;
    const date = parseLocalDate(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0)
      return {
        text: `Overdue ${Math.abs(diffDays)}d`,
        color: "text-destructive",
      };
    if (diffDays === 0)
      return {
        text: "Due today",
        color: "text-orange-600 dark:text-orange-400",
      };
    if (diffDays === 1)
      return {
        text: "Due tomorrow",
        color: "text-yellow-600 dark:text-yellow-400",
      };
    return {
      text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      color: "text-muted-foreground",
    };
  };

  const dueInfo = formatDueDate(task.dueDate);
  const completedCount = checklistItems?.filter((i) => i.isCompleted).length ?? 0;
  const totalCount = checklistItems?.length ?? 0;

  return (
    <Card
      className={`cursor-pointer transition-all select-none ${
        isDragging ? "opacity-50 rotate-1 shadow-xl scale-105" : "hover-elevate"
      }`}
      onClick={() => onTaskClick(task)}
      data-testid={`board-card-${task.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

        {companyName && (
          <p
            className="text-xs text-muted-foreground truncate"
            data-testid={`board-company-${task.id}`}
          >
            {companyName}
          </p>
        )}

        <div className="flex flex-wrap gap-1 items-center">
          {mode === "category" ? (
            <StatusBadge status={task.status as TaskStatus} />
          ) : category ? (
            <Badge
              className="text-xs gap-1"
              style={{
                backgroundColor: categoryColor + "22",
                color: categoryColor,
                borderColor: categoryColor + "55",
              }}
              variant="outline"
              data-testid={`board-category-badge-${task.id}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: categoryColor }}
              />
              {category.name}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground"
              data-testid={`board-category-badge-${task.id}`}
            >
              Unassigned
            </Badge>
          )}

          {task.priority !== "medium" && (
            <Badge
              variant="outline"
              className={`text-xs ${
                task.priority === "urgent"
                  ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                  : task.priority === "high"
                  ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
                  : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
              data-testid={`board-priority-badge-${task.id}`}
            >
              {task.priority}
            </Badge>
          )}

          {task.isRecurring && (
            <Repeat className="w-3 h-3 text-muted-foreground" />
          )}
        </div>

        {dueInfo && (
          <div className={`flex items-center gap-1 text-xs ${dueInfo.color}`}>
            <Calendar className="w-3 h-3" />
            <span>{dueInfo.text}</span>
          </div>
        )}

        {totalCount > 0 && checklistItems && (
          <div
            className="border-t pt-2 space-y-1.5"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} complete
            </p>
            {checklistItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-1.5"
                data-testid={`board-checklist-item-${item.id}`}
              >
                <Checkbox
                  checked={item.isCompleted}
                  onCheckedChange={(checked) => {
                    toggleChecklistMutation.mutate({
                      id: item.id,
                      isCompleted: !!checked,
                    });
                  }}
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                  data-testid={`board-checkbox-${item.id}`}
                />
                <span
                  className={`text-xs leading-tight ${
                    item.isCompleted ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.title}
                </span>
              </div>
            ))}
            {checklistItems.length > 3 && (
              <p className="text-xs text-muted-foreground pl-5">
                +{checklistItems.length - 3} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
