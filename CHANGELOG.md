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

## 2026-10-25T02:25:36+05:30 — Reframe Journal as a channel-ready execution agent

- Changed: Added channel provenance and external-message deduplication to `journal_entries`, a normalized `receiveAgentMessage` ingress for web/Slack/Google Chat adapters, and a `task_dependencies` table. Applied blockers now record who or what the task is waiting on; project overviews show that dependency. Status questions can use the latest teammate journal evidence with author and timestamp. Reframed the UI/nav/docs from Journal to Agent while keeping `/journal` stable.
- Why: Jeera's core product is the agent that understands execution state across conversations—not a web task board or private journal. This milestone makes the web channel first-class while keeping future chat channels on the same domain model.
- Validation: `npm run db:generate`, `npm run db:migrate`, `npm run typecheck`, `npm run lint`, `npm test` (89/89), `npm run test:integration` (43/43), `git diff --check`, and an HTTP 200 check of `/journal` passed.
- Limitations: Slack/Google Chat adapters and automatic follow-up delivery are not connected yet; no production build was run while the dev server was active.

## 2026-10-25T02:03:00+05:30 — Split task questions from journal proposals

- Changed: Added a deterministic read-only task-query path in `src/lib/journal/answers.ts` and `src/server/journal.ts`, so questions such as “Which tasks assigned to George should be prioritized for today?” return George's open tasks ordered by priority and due date instead of producing a clarification proposal. Added `TaskAnswer` data to resolved journal interpretations and a linked task-search card in `src/app/journal/journal-chat.tsx`. Refreshed the journal header, empty state, message bubbles, composer, and quick prompts; task context now includes due dates.
- Why: The old prompt only supported journal-update interpretation, so a normal question was incorrectly treated as missing update information. The chat also needed a clearer chatbot-style answer surface.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (89/89), and `npm run test:integration` (41/41) pass. Browser automation was unavailable in this session; the running dev server remained available for manual review.
- Limitations: The first read-only tool covers task-list questions; broader project-history questions still use the proposal interpreter and need a future read-only tool.

## 2026-10-25T01:42:14+05:30 — Jeera ASCII wordmark on empty journal

