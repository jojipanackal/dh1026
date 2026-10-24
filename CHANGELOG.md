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

## 2026-10-25T03:53:07+05:30 — Polish the demo entry points

- Changed: Added persistent Agent prompt chips for the seeded task questions and corrected Tasks counts/due styling so cancelled work is not presented as open or overdue.
- Why: A live demo should reveal the intended conversation paths immediately, while the task queue should communicate execution state without misleading terminal work.
- Validation: `npm run typecheck`, `npm run lint`, and `git diff --check` passed.
- Limitations: Visual screenshot review remains unavailable because no browser surface is exposed in this environment.

## 2026-10-25T03:51:42+05:30 — Add the cross-project Tasks workspace and demo conversation

- Changed: Added the primary **Tasks** tab with a database-backed execution queue, All work/My work scopes, search and project/status/priority/assignee filters, summary counts, dependency context, direct task links, and global task creation. Expanded the demo seed with grounded Joji task questions and answer cards for the launch chain.
- Why: The task runner needs a shared operational view alongside the natural-language Agent, and the demo should show a believable conversation that leads to persisted work rather than isolated sample rows.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (51/51), `npm run db:seed:demo`, authenticated HTTP 200 checks for `/tasks` and `/journal`, and content checks for the landing-page queue and seeded questions passed.
- Limitations: The Tasks tab is intentionally focused on the current execution workflow; bulk editing, saved views, and calendar/timeline layouts remain future work.

## 2026-10-25T03:44:45+05:30 — Move follow-ups into a server-side worker

- Changed: Added `scripts/follow-up-worker.ts`, `npm run agent:worker`, and `npm run agent:follow-ups`. The continuous worker scans every project membership, uses a PostgreSQL advisory lock, and shares the existing evidence-based sweep and database deduplication. The browser heartbeat remains a local fallback.
- Why: Follow-ups must happen when nobody has the Agent page open; a separate process is the simplest reliable deployment boundary without creating a second task system.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (50/50), `npm run agent:follow-ups` (one-shot completed with 0 duplicate messages), `npm run agent:worker` (started, ran one tick, and stopped cleanly on SIGINT), and `git diff --check` passed.
- Limitations: The repository does not deploy or supervise the worker. Production still needs a process supervisor or hosted scheduled job, plus quiet hours, acknowledgement/escalation policy, and Telegram delivery.

## 2026-10-25T03:39:04+05:30 — Add five-minute demo follow-ups and simplify the demo story

