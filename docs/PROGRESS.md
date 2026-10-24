# PROGRESS.md — Phase Reports

One entry per completed phase from [PHASES.md](PHASES.md), newest first. Report only verified results.

```text
## Phase <n> — <name> (<actual timestamp with timezone>)

- Implemented:
- Files and areas changed:
- Checks run and results:
- Decisions affecting later phases:
- Remaining limitations:
- Next phase:
```

## Revised roadmap note (2026-10-25T02:30+05:30)

The original foundation work through Phase 4 and the channel-ready Phase 3A
is complete and recorded below. The former Phases 5–9 remain as historical
planning context, but they are no longer the active sequence. The current
execution-agent work continues as Phases 10–13 in [PHASES.md](PHASES.md):
web-first agent, task/dependency graph, evidence-backed status and sprint
movement, then stale-work follow-ups.

## Tasks graph milestone — Connected demo dependency map (2026-10-25T05:05:00+05:30)

- Implemented: Made Graph the default Tasks view, showing recorded handoffs as connected blocking → blocked cards with waiting-on context, plus independent work. Kept Queue as the filtered execution table with inline status movement.
- Files and areas changed: `src/app/tasks/task-graph.tsx`, `src/app/tasks/page.tsx`, `src/server/tasks.ts`, `scripts/seed-demo.ts`, `tests/integration/services.test.ts`, `README.md`, `docs/DEMO.md`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: Typecheck, lint, integration suite (51/51), repeatable demo seed, authenticated Tasks HTTP checks, and diff check pass.
- Decisions affecting later phases: The graph is a read-only projection over `task_dependencies`; task edits and lifecycle transitions still use the existing Queue/detail actions and one source of truth.
- Remaining limitations: No graph drag-and-drop, timeline layout, bulk editing, or channel delivery yet.
- Next phase: Rehearse the full demo, then add acknowledgement and quiet-hour policy to follow-up delivery.

## Tasks runner milestone — Inline status movement (2026-10-25T03:54:06+05:30)

- Implemented: Added an inline status control to each Tasks queue row, reusing lifecycle validation, authorization, activity history, and `/tasks` revalidation from the existing move action.
- Files and areas changed: `src/app/tasks/task-status-menu.tsx`, `src/app/tasks/page.tsx`, `src/app/projects/actions.ts`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: Typecheck, lint, 95 unit tests, diff check, and authenticated HTTP content checks pass.
- Decisions affecting later phases: Tasks remains a shared operational surface; moving status is direct, while dependency resolution still requires the explicit project action.
- Remaining limitations: No bulk status movement or drag-and-drop on the cross-project queue; project boards retain drag-and-drop.
- Next phase: Final browser rehearsal when a browser surface is available.

## Demo polish milestone — Guided Agent entry points (2026-10-25T03:53:07+05:30)

- Implemented: Added always-visible prompt chips for the seeded Agent workflows and corrected Tasks open/overdue counts so cancelled work remains terminal.
- Files and areas changed: `src/app/journal/journal-chat.tsx`, `src/app/tasks/page.tsx`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: Typecheck, lint, and diff check pass.
- Decisions affecting later phases: Prompt chips populate the composer but never auto-submit or bypass the normal Agent review path.
- Remaining limitations: No browser screenshot review was available in this environment.
- Next phase: Browser review and final demo rehearsal when a browser surface is available.

## Tasks workspace milestone — Cross-project execution queue (2026-10-25T03:51:42+05:30)

- Implemented:
  - Added the primary Tasks tab with All work/My work scopes, search and project/status/priority/assignee filters, summary counts, dependency context, and direct links into the existing editable task detail flow.
  - Added global task creation from the Tasks tab while retaining Agent as the natural-language capture path.
  - Seeded a grounded Joji conversation history with task questions and answer cards linked to the real landing-page launch records.
- Files and areas changed: `src/app/tasks/page.tsx`, `src/app/tasks/new-task-dialog.tsx`, `src/components/app-shell/nav-items.ts`, `src/server/tasks.ts`, `src/app/projects/actions.ts`, `scripts/seed-demo.ts`, `tests/integration/services.test.ts`, `README.md`, `docs/DEMO.md`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (51/51), demo seed, authenticated HTTP 200 checks for `/tasks` and `/journal`, and content checks pass.
- Decisions affecting later phases: Tasks is a shared execution surface over the existing task source of truth, not a second task system. Demo conversation entries use persisted task ids and evidence so the UI behaves like normal Agent history.
- Remaining limitations: No bulk edits, saved views, calendar/timeline layout, or visual browser screenshot review was available in this environment.
- Next phase: Use the Tasks workspace as the primary demo entry point, then add acknowledgement/quiet-hour policy to worker-generated follow-ups.

## Background worker milestone — Server-side five-minute check-ins (2026-10-25T03:44:45+05:30)

