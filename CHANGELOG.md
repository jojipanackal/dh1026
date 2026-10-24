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
