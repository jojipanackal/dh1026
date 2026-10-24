# PHASES.md — Jeera Implementation Plan

## Objective

Build the product in [PRD.md](PRD.md) using the architecture in [TECH.md](TECH.md), in **small, verifiable phases**. Each phase must leave the application in a working state.

## General Rules

Coding, verification, documentation, and commit rules are in [AGENTS.md](../AGENTS.md). Phase-specific rules:

- Complete phases in order unless a dependency clearly allows otherwise.
- Do not build future-phase features prematurely.
- Prefer end-to-end functionality over disconnected UI mockups.
- Do not make the project depend on development-only tools such as MCP servers.
- Record each finished phase in [PROGRESS.md](PROGRESS.md) using the protocol at the end of this file.

The original foundation phases are historical implementation phases. Phases 1–4
and 3A have already been completed in this repository. The current product
roadmap is appended as Phases 10–13 below so the new execution-agent direction
does not erase the build record or pretend the unfinished legacy phases are
complete.

---

## Phase 1 — Foundation and Application Shell

### Goal
Establish the project structure and a working application shell.

### Tasks
- Inspect the repository and current dependencies.
- Set up or verify Next.js, TypeScript, Tailwind CSS, and shadcn/ui as appropriate.
- Establish the application layout, navigation, and design foundations.
- Configure environment variable handling.
- Connect PostgreSQL and configure Drizzle ORM and migrations.
- Add a clear loading, empty, and error-state pattern.

### Acceptance criteria
- The application starts locally.
- The database connection works.
- Migrations can be applied successfully.
- Core routes and layout render without errors.
- No real secrets are committed to the repository.

---

## Phase 2 — Projects, Teams, and Tasks

### Goal
Create the foundational project data and task-management workflow.

### Tasks
- Implement the necessary project and team membership model.
- Implement task creation, editing, assignment, status, and priority.
- Define the initial task lifecycle.
- Record important task changes in project activity history.
- Build usable project and task views.

### Acceptance criteria
- A user can create and inspect project tasks.
- Tasks can be updated and assigned to team members.
- Important changes are persisted.
- The UI reflects the database state rather than hardcoded sample data.
- Invalid operations are rejected safely.

---

## Phase 3 — Natural-Language Journal and AI Interpretation

### Goal
Make natural language the primary way to update a project.

### Tasks
- Build the journal submission interface.
- Persist original journal entries.
- Integrate the Vercel AI SDK with a selected model provider.
- Define structured output schemas using Zod.
- Interpret entries into proposed task creations, updates, blockers, and technical decisions.
- Resolve references against real project records.
- Handle ambiguity, duplicate-task risks, and invalid AI output.
- Let users review or correct consequential proposed changes.

### Acceptance criteria
- A developer can submit a natural-language update.
- The AI produces validated structured output.
- Relevant task changes can be applied and persisted.
- The original journal remains available.
- Invalid or uncertain output does not silently corrupt project state.
- The user can understand what the AI changed and why.

---

## Phase 3A — Execution Agent Core and Channel-Ready Messages

### Goal
Make the agent, rather than the web UI, the primary product boundary while keeping the web conversation as the first working channel.

### Tasks
- Normalize messages with channel, conversation, external id, and author metadata.
- Keep read-only task/status questions separate from consequential write proposals.
- Record explicit task dependencies and who a blocked task is waiting on.
- Ground status answers in persisted team evidence with timestamps.
- Keep Slack and Google Chat behind a normalized ingress adapter until their authentication and webhook contracts are chosen.

### Acceptance criteria
- Web messages remain a complete working conversation.
- A future channel can call the same agent ingress without duplicating task logic.
- A blocker creates a queryable dependency record.
- A member can ask for task status and see the latest recorded teammate evidence.
- Existing review-before-apply and membership checks remain intact.

## Phase 4 — Project Progress and Blockers

### Goal
Make the current state of project execution easy to understand.

