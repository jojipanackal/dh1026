# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

Add entries as you build, newest first:

```text
## <actual timestamp> — <short change title>

- Changed: <feature or files changed>
- Why: <reason for the change>
- Validation: <commands or manual checks actually run, with results>
- Limitations: <known issues or "None identified in these checks">
```

## 2026-10-24T23:59:39+05:30 — ClickUp-style board view for projects

- Changed: The project page has a views bar (Board, List, Activity, Members via `?view=`). The board has status columns with counts, quick-add "+" on To do, In progress and Blocked, and a collapsible Cancelled column. Drag-and-drop (`@dnd-kit/core` 6.3.1) updates the screen immediately and reverts if the server rejects the move; a toast (`sonner` 2.0.8) reports the result. Cards show priority, due date (red when overdue), estimate and assignee avatar. Assignee and priority filters (`?assignee=`, `?priority=`) are applied on the server. A "+ New task" dialog and a member avatar stack are in the header. New `moveTask` service shares one locked update path with `updateTask`. `createTaskInput` accepts a starting status (todo, in_progress or blocked). New helpers `isOverdue` and `parseTaskFilters`.
- Why: User asked for a ClickUp-style board/kanban view and better UI/UX on projects.
- Validation: lint and typecheck pass. 55/55 unit tests and 16/16 integration tests pass. In Playwright, a To do → In progress drag updated the database, and a Done → Blocked drag showed an error toast and the card reverted. No horizontal scroll at 1440px or 390px. Fixed a hydration mismatch from dnd-kit's generated ids (now a stable `useId` on `DndContext`). `npm run build` was not re-run because the dev server was running.
- Limitations: Order within a column is not saved; cards sort by priority, then creation time. Dragging between columns only changes status.

## 2026-10-24T23:45:11+05:30 — New project button and dialog

- Changed: `/projects` now has a "+ New project" outline button in the page header that opens a shadcn Dialog with the create form (`src/app/projects/new-project-dialog.tsx`, `src/components/ui/dialog.tsx`); the table is full width; `createProjectAction` returns `success` so the dialog closes and resets.
- Why: User asked for an OpenCode-style header action instead of the side form.
- Validation: lint and typecheck pass; `/projects` renders the button and project list (HTTP 200). Dialog not browser-tested (user asked to keep testing light).
- Limitations: None identified in these checks.

## 2026-10-24T23:30:00+05:30 — Dark dev-console UI theme

- Changed: Dark-by-default theme with a light/dark toggle (`next-themes` 0.4.6, `src/components/theme-provider.tsx`, `theme-toggle.tsx`). Inter for UI text, with JetBrains Mono only for ids, emails, event types and timestamps. Neutral shadcn tokens plus an indigo `--brand` accent (`src/app/globals.css`). App shell redesigned as a top bar (logo, demo user switcher, toggle) above an inset panel with tab navigation (`src/components/app-shell/**`). New shared `StatusBadge`/`PriorityBadge` and `KeyValueList`. Projects, project and task pages rearranged into a main column and a details column, with bordered tables. Mobile layout fixed. Next.js dev indicator moved to the bottom-right.
- Why: User asked for a dark theme in the style of a developer-tool console (OpenCode-like) that non-developers can also read comfortably. A terminal/monospace "Lyra" pass was tried first and rejected by the user, then reverted.
- Validation: lint, typecheck, 45/45 unit tests and build pass. I reviewed Playwright screenshots in dark and light at 1440×900 and 390×844. `scrollWidth` is 390 at 390px on `/`, `/projects`, the project page and the task page. No browser console errors. No server code changed.
- Limitations: Running `npm run build` while `next dev` is running overwrites the shared `.next` directory. The dev server then serves stale CSS or crashes; restart it after `rm -rf .next`.

## 2026-10-24T23:08:00+05:30 — Phase 2: projects, teams, and tasks

