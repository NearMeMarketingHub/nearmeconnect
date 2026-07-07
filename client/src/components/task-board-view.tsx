import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { BoardTaskCard } from "@/components/board-task-card";
import { statusConfig } from "@/components/status-badge";
import type { Task, TaskCategory, TaskStatus } from "@shared/schema";

const STAGE_ORDER: TaskStatus[] = [
  "pending",
  "in_progress",
  "review",
  "approved",
  "completed",
];

const ACTIVE_STAGES: TaskStatus[] = ["pending", "in_progress", "review", "approved"];

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

interface TaskBoardViewProps {
  tasks: Task[];
  categories: TaskCategory[];
  mode: "category" | "stage" | "swimlane";
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  allowDrag?: boolean;
  showCompleted?: boolean;
  getCompanyName?: (companyId: string) => string;
}

function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-[80px] rounded-lg p-1.5 transition-colors ${
        isOver ? "bg-accent/60 ring-2 ring-primary/30" : ""
      }`}
      data-testid={`board-column-drop-${id}`}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  task,
  categories,
  onTaskClick,
  getCompanyName,
}: {
  task: Task;
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
  getCompanyName?: (id: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        position: "relative" as const,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`board-draggable-${task.id}`}
    >
      <BoardTaskCard
        task={task}
        categories={categories}
        mode="stage"
        onTaskClick={onTaskClick}
        companyName={getCompanyName ? getCompanyName(task.companyId) : undefined}
        isDragging={isDragging}
      />
    </div>
  );
}

export function TaskBoardView({
  tasks,
  categories,
  mode,
  onTaskClick,
  onStatusChange,
  allowDrag = false,
  showCompleted = true,
  getCompanyName,
}: TaskBoardViewProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over || active.id === over.id) return;
    const dropId = String(over.id);
    const statusPart = dropId.includes("::") ? dropId.split("::")[1] : dropId;
    const validStatus = STAGE_ORDER.find((s) => s === statusPart);
    if (validStatus) {
      onStatusChange?.(String(active.id), validStatus);
    }
  }

  if (mode === "swimlane") {
    const inner = (
      <SwimlaneBoard
        tasks={tasks}
        categories={categories}
        onTaskClick={onTaskClick}
        onStatusChange={onStatusChange}
        allowDrag={allowDrag}
        showCompleted={showCompleted}
        getCompanyName={getCompanyName}
        activeTask={activeTask ?? null}
      />
    );

    if (!allowDrag) return inner;

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {inner}
        <DragOverlay>
          {activeTask ? (
            <BoardTaskCard
              task={activeTask}
              categories={categories}
              mode="stage"
              onTaskClick={() => {}}
              companyName={getCompanyName ? getCompanyName(activeTask.companyId) : undefined}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  if (mode === "category") {
    return <CategoryBoard tasks={tasks} categories={categories} onTaskClick={onTaskClick} getCompanyName={getCompanyName} />;
  }

  return (
    <StageBoard
      tasks={tasks}
      categories={categories}
      onTaskClick={onTaskClick}
      onStatusChange={onStatusChange}
      allowDrag={allowDrag}
      getCompanyName={getCompanyName}
      sensors={sensors}
      activeTask={activeTask ?? null}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  );
}

function SwimlaneBoard({
  tasks,
  categories,
  onTaskClick,
  onStatusChange,
  allowDrag,
  showCompleted,
  getCompanyName,
  activeTask,
}: {
  tasks: Task[];
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  allowDrag: boolean;
  showCompleted: boolean;
  getCompanyName?: (id: string) => string;
  activeTask: Task | null;
}) {
  const visibleStages = showCompleted ? STAGE_ORDER : ACTIVE_STAGES;

  const usedCategoryIds = new Set(tasks.filter((t) => t.categoryId).map((t) => t.categoryId as string));
  const usedCategories = categories.filter((c) => usedCategoryIds.has(c.id));
  const unassignedTasks = tasks.filter((t) => !t.categoryId);

  type Lane = { id: string; name: string; color: string | null; tasks: Task[] };
  const lanes: Lane[] = [
    ...usedCategories.map((cat, idx) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color || CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
      tasks: tasks.filter((t) => t.categoryId === cat.id),
    })),
    ...(unassignedTasks.length > 0
      ? [{ id: "__unassigned__", name: "Unassigned", color: "#94a3b8", tasks: unassignedTasks }]
      : []),
  ];

  if (lanes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No tasks to display.</p>
      </div>
    );
  }

  const CATEGORY_COL_W = 160;
  const STAGE_COL_W = 220;
  const minWidth = CATEGORY_COL_W + visibleStages.length * STAGE_COL_W;

  return (
    <div className="overflow-x-auto pb-6" data-testid="board-swimlane-view">
      <div style={{ minWidth: `${minWidth}px` }}>
        {/* Header row */}
        <div className="flex mb-3">
          <div style={{ width: CATEGORY_COL_W }} className="flex-shrink-0" />
          {visibleStages.map((stage) => {
            const config = statusConfig[stage];
            const stageCount = tasks.filter((t) => t.status === stage).length;
            return (
              <div
                key={stage}
                style={{ width: STAGE_COL_W }}
                className="flex-shrink-0 px-2"
                data-testid={`swimlane-header-${stage}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
                    {config.label}
                  </span>
                  {stageCount > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-mono">
                      {stageCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Swimlane rows */}
        {lanes.map((lane, laneIdx) => (
          <div
            key={lane.id}
            className={`flex ${laneIdx < lanes.length - 1 ? "border-b border-border/50 pb-3 mb-3" : ""}`}
            data-testid={`swimlane-row-${lane.id}`}
          >
            {/* Category label column */}
            <div
              style={{ width: CATEGORY_COL_W }}
              className="flex-shrink-0 pr-3 pt-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: lane.color || "#94a3b8" }}
                />
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {lane.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground ml-4.5 mt-0.5 block">
                {lane.tasks.length} task{lane.tasks.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Stage cells */}
            {visibleStages.map((stage) => {
              const cellTasks = lane.tasks.filter((t) => t.status === stage);
              const cellId = `${lane.id}::${stage}`;

              return (
                <div key={stage} style={{ width: STAGE_COL_W }} className="flex-shrink-0 px-1.5">
                  {allowDrag ? (
                    <DroppableColumn id={cellId}>
                      {cellTasks.map((task) => (
                        <DraggableCard
                          key={task.id}
                          task={task}
                          categories={[]}
                          onTaskClick={onTaskClick}
                          getCompanyName={getCompanyName}
                        />
                      ))}
                      {cellTasks.length === 0 && (
                        <div className="min-h-[60px] rounded-md border border-dashed border-border/60" />
                      )}
                    </DroppableColumn>
                  ) : (
                    <div className="flex flex-col gap-2 min-h-[60px]">
                      {cellTasks.map((task) => (
                        <BoardTaskCard
                          key={task.id}
                          task={task}
                          categories={[]}
                          mode="stage"
                          onTaskClick={onTaskClick}
                          companyName={getCompanyName ? getCompanyName(task.companyId) : undefined}
                        />
                      ))}
                      {cellTasks.length === 0 && (
                        <div className="min-h-[60px] rounded-md border border-dashed border-border/40" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBoard({
  tasks,
  categories,
  onTaskClick,
  getCompanyName,
}: {
  tasks: Task[];
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
  getCompanyName?: (id: string) => string;
}) {
  const assignedCategoryIds = new Set(
    tasks.filter((t) => t.categoryId).map((t) => t.categoryId as string)
  );
  const usedCategories = categories.filter((c) => assignedCategoryIds.has(c.id));
  const unassignedTasks = tasks.filter((t) => !t.categoryId);

  const columns: Array<{
    id: string;
    name: string;
    color?: string | null;
    colorIndex: number;
    tasks: Task[];
  }> = [
    ...usedCategories.map((cat, idx) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      colorIndex: idx,
      tasks: tasks.filter((t) => t.categoryId === cat.id),
    })),
    ...(unassignedTasks.length > 0
      ? [
          {
            id: "__unassigned__",
            name: "Unassigned",
            color: null,
            colorIndex: -1,
            tasks: unassignedTasks,
          },
        ]
      : []),
  ];

  if (columns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No tasks to display in this view.</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto pb-4"
      data-testid="board-category-view"
    >
      <div
        className="flex gap-4"
        style={{ minWidth: `${columns.length * 280}px` }}
      >
        {columns.map((col) => {
          const color =
            col.color ||
            (col.colorIndex >= 0
              ? CATEGORY_PALETTE[col.colorIndex % CATEGORY_PALETTE.length]
              : "#94a3b8");
          return (
            <div key={col.id} className="flex-none w-[272px]" data-testid={`board-category-column-${col.id}`}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold truncate">{col.name}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {col.tasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 min-h-[120px]">
                {col.tasks.map((task) => (
                  <BoardTaskCard
                    key={task.id}
                    task={task}
                    categories={categories}
                    mode="category"
                    onTaskClick={onTaskClick}
                    companyName={getCompanyName ? getCompanyName(task.companyId) : undefined}
                  />
                ))}
                {col.tasks.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageBoard({
  tasks,
  categories,
  onTaskClick,
  onStatusChange,
  allowDrag,
  getCompanyName,
  sensors,
  activeTask,
  onDragStart,
  onDragEnd,
}: {
  tasks: Task[];
  categories: TaskCategory[];
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  allowDrag: boolean;
  getCompanyName?: (id: string) => string;
  sensors: ReturnType<typeof useSensors>;
  activeTask: Task | null;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
}) {
  const allColumns = STAGE_ORDER;

  const inner = (
    <div
      className="overflow-x-auto pb-4"
      data-testid="board-stage-view"
    >
      <div
        className="flex gap-4"
        style={{ minWidth: `${allColumns.length * 280}px` }}
      >
        {allColumns.map((status) => {
          const config = statusConfig[status];
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="flex-none w-[272px]" data-testid={`board-stage-column-${status}`}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                >
                  {config.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {columnTasks.length}
                </span>
              </div>

              {allowDrag ? (
                <DroppableColumn id={status}>
                  {columnTasks.map((task) => (
                    <DraggableCard
                      key={task.id}
                      task={task}
                      categories={categories}
                      onTaskClick={onTaskClick}
                      getCompanyName={getCompanyName}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                      Drop tasks here
                    </div>
                  )}
                </DroppableColumn>
              ) : (
                <div className="flex flex-col gap-2 min-h-[120px]">
                  {columnTasks.map((task) => (
                    <BoardTaskCard
                      key={task.id}
                      task={task}
                      categories={categories}
                      mode="stage"
                      onTaskClick={onTaskClick}
                      companyName={getCompanyName ? getCompanyName(task.companyId) : undefined}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!allowDrag) return inner;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {inner}
      <DragOverlay>
        {activeTask ? (
          <BoardTaskCard
            task={activeTask}
            categories={categories}
            mode="stage"
            onTaskClick={() => {}}
            companyName={getCompanyName ? getCompanyName(activeTask.companyId) : undefined}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