- Implemented:
  - Added a standalone Node worker with continuous and one-shot modes: `npm run agent:worker` and `npm run agent:follow-ups`.
  - Added a global sweep over all project memberships, PostgreSQL advisory locking, and graceful shutdown.
  - Kept the web heartbeat as a local fallback and retained database deduplication.
- Files and areas changed: `scripts/follow-up-worker.ts`, `package.json`, `src/db/index.ts`, `src/server/agent-messages.ts`, `tests/integration/agent-messages.test.ts`, `README.md`, `docs/DEMO.md`, and `docs/TECH.md`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (50/50), one-shot worker execution, continuous worker start/stop, and `git diff --check` pass.
- Decisions affecting later phases: The worker is a separate process, not a second app or task database. Hosting must provide a process supervisor or scheduled-job trigger; Telegram delivery and quiet hours remain policy work.
- Remaining limitations: No hosted worker deployment, restart supervisor, follow-up acknowledgement, or channel delivery yet.
- Next phase: Validate the worker in one-shot mode against the demo database and connect delivery policy.

## Demo automation milestone — Five-minute team check-ins (2026-10-25T03:39:04+05:30)

- Implemented:
  - Simplified the dedicated demo to a landing-page launch with six tasks and a copy → page → signup → QA → publish dependency chain.
  - Added a stale-work sweep that checks active tasks assigned to every member of the selected user's projects and creates a follow-up in the assignee's Agent conversation.
  - Added five-minute browser heartbeat, follow-up cards with task links, five-minute bucket deduplication, and integration coverage.
