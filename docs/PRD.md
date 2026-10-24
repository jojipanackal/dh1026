# Product Requirements Document (PRD)

## 1. Product Overview

**Product:** Jeera

**Vision:** An execution agent that helps software teams run projects through natural-language conversations wherever work happens. Jeera turns updates into tasks, dependencies, evidence, follow-ups, and a trustworthy view of sprint movement.

The web app is one conversation surface and control plane. Slack, Google Chat, and future channels can feed the same agent runtime. Jeera aims to reduce the administrative burden of project management while helping teams understand who is waiting on whom, what changed, and what needs attention next.

## 2. Problem Statement

Software teams often rely on manually maintained task boards, status reports, meetings, and scattered documentation to coordinate work.

This creates several problems:
- Developers spend time updating project-management tools instead of doing their work.
- Project status becomes outdated or fragmented.
- Blockers and dependencies are discovered too late.
- A person can be blocked by a teammate without that dependency becoming visible to leads.
- Workload imbalances and individual overload are difficult to identify.
- Technical decisions and their rationale are lost across conversations and documentation.
- Managers lack a reliable view of progress, capacity, and risks.

Jeera addresses these problems by making natural-language updates the primary input for project coordination.

## 3. Target Users

### Primary users
- **Developers:** Record progress, plans, discoveries, and blockers with minimal overhead.
- **Tech leads:** Understand project progress, dependencies, technical decisions, and team workload.
- **Project managers:** Coordinate execution, identify risks, and manage priorities.
- **Team leads and managers:** Understand capacity and workload distribution across the team.

The initial product should focus on software development teams.

## 4. Product Goals

1. Make project updates easy to record using natural language.
2. Convert updates into useful, structured project information.
3. Maintain a clear and current view of tasks and project progress.
4. Make team workload, capacity issues, and blockers visible.
5. Reduce the need for manual status chasing through contextual follow-ups.
6. Preserve project history, technical decisions, and their rationale.
7. Help teams decide what needs attention next.

## 5. Core Functional Requirements

### 5.1 Conversational Execution Agent

Users must be able to talk to Jeera in a daily conversation and submit free-form messages describing:
- Work completed.
- Work in progress.
- Planned work.
- Blockers and dependencies.
- Discoveries and technical decisions.
- Changes in priorities or estimates.
- New work they were asked to do.
- Scope changes during an active task.
- Questions about a teammate, task, dependency, or project.

The system should interpret these updates and identify relevant project information.

**Expected behavior:**
- Extract relevant tasks, status changes, blockers, decisions, follow-up actions, and task-linked context.
- Preserve interruptions, resumptions, handoffs, and next steps even when the task status does not change.
- Associate information with existing tasks or propose new tasks when appropriate.
- Ask for clarification when an update is ambiguous or important information is missing.
- Allow users to review or correct AI-generated interpretations.
- Preserve the original journal entry for historical reference.
- Answer read-only questions from trusted task records and dated evidence.
- Keep the same agent state whether a message arrives from the web app or a connected chat channel.

### 5.2 Task and Project Tracking

The platform must provide a structured view of project work.

Each task should support relevant attributes such as:
- Title and description.
- Status.
- Assignee.
- Priority.
- Dependencies and blockers.
- Due date or estimate, when applicable.
- Creation and update history.

**Expected behavior:**
- Create and update tasks from natural-language input.
- Track progress from task creation through completion.
- Surface blocked, delayed, and unassigned work.
- Maintain a history of important changes.
- Avoid creating duplicate tasks when an update refers to existing work.

### 5.3 Team Bandwidth and Workload

The platform must help users understand how work is distributed across team members.

**Expected behavior:**
- Provide an overview of assigned and ongoing work by team member.
- Represent workload using available signals such as estimates, priorities, deadlines, dependencies, and capacity.
- Flag potential overloads, uneven distribution, and capacity bottlenecks.
- Explain the evidence behind workload warnings.
- Help users identify possible reassignment or prioritization actions.

**Requirements and safeguards:**
- Do not equate task count alone with workload.
- Distinguish known capacity from estimated or unknown capacity.
- Do not infer that someone is available or idle merely because they have not submitted an update.
- Allow users to correct inaccurate workload information.
- Present workload indicators as decision support, not unquestionable judgments about individual performance.

### 5.4 Blocker and Risk Detection

The platform must make obstacles to project progress visible.

**Expected behavior:**
- Record blockers reported through journal entries.
- Associate blockers with relevant tasks and dependencies.
- Show blocked tasks and explain the reported reason.
- Identify potential stalled work when sufficient evidence exists.
- Surface blockers that require another person's action.
- Suggest reasonable next steps where possible.

The system must distinguish explicitly reported blockers from AI-inferred risks.

### 5.5 Contextual Follow-Ups

The platform should reduce the need for manual status chasing.

**Expected behavior:**
- Request updates when important information is missing.
- Follow up on blockers or work that appears stalled.
- Ask targeted questions that help clarify progress, dependencies, or next actions.
- Ask when to check back after an open-ended interruption and respect an explicit check-in time.
- Avoid excessive, repetitive, or irrelevant reminders.
- Allow users to respond naturally and have relevant project information updated.

