# Devin Hacks Kochi

A solo, 12-hour hackathon project. This repository started from a documentation template; the project itself is built from scratch at the event.

**[Event rules and tracks](RULES.md)** · **[Agent instructions](AGENTS.md)** · **[Submission](SUBMISSION.md)**

## Event details

| Detail | Information |
| --- | --- |
| Event | Devin Hacks Kochi |
| Format | Solo, 12 hours |
| Date and venue | TBD |
| Submission deadline | TBD (IST) |
| Tracks | Kill the Busywork · Make the Invisible Visible · Works Anyway · Make Room for Play |
| AI tool | Devin |

## Use this template

1. Read [RULES.md](RULES.md) and [AGENTS.md](AGENTS.md), then pick a track.
2. Fill in the project overview below as you build. Use any suitable language or framework, keeping the implementation simple.
3. Record meaningful changes in [CHANGELOG.md](CHANGELOG.md) and your Devin usage in [AI_USAGE.md](AI_USAGE.md). Commit after completed milestones; aim for a meaningful checkpoint about every 30 minutes.
4. Complete [SUBMISSION.md](SUBMISSION.md) with your code repository, short project description, and working demo before the deadline.

## Project overview — complete during the event

- **Project name:** Jeera
- **Track:** TODO — one of the four tracks in [RULES.md](RULES.md)
- **Short description:** TODO — what it does, who it helps, and why it matters.
- **Builder:** TODO — your name and GitHub handle
- **Working demo:** TODO — link or local demo instructions.
- **Technology stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · next-themes · Drizzle ORM · PostgreSQL · Zod · Vitest

The active roadmap is now the execution-agent sequence in
[PHASES.md](docs/PHASES.md) Phases 10–13. The earlier phases document the
foundation already built; current work completes the usable web-first agent
workflow before adding external chat adapters.

### Run the project

1. Prerequisites and versions: Node.js 22+, npm 10+, PostgreSQL 14+ running locally.
2. Dependency installation: `npm install`
3. Environment setup: copy `.env.example` to `.env.local` and set `DATABASE_URL`
   to a `postgresql://` connection string, e.g.
   `postgresql://YOUR_USER@localhost:5432/project_runner`.
   For the AI journal, set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`,
   default `gpt-4.1-mini`). Without a key the app still runs; journal entries
   are saved and show "AI is not configured" with a Retry button.
4. Create the database and apply migrations:
   - `createdb project_runner` (add `-h /tmp` if your server listens on the
     `/tmp` socket)
   - `createdb project_runner_test` (only needed for `npm run test:integration`)
   - `npm run db:migrate`
5. Seed demo users: `npm run db:seed` (idempotent, 4 users only). For the
   realistic task-runner story, run `npm run db:seed:demo` too; see
   [docs/DEMO.md](docs/DEMO.md).
6. Start the project: `npm run dev`, then open http://localhost:3000
7. Click the demo user name at the bottom of the sidebar to open the user
   popup, then pick a user (the choice is stored in an httpOnly cookie — demo
   identity, not a login).
8. Run checks or tests:
   - `npm run lint` — ESLint
   - `npm run typecheck` — `tsc --noEmit`
   - `npm test` — Vitest unit tests
   - `npm run test:integration` — service-level tests against a dedicated
     test database; requires `TEST_DATABASE_URL` in `.env.local`
     (see `.env.example`), which must differ from `DATABASE_URL`
   - `npm run build` — production build (does not require a live database)
   - `npm run db:generate` — regenerate migrations after schema changes
   - `npm run db:migrate` / `npm run db:seed` / `npm run db:studio`
   - `npm run agent:worker` — run the server-side five-minute follow-up worker
   - `npm run agent:follow-ups` — run one follow-up sweep for cron or a platform scheduler
   - `curl http://localhost:3000/api/health` — returns JSON health status
     (200 when the database is reachable, 503 otherwise)

### Vercel deployment

The Vercel project is `jeera` under the `Joji` team. Before deploying a
database-backed build, set `DATABASE_URL` in the Vercel production environment
to a hosted PostgreSQL connection string; the local `.env.local` value points
to `localhost` and is not usable from Vercel. Apply the Drizzle migrations and
seed the hosted database separately, then optionally add `OPENAI_API_KEY` and
the Telegram variables. The app validates `DATABASE_URL` while prerendering,
so a deployment without it will fail during the build rather than produce a
misleading partial demo.

The verified production deployment is `https://jeera-joji13.vercel.app`. Vercel
Authentication remains enabled on the project; use the temporary share URL
provided in the deployment handoff for demo access. The current production
build applies migrations and runs the idempotent demo seed before `next build`.