### Tasks
- Build the project overview.
- Show active, completed, and blocked tasks.
- Surface overdue work and upcoming priorities where data supports them.
- Link blockers to their affected tasks and reported causes.
- Display recent activity and meaningful changes.
- Distinguish reported blockers from AI-inferred risks.

### Acceptance criteria
- The overview uses persisted project data.
- Users can identify blocked work and understand the stated reason.
- Important project changes are traceable to their sources.
- Empty and error states are handled.

---

## Phase 5 — Team Bandwidth and Workload

### Goal
Help teams understand workload distribution and identify possible capacity problems.

### Tasks
- Define the initial capacity representation.
- Calculate workload using available signals such as task estimates, priorities, deadlines, and dependencies.
- Build a team workload view.
- Identify potential overloads and workload imbalances using explainable rules.
- Show the evidence behind each warning.
- Allow users to correct inaccurate workload data.

### Acceptance criteria
- Workload is derived from actual project data.
- The UI explains why a person or team is flagged.
- Missing updates are not treated as proof of inactivity or availability.
- Unknown capacity is distinguished from known capacity.
- Workload calculations are deterministic and testable where practical.

---

## Phase 6 — Contextual Follow-Ups

### Goal
Reduce manual status chasing by asking for useful information at the right time.

### Tasks
- Define explicit conditions that trigger a follow-up.
- Implement follow-ups for selected blockers or missing information.
- Provide a way to respond to, dismiss, or resolve a follow-up.
- Record follow-up history and status.
- Prevent duplicate or repetitive follow-ups.
- Use the simplest reliable scheduling approach supported by the deployment environment.

### Acceptance criteria
- Follow-ups have a clear reason and context.
- Responses can update relevant project information.
- Repeated execution does not create duplicate follow-ups.
- Failed operations are visible and recoverable.
- Follow-ups do not assume that silence means a person is idle.

---

## Phase 7 — Project Knowledge and Technical Decisions

### Goal
Preserve project reasoning and make historical context searchable.

### Tasks
- Persist technical decisions and their rationale.
- Capture task resolutions and useful outcomes.
- Associate knowledge with relevant tasks and journal entries.
- Implement PostgreSQL full-text search.
- Provide a project-history question-and-answer workflow grounded in retrieved records.
- Link answers to source records when possible.

### Acceptance criteria
- Users can search historical project information.
- Relevant decisions and resolutions can be retrieved.
- Answers are grounded in persisted records.
- The system distinguishes recorded facts from inferred explanations.
- Search respects project access boundaries.

---

## Phase 8 — End-to-End Integration and Reliability

### Goal
Make the core workflows work together reliably.

