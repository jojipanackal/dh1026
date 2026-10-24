# PHASES.md — Project Runner Implementation Plan

## Objective

Build the product in [PRD.md](PRD.md) using the architecture in [TECH.md](TECH.md), in **small, verifiable phases**. Each phase must leave the application in a working state.

## General Rules

Coding, verification, documentation, and commit rules are in [AGENTS.md](../AGENTS.md). Phase-specific rules:

- Complete phases in order unless a dependency clearly allows otherwise.
- Do not build future-phase features prematurely.
- Prefer end-to-end functionality over disconnected UI mockups.
- Do not make the project depend on development-only tools such as MCP servers.
- Record each finished phase in [PROGRESS.md](PROGRESS.md) using the protocol at the end of this file.

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

## Completion Criteria

Project Runner is ready for its initial release when every success criterion in [PRD.md §9](PRD.md#9-success-criteria) is met, and correcting an AI interpretation does not lose the original journal history.

## Execution Protocol

At the end of each phase, add an entry to [PROGRESS.md](PROGRESS.md) covering:

- What was implemented.
- Files and architectural areas changed.
- Tests and checks performed, including failures.
- Any decisions that affect later phases.
- Remaining limitations.
- The next recommended phase.

**Do not skip validation to claim progress. Do not begin a new phase while the current phase has unresolved blocking failures.**