- Files and areas changed: `scripts/seed-demo.ts`, `src/lib/agent/messages.ts`, `src/server/agent-messages.ts`, `src/app/api/agent/follow-ups/route.ts`, `src/app/journal/page.tsx`, `src/app/journal/journal-chat.tsx`, `tests/integration/agent-messages.test.ts`, `docs/DEMO.md`, and project records.
- Checks run and results: Demo seed created 6 tasks and 3 dependencies; HTTP smoke check showed stale follow-ups. `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (49/49), and `git diff --check` pass.
- Decisions affecting later phases: Follow-ups are based on explicit task evidence or task update time, assigned to the task owner, and deduplicated per five-minute bucket. The browser heartbeat is a local fallback; production delivery uses the standalone worker with quiet hours and escalation rules.
- Remaining limitations: No hosted worker deployment, push/Telegram follow-up delivery, quiet hours, acknowledgement tracking, or maximum-nag policy yet.
- Next phase: Validate the standalone worker and connect durable delivery policy.

## PWA milestone — Installable mobile Agent shell (2026-10-25T03:28:39+05:30)

- Implemented:
  - Added `/manifest.webmanifest` with standalone display, Jeera branding, theme colors, and install icon metadata.
  - Added a client-side service-worker registration, static asset caching, no-cache service-worker headers, and an offline fallback page.
  - Added mobile viewport and Apple web-app metadata.
- Files and areas changed: `src/app/manifest.ts`, `src/app/layout.tsx`, `src/components/pwa-register.tsx`, `public/sw.js`, `public/icon.svg`, `public/offline.html`, `next.config.ts`, `README.md`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (95/95), and HTTP checks for the manifest, service worker, and offline fallback pass.
- Decisions affecting later phases: The service worker caches static assets only; task/API responses remain network-backed so the app does not present stale execution state as current.
- Remaining limitations: No push notifications, background sync, or offline mutation queue. PWA installability should be checked on the deployed HTTPS domain in each target browser.
- Next phase: Add push notifications and durable follow-up delivery after the task-runner policy is stable.

## Integrations milestone — Connector control plane (2026-10-25T03:25:38+05:30)

- Implemented:
  - Added `/integrations` to the primary navigation.
  - Added connector cards for Telegram, GitHub, Slack, and Google Chat with clear configured/planned status.
  - Telegram status is computed server-side from environment configuration without exposing the bot token; the page links to the existing webhook setup.
  - Documented the shared-ingress principle so future connectors feed the same agent runtime.
- Files and areas changed: `src/app/integrations/page.tsx`, `src/components/app-shell/nav-items.ts`, `README.md`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (95/95), and an HTTP smoke check of `/integrations` (200) pass.
- Decisions affecting later phases: Integrations is a control plane, not a second task system; provider credentials remain server-side and connector event processing stays behind the normalized agent ingress.
- Remaining limitations: GitHub, Slack, and Google Chat OAuth/event flows are not implemented; Telegram is configured through environment variables rather than a UI secret form.
- Next phase: Add GitHub webhook/repository linking and per-person identity mapping for external chat accounts.

## Chat polish — Remove purple AI identity icons (2026-10-25T03:24:29+05:30)

- Implemented: Removed the purple Sparkles/Bot avatar treatment from Agent briefing, assistant, loading, header, and empty states while preserving text labels and interaction behavior.
- Files and areas changed: `src/app/journal/journal-chat.tsx`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: `npm run typecheck`, `npm run lint`, and an HTTP smoke check pass; the rendered page contains no `lucide-sparkles` or purple avatar markup.
- Remaining limitations: None identified in these checks.

## Shell polish — Remove Jira-like logo mark (2026-10-25T03:21:36+05:30)

- Implemented: Removed the square-kanban icon from the desktop and mobile shell so the header presents Jeera without the Jira-like mark.
- Files and areas changed: `src/components/app-shell/app-shell.tsx`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: `npm run typecheck` and `npm run lint` pass.
- Remaining limitations: None identified in these checks.

## Team milestone — Membership-scoped team directory (2026-10-25T03:19:17+05:30)

- Implemented:
  - Replaced the Team placeholder with a directory of people from the selected user's projects.
  - Each member card shows name, email, project roles, project links, open workload, and total task count.
  - Added membership-scoped aggregation so users from unrelated projects are not exposed.
- Files and areas changed: `src/server/team.ts`, `src/app/team/page.tsx`, `tests/integration/team.test.ts`, `README.md`, `CHANGELOG.md`, and `AI_USAGE.md`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (48/48), and `git diff --check` pass.
- Decisions affecting later phases: Team visibility follows the existing project-membership boundary; this page does not become a global user directory.
- Remaining limitations: The directory is read-only and does not yet show availability, skills, or Telegram account links.
- Next phase: Use this team surface as the identity-linking target for Telegram users.

## Telegram milestone — First delivery adapter and focused navigation (2026-10-25T03:10:42+05:30)

- Implemented:
  - Removed Overview and Knowledge from the primary sidebar without deleting their routes.
  - Added Telegram to the normalized conversation channels and implemented `/api/telegram/webhook` with secret-header verification, allowed-chat filtering, deterministic retry keys, shared agent ingress, and Bot API replies.
  - Added environment placeholders and [Telegram setup instructions](DEMO.md#connect-telegram-for-the-demo). The first adapter maps one configured chat to one Jeera user for the demo.
- Files and areas changed: `src/components/app-shell/nav-items.ts`, `src/db/schema.ts`, `drizzle/0006_misty_mandrill.sql`, `src/lib/agent/channels.ts`, `src/lib/agent/telegram.ts`, `src/app/api/telegram/webhook/route.ts`, `src/lib/env.ts`, `.env.example`, `tests/telegram.test.ts`, `README.md`, and `docs/DEMO.md`.
- Checks run and results: `npm run db:generate`, `npm run db:migrate`, `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (47/47), and `git diff --check` pass.
- Decisions affecting later phases: Telegram only translates transport events and formats responses; all task/dependency permissions and journal processing remain in the shared agent service. Telegram writes preserve review-before-apply, so the first bot response directs consequential changes to the web review surface.
- Remaining limitations: Per-person Telegram identity linking, inline proposal review/apply controls, webhook deployment, and live Bot API verification require a real bot token and public HTTPS URL.
- Next phase: Configure the demo bot, test task/status questions end to end, then add identity linking and Telegram review actions.

## Demo milestone — Seeded team-delivery story (2026-10-25T03:03:35+05:30)

- Implemented:
  - Added an idempotent `npm run db:seed:demo` script for the dedicated Kochi Metro App execution demo.
  - Seeded four project members, six tasks across todo/in-progress/blocked/done, an open dependency waiting on George, three teammate evidence entries, and completion details on the finished decision task.
  - Added [docs/DEMO.md](DEMO.md) with the demo sequence, expected Agent questions, dependency-resolution step, completion flow, and the future Telegram adapter boundary.
- Checks run and results: The seed ran twice with a stable project id; a read-only query verified 4 members, 6 tasks, 1 open dependency, and 3 evidence entries. Typecheck, lint, 92 unit tests, 47 integration tests, `git diff --check`, and an HTTP 200 smoke check of the seeded project page passed.
- Decisions affecting later phases: Telegram remains a delivery adapter over the normalized agent ingress; it does not get separate task or dependency logic. No token, webhook, or identity mapping is stored in the repository.
- Remaining limitations: Telegram is not connected yet, and the demo seed is additive rather than a destructive database reset.
- Next phase: Implement and test the Telegram webhook/identity adapter when a bot token and deployment target are available.

## Phase 10 milestone — Morning task runner and completion records (2026-10-25T02:56:50+05:30)