### Current status

- Working features: application shell with responsive navigation (Agent, Tasks,
  Projects, Team, Integrations); a cross-project Tasks workspace that opens on a
  connected dependency graph and includes a Queue view with search, scope,
  project/status/priority/assignee filters, dependency context, workload counts,
  inline status movement, direct task links, and global task creation; a membership-scoped
  Team directory showing teammates,
  projects, roles, and workload; demo user switcher (httpOnly cookie,
  no authentication); project creation and listing with per-status task
  counts; project detail page with Overview/Board/List/Activity/Members
  views — the overview shows progress, reported blockers with reasons,
  overdue and due-soon work, inferred stall warnings, journal blockers
  awaiting review, and recent activity; the board supports drag-and-drop
  status moves; task create/edit forms with lifecycle validation (todo,
  in_progress, blocked, done, cancelled) and per-field change history;
  `completed_at` set on done and cleared on reopen; activity events
  recorded for project/member/task changes; an execution agent at
  `/journal` that answers trusted task and status questions with teammate
  evidence, interprets work updates into reviewable task changes, records
  dependencies such as "waiting on B", captures editable scope, ownership,
  target dates, and effort estimates for new work and scope changes, and
  keeps incomplete new work in clarification until those commitments are
  answered before applying approved changes; blocked work can be explicitly
  resolved and resumed from the project overview; web messages carry channel
  provenance and task-linked context notes preserve interruptions, resumptions,
  handoffs, and next steps without forcing a status change; teammate answers
  include that dated context and timed pauses suppress follow-ups until their
  check-in window; the server exposes a normalized ingress boundary for future
  Slack/Google Chat adapters; Overview
  page with a live database health card;
  `GET /api/health` endpoint; PostgreSQL via Drizzle ORM with migrations
  (`users`, `projects`, `project_memberships`, `tasks`,
  `journal_entries`, `agent_messages`, `activity_events`); shared loading/empty/error state
  components; custom 404 and error pages; environment validation
  (`parseServerEnv`) with unit tests; service-level integration tests
  against a separate test database. The Agent creates one persisted morning
  briefing per user/day when the web conversation opens, prompts the user to
  state the first commitment, and preserves completion details when work is
  closed. A repeatable fake team-delivery dataset is available through
  `npm run db:seed:demo`. A Telegram webhook adapter is available at
  `/api/telegram/webhook`; it currently supports one configured demo identity
  and uses the same normalized agent ingress as the web conversation; an
  Integrations page shows connector configuration and planned GitHub/Slack/
  Google Chat adapters. Jeera is installable as a PWA from a supporting
  browser's install control and includes a static-asset service worker plus an
  offline fallback screen. The Agent has a five-minute browser fallback, and
  the standalone Node worker runs the same deduplicated sweep over all project
  memberships and writes check-ins to each assignee's conversation.
- Known limitations: Knowledge remains an honest placeholder — that feature
  lands in a later phase (see [docs/PHASES.md](docs/PHASES.md)). No real authentication (demo user
  switcher only). Slack and Google Chat are represented by the normalized
  channel boundary but external OAuth/webhook adapters are not connected yet.
  The browser heartbeat is only a fallback; run `npm run agent:worker` as a
  separate long-lived process or schedule `npm run agent:follow-ups` every five
  minutes. The repository does not include a hosted worker deployment,
  process supervisor, quiet hours, or channel delivery policy yet. The morning
  briefing currently triggers on opening the web Agent thread rather than from
  a scheduler or Slack/Google Chat. Telegram is wired for a single configured
  demo identity, but per-person Telegram account linking and Telegram review
  buttons are not implemented yet. The PWA does not support offline task
  reads/writes, push notifications, background sync, or offline mutation
  queues yet. Manually blocked tasks
  have no reason field yet, so the overview can only show "no reason
  recorded" for them. Under Next.js
  cacheComponents, a not-found page rendered from request-time checks
  (e.g. a non-member opening a project URL) streams with a 200 status — a
  platform limitation, not a data leak.
- Libraries, APIs, and public datasets used:
  - Next.js, React, Tailwind CSS — https://nextjs.org, https://tailwindcss.com
  - shadcn/ui components — https://ui.shadcn.com
  - Drizzle ORM + drizzle-kit — https://orm.drizzle.team
  - PostgreSQL driver `pg` — https://node-postgres.com
  - Zod — https://zod.dev
  - Vitest — https://vitest.dev
  - lucide-react icons — https://lucide.dev

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
