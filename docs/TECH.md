# TECH.md — Technical Architecture

## 1. Technical Overview

This document describes how to build the product defined in [PRD.md](PRD.md).

The architecture should prioritize:
- Fast development and iteration.
- Reliable, structured AI operations.
- A consistent source of truth for project data.
- Clear separation between AI interpretation and application logic.
- A simple deployment model suitable for an MVP.

**Architecture principle:** Start with a modular monolith. Do not introduce microservices or distributed infrastructure without a demonstrated need.

## 2. Recommended Stack

Use these defaults unless the existing repository or a concrete requirement justifies a different choice.

| Layer | Technology |
|---|---|
| Application | Next.js with App Router |
| Language | TypeScript |
| UI | React, Tailwind CSS, shadcn/ui |
| AI integration | Vercel AI SDK |
| Input/output validation | Zod |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Authentication | Supabase Auth or an equally simple established solution, if authentication is required |
| Search | PostgreSQL full-text search initially |
| Deployment | Vercel for the application; managed PostgreSQL or another suitable PostgreSQL host |

Use the current stable, compatible versions available in the project environment. Inspect the existing repository before installing or replacing dependencies.

## 3. Application Architecture

Keep the application in a single codebase with clearly separated responsibilities.

### Presentation Layer
Responsible for:
- Project dashboard.
- Conversational execution agent (web first, channel adapters later).
- Task and project views.
- Team workload visualization.
- Blocker and follow-up views.
- Searchable project knowledge.

### Application Layer
Responsible for:
- Processing journal submissions.
- Validating requested operations.
- Creating and updating tasks.
- Updating project state.
- Calculating workload indicators.
- Scheduling or triggering follow-ups.
- Ingesting normalized messages from web, Slack, and Google Chat adapters.
- Recording project history.

### AI Layer
Responsible for:
- Interpreting natural-language updates.
- Extracting structured tasks, blockers, decisions, and follow-up suggestions.
- Resolving references to existing project entities using application-provided context.
- Generating contextual follow-up questions.
- Answering project-history questions using retrieved records.
- Routing read-only questions to trusted query tools before using write-proposal interpretation.

AI must not bypass application validation or directly modify the database outside controlled application operations.

### Data Layer
PostgreSQL is the source of truth for:
- Users and teams.
- Projects and memberships.
- Journal entries.
- Tasks and dependencies.
- Workload and capacity information.
- Blockers and follow-ups.
- Technical decisions and knowledge records.
- Audit and activity history.

## 4. AI Processing Workflow

A journal submission should follow this general flow:

1. Receive a normalized message with author, channel, conversation, and external id metadata.
2. Validate the request and confirm the user has access to the relevant project.
3. Retrieve relevant project context, such as existing tasks, dependencies, and recent team evidence.
4. Route read-only questions to deterministic query tools where possible.
5. For work updates, ask the AI to interpret the message into a structured result.
6. Validate the result against a schema using Zod.
7. Resolve references to existing records and detect possible ambiguities or duplicate tasks.
8. Apply permitted changes through application services, requesting confirmation where required.
9. Store the original message with channel provenance and record the resulting changes/dependencies.
10. Refresh the relevant project views and workload indicators.
11. Return a concise explanation of what changed and what requires attention in the originating channel.

AI output is a proposal until it passes validation and any required approval.

## 5. Structured AI Output

Use typed, schema-validated outputs rather than relying on free-form model responses for application state changes.

An interpretation may contain:
- A concise summary.
- Proposed task creations or updates.
- Reported blockers.
- Technical decisions and rationale.
- Proposed follow-up actions.
- References to existing entities.
- Uncertainties or clarification requests.

The exact schema should be defined in code and refined as workflows are implemented.

Requirements:
- Validate every operation before applying it.
- Reject or safely handle invalid output.
- Do not invent task IDs, users, historical decisions, or project facts.
- Require real database records for entity references.
- Make operations idempotent where practical to reduce duplicate changes during retries.
- Preserve the source journal entry for traceability.

## 6. Data and Persistence

Use PostgreSQL as the authoritative store. Model data around the actual product workflows rather than introducing a separate database for each feature.

Likely core entities include:
- `users`
- `teams`
- `team_memberships`
- `projects`
- `project_memberships`
- `journal_entries`
- `task_dependencies`
- `tasks`
- `task_dependencies`
- `blockers`
- `follow_ups`
- `technical_decisions`
- `activity_events`
- `agent channel metadata and conversation keys`
- `capacity_records`

This is a starting point, not a mandatory final schema. Combine or separate entities based on the agreed product behavior.