- Implemented:
  - Added a persisted, idempotent morning briefing per user and IST day. It summarizes assigned open work, counts blocked/in-progress/due work, includes the newest explicit dependency for each listed task, and asks the person to state what they will work on first.
  - Interleaved the briefing into the single web Agent conversation as an assistant message with links to the relevant tasks. The current trigger is opening the Agent thread; the message model is ready for future scheduler and channel delivery.
  - Added completion details to tasks and to journal task-update proposals. Closing work can preserve what was completed, verified, or handed off, with the value visible in task details and activity changes.
- Files and areas changed: `src/db/schema.ts`, `drizzle/0005_purple_moira_mactaggert.sql`, `src/lib/agent/messages.ts`, `src/server/agent-messages.ts`, `src/app/journal/page.tsx`, `src/app/journal/journal-chat.tsx`, task services/forms, journal schema/resolution/apply path, and `tests/integration/journal.test.ts`.
- Checks run and results: `npm run db:migrate`, `npm run typecheck`, `npm run lint`, `npm test` (92/92), `npm run test:integration` (47/47), and `git diff --check` pass.
- Decisions affecting later phases: The daily message is a durable record with a `(user, day)` dedupe key, not a transient render-only banner. The agent summarizes explicit task/dependency records and does not infer that a task is finished from silence. Next.js server data is serialized before crossing into the interactive chat component.
- Remaining limitations: No scheduler, quiet hours, Slack/Google Chat delivery, or automatic stale-work follow-up is connected yet. New work still requires explicit owner, estimate, and target date before apply.
- Next phase: Continue Phase 10 with multi-turn commitment capture, then connect the Phase 13 follow-up policy to durable agent messages.

## Phase 10 milestone — Accountable task capture and scope changes (2026-10-25T02:45:34+05:30)

- Implemented:
  - AI task proposals now carry explicit nullable `dueDate`, `estimateHours`, and task-scope fields for both new work and updates to existing work.
  - Existing task resolution treats scope, dates, and estimates like other mutable fields: equal values become no-ops, while changed values remain reviewable.
  - New work without an owner, estimate, or target date produces visible clarification questions and cannot be selected for apply until answered.
  - The proposal card displays and edits scope, target date, effort, status, priority, and assignee; approved values flow through the normal transactional task update/create services and activity history.
  - The journal prompt tells the agent to capture only explicitly stated commitments, including scope changes, and never infer dates or estimates.
- Files and areas changed: `src/lib/journal/interpretation-schema.ts`, `src/lib/journal/resolve.ts`, `src/lib/journal/prompt.ts`, `src/server/journal.ts`, `src/app/journal/proposal-card.tsx`, `tests/journal.test.ts`, `tests/integration/journal.test.ts`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (90/90), `npm run test:integration` (44/44), and `git diff --check` pass.
- Decisions affecting later phases: estimates, target dates, and ownership are explicit evidence captured from a person or edited during review; they are not inferred from wording. Activity history remains the source of prior commitments.
- Remaining limitations: Phase 10 still needs clearer multi-turn task-capture prompts, real authentication, and broader read-only answers. Phases 11–13 are not complete.
- Next phase: Continue Phase 10 with authenticated team identity and richer daily-conversation task capture.

## Phase 12 milestone — Person-specific status evidence (2026-10-25T02:46:52+05:30)

- Implemented:
  - Status evidence now retains the author id and a recent evidence list per task instead of only the globally newest entry.
  - Questions naming a teammate and a task select that teammate's latest recorded update, preserving author, body, and timestamp for the answer card.
  - The read-only classifier recognizes natural phrasing such as “What is Priya doing on Checkout?”.
- Files and areas changed: `src/lib/journal/answers.ts`, `src/server/journal.ts`, `tests/journal-answers.test.ts`.
- Checks run and results: `npm test` (91/91), `npm run test:integration` (44/44), `npm run typecheck`, `npm run lint`, and `git diff --check` pass.
- Decisions affecting later phases: Evidence selection is explicit and author-aware; a missing teammate update remains unknown rather than being inferred from another person's update.
- Remaining limitations: The evidence window is bounded to recent interpreted entries, and project/dependency history still needs richer retrieval.
- Next phase: Continue Phase 12 with dependency-aware and project-level read-only answers.

## Phase 11 milestone — Dependency-aware task answers (2026-10-25T02:48:03+05:30)

- Implemented:
  - Read-only task answers now include the newest open dependency for blocked work, including waiting-on text, matched blocking user, description, and creation timestamp.
  - The web answer card surfaces “Waiting on … since …” next to the blocked task.
  - The query path is covered through the database-backed journal integration test, including the no-provider path.
  - Teammate matching uses word boundaries so short names cannot match inside words such as “blocked”.
