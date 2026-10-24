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

## 2026-10-25T00:53:27+05:30 — Journal chat scrollbar and composer position

- Changed: In the journal thread, the scrollbar now sits right next to the message column (bounded scroll area `max-w-[52rem]` + `scrollbar-gutter: stable`) instead of at the page edge, and the composer sits at the bottom of the thread with less dead space below it.
- Why: User feedback — the scrollbar looked like a misplaced page scrollbar and the composer appeared to float mid-page.
- Validation: Measured in a browser (Playwright, 1440x900): the scrollbar gutter is 15px beside the message column, the composer is anchored near the viewport bottom, and the page does not scroll (document height = viewport). Lint and typecheck pass.
- Limitations: None identified in these checks.

## 2026-10-25T00:55:00+05:30 — Rename product to Jeera

- Changed: Product name "Project Runner" → "Jeera" in the page title, sidebar and mobile top bar, journal chat copy, the AI system prompt, overview description, `package.json`/`package-lock.json` name, `SUBMISSION.md`, `README.md`, `docs/PRD.md`, and `docs/PHASES.md`.
- Why: User chose "Jeera" as the project name.
- Validation: lint, typecheck and 76/76 unit tests pass; dev server serves `<title>Jeera</title>` and the renamed sidebar brand.
- Limitations: The local database and `.env.example` keep the `project_runner` name — renaming it would break the existing local setup. Historical CHANGELOG/PROGRESS entries are unchanged.

## 2026-10-25T00:45:00+05:30 — Phase 4: project overview with progress and blockers

- Changed: `/projects/[projectId]` opens on a new "Overview" view (first tab, now the default). `src/server/overview.ts` adds `getProjectOverview` (membership-checked): status counts and done %, currently blocked tasks with who marked them and the recorded reason (read from `activity_events`, including journal-applied `blockedReason`), overdue open tasks, upcoming priorities (high/urgent or due within 7 days), and blockers reported in journal entries that are still awaiting review. Rules live in `src/lib/overview.ts` (`latestBlockerInfo`, `dayDiff`, `isStalled`) and the UI in `overview-view.tsx`. In-progress tasks with no change for 4+ days appear under "Needs attention" explicitly badged "inferred — not reported", keeping reported blockers distinct from system guesses. `src/lib/dates.ts` gains `todayIst`, reused by `isOverdue`.
- Why: Phase 4 of `docs/PHASES.md` — a central view of project execution that surfaces blocked work with its reported cause and separates reported facts from inference.
- Validation: lint and typecheck pass; 76/76 unit and 36/36 integration tests pass, including a journal-apply → blocked-reason → overview check. The project page was fetched over HTTP on the dev server: all five cards render, a manually blocked task shows "no reason recorded", and the progress bar/done % match the database.
- Limitations: Manual status moves capture no blocked reason, so those tasks show "no reason recorded" until a journal entry adds one. Stall detection is a fixed 4-day heuristic. The build was not re-run while the dev server was up.

## 2026-10-25T00:44:43+05:30 — ChatGPT-style collapsible sidebar and chat layout

- Changed: Replaced the top-bar and inset panel with a collapsible sidebar (shadcn `sidebar`, `tooltip`, `sheet`; off-canvas drawer on mobile, ⌘B toggle, state persisted in the `sidebar_state` cookie). Sidebar holds main nav, a "Conversations" group listing projects by recent journal activity, and a footer with the user switcher, demo badge and theme toggle. `/journal` dropped its project rail: centered `max-w-3xl` thread, user bubbles right-aligned, plain-text assistant replies with avatar, and a rounded composer with an in-box send button.
- Why: User asked for a ChatGPT-like collapsible sidebar and chat layout (referencing the Vercel eve chat template).
- Validation: lint, typecheck and 67/67 unit tests pass. Playwright verified collapse toggle, cookie persistence across reloads, mobile drawer, 390px scrollWidth = 390, zero console errors. Screenshots reviewed.
- Limitations: Production build not run while dev server was up. Conversations rail caps at 10 projects.

## 2026-10-25T00:30:54+05:30 — Phase 3: AI journal chat

- Changed: `/journal` is now an AI chat. Entries are stored first; OpenAI (via the AI SDK) interprets them into a validated proposal, which deterministic checks verify against real records. The user ticks items to apply in a proposal card, and they are applied in one transaction with journal-sourced activity events. Also adds: migration `0002` (`journal_entries`, `activity_events.journal_entry_id`); `OPENAI_API_KEY` and `OPENAI_MODEL` env vars; an env parsing fix so optional variables are forwarded; "via journal" badges in activity.
- Why: Phase 3 of `docs/PHASES.md`. The user chose OpenAI, review-before-apply, and a chat interface.
- Validation: lint and typecheck pass; 67/67 unit and 27/27 integration tests pass (mocked model). A real `gpt-4.1-mini` smoke test through the chat UI matched real tasks and handled a follow-up reply. Screenshots reviewed.
- Limitations: Interpretation runs inline (45 s timeout). Blockers and decisions have no tables yet (planned for Phases 4 and 7). The build was not re-run while the dev server was up.

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