Important rules:
- Store timestamps consistently and handle display time zones explicitly.
- Preserve original journal entries.
- Track who initiated a change and which journal or action caused it.
- Distinguish user-confirmed information from AI-inferred information.
- Maintain history for important task and project-state changes.
- Use database constraints and transactions to preserve consistency.
- Use migrations to evolve the schema safely.

## 7. Team Workload and Bandwidth

Workload indicators should be computed from explicit, explainable signals.

Potential inputs include:
- Assigned tasks.
- Task estimates, when available.
- Priorities and deadlines.
- Active blockers and dependencies.
- Explicitly recorded availability or capacity.
- Work in progress.

Do not treat task count as a complete measure of workload.

Requirements:
- Clearly distinguish measured data from estimates.
- Explain why a person or project is flagged.
- Avoid inferring availability from a lack of journal entries.
- Keep workload calculations in deterministic application logic where possible, not solely in an LLM prompt.
- Allow users to correct inaccurate task or capacity information.

Begin with simple rules that can be explained and tested. Add more sophisticated forecasting only when the product has reliable input data.

## 8. Follow-Ups and Background Work

Follow-ups may require work to happen after the initial request.

For the MVP, background work runs in a separate Node process in this repository:
- `npm run agent:worker` runs the five-minute sweep continuously.
- `npm run agent:follow-ups` runs one sweep for cron, container, or platform schedulers.
- The worker scans all project memberships, uses a PostgreSQL advisory lock to prevent concurrent copies, and relies on the unique `(user_id, dedupe_key)` constraint for retry-safe message creation.
- The web heartbeat remains a fallback for local demos, not the production scheduler.
- Follow-up rules stay explicit and evidence-based; channel delivery, quiet hours, acknowledgement, dismissal, and escalation are separate policy work.

The worker is intentionally not a second application or task system. It imports the same service layer and writes to the same PostgreSQL source of truth. A deployment still needs a process supervisor or hosted scheduled job to restart/run it reliably.

## 9. Search and Project Knowledge

Start with PostgreSQL full-text search for journal entries, decisions, task descriptions, and resolutions.

Search results should:
- Respect project membership and access controls.
- Identify the source record.
- Provide enough context to understand the result.
- Support answers grounded in recorded project information.

Use embeddings or a vector database only if real search requirements cannot be met adequately with PostgreSQL search.

When answering questions about project history, retrieve relevant records first and generate answers from that evidence. Do not present unsupported guesses as historical facts.

## 10. Security and Permissions

- Enforce authentication where the product requires user accounts.
- Verify project membership and authorization on the server for every protected operation.
- Do not rely on hidden UI elements as access control.
- Keep API keys and secrets on the server.
- Avoid exposing secrets or sensitive project data in logs.
- Ensure AI context contains only information the requesting user is authorized to access.
- Treat journal content as untrusted input; do not allow embedded instructions to override system rules or access controls.
- Validate all client input and AI-generated operations.

## 11. Error Handling and Observability

The application should handle:
- AI timeouts and provider errors.
- Invalid or incomplete AI output.
- Database failures.
- Conflicting task updates.
- Missing or inaccessible records.
- Failed follow-ups.
- Duplicate submissions and retries.

Requirements:
- Show useful, actionable errors to the user.
- Avoid partially applying a group of related changes.
- Log operational failures without leaking secrets or unnecessary personal information.
- Record enough context to diagnose failures.

## 12. Testing Strategy

Prioritize tests around the most important product risks.

### Unit tests
- Workload calculations.
- Task-state transition rules.
- Permission checks.
- Input and AI-output validation.
- Follow-up eligibility.

### Integration tests
- Journal submission through persistence.
- AI interpretation through validated application operations.
- Task updates and activity history.
- Project-level access control.
- Search results respecting permissions.

### End-to-end tests
- Submit a journal entry and see the resulting project changes.
- Review and correct an AI interpretation.
- Identify a blocker or workload imbalance.
- Retrieve a past technical decision from project knowledge.

Use representative mocked AI responses for deterministic tests, with a smaller number of provider-level tests where practical.

## 13. Development Guidelines and Build Order

General coding, dependency, documentation, and commit rules live in [AGENTS.md](../AGENTS.md). Project-specific additions:

- Keep business rules (workload, task transitions, follow-up eligibility) outside UI components.
- Use TypeScript types and Zod validation at trust boundaries.
- This document sets the default direction, not permission to add every listed capability immediately. Before adding a service, library, database, or layer, name the agreed requirement that needs it and confirm the existing stack cannot meet it.

The build order is defined in [PHASES.md](PHASES.md).
