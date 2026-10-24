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

- **Project name:** Project Runner
- **Track:** TODO — one of the four tracks in [RULES.md](RULES.md)
- **Short description:** TODO — what it does, who it helps, and why it matters.
- **Builder:** TODO — your name and GitHub handle
- **Working demo:** TODO — link or local demo instructions.
- **Technology stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Drizzle ORM · PostgreSQL · Zod · Vitest

### Run the project

1. Prerequisites and versions: Node.js 22+, npm 10+, PostgreSQL 14+ running locally.
2. Dependency installation: `npm install`
3. Environment setup: copy `.env.example` to `.env.local` and set `DATABASE_URL`
   to a `postgresql://` connection string, e.g.
   `postgresql://YOUR_USER@localhost:5432/project_runner`.
4. Create the database and apply migrations:
   - `createdb project_runner` (add `-h /tmp` if your server listens on the
     `/tmp` socket)
   - `npm run db:migrate`
5. Start the project: `npm run dev`, then open http://localhost:3000
6. Run checks or tests:
   - `npm run lint` — ESLint
   - `npm run typecheck` — `tsc --noEmit`
   - `npm test` — Vitest unit tests
   - `npm run build` — production build (does not require a live database)
   - `npm run db:generate` — regenerate migrations after schema changes
   - `curl http://localhost:3000/api/health` — returns JSON health status
     (200 when the database is reachable, 503 otherwise)

### Current status

- Working features: application shell with responsive navigation (Overview,
  Journal, Tasks, Team, Knowledge); Overview page with a live database health
  card; `GET /api/health` endpoint; PostgreSQL connection via Drizzle ORM with
  a `users` table migration; shared loading/empty/error state components;
  custom 404 and error pages; environment validation (`parseServerEnv`) with
  unit tests.
- Known limitations: Journal, Tasks, Team, and Knowledge pages are honest
  placeholders — those features land in later phases (see
  [docs/PHASES.md](docs/PHASES.md)). No authentication yet.
- Libraries, APIs, and public datasets used:
  - Next.js, React, Tailwind CSS — https://nextjs.org, https://tailwindcss.com
  - shadcn/ui components — https://ui.shadcn.com
  - Drizzle ORM + drizzle-kit — https://orm.drizzle.team
  - PostgreSQL driver `pg` — https://node-postgres.com
  - Zod — https://zod.dev
  - Vitest — https://vitest.dev
  - lucide-react icons — https://lucide.dev

See [AI_USAGE.md](AI_USAGE.md) for AI assistance and [CHANGELOG.md](CHANGELOG.md) for the development record.