- Changed: New tables `projects`, `project_memberships`, `tasks`, `activity_events` (migration `0001`); task lifecycle, validation, and diff rules (`src/lib/tasks/`); membership-checked services (`src/server/`); demo user switcher; `/projects`, project detail, and task detail pages with forms and activity history; `npm run db:seed`; unit and integration tests; nav Tasks → Projects.
- Why: Phase 2 of `docs/PHASES.md`. Projects, membership, and the task workflow must exist before the journal and AI phases can create or update tasks.
- Validation: lint and typecheck pass; 45/45 unit and 11/11 integration tests pass; build passes; migrate and seed are idempotent. Service-level end-to-end flow and HTTP page checks per user role. Fixed and re-verified a crash on non-UUID cookies and route params.
- Limitations: Demo identity only, no real auth; dynamic not-found pages return HTTP 200; server actions not yet browser-tested; no delete or archive.

## 2026-10-24T22:42:00+05:30 — Phase 1: foundation and application shell

- Changed: Scaffolded Next.js 16.4.2 + TypeScript + Tailwind v4 + shadcn/ui at the repo root; app shell and navigation (`src/app/**`, `src/components/**`); Zod env validation (`src/lib/env.ts`); Drizzle ORM + node-postgres connection, `users` schema, and initial migration (`src/db/**`, `drizzle.config.ts`, `drizzle/`); `GET /api/health`; loading/empty/error/not-found/global-error states; Vitest tests (`tests/env.test.ts`); `.env.example`; README setup and commands; `docs/PROGRESS.md` Phase 1 report.
- Why: Phase 1 of `docs/PHASES.md` — a working shell, configured database, and migrations before building features.
- Validation: lint, typecheck, 5/5 unit tests, and production build (also without `.env.local`) pass; `db:migrate` applies and is idempotent; all core routes return 200, unknown route 404, `/api/health` 200; with a missing database `/api/health` returns 503 and Overview renders the error state.
- Limitations: Feature pages are placeholders; no auth; `npm audit` reports advisories inside `shadcn`'s bundled dependencies; no favicon.

## 2026-10-24T22:24:23+05:30 — Add Context7 documentation rule

- Changed: `AGENTS.md`.
- Why: Agents should fetch current library docs through Context7 by default instead of relying on memory.
- Validation: Reviewed the new section for consistency with the rest of `AGENTS.md`.
- Limitations: None identified in these checks.

## 2026-10-24T22:16:09+05:30 — De-duplicate Project Runner planning docs

- Changed: `docs/TECH.md`, `docs/PHASES.md`, `docs/PROGRESS.md`.
- Why: The PRD, TECH, and PHASES docs repeated each other and `AGENTS.md`. Each now has one job: PRD defines what to build, TECH defines how, PHASES defines the build order, and PROGRESS records completed phases. Removed TECH's copy of the build order and generic coding rules, PHASES' copy of the PRD success criteria, and PHASES' references to the nonexistent `PROJECT.md` and `MCP.md`. Added a phase-report template to the empty `PROGRESS.md`.
- Validation: Checked that the relative links and section anchors in the edited docs point to existing files and headings.
- Limitations: Docs-only; no implementation yet. Track choice is not yet recorded in the README.

## 2026-10-24T22:03:16+05:30 — Adapt template for Devin Hacks Kochi

- Changed: `RULES.md`, `README.md`, `SUBMISSION.md`, `AGENTS.md`, `AI_USAGE.md`, `CHANGELOG.md`, `.github/pull_request_template.md`.
- Why: The template came from an earlier Codex event; this event is Devin Hacks Kochi, solo, 12 hours, with four tracks.
- Validation: Checked local Markdown links and searched for leftover Codex, team, and old-date references.
- Limitations: Event date, venue, start time, and deadline are TBD until confirmed by organizers. No project implementation yet.

## Template setup — 10 October 2026 (earlier Codex event)

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
