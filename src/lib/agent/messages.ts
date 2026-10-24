export type BriefingDependency = {
  waitingOn: string | null;
  blockingUserName: string | null;
};

export type MorningBriefingTask = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: "todo" | "in_progress" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  estimateHours: number | null;
  dependency: BriefingDependency | null;
};

export type MorningBriefingPayload = {
  kind: "morning_briefing";
  date: string;
  openCount: number;
  blockedCount: number;
  inProgressCount: number;
  dueCount: number;
  tasks: MorningBriefingTask[];
};

export type AgentMessagePayload = MorningBriefingPayload;