- Changed: Reset the dedicated demo project to a simple landing-page launch with six connected tasks and a three-step dependency chain. Added `runTeamFollowUpSweep`, a follow-up API route compatible with the project's Next.js cache-components mode, five-minute browser heartbeat, stale-evidence check-ins for every teammate in the selected user's projects, and follow-up message rendering in Agent conversations.
- Why: The demo should make Jeera's core promise obvious: a small team can see who is waiting on whom, and Jeera actively checks for movement instead of only answering when asked.
- Validation: `npm run db:seed:demo` created the landing-page demo with 6 tasks and 3 dependencies; `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (49/49), and `git diff --check` passed. Live HTTP checks returned 200 for `/journal` and `/projects`; the follow-up route returned its expected 401 without a selected demo-user cookie.
- Limitations: The five-minute heartbeat runs while a web Agent page is open. Production needs a durable scheduler/queue, quiet hours, per-channel delivery policy, and a maximum follow-up policy to avoid nagging.

## 2026-10-25T03:38:47+05:30 — Add color and depth to the app shell

- Changed: Refreshed `src/app/globals.css` with cool indigo/teal semantic tokens, richer dark surfaces, soft background glows, selection styling, and a subtle animated brand mark. Updated the shared shell and page header in `src/components/app-shell/app-shell.tsx` and `src/components/app-shell/page-header.tsx` with the new brand treatment and clearer hierarchy.
- Why: The interface was visually flat even though the product has a dark dev-console direction; the shared tokens and shell were the smallest focused change that could improve every route consistently.
- Validation: `npm run lint`, `npm run typecheck`, `git diff --check`, and live HTTP 200 checks for `/`, `/journal`, `/projects`, `/team`, and `/integrations` passed. Browser screenshot review was unavailable because no browser surface was exposed in this session.
- Limitations: The design pass changes shared color tokens and spacing, so pages with dense data may still need individual polish after a visual browser review.

## 2026-10-25T03:28:39+05:30 — Add installable PWA baseline

- Changed: Added the Next.js web app manifest, Jeera icon, mobile viewport/theme metadata, Apple web-app metadata, service-worker registration, static asset caching, and an offline fallback page. The worker deliberately avoids caching dynamic task/API responses.
- Why: Jeera is a daily, mobile-first Agent surface and should be installable like a lightweight work app without claiming that task mutations work offline.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (95/95), and HTTP checks for `/manifest.webmanifest` (200), `/sw.js` (200 with service-worker headers), and `/offline.html` (200) passed.
- Limitations: Dynamic task data and writes still require a network connection; push notifications, background sync, and offline mutation queues are not implemented.

## 2026-10-25T03:25:38+05:30 — Add the Integrations page

- Changed: Added an Integrations page to the primary navigation with connector cards for Telegram, GitHub, Slack, and Google Chat. Telegram reflects server-side configuration without exposing secrets and links to the webhook setup; planned connectors explain their future capabilities and shared-ingress model.
- Why: Integrations should be a visible control plane for connecting the agent to the tools where teams already work.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (95/95), and an HTTP smoke check of `/integrations` (200) passed.
- Limitations: The page is a connector catalog/status surface; GitHub, Slack, and Google Chat OAuth/event flows are not implemented yet. Telegram credentials remain environment-managed.

## 2026-10-25T03:24:29+05:30 — Remove the purple AI chat avatar

- Changed: Removed the purple Sparkles/Bot avatar treatment from briefing messages, assistant responses, loading responses, the chat header, and the empty Agent state. Text labels and message content remain unchanged.
- Why: The decorative AI icon made the conversation feel more like an AI demo than a natural task conversation.
- Validation: `npm run typecheck`, `npm run lint`, and an HTTP smoke check confirmed the Agent page no longer renders the Sparkles avatar/icon.
- Limitations: None identified in these checks.

## 2026-10-25T03:21:36+05:30 — Remove the Jira-like shell mark

- Changed: Removed the square-kanban logo chip from the desktop and mobile app shell, leaving the Jeera wordmark and navigation controls in place.
- Why: The icon read as a Jira logo and did not represent Jeera's agent-first identity.
- Validation: `npm run typecheck` and `npm run lint` passed.
- Limitations: None identified in these checks.

## 2026-10-25T03:19:17+05:30 — Show the team directory

- Changed: Replaced the Team placeholder with a membership-scoped directory showing each teammate's name, email, projects, role, open workload, and total assigned task count. Added a database-backed team query and integration coverage for project visibility and workload counts.
- Why: The execution agent needs a visible people surface so the team behind status, dependencies, and assignments is discoverable.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (48/48), and `git diff --check` passed.
- Limitations: The directory is read-only; profile editing, availability, and per-person Telegram identity linking remain future work.

## 2026-10-25T03:10:42+05:30 — Add Telegram delivery adapter and simplify navigation

- Changed: Removed Overview and Knowledge from the primary sidebar navigation while keeping their routes available. Added `telegram` as a conversation channel, a secured `/api/telegram/webhook` Route Handler, deterministic Telegram retry keys, Telegram reply formatting, Bot API `sendMessage` delivery, and optional token/secret/default-user/chat configuration in `.env.example`. Generated and applied migration `drizzle/0006_misty_mandrill.sql`.
- Why: The Agent and Projects surfaces are the product's working center, and Telegram is the next practical place to capture questions and updates without duplicating agent/task logic.
- Validation: `npm run db:generate`, `npm run db:migrate`, `npm run typecheck`, `npm run lint`, `npm test` (95/95), `npm run test:integration` (47/47), and `git diff --check` passed. Telegram pure adapter tests cover message parsing, stable retry ids, and dependency/evidence reply formatting.
- Limitations: The demo maps all allowed-chat messages to `TELEGRAM_DEFAULT_USER_ID`; per-person account linking, Telegram proposal review buttons, and production deployment are still unfinished.

## 2026-10-25T03:03:35+05:30 — Add the team-delivery demo dataset

- Changed: Added `npm run db:seed:demo` and `docs/DEMO.md`. The idempotent demo seed creates the Kochi Metro App execution scenario with Joji, George, Vaishakh, and Jaice; six tasks across todo, in-progress, blocked, and done states; an explicit dependency waiting on George; staging/payment evidence; and completion details on the finished decision task. The runbook documents the demo conversation and the Telegram adapter direction.
- Why: The execution agent needs a believable end-to-end story for the demo: a lead can ask what a teammate is doing, see who is waiting on whom, and close work with verifiable handoff details.
- Validation: `npm run db:seed:demo` ran twice with the same project id; a read-only count verified 4 members, 6 tasks, 1 open dependency, and 3 seeded evidence entries. `npm run typecheck`, `npm run lint`, `npm test` (92/92), `npm run test:integration` (47/47), and an HTTP smoke check of the seeded project page (200) passed.
- Limitations: Telegram is documented at the normalized ingress boundary but no bot token, identity mapping, webhook, or deployment has been configured.

## 2026-10-25T02:56:50+05:30 — Add the morning task-runner loop

- Changed: Added idempotent daily morning briefings to the Agent conversation, showing assigned open work, blocked/in-progress/due counts, dependency context, and a prompt to declare the first commitment of the day. Added completion details to task creation, edits, journal proposals, task history, and the done-task flow. Added migration `drizzle/0005_purple_moira_mactaggert.sql` and integration coverage for both behaviors.
- Why: Jeera needs to behave like a task runner: start the day with accountable work, let a person state what they will do, and preserve what was actually completed or handed off when work closes.
- Validation: `npm run db:migrate`, `npm run typecheck`, `npm run lint`, `npm test` (92/92), `npm run test:integration` (47/47), and `git diff --check` passed.
- Limitations: The morning message is currently created when the web Agent thread is opened and is deduplicated per user/day. Scheduler delivery and Slack/Google Chat adapters are still future work; automatic follow-ups for stale work are not enabled.

## 2026-10-25T02:49:13+05:30 — Resolve dependencies and resume blocked work

- Changed: Added a membership-checked “Resolve & resume” action to project overview blocked-work items. It closes the open dependency, resumes a blocked task to In progress, and records both changes transactionally in task activity history.
- Why: A task runner needs a complete dependency lifecycle; “waiting on B” must be able to become “B finished, work resumed.”
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (92/92), `npm run test:integration` (45/45), and `git diff --check` passed.
- Limitations: Dependency chains and automatic resolution from a teammate’s completion update are still future work.

## 2026-10-25T02:48:03+05:30 — Surface waiting-on dependencies in agent answers

- Changed: Task/status answers now include the newest open dependency for each blocked task, including the waiting-on person or text and dependency age. Added an integration test through the real journal query path and fixed single-letter teammate names being falsely matched inside ordinary words.
- Why: “What is blocked?” must expose the execution relationship, not just a blocked status, so leads can see why work cannot move.
- Validation: `npm test` (92/92), `npm run test:integration` (45/45), `npm run typecheck`, `npm run lint`, and `git diff --check` passed.
- Limitations: Dependency answers currently show the first open dependency per task; dependency chains remain in the next graph phase.

## 2026-10-25T02:46:52+05:30 — Ground status answers in the named teammate

- Changed: Preserved multiple journal evidence records per task, including author ids, and made task answers select the named teammate's latest update for questions such as “What is Priya doing on Checkout?”. Expanded the read-only question classifier and added a regression test.
- Why: A current task status is not enough when several people have reported work on the same task; the answer must identify the requested person's recorded evidence.
- Validation: `npm test` (91/91), `npm run test:integration` (44/44), `npm run typecheck`, `npm run lint`, and `git diff --check` passed.
- Limitations: Evidence is still limited to the recent interpreted journal window; richer history search remains a later phase.

## 2026-10-25T02:45:34+05:30 — Gate new work on accountable planning context

- Changed: Extended the Phase 10 conversation path so new work carries editable scope plus explicit owner, effort estimate, and target-date questions. New tasks with missing planning context remain unselectable until the author replies; existing-task scope changes persist through the normal activity history. Added focused unit and integration coverage.
- Why: A usable execution agent must make accountability and commitments visible before work enters the task record, while preserving the conversational review flow.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (90/90), `npm run test:integration` (44/44), and `git diff --check` passed.
- Limitations: This is a Phase 10 milestone, not completion of Phase 10. Authentication, external channel adapters, and automated follow-ups remain unfinished.

## 2026-10-25T02:34:13+05:30 — Append the revised execution-agent roadmap

- Changed: Updated `docs/PHASES.md`, `docs/PROGRESS.md`, and `README.md` to preserve the completed foundation phases while adding the active execution-agent roadmap as Phases 10–13: web-first agent, task/dependency graph, evidence-backed status and sprint movement, and stale-work follow-ups.
- Why: The product direction moved from a journal/task-board app to a usable conversational execution tool. The roadmap must distinguish completed historical work from the new unfinished workflow.
- Validation: Reviewed phase ordering and cross-links; `git diff --check` passed.
- Limitations: This milestone changes planning documentation only; Phase 10 implementation work remains incomplete.

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
