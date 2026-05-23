# Planning Poker — Brief

## Overview

Planning Poker for Scrum teams: practice setup, multi-participant session, reveal, statistics, history. React 18, Vite, Tailwind, Firebase-capable per README, react-i18next. Deploy: GitHub Pages.

## Features

- [x] Home + learn content, solo/practice setup flow (`App.tsx`, `HomeScreen.tsx`)
- [x] Session runner — `session.*` / `setup.*` wired in `SessionView.tsx`
- [x] EN + RU + ES + BE — all four suite locales; 4-button language selector in header
- [x] Team session entry — `home.start_team` disabled CTA on home screen with Firebase tooltip
- [x] Card value legend on home screen — `home.cards_title` + `cards.*` descriptions
- [x] Card value tooltips — `cards.*` wired as `title` on all card buttons in `SessionView.tsx`
- [x] Language toggle — uses `app.switch_lang` i18n key (removes raw EN/RU strings)
- [x] Dead locale trees removed — `voting.*` and `revealed.*` deleted from all locales

## Backlog

- [x] [#3] Feature: Add ES and BE locales to match suite standard — implemented
- [x] [#4] Integration: Export session results to Sprint Metrics — implemented
- [ ] [#5] Research: Per-round voting timer to prevent vote anchoring delay
- [x] [#6] Feature: Custom card deck selection (Fibonacci, T-shirt, powers-of-2) — implemented
- [ ] [#7] UX: Keyboard accessibility — full keyboard navigation for card voting and story flow
- [x] [#8] Integration: Change Planner → Planning Poker deep-link for effort estimation — implemented
- [x] [#12] Integration: Write planning-poker:lastSession to localStorage for Dashboard card — implemented
- [ ] [#13] Feature: Session history persistence in localStorage
- [ ] [#14] UX: Reveal animation and consensus celebration
- [x] [#15] Integration: Team Identity → Planning Poker participant auto-import — implemented
- [x] [#16] Integration: Scrum Facilitator → Planning Poker sprint planning deep-link — documented (PP side already implemented via `?stories=`; Scrum Facilitator side tracked in scrum-facilitator repo)
- [ ] [#17] Feature: Session results export — share image and copy summary text

## localStorage keys

- `sprintMetrics_planningPoker` — JSON array of `{ title, finalEstimate }` objects; written when session ends; read by Sprint Metrics and the Dashboard reader.
- `planning-poker:lastSession` — *(proposed #12)* session-level summary for the Dashboard card: `{ sessionName, deckType, storyCount, estimatedCount, avgPoints, date }`.
- `planning-poker:history` — *(proposed #13)* array of up to 10 past session objects for the History screen.

## Tech notes

- Wire Firebase team mode when implementing `home.start_team` CTA fully.
- **`?stories=` deep-link contract** (suite integration point): any app can open Planning Poker with pre-populated stories by appending `?stories=<URL-encoded JSON array of {title, description?}>` to the PP URL. Implemented in issue #8. Change Planner uses this today; Scrum Facilitator sprint-planning phase is the next consumer (tracked in scrum-facilitator repo).

## Agent Log

### 2026-05-23 — feat: planning-poker:lastSession localStorage key (#12) + ?stories= contract docs (#16)
- Done #12: `handleSessionBack` in App.tsx now writes `planning-poker:lastSession` JSON (`sessionName`, `deckType`, `storyCount`, `estimatedCount`, `avgPoints`, `date`) after each completed session; `avgPoints` is null for non-numeric decks (T-shirt sizing)
- Done #16: Confirmed `?stories=` deep-link already implemented; documented suite integration contract in BRIEF.md Tech notes; Scrum Facilitator side tracked in scrum-facilitator repo
- Remaining approved issues: #19 (header unification), #20 (dark mode), #17 (results export), #21 (Firebase team sessions), #13 (session history), #14 (reveal animation), #5 (voting timer), #7 (keyboard accessibility)
- Next task: implement #19 (header unification: copy AppHeader.tsx + LanguagePicker.tsx from design-system into src/components/, replace dark header block ~lines 148-209 in App.tsx)

### 2026-05-18 — feat: Team Identity → Planning Poker participant auto-import (#15)
- Done: added `importFromTeamIdentity()` in `App.tsx` that reads `team-identity-charter` from localStorage, looks for a `members` array, and pre-populates the participants textarea; if charter is absent or has no `members`, shows an inline tooltip; added `setup.import_team` and `setup.import_team_empty` i18n keys to all 4 locales (EN/ES/BE/RU)
- The `members` array is not yet in team-identity's `TeamCharter` type — the import button is ready and will activate once team-identity adds member support (issue #6 in team-identity repo)
- Remaining approved issues: #16 (Scrum Facilitator deep-link), #17 (results export: Clipboard + html2canvas), #12 (planning-poker:lastSession localStorage key), #13 (session history), #14 (reveal animation), #5 (voting timer)
- Next task: implement #16 (Scrum Facilitator → Planning Poker deep-link: confirm `?stories=` contract already in place, no Planning Poker code changes needed — update BRIEF.md Tech notes to document the suite integration point); then implement #12 (write planning-poker:lastSession in handleSessionBack)

### 2026-05-15 — research: Team Identity integration, Scrum Facilitator deep-link, results export
- Done: checked open issues — #3, #4, #6, #8 all approved + In Review (already implemented); no approved items in In Progress; #5, #7, #12, #13, #14 all needs-review with no human feedback
- Created issue #15 (Team Identity → Planning Poker participant auto-import: read `team-identity-charter` localStorage, pre-populate setup participant list; zero backend)
- Created issue #16 (Scrum Facilitator → Planning Poker sprint planning deep-link: Scrum Facilitator sprint-planning phase passes backlog via existing `?stories=` param; PP side already ready)
- Created issue #17 (Session results export: copy-to-clipboard plain-text table + html2canvas PNG download; reuses `sprintMetrics_planningPoker` data; `results.copyResults` + `results.saveImage` i18n keys)
- All three set to Backlog in project #6
- Next task: check issues for human feedback; implement first approved item among #15, #16, #17, #12, #13, #14, #5, #7

### 2026-05-11 — research: Dashboard integration, session history, reveal animation
- Done: set issues #3, #4, #6, #8 (approved + implemented) to In Review in project board; created issue #12 (planning-poker:lastSession localStorage key for Dashboard), #13 (session history persistence — 10-session rolling log), #14 (CSS card-flip reveal animation + consensus celebration with prefers-reduced-motion support); all set to Backlog
- Waiting for human review on #12, #13, #14; existing needs-review: #5 (voting timer), #7 (keyboard accessibility)
- Next task: check issues for human feedback; implement first approved item among #12, #13, #14, #5, #7

### 2026-05-08 — feat: Change Planner deep-link (#8)
- Done: `parseDeeplinkStories()` reads `?stories=<URL-encoded JSON>` from query param on load; accepts up to 50 stories with `{title, description?}`; if stories present, app initialises directly on setup phase; setup screen shows branded banner + removable story list; `startSession` creates a multi-story PokerSession when deep-linked; added i18n keys `setup.deeplink_banner`, `setup.stories_label`, `setup.remove_story` to all 4 locales; issue #8 set to In Review
- Remaining backlog: #5 (voting timer), #7 (keyboard accessibility)
- Next task: check issues for human feedback (#5 voting timer, #7 keyboard accessibility)

### 2026-04-29 — feat: Sprint Metrics export + custom deck selection
- Done: #4 — on session back, completed stories (title + finalEstimate) are written to `localStorage.sprintMetrics_planningPoker` as a JSON array for Sprint Metrics to consume; #6 — DeckType enum (fibonacci/tshirt/powers2) added to types.ts; setup screen shows a 3-button deck picker with preview of card values; SessionView uses `DECKS[session.deckType]` so voting and final-estimate cards match the chosen deck; i18n keys `setup.deck_label/fibonacci/tshirt/powers2` added to all 4 locales
- Remaining backlog: #5 (voting timer), #7 (keyboard accessibility), #8 (Change Planner deep-link)
- Next task: check needs-review issues for human feedback (#5 voting timer, #7 keyboard accessibility, #8 Change Planner deep-link); then set status stable

### 2026-04-29 — feat: ES and BE locales + 4-button language selector
- Done: created `src/i18n/es.json` (Spanish) and `src/i18n/be.json` (Belarusian) with full translations of all ~80 keys; registered both in `src/i18n/index.ts`; replaced two-state EN/RU toggle in App.tsx with 4-button EN/ES/BE/RU selector matching improvement-board pattern; resolved issue #3
- Approved issues still pending: #4 (Sprint Metrics integration), #6 (custom deck selection), #8 (Change Planner deep-link)
- Next task: implement issue #4 — export session results to Sprint Metrics via localStorage key `sprintMetrics_planningPoker` (stories array with title + finalEstimate)

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