- Files and areas changed: `src/lib/journal/answers.ts`, `src/server/journal.ts`, `src/app/journal/journal-chat.tsx`, `tests/journal-answers.test.ts`, `tests/integration/journal.test.ts`.
- Checks run and results: `npm test` (92/92), `npm run test:integration` (45/45), `npm run typecheck`, `npm run lint`, and `git diff --check` pass.
- Decisions affecting later phases: The answer surface reads explicit open dependency rows and does not infer a dependency from a blocked status alone. Only the newest open dependency is shown until the full graph view exists.
- Remaining limitations: Dependency chains, task-to-task blockers, resolution actions, and project-level “at risk” answers remain unfinished.
- Next phase: Continue Phase 11 with dependency chains and explicit resolution/update actions.

## Phase 11 milestone — Resolve dependencies and resume work (2026-10-25T02:49:13+05:30)

- Implemented:
  - Project overview blocked-work items now expose a membership-checked “Resolve & resume” action for open dependencies.
  - Resolving a dependency closes it and moves the blocked task back to `in_progress` in one transaction.
  - The dependency resolution and task transition each produce auditable manual activity events.
- Files and areas changed: `src/server/dependencies.ts`, `src/app/projects/actions.ts`, `src/app/projects/[projectId]/resolve-dependency-button.tsx`, `src/app/projects/[projectId]/overview-view.tsx`, `src/server/overview.ts`, `tests/integration/journal.test.ts`.
- Checks run and results: `npm run typecheck`, `npm run lint`, `npm test` (92/92), `npm run test:integration` (45/45), and `git diff --check` pass.
- Decisions affecting later phases: Resolution is an explicit user action for now; the agent does not infer that a dependency is resolved merely because a person posted an update.
- Remaining limitations: Dependency chains, automatic resolution from completion evidence, and cross-channel follow-up decisions remain unfinished.
- Next phase: Continue the task-runner loop with proactive daily briefings and completion details.

## Phase 3A — Execution Agent Core and Channel-Ready Messages (2026-10-25T02:25+05:30)

- Implemented:
  - Reframed `/journal` as the web surface for the execution agent and renamed the primary navigation item to Agent.
  - Added channel provenance to `journal_entries` (`web`, `slack`, `google_chat`), conversation keys, external message ids, and an idempotent `receiveAgentMessage` ingress for future channel adapters.
  - Added `task_dependencies` records so applied blockers preserve the blocked task, waiting-on text, matched team member, source journal entry, and open/resolved lifecycle.
  - Project overviews now show who or what blocked work is waiting on.
  - Status questions can use the latest ready/applied team journal evidence, including author and timestamp, while normal work updates continue through the review-before-apply proposal flow.
- Files and areas changed: `src/db/schema.ts`, `drizzle/0004_*.sql`, `src/lib/agent/channels.ts`, `src/server/agent.ts`, `src/server/journal.ts`, `src/server/overview.ts`, `src/lib/journal/answers.ts`, `src/lib/journal/resolve.ts`, `src/app/journal/**`, `src/app/projects/[projectId]/overview-view.tsx`, `tests/integration/journal.test.ts`, `tests/journal-answers.test.ts`, `README.md`, `docs/PRD.md`, `docs/TECH.md`, `docs/PHASES.md`.
- Checks run and results:
  - `npm run db:generate` created migration `0004_glamorous_jubilee.sql`.
  - `npm run db:migrate` applied the migration successfully to the configured development database.
  - `npm run typecheck`, `npm run lint`, `npm test` (89/89), and `npm run test:integration` (43/43) pass.
  - `/journal` returned HTTP 200 from the running dev server and rendered the Agent fallback state without a selected user.
- Decisions affecting later phases:
  - Web, Slack, and Google Chat share one normalized message boundary; channel adapters must not duplicate task/dependency logic.
  - Team evidence is readable only through project membership, while the personal conversation thread remains author-scoped.
  - A dependency is explicit when reported; lack of an update remains stale evidence, not proof that a person is idle.
- Remaining limitations:
  - Slack and Google Chat OAuth/webhook adapters are not connected yet.
  - Follow-up delivery and quiet-hour policies are not automated yet.
  - Current status evidence is based on interpreted journal entries; full-text search and richer history retrieval remain future work.
- Next phase: Phase 10 — Web-First Execution Agent.

## Phase 4 — Project Progress and Blockers (2026-10-25T00:45+05:30)

- Implemented:
  - A new "Overview" view on `/projects/[projectId]` — the first tab and the default when no `?view=` is given (`?view=board` keeps the board).
  - `getProjectOverview` in `src/server/overview.ts` (membership-checked) returns: status counts and done % (cancelled excluded from the denominator); blocked tasks with who marked them and the reported reason; overdue open tasks; upcoming priorities (high/urgent or due within 7 days); inferred stalls; and blockers from journal entries still in `ready` (awaiting review).
  - Reported blocker reasons come from `activity_events`: the reason is taken from the newest event carrying `blockedReason` at or after the latest status→blocked transition, so a reason from a previous block cycle is never shown as current (`src/lib/overview.ts` `latestBlockerInfo`). Tasks blocked manually show "no reason recorded".
  - Reported vs inferred is visible in the UI: the "Needs attention" card separates Overdue and "Reported in journal, not yet applied" (links to the entry) from "Possible stalls", which carry an "inferred — not reported" badge and an explanatory caption (in progress with no change for > 4 days).
  - Each section has its own empty state; the page keeps the shared error/not-found handling.
