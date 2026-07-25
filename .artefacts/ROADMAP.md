# Planning Poker — Roadmap

Derived from GOAL.md. Rebuilt when GOAL changes or an epic ships.

## Current epic
None — idle. See `## Next epics` below.

## Next epics
1. **E1: Mobile swipe-to-vote gesture** — serves #1. Pointer Events swipe-to-browse / swipe-up-to-vote layer on the card deck for one-handed mobile voting in solo sessions, additive to existing tap/keyboard voting. Open, needs-review, past the 7-day staleness threshold (created 2026-06-28). https://github.com/agile-toolkit/planning-poker/issues/39
2. **E2: Estimation accuracy cross-reference with Sprint Metrics** — serves #3. Read-only "Accuracy" tab in the history screen matching `planning-poker:history` sessions to `sprint-metrics:sprints` by date, showing committed-vs-delivered points to close the planning → delivery feedback loop. Open, needs-review, past the 7-day staleness threshold (created 2026-06-28). https://github.com/agile-toolkit/planning-poker/issues/40

## Polish backlog
- No small polish items queued outside the two epics above — the rest of BRIEF.md's backlog (issues #32–#38) is already implemented and merged; those issues remain open only pending a human "Done" close, not further engineering work.

## Shipped
- ~~Solo/practice session flow with configurable card decks (Fibonacci, T-shirt, powers-of-2) and per-round voting timer~~
- ~~Firebase real-time team sessions — PIN-based host/join, hidden-until-reveal voting, QR code join, observer/spectator mode, blind/anonymous voting~~
- ~~Session history persistence, results export (copy-as-text, PNG image), per-story discussion notes after reveal~~
- ~~Suite integrations — Sprint Metrics export + velocity hint, Change Planner deep-link + bidirectional estimate sync, Team Identity participant import, Scrum Facilitator story deep-link (`?stories=`)~~
- ~~EN/ES/BE/RU localization, light/dark theme, unified suite header, full keyboard accessibility, reveal/consensus animation~~
