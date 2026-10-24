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
