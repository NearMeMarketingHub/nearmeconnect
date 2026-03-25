import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Calendar, CreditCard } from "lucide-react";
import type { Task, TaskStatus, TaskPriority } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card
      className="hover-elevate cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-medium leading-tight">
            {task.title}
          </CardTitle>
          <Badge
            variant={task.type === "assigned" ? "default" : "outline"}
            className="text-xs shrink-0"
          >
            {task.type === "assigned" ? "Assigned" : "Requested"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status as TaskStatus} />
          <PriorityBadge priority={task.priority as TaskPriority} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{task.dueDate}</span>
            </div>
          )}
          <div className="flex items-center gap-1 font-mono">
            <CreditCard className="w-3 h-3" />
            <span>{task.creditCost} credits</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