- Files and areas changed: `src/lib/overview.ts` (new, pure rules), `src/lib/dates.ts` (`todayIst`, now shared with `isOverdue`), `src/server/overview.ts` (new), `src/app/projects/[projectId]/overview-view.tsx` (new), `src/app/projects/[projectId]/page.tsx` (new default view), `tests/overview.test.ts`, `tests/integration/overview.test.ts`, `README.md`, `CHANGELOG.md`.
- Checks run and results:
  - lint and typecheck: pass. `npm test`: 76/76 pass. `npm run test:integration`: 36/36 pass, covering membership rejection, counts/done %, journal-applied blocker reason with entry link, manual block with no reason, overdue/upcoming/stall selection, pending-review blockers, and the empty project case.
  - Rendered over HTTP on the dev server against real data (Kochi Metro App): 200; all five cards render; the manually blocked "Order lanyards" shows "no reason recorded" + who marked it; an overdue task and the 29% done figure match the database.
- Decisions affecting later phases:
  - Blockers still have no dedicated table; reported reasons live in `activity_events.changes.blockedReason`. If a later phase adds a `blockers` table, `latestBlockerInfo` is the place to swap the read.
  - Stall inference is a fixed 4-day rule in `src/lib/overview.ts`, not an AI call. Phase 6 follow-ups can reuse `isStalled`/`staleDays` for "work appears stalled" triggers.
  - The Overview view defaults for the project page; the board moved to `?view=board`. Easy to flip back if the default is wrong.
- Remaining limitations:
  - Manual blocks capture no reason, so "no reason recorded" is common until journal apply writes one. A reason prompt on manual block is a candidate improvement.
  - Pending-review blockers read up to 30 recent `ready` entries per project — enough for the demo, not a complete history.
  - `npm run build` was not re-run while the dev server was up.
- Next phase: Phase 5 — Team Bandwidth and Workload.

## Phase 3 — Natural-Language Journal and AI Interpretation (2026-10-25T00:31+05:30)

- Implemented:
  - Journal as a chat interface at `/journal`. The left rail lists the user's projects, each a private thread of the user's own entries. Messages are sent from a composer; the AI replies in the thread.
  - Entries are always stored first (`journal_entries`, migration `0002_next_betty_brant.sql`), with an idempotent `submission_key` per author so retries don't create duplicates. The original text stays visible in the thread in every state.
  - AI interpretation via the Vercel AI SDK (`ai` 7.0.143, `@ai-sdk/openai` 4.0.96, default model `gpt-4.1-mini`, configurable with `OPENAI_MODEL`):
    - structured output validated against a Zod schema (`src/lib/journal/interpretation-schema.ts`);
    - prompt in `src/lib/journal/prompt.ts`, which treats journal text as untrusted data;
    - up to 6 earlier, non-dismissed entries by the same author in the project are sent as context, so replies to the AI's questions resolve.
  - Deterministic checks after the model replies (`src/lib/journal/resolve.ts`):
    - unknown task ids are dropped;
    - assignees who aren't project members are cleared;
    - no-op changes are dropped;
    - transitions the lifecycle doesn't allow are flagged and can't be selected;
    - likely duplicate new tasks are flagged (normalised title equality or token Jaccard ≥ 0.6);
    - every drop or correction is listed as an "issue" under the proposal.
  - Review, then apply. A proposal card in the AI's message lists task updates as field diffs, new tasks and blockers, each with a checkbox and inline edits. Decisions and clarifying questions are shown without checkboxes.
    - Low-confidence items, possible duplicates and invalid transitions start unchecked.
    - Apply runs as one transaction: all or nothing, re-checked against the current database.
    - The client sends only indexes into the stored proposal plus a few editable fields, so it cannot inject task ids.
    - Applying twice returns a conflict.
  - Changes from the journal are recorded in activity with `source = journal` and a link to the entry, shown as a "via journal" badge in project and task history.
  - Failed interpretations (AI not configured, unreadable output, timeout, provider error) keep the entry, show a safe message, and offer Retry or Dismiss. They are logged server-side by error name and code only.
