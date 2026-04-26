# Planning Poker — Brief

## Overview

Planning Poker for Scrum teams: practice setup, multi-participant session, reveal, statistics, history. React 18, Vite, Tailwind, Firebase-capable per README, react-i18next. Deploy: GitHub Pages.

## Features

- [x] Home + learn content, solo/practice setup flow (`App.tsx`, `HomeScreen.tsx`)
- [x] Session runner — `session.*` / `setup.*` wired in `SessionView.tsx`
- [x] EN + RU
- [x] Team session entry — `home.start_team` disabled CTA on home screen with Firebase tooltip
- [x] Card value legend on home screen — `home.cards_title` + `cards.*` descriptions
- [x] Card value tooltips — `cards.*` wired as `title` on all card buttons in `SessionView.tsx`
- [x] Language toggle — uses `app.switch_lang` i18n key (removes raw EN/RU strings)
- [x] Dead locale trees removed — `voting.*` and `revealed.*` deleted from all locales

## Backlog

- [ ] [#3] Feature: Add ES and BE locales to match suite standard
- [ ] [#4] Integration: Export session results to Sprint Metrics
- [ ] [#5] Research: Per-round voting timer to prevent vote anchoring delay
- [ ] [#6] Feature: Custom card deck selection (Fibonacci, T-shirt, powers-of-2, custom)
- [ ] [#7] UX: Keyboard accessibility — full keyboard navigation for card voting and story flow
- [ ] [#8] Integration: Change Planner → Planning Poker deep-link for effort estimation

## Tech notes

- Wire Firebase team mode when implementing `home.start_team` CTA fully.

## Agent Log

### 2026-04-26 — research: custom decks, keyboard accessibility, Change Planner integration

- Done: created issue #6 (custom card deck selection — Fibonacci/T-shirt/powers-of-2/custom), #7 (keyboard accessibility audit — aria-pressed, focus management, keyboard shortcuts), #8 (Change Planner → Planning Poker deep-link via `?stories=` URL param)
- Issues #3–#5 still awaiting human review (no label changes)
- Next task: check needs-review issues for human feedback (#3 ES/BE locales, #4 Sprint Metrics integration, #5 voting timer, #6 custom decks, #7 keyboard accessibility, #8 Change Planner integration)

### 2026-04-24 — research: locales, sprint-metrics integration, voting timer

- Done: created issue #3 (ES + BE locales — all other 9 suite apps have 4 locales), #4 (export session results to Sprint Metrics via clipboard/deep-link), #5 (per-round countdown timer with auto-reveal, seen in Scrum Poker Online and PlanITPoker)
- Waiting for human review on all three
- Next task: check needs-review issues for human feedback (#3 ES/BE locales, #4 Sprint Metrics integration, #5 voting timer)

### 2026-04-21 — feat: i18n cleanup, card tooltips, team CTA, cards legend

- Done: removed dead `voting.*` and `revealed.*` locale trees from en.json + ru.json; added `app.switch_lang` key; wired `cards.*` as `title` tooltip on card buttons in SessionView.tsx; added disabled Team Session CTA on home screen; added Card Values legend section on home screen using `home.cards_title` + `cards.*`; replaced raw EN/RU toggle with `t('app.switch_lang')`
- All BRIEF features now implemented
- Next task: check needs-review issues for human feedback; run research cycle for market/integration/UX improvements

### 2026-04-19 — docs: BRIEF template (AGENT_AUTONOMOUS)

- Done: Template migration; documented locale vs UI drift.
- Next task: Remove `voting.*`/`revealed.*`/`cards.*` from `en.json`+`ru.json` OR wire `cards.*` tooltips in `SessionView.tsx` + `home.start_team` CTA in `App.tsx`; i18n for lang toggle.
