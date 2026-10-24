import type { TaskStatus } from "@/lib/tasks/lifecycle";

export type TaskAnswerItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: TaskStatus;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
  lastUpdate: TaskEvidence | null;
  dependency: TaskDependencyEvidence | null;
};

export type TaskDependencyEvidence = {
  description: string;
  waitingOn: string | null;
  blockingUserName: string | null;
  createdAt: string;
};

export type TaskEvidence = {
  authorId?: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type TaskAnswer = {
  kind: "task_list";
  summary: string;
  targetName: string;
  tasks: TaskAnswerItem[];
};

type TaskRecord = Omit<TaskAnswerItem, "lastUpdate" | "dependency"> & {
  assigneeId: string | null;
  lastUpdate?: TaskEvidence | null;
  evidence?: TaskEvidence[];
  dependency?: TaskDependencyEvidence | null;
};

type AnswerContext = {
  authorId: string;
  authorName: string;
  tasks: TaskRecord[];
  membersByProject: Record<string, { id: string; name: string }[]>;
};

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function mentionsTaskQuestion(body: string): boolean {
  const text = body.toLowerCase();
  const asksForInformation = /\b(what|which|show|list|give|tell|help|prioriti[sz]e)\b/.test(text);
  const mentionsTasks = /\b(tasks?|work|to[- ]?dos?|assigned|priorit(?:y|ise|ize)|status|progress|update|waiting|doing|working|happening)\b/.test(text);
  return asksForInformation && mentionsTasks;
}

function findTarget(body: string, context: AnswerContext) {
  const text = body.toLowerCase();
  if (/\bmy\b|\bme\b/.test(text)) {
    return { id: context.authorId, name: context.authorName };
  }

  const members = Object.values(context.membersByProject)
    .flat()
    .sort((a, b) => b.name.length - a.name.length);
  const match = members.find((member) => {
    const escapedName = member.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escapedName}\\b`).test(text);
  });
  return match ? { id: match.id, name: match.name } : null;
}

export function answerTaskQuestion(
  body: string,
  context: AnswerContext,
): TaskAnswer | null {
  if (!mentionsTaskQuestion(body)) return null;

  const text = body.toLowerCase();
  const target = findTarget(body, context);
  const namedTask = [...context.tasks]
    .sort((a, b) => b.title.length - a.title.length)
    .find((task) => text.includes(task.title.toLowerCase()));
  const openTasks = context.tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const assigneeTasks = namedTask
    ? [namedTask]
    : target
    ? openTasks.filter((task) => task.assigneeId === target.id)
    : openTasks;
  const matchingTasks = /\bblocked|blockers?\b/.test(text)
    ? assigneeTasks.filter((task) => task.status === "blocked")
    : assigneeTasks;
  const tasks = [...matchingTasks]
    .sort((a, b) => {
      const priority = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (priority !== 0) return priority;
      if (a.dueDate === null && b.dueDate !== null) return 1;
      if (a.dueDate !== null && b.dueDate === null) return -1;
      if (a.dueDate !== b.dueDate) return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      return a.title.localeCompare(b.title);
    })
    .slice(0, 12);

  const targetName = target?.name ?? "the team";
  const summary = namedTask
    ? `${namedTask.title} is shown with its latest recorded status and evidence.`
    : /\bblocked|blockers?\b/.test(text)
    ? matchingTasks.length > 0
      ? `Here are the blocked tasks${target ? ` assigned to ${target.name}` : ""}.`
      : `There are no blocked tasks${target ? ` assigned to ${target.name}` : ""}.`
    : target
    ? tasks.length > 0
      ? `Here are ${target.name}'s open tasks, prioritized by urgency and due date.`
      : `${target.name} has no open tasks in your projects.`
    : tasks.length > 0
      ? "Here are the open tasks across your projects, prioritized by urgency and due date."
      : "There are no open tasks in your projects.";

  return {
    kind: "task_list",
    summary,
    targetName,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectName: task.projectName,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeName: task.assigneeName,
      lastUpdate:
        (target && task.evidence?.find((evidence) => evidence.authorId === target.id)) ??
        task.lastUpdate ??
        task.evidence?.[0] ??
        null,
      dependency: task.dependency ?? null,
    })),
  };
}