- Files and areas changed: `src/db/schema.ts`, `drizzle/0002_*`, `src/lib/env.ts` (`OPENAI_API_KEY`, `OPENAI_MODEL`, `getAiConfig`), `src/lib/journal/**`, `src/server/ai/interpret.ts`, `src/server/journal.ts`, `src/server/tasks.ts` (shared transaction-aware create/update with source and journal id), `src/app/journal/**`, project and task pages (journal link, "via journal" badges), `src/components/ui/checkbox.tsx`, `.env.example`, tests.
- Checks run and results:
  - lint and typecheck pass. `npm test` 67/67 pass. `npm run test:integration` 27/27 pass, using a mocked model. Cases covered:
    - ready path; invalid AI output leaves no changes; missing key gives the configuration message; same submission key gives one entry;
    - apply records journal-sourced events; re-apply conflicts; a concurrent change to done rolls back the whole apply, including new tasks;
    - non-member gets not-found; out-of-range index is rejected; blocker on an already-blocked task; dismiss.
  - `db:migrate` applied `0002`.
  - Real OpenAI smoke test (`gpt-4.1-mini`) through the chat UI in Playwright, as Asha on Kochi Metro App.
    - First entry: matched the real tasks (Print badges → Done, blocker on Order lanyards waiting on Rahul). It recorded the QR-over-NFC decision with the stated rationale and dropped two no-op updates.
    - Follow-up "Assign the registration desk setup to Priya please.": proposed a new task assigned to Priya, after prompt rule 14 was added. Before that rule it had mapped the request onto an unrelated existing task.
    - Both entries were left unapplied. Screenshots reviewed at desktop and 390px; no console errors.
- Decisions affecting later phases:
  - Blockers are applied by moving the task to Blocked with `blockedReason` in the activity event. There is no separate `blockers` table yet; Phase 4 should introduce one if it needs blocker lifecycle.
  - Decisions are stored only inside the entry's interpretation JSON. Phase 7 should turn them into searchable records, drawing on stored interpretations.
  - The journal is private per author; project-wide visibility comes through the activity feed.
  - AI output is never applied without a click. Any future auto-apply must reuse `applyJournalEntry`'s validation.
- Remaining limitations:
  - Interpretation runs inline in the request (45 s timeout), with no background queue.
  - The first entry in the final smoke run did not propose the "registration desk" task, most likely because earlier test entries with the same text were in its context. Dismissed entries are now excluded from context, but this was not re-verified with a real call.
  - The model can still make mistakes. The review step and the database checks are the safeguards.
  - The production build was not re-run in this phase because the dev server was running.
- Next phase: Phase 4 — Project Progress and Blockers.

## Phase 2 — Projects, Teams, and Tasks (2026-10-24T23:08+05:30)

- Implemented:
  - Schema and migration `drizzle/0001_flat_shiva.sql`: `projects`, `project_memberships` (owner/member), `tasks` (status, priority, assignee, due date, estimate hours, `completed_at`), `activity_events` (type, per-field `changes` jsonb, `source` manual/journal/ai).
  - Task lifecycle rules (`src/lib/tasks/lifecycle.ts`): `todo`, `in_progress`, `blocked`, `done`, `cancelled`. Done and cancelled can only be reopened to To do; `completed_at` is set when a task becomes Done and cleared when it leaves Done.
  - Zod input schemas, field diffing, and UUID checks at trust boundaries (`src/lib/tasks/`, `src/lib/ids.ts`).
  - Application services (`src/server/`): project membership checks on every read and write (non-members get not-found), owner-only member addition, assignees limited to project members, transactional writes that record an activity event for each change, no event for no-op edits, row lock on task update.
  - Demo user switcher (httpOnly `pr_user_id` cookie, labelled "Demo identity — no authentication").
  - UI: `/projects` (list with per-status counts, create form), `/projects/[projectId]` (task table with `?status=` filter, new-task form, members panel, owner-only add member, recent activity), `/projects/[projectId]/tasks/[taskId]` (edit form, per-field "from → to" history). Times shown in Asia/Kolkata (IST).
  - `npm run db:seed` adds 5 demo users idempotently.
- Files and areas changed: `src/db/schema.ts`, `drizzle/`, `src/lib/{ids,format}.ts`, `src/lib/tasks/**`, `src/server/**`, `src/app/actions.ts`, `src/app/projects/**`, `src/components/{activity-changes,forms}.tsx`, `src/components/app-shell/**` (nav now Projects instead of Tasks; `/tasks` page removed), new shadcn `input`, `label`, `select`, `table`, `textarea`, `scripts/seed.ts`, `vitest.integration.config.ts`, `vitest.config.ts`, `tests/**`, `package.json` (`tsx` 4.23.15, new scripts), `.env.example`, `README.md`.
- Checks run and results:
  - lint and typecheck: pass. `npm test`: 45/45 pass. `npm run test:integration`: 11/11 pass against `project_runner_test`. `npm run build`: pass.
  - `db:migrate` applied 0001; `db:seed` run twice, still 5 users.
  - End-to-end flow, run through the service layer with a throwaway script against the dev DB: create project, add member, create assigned task, todo → in_progress → done, done → blocked rejected with an explanatory message, history recorded. Then rendered the project and task pages over HTTP with each user's cookie: the owner sees "Add member", a member does not, and a non-member gets the not-found UI.
  - Invalid identifiers (non-UUID cookie or route params) render the "No demo user selected" or not-found state instead of the database error seen before the fix.
