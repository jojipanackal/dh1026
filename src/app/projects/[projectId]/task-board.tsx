"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { moveTaskAction, quickAddTaskAction } from "@/app/projects/actions";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { isOverdue } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/tasks/lifecycle";
import { cn } from "@/lib/utils";

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  estimateHours: number | null;
};

const QUICK_ADD_STATUSES: readonly TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
];

function TaskCard({
  task,
  onOpen,
}: {
  task: BoardTask;
  onOpen: () => void;
}) {
  const overdue =
    isOverdue(task.dueDate, new Date()) &&
    task.status !== "done" &&
    task.status !== "cancelled";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full cursor-grab rounded-lg border bg-card p-3 text-left transition-colors hover:border-brand/50 active:cursor-grabbing"
    >
      <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
      <div className="mt-2 flex items-center gap-2">
        {task.priority !== "medium" ? (
          <PriorityBadge priority={task.priority} />
        ) : null}
        {task.dueDate ? (
          <span
            className={cn(
              "text-xs",
              overdue ? "text-red-500 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            {formatDate(task.dueDate)}
          </span>
        ) : null}
        {task.estimateHours != null ? (
          <span className="text-xs text-muted-foreground">
            {task.estimateHours}h
          </span>
        ) : null}
        <span className="ml-auto">
          {task.assigneeName ? (
            <span
              title={task.assigneeName}
              className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-brand-foreground"
            >
              {task.assigneeName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span
              title="Unassigned"
              className="block size-5 rounded-full border border-dashed border-muted-foreground/50"
            />
          )}
        </span>
      </div>
    </button>
  );
}

function DraggableCard({
  task,
  projectId,
  dragJustEnded,
}: {
  task: BoardTask;
  projectId: string;
  dragJustEnded: React.RefObject<boolean>;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
    >
      <TaskCard
        task={task}
        onOpen={() => {
          if (dragJustEnded.current) return;
          router.push(`/projects/${projectId}/tasks/${task.id}`);
        }}
      />
    </div>
  );
}

function QuickAdd({
  projectId,
  status,
  onDone,
}: {
  projectId: string;
  status: TaskStatus;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const title = inputRef.current?.value.trim();
    if (!title) {
      onDone();
      return;
    }
    startTransition(async () => {
      const result = await quickAddTaskAction(
        projectId,
        title,
        status as "todo" | "in_progress" | "blocked",
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added to ${TASK_STATUS_LABELS[status]}`);
      }
      onDone();
    });
  }

  return (
    <Input
      ref={inputRef}
      autoFocus
      placeholder="Task title — Enter to add, Esc to cancel"
      disabled={pending}
      className="text-sm"
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") onDone();
      }}
      onBlur={() => {
        if (!pending) onDone();
      }}
    />
  );
}

function BoardColumn({
  projectId,
  status,
  tasks,
  quickAddOpen,
  onQuickAdd,
  onQuickAddDone,
  overColumn,
  dragJustEnded,
}: {
  projectId: string;
  status: TaskStatus;
  tasks: BoardTask[];
  quickAddOpen: boolean;
  onQuickAdd: () => void;
  onQuickAddDone: () => void;
  overColumn: TaskStatus | null;
  dragJustEnded: React.RefObject<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const highlighted = overColumn === status || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-70 shrink-0 snap-start flex-col rounded-lg border bg-muted/30 transition-colors",
        highlighted && "border-brand/60 bg-brand/5",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
        {QUICK_ADD_STATUSES.includes(status) ? (
          <button
            type="button"
            aria-label={`Add task to ${TASK_STATUS_LABELS[status]}`}
            onClick={onQuickAdd}
            className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="flex max-h-[calc(100svh-320px)] min-h-16 flex-col gap-2 overflow-y-auto px-2.5 pb-3">
        {quickAddOpen ? (
          <QuickAdd projectId={projectId} status={status} onDone={onQuickAddDone} />
        ) : null}
        {tasks.length === 0 && !quickAddOpen ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              projectId={projectId}
              dragJustEnded={dragJustEnded}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function TaskBoard({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: BoardTask[];
}) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [quickAddFor, setQuickAddFor] = useState<TaskStatus | null>(null);
  const [cancelledExpanded, setCancelledExpanded] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [prevTasks, setPrevTasks] = useState(tasks);
  const dragJustEnded = useRef(false);
  // Resync from the server-rendered list (derived-state pattern).
  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setLocalTasks(tasks);
  }

  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumn((event.over?.id as TaskStatus) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(null);
    setOverColumn(null);
    dragJustEnded.current = true;
    setTimeout(() => {
      dragJustEnded.current = false;
    }, 0);

    const target = event.over?.id as TaskStatus | undefined;
    if (!task || !target || !(TASK_STATUSES as readonly string[]).includes(target)) {
      return;
    }
    if (target === task.status) return;

    const previous = localTasks;
    setLocalTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, status: target } : t)),
    );
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("status", target);
    moveTaskAction(projectId, {}, formData).then((result) => {
      if (result.error || result.fieldErrors) {
        setLocalTasks(previous);
        toast.error(result.error ?? "Could not move the task");
      } else {
        toast.success(`Moved to ${TASK_STATUS_LABELS[target]}`);
      }
    });
  }

  const columns: { status: TaskStatus; tasks: BoardTask[] }[] =
    TASK_STATUSES.map((status) => ({
      status,
      tasks: localTasks.filter((t) => t.status === status),
    }));

  const cancelledColumn = columns.find((c) => c.status === "cancelled")!;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
        setOverColumn(null);
      }}
    >
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:snap-none">
        {columns
          .filter((c) => c.status !== "cancelled")
          .map((c) => (
            <BoardColumn
              key={c.status}
              projectId={projectId}
              status={c.status}
              tasks={c.tasks}
              quickAddOpen={quickAddFor === c.status}
              onQuickAdd={() => setQuickAddFor(c.status)}
              onQuickAddDone={() => setQuickAddFor(null)}
              overColumn={overColumn}
              dragJustEnded={dragJustEnded}
            />
          ))}
        {cancelledExpanded ? (
          <BoardColumn
            projectId={projectId}
            status="cancelled"
            tasks={cancelledColumn.tasks}
            quickAddOpen={false}
            onQuickAdd={() => setCancelledExpanded(false)}
            onQuickAddDone={() => setCancelledExpanded(false)}
            overColumn={overColumn}
            dragJustEnded={dragJustEnded}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCancelledExpanded(true)}
            className="flex w-12 shrink-0 snap-start flex-col items-center gap-2 rounded-lg border bg-muted/30 py-3 text-muted-foreground hover:text-foreground"
            title="Show cancelled tasks"
          >
            <span className="text-xs">{cancelledColumn.tasks.length}</span>
            <span
              className="text-xs tracking-wide"
              style={{ writingMode: "vertical-rl" }}
            >
              Cancelled
            </span>
          </button>
        )}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-64 rotate-1 opacity-90">
            <TaskCard task={activeTask} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