### Tasks
- Test journal submission through AI interpretation and task updates.
- Verify task history and project activity remain consistent.
- Handle AI timeouts, database failures, duplicate submissions, and invalid output.
- Verify authorization on protected operations.
- Add the tests listed in [TECH.md §12](TECH.md#12-testing-strategy).
- Test the main workflows in a real browser using Playwright where available.
- Fix integration issues and remove dead or misleading UI.

### Acceptance criteria
- The core workflow succeeds from start to finish.
- Failure cases do not silently corrupt persisted data.
- Critical business rules have tests.
- The application builds and runs without known blocking errors.
- The main user flows work in the browser.

---

## Phase 9 — UX Polish and Demonstration Readiness

### Goal
Present a coherent, credible product experience.

### Tasks
- Improve visual consistency, spacing, typography, and navigation.
- Ensure dashboards prioritize actions and useful context.
- Add realistic demonstration data where appropriate.
- Verify loading, empty, error, and success states.
- Remove placeholder interactions that imply nonexistent functionality.
- Prepare a short demonstration of the complete project workflow.

### Acceptance criteria
- A new user can understand the product's purpose quickly.
- The demo works without manual database intervention.
- The natural-language workflow is easy to demonstrate.
- Workload warnings include explanations.
- Project history can show why a technical decision was made.

---

---

## Current Execution-Agent Roadmap

The following phases are the active roadmap for the revised product. They are
numbered after the existing phases intentionally: the earlier phases are the
foundation already built, while these phases complete the usable execution-agent
workflow.

## Phase 10 — Web-First Execution Agent

### Goal

Make the web conversation a complete, dependable daily work surface for one
team, with the agent handling task capture, updates, questions, and review.

### Tasks

- Keep one daily conversation per person while preserving task and project context.
- Let a person describe newly assigned work and receive a task proposal with owner, scope, priority, estimate, and target-date questions.
- Support natural-language start, progress, completion, and scope-change updates.
- Keep read-only answers separate from write proposals.
- Make every consequential change reviewable before application.
- Replace demo-only identity with an explicit authenticated team boundary before external rollout.

### Acceptance criteria

- A developer can start the day, create work, update it, and ask status questions without leaving the conversation.
- Task creation and updates preserve the original message and a reviewable change history.
- Scope changes can update the current estimate or split work without erasing the original commitment.
- No task mutation occurs without the configured approval rule.
- The web channel is usable without Slack or Google Chat being connected.

## Phase 11 — Task and Dependency Graph

### Goal

Represent the execution relationships that ordinary task boards miss.

### Tasks

- Model “A is waiting on B” as an explicit dependency with source evidence.
- Support dependencies on a task, person, team, or external system.
- Show dependency direction, age, current state, and the next expected action.
- Resolve or update dependencies when the blocking work changes.
- Surface dependency chains in task detail, project overview, and agent answers.

### Acceptance criteria

- A blocked task explains who or what it is waiting on.
- Leads can see dependency chains without reading every conversation.
- Dependency records link back to the original message and author.
- A dependency can become stale without being falsely marked resolved.
- Access checks prevent users from seeing evidence outside their projects.

## Phase 12 — Evidence-Backed Status and Sprint Movement

### Goal

Answer “what is happening?” from current records and help the team distinguish
real movement from stale activity.

### Tasks

- Answer task, person, project, and dependency status questions.
- Show the latest evidence, author, timestamp, and confidence/freshness.
- Preserve interruptions, resumptions, handoffs, and next steps as task-linked context without changing task status unless the author explicitly changes it.
- Distinguish reported facts, applied task state, and agent inference.
- Track sprint movement through meaningful transitions, scope changes, dependency resolution, and review handoffs.
- Explain why a task or sprint is at risk.

### Acceptance criteria

- “What is B doing on Checkout?” returns the latest grounded evidence when available.
- “What happened to B’s work?” includes the latest interruption or resumption context when recorded.
- “What is blocked?” identifies dependency owners and evidence age.
- Silence is shown as stale or unknown, never as proof that someone is idle.
- Sprint risk explanations link to concrete tasks, dependencies, or missing evidence.

## Phase 13 — Stale Work and Contextual Follow-Ups

### Goal

Turn stale execution state into targeted, respectful follow-ups.

### Tasks

- Define follow-up triggers for stale dependencies, missing estimates, and unchanged in-progress work.
- Ask the smallest useful question and include the relevant task/dependency context.
- Deliver follow-ups through the configured channel, starting with the web channel.
- Record delivery, response, dismissal, and resolution history.
- Add working hours, quiet hours, deduplication, and escalation rules.

### Acceptance criteria

- A stale dependency produces one actionable follow-up rather than repeated reminders.
- A natural reply updates the relevant task or dependency through the normal review rules.
- Users can dismiss or defer a follow-up.
- Follow-ups respect channel, project membership, and quiet-hour configuration.
- Failed delivery is visible and recoverable.

## Completion Criteria

Jeera is ready for its initial release when every success criterion in [PRD.md §9](PRD.md#9-success-criteria) is met, and correcting an AI interpretation does not lose the original journal history.

## Execution Protocol

At the end of each phase, add an entry to [PROGRESS.md](PROGRESS.md) covering:

- What was implemented.
- Files and architectural areas changed.
- Tests and checks performed, including failures.
- Any decisions that affect later phases.
- Remaining limitations.
- The next recommended phase.

**Do not skip validation to claim progress. Do not begin a new phase while the current phase has unresolved blocking failures.**