- Decisions affecting later phases:
  - No separate `teams` table: a project's team is its members.
  - Every change goes through `src/server/*` services and writes an `activity_events` row; journal/AI phases must set `source` to `journal`/`ai` and should reuse `updateTask`/`createTask`.
  - Pages that read the cookie or DB use `await connection()` inside Suspense; the project and task pages set `export const instant = false`.
- Remaining limitations:
  - No real authentication. Anyone can choose any demo user.
  - Not-found pages from request-time checks stream with HTTP 200, not 404 (Next.js Cache Components behaviour). The UI and data exposure are correct.
  - Server actions were not exercised through a browser. The flow was driven via the services, then pages were checked over HTTP. Browser testing is planned for Phase 8.
  - No optimistic concurrency check on simultaneous edits (row lock only). No delete or archive of projects or tasks.
- Next phase: Phase 3 — Natural-Language Journal and AI Interpretation.

## Phase 1 — Foundation and Application Shell (2026-10-24T22:42+05:30)

- Implemented:
  - Next.js 16.4.2 (App Router, TypeScript, Tailwind CSS v4, ESLint) scaffolded at the repo root; shadcn/ui (radix base, `nova` preset) with button, card, skeleton, alert, separator, badge.
  - App shell: sidebar (top bar on small screens) with active-state navigation for Overview, Journal, Tasks, Team, Knowledge.
  - Environment handling: Zod-validated `parseServerEnv` / lazily memoized `getServerEnv` (`DATABASE_URL`, must be `postgres://` or `postgresql://`; errors name the variable and never echo its value). Sanitized `.env.example`.
  - PostgreSQL via Drizzle ORM + node-postgres: lazily created shared `Pool` and `db` so `next build` needs no database; drizzle-kit config shares `.env.local` through `@next/env`; initial migration creating `users`.
  - `GET /api/health` (200 healthy / 503 with a redacted error) and a live "System status" card on Overview.
  - Loading/empty/error pattern: `LoadingState`, `EmptyState`, `ErrorState`, `PageHeader`, wired into `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`.
- Files and areas changed: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `components.json`, `vitest.config.ts`, `drizzle.config.ts`, `drizzle/` (migration + meta), `.env.example`, `.gitignore`, `src/app/**`, `src/components/{app-shell,states,ui}/**`, `src/db/{index,schema,health}.ts`, `src/lib/{env,utils}.ts`, `tests/env.test.ts`, `README.md`, `AGENTS.md` (Next.js-generated agent block).
- Checks run and results:
  - `npm run lint`, `npm run typecheck`: pass.
  - `npm test`: 5/5 Vitest tests pass (env validation).
  - `npm run build`: pass, also with `.env.local` removed (no DB needed at build time).
  - `npm run db:migrate`: applied `users`; second run is a no-op; `\d users` confirms the table.
  - Dev server: `/`, `/journal`, `/tasks`, `/team`, `/knowledge` → 200; unknown route → custom 404; `/api/health` → `{"status":"ok",...}`; Overview shows "Database connected".
  - Failure case: production server with `DATABASE_URL` pointing at a missing database → `/api/health` 503 with `database "does_not_exist" does not exist`; Overview renders the "Database unavailable" error state instead of crashing.
  - `.env.local` confirmed git-ignored; no real connection strings in tracked files.
- Decisions affecting later phases:
  - Next 16.4.2 enables Cache Components and Partial Prefetching by default: data-dependent server components must sit inside `<Suspense>` and call `await connection()` (or use `"use cache"`) to avoid build-time prerender errors.
  - Next 16 error boundaries receive `retry` (not `reset`); check `node_modules/next/dist/docs/` for current APIs.
  - Import `db` from `@/db` only in server code (`server-only` guard). Migrations are generated with `npm run db:generate` and committed under `drizzle/`.
  - Dependencies are pinned to releases at least 7 days old (lucide-react 1.58.0, shadcn 4.21.5 were downgraded from newer releases).
- Remaining limitations:
  - Journal, Tasks, Team, Knowledge are honest "not built yet" placeholders.
  - No authentication; the `users` table has no UI or seed data yet.
  - `npm audit` reports 7 advisories (4 moderate, 3 high) inside the `shadcn` package's bundled dependencies; `shadcn` is a runtime dependency only for its `shadcn/tailwind.css` import.
  - No favicon.
- Next phase: Phase 2 — Projects, Teams, and Tasks.