Follow-up timing, notification channels, and escalation policies should remain configurable or be kept simple for the initial MVP.

### 5.6 Multi-Channel Conversation

The agent must have one normalized message model with multiple possible interfaces.

**Expected behavior:**
- Treat the web app as the first-class conversation and review surface.
- Record the source channel, conversation, external message id, author, and timestamp for every message.
- Deduplicate webhook retries from external channels.
- Reply in the originating channel by default while keeping the state visible in the web app.
- Enforce project membership and channel authorization before exposing team evidence.

Slack and Google Chat delivery are adapter work; the core agent must not duplicate its task or dependency logic per channel.

### 5.7 Project Knowledge and Technical Decisions

The platform must preserve useful project context over time.

**Expected behavior:**
- Record important technical decisions and their rationale.
- Preserve problem descriptions, resolutions, and lessons learned.
- Associate knowledge with relevant tasks and journal entries.
- Make historical project information searchable.
- Answer questions about project history using recorded evidence.
- Link answers to their underlying project records where possible.

The system must not fabricate historical facts or present an inferred explanation as a confirmed decision.

### 5.8 Project Overview

The platform should provide a central view of project execution.

It should surface:
- Overall project progress.
- Active, completed, and blocked tasks.
- Upcoming priorities and overdue work.
- Team workload distribution.
- Potential overloads and bottlenecks.
- Recent updates and important decisions.
- Items requiring attention.

The overview should prioritize actionable information rather than displaying metrics without context.

## 6. AI Behavior and Trust

AI is a core interaction layer, not a replacement for reliable project data.

The system must:
- Convert natural-language input into validated structured information.
- Use existing project context when interpreting updates.
- Distinguish confirmed facts, suggestions, and uncertain inferences.
- Ask for clarification when ambiguity could cause meaningful errors.
- Avoid silently making consequential changes.
- Preserve the source of important updates and decisions.
- Handle failed or incomplete AI responses safely.
- Avoid inventing task history, team capacity, decisions, or progress.

The implementation must explicitly define which actions can happen automatically and which require user confirmation.

## 7. MVP Scope

The MVP should demonstrate one coherent end-to-end project workflow.

### Must have
1. Basic project and team setup.
2. A web conversation with one execution agent.
3. AI interpretation of updates into tasks and project changes.
4. Task tracking with status and ownership.
5. Explicit dependency records showing who or what a task is waiting on.
6. A project overview showing progress, blockers, and stale work.
7. Grounded status answers with the latest team evidence and timestamp.
8. Team workload visibility and basic imbalance indicators.
9. Contextual follow-ups for missing updates or blockers.
10. Persistent project history and searchable technical knowledge.

### Defer until the core workflow works
- Complex resource forecasting.
- Advanced analytics and reporting.
- Production Slack and Google Chat integrations.
- Sophisticated notification and escalation systems.
- Multi-agent orchestration.
- Complex organizational permission hierarchies.
- Advanced semantic search infrastructure.

These items can be reconsidered based on actual MVP needs.

## 8. Non-Functional Requirements

- **Usability:** Recording and reviewing updates should require minimal effort.
- **Responsiveness:** Common interactions should feel fast.
- **Reliability:** Failed AI operations must not corrupt project state.
- **Consistency:** Task state, journal history, and project knowledge should remain coherent.
- **Traceability:** Important changes should be attributable to their source.
- **Privacy:** Team workload and project information must respect appropriate access boundaries.
- **Maintainability:** The initial architecture should remain simple and understandable.
- **Recoverability:** Users should be able to correct incorrect interpretations and important state changes.

Specific performance targets and deployment requirements can be established during implementation planning.

## 9. Success Criteria

The MVP should be considered successful if a user can:

1. Submit a natural-language developer update.
2. See the update interpreted into relevant tasks or project-state changes.
3. Review and correct the resulting information.
4. Understand current progress, blockers, and team workload.
5. Identify a potential workload imbalance and understand why it was flagged.
6. Receive or respond to a relevant follow-up.
7. Search project history and retrieve the rationale behind a past technical decision.

The central success measure is whether the platform reduces manual coordination while improving project visibility and decision-making.

## 10. Key Product Principles

- Natural language should be the easiest way to update a project.
- The agent is the product; web and chat platforms are interfaces to it.
- The platform should help run projects, not merely display task boards.
- Workload insights must be explainable and grounded in available evidence.
- Missing updates must not be treated as proof of inactivity.
- Important decisions and their rationale must remain traceable.
- AI should reduce administrative overhead without removing human control.
- The MVP should prioritize a complete, useful workflow over feature breadth.

## 11. Open Implementation Decisions

The following details can be finalized during implementation planning:
- Exact task states and workflow.
- Workload calculation and capacity representation.
- Follow-up timing and notification channels.
- AI approval rules for different kinds of changes.
- Search implementation.
- Authentication and access-control model.
- Deployment and integrations.
- Detailed UI layout and interaction patterns.
- External channel authentication and webhook contracts.
