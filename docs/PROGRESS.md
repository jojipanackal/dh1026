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
