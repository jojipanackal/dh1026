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
