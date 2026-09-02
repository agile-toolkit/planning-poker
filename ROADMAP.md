# Planning Poker — Roadmap

Derived from GOAL.md. Rebuilt when GOAL changes or an epic ships.

## Current epic
None — idle. See `## Next epics` below.

## Next epics
1. **E2: Estimation accuracy cross-reference with Sprint Metrics** — serves #3. Blocked on a data-model gap discovered this run: Sprint Metrics' `SprintData` has no date field to match Planning Poker sessions against (see [#40](https://github.com/agile-toolkit/planning-poker/issues/40) comment, 2026-09-02) — needs a human call on whether Sprint Metrics adds a date field first, or this drops the per-sprint framing for a coarser trend comparison.

## Recently shipped
**E1: Mobile swipe-to-vote gesture** (2026-09-02) — see `## Shipped`. [#39](https://github.com/agile-toolkit/planning-poker/issues/39) shipped for solo mode; team mode swipe support is a possible future follow-up, not filed as its own issue yet.

## Polish backlog
- No small polish items queued — the rest of BRIEF.md's backlog (issues #32–#38) was confirmed already implemented and closed this run (2026-09-02).

## Shipped
- ~~Solo/practice session flow with configurable card decks (Fibonacci, T-shirt, powers-of-2) and per-round voting timer~~
- ~~Firebase real-time team sessions — PIN-based host/join, hidden-until-reveal voting, QR code join, observer/spectator mode, blind/anonymous voting~~
- ~~Session history persistence, results export (copy-as-text, PNG image), per-story discussion notes after reveal~~
- ~~Suite integrations — Sprint Metrics export + velocity hint, Change Planner deep-link + bidirectional estimate sync, Team Identity participant import, Scrum Facilitator story deep-link (`?stories=`)~~
- ~~EN/ES/BE/RU localization, light/dark theme, unified suite header, full keyboard accessibility, reveal/consensus animation~~

**v0.2.0 — [E1: Mobile swipe-to-vote gesture](https://github.com/agile-toolkit/planning-poker/issues/39)** (2026-09-02):
- ~~Touch-only swipe layer on the solo-mode card deck: horizontal swipe browses a per-participant highlight, swipe up casts the highlighted card as that participant's vote — additive to existing tap/keyboard voting~~