- Changed: `src/components/jeera-wordmark.tsx` renders "JEERA" generated with figlet's ANSI Shadow font, shown centered on the empty journal thread above the composer; rows fade/rise in with staggered delays then a slow ambient pulse (`globals.css`, respects prefers-reduced-motion). Journal helper labels ("No entries yet", "Enter to send", private-journal tagline) removed in the same pass.
- Why: User asked for an OpenCode-style ASCII label above the input, and to strip helper text.
- Validation: typecheck and lint pass; Playwright confirmed `pre[aria-label=Jeera]` renders on an empty thread (new test user) and screenshot reviewed.
- Limitations: Wordmark only shows when the thread is empty (by design, like OpenCode's start screen).

## 2026-10-25T01:26:40+05:30 — Project-agnostic journal chat

- Changed: `/journal` is now one project-free chat per user — no project picker, header or labels. Journal entries are author-scoped (`journal_entries.project_id` nullable, migration `0003`); interpretation resolves the project per proposed item across all of the user's member projects (prompt now lists PROJECTS, per-project MEMBERS, and tasks tagged with `project=`); new tasks carry `projectId` (null → clarification question, unselectable in review); apply checks membership per item. Sidebar Conversations group removed; proposal card shows each item's project subtly.
- Why: User decision — the developer just talks to the agent; the agent figures out the project and asks when ambiguous.
- Validation: typecheck, lint, 85/85 unit and 40/40 integration tests pass; real OpenAI smoke entry resolved "Still blocked on lanyards" to the right project automatically. Screenshots reviewed.
- Limitations: A new task with an unclear project stays unselectable until clarified in a reply.

## 2026-10-25T01:29:00+05:30 — Move theme switch beside user menu

- Changed: Placed the theme toggle on the right side of the sidebar footer's user-switcher row in `src/components/app-shell/app-shell.tsx`.
- Why: User feedback — the theme switch should not occupy a separate bottom row.
- Validation: `npm run lint`, `npm run typecheck`, and `npm test` pass.
- Limitations: None identified in these checks.

## 2026-10-25T01:23:57+05:30 — Make the sidebar user popup visible

- Changed: Replaced the sidebar footer's Radix Select trigger with an explicit account-style popup in `src/components/app-shell/user-switcher-client.tsx`; clicking the name now opens the user list above the control, with outside-click and Escape dismissal and a checkmark for the active user.
- Why: User feedback — the name control rendered, but its popup was not visibly opening.
- Validation: `npm run lint` and `npm run typecheck` pass.
- Limitations: The popup was verified through the rendered component structure and static checks; browser automation was not used.

## 2026-10-25T01:06:59+05:30 — Journal as a plain daily conversation

- Changed: Removed the inner scroll container and fixed-height wrapper from `/journal` — the thread now scrolls with the page like a normal document, with a `sticky bottom-0` composer (no separate scrollbar). Header is a plain, unpinned project name. Entries are grouped by IST day with "Today"/"Yesterday"/date separators — each day starts a fresh conversation.
- Why: User asked to remove the custom scroller and pinned header; the journal is a daily chat with the agent, not a CRUD list.
- Validation: Browser check (1440x900): no inner scrollers remain, page scrolls naturally (docH 2510 > vh 900), composer stays sticky-bottom, day separator renders. Lint and typecheck pass.
- Limitations: None identified in these checks.

## 2026-10-25T00:53:27+05:30 — Journal chat scrollbar and composer position

- Changed: In the journal thread, the scrollbar now sits right next to the message column (bounded scroll area `max-w-[52rem]` + `scrollbar-gutter: stable`) instead of at the page edge, and the composer sits at the bottom of the thread with less dead space below it.
- Why: User feedback — the scrollbar looked like a misplaced page scrollbar and the composer appeared to float mid-page.
- Validation: Measured in a browser (Playwright, 1440x900): the scrollbar gutter is 15px beside the message column, the composer is anchored near the viewport bottom, and the page does not scroll (document height = viewport). Lint and typecheck pass.
- Limitations: None identified in these checks.

## 2026-10-25T01:15:00+05:30 — User switcher as an account-style menu

- Changed: Sidebar footer user control restyled to the account-menu pattern — avatar + name on the left, `ChevronsUpDown` icon on the right; the select popup opens upward (`position="popper"`, `side="top"`) and each item shows the user's initial chip.
- Why: User feedback — the switcher should read as a clickable account menu, not a form field.
- Validation: lint and typecheck pass; rendered page shows the current user's name with the up/down icon.
- Limitations: Popup positioning checked via markup only (Radix renders the list on open).

## 2026-10-25T01:10:00+05:30 — Simplify sidebar footer and rename demo users

- Changed: Removed the "Conversations" rail from the sidebar (`conversations.tsx`, `conversations-nav.tsx` deleted); the journal page now shows its project picker on all breakpoints instead of relying on the rail (`MobileProjectSelect` → `ProjectSelect`). Removed the "Demo identity · no auth" badge from the footer; the user switcher trigger is now full-width so clicking the name opens the user menu. Demo users renamed to Joji, George, Vaishakh, Jaice in `scripts/seed.ts` and in the dev database (the unused fifth seeded user was deleted; it had no references). `excerpt` helper removed from `lib/format.ts` (only the rail used it).
- Why: User direction — a simpler sidebar without the conversations rail or the no-auth label, and real teammate names for the demo.
- Validation: lint and typecheck pass; 76/76 unit and 36/36 integration tests pass; `/journal` returns 200 with no "Conversations"/"Demo identity" markup and shows the project picker and new user names.
- Limitations: Journal project switching on desktop now goes through the picker in the page header. Existing journal entries may still mention old demo names in their text.

## 2026-10-25T01:01:00+05:30 — Collapsed sidebar shows expand icon

- Changed: Collapsed (icon) sidebar header now renders `SidebarTrigger` (PanelLeft icon, expands on click) instead of the logo chip; `collapsed-logo-button.tsx` removed.
- Why: User asked for the expand icon rather than the logo in the collapsed view.
- Validation: lint and typecheck pass; dev server (with `sidebar_state=false`) renders the trigger in the collapsed header.
- Limitations: None identified in these checks.

## 2026-10-25T00:55:00+05:30 — Rename product to Jeera

- Changed: Product name "Project Runner" → "Jeera" in the page title, sidebar and mobile top bar, journal chat copy, the AI system prompt, overview description, `package.json`/`package-lock.json` name, `SUBMISSION.md`, `README.md`, `docs/PRD.md`, and `docs/PHASES.md`.
- Why: User chose "Jeera" as the project name.
- Validation: lint, typecheck and 76/76 unit tests pass; dev server serves `<title>Jeera</title>` and the renamed sidebar brand.
- Limitations: The local database and `.env.example` keep the `project_runner` name — renaming it would break the existing local setup. Historical CHANGELOG/PROGRESS entries are unchanged.

## 2026-10-25T00:59:00+05:30 — Journal chat layout fixes

- Changed: Sidebar footer restacked (user switcher on its own row; "Demo identity · no auth" badge beside the theme toggle below it). Thread scrollbar back at the right edge of the content area. Composer stays anchored at the bottom of the chat area; the page no longer scrolls.
- Why: User feedback on the journal layout.
- Validation: Measured in a browser at 1440x900 — document height equals the viewport (no page scroll), thread scrolls internally, scrollbar at the content edge, composer bottom ~64px above the viewport edge. Lint and typecheck pass.
- Limitations: None identified in these checks.

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
