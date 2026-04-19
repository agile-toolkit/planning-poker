# Planning Poker — Brief

## Overview

Planning Poker for Scrum teams: practice setup, multi-participant session, reveal, statistics, history. React 18, Vite, Tailwind, Firebase-capable per README, react-i18next. Deploy: GitHub Pages.

## Features

- [x] Home + learn content, solo/practice setup flow (`App.tsx`, `HomeScreen.tsx`)
- [x] Session runner — `session.*` / `setup.*` wired in `SessionView.tsx`
- [x] EN + RU
- [ ] Team session entry — `home.start_team`, `home.cards_title` unused; only `home.start_practice` + `home.team_note`
- [ ] Card value tooltips — `cards.*` descriptions unused; buttons show raw `CARD_VALUES` labels
- [ ] Dead locale trees — `voting.*`, `revealed.*` superseded by `session.*` (remove or repurpose)
- [ ] Language toggle — raw `EN`/`RU` in `App.tsx` header

## Backlog

## Tech notes

- Wire Firebase team mode when implementing `home.start_team` CTA.

## Agent Log

### 2026-04-19 — docs: BRIEF template (AGENT_AUTONOMOUS)

- Done: Template migration; documented locale vs UI drift.
- Next task: Remove `voting.*`/`revealed.*`/`cards.*` from `en.json`+`ru.json` OR wire `cards.*` tooltips in `SessionView.tsx` + `home.start_team` CTA in `App.tsx`; i18n for lang toggle.
