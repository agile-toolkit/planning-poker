# Changelog

All notable changes to this project are documented in this file.

## Unreleased

## 0.2.1 — Remove Management 3.0 ref; fix invisible brand colors; first tests (2026-09-02)

- **content**: removed a stray "Management 3.0" mention from `README.md`.
- **fix**: `brand-200`/`brand-300`/`brand-800`/`brand-900` were referenced
  39 times across 6 files (`App.tsx`, `AppHeader.tsx`, `HomeScreen.tsx`,
  `LanguagePicker.tsx`, `SessionView.tsx`, `TeamSession.tsx`) but never
  defined in `tailwind.config.js` — the most of any repo in the suite.
  Completed the `brand` scale with Tailwind's own `pink` values.
- **test**: extracted `App.tsx`'s URL-parsing functions
  (`parseDeeplinkStories`, `parseChangePlannerParams`, `cardKey`,
  `loadHistory`) into `src/deeplink.ts` so they're testable without
  triggering the module-level `isFirebaseConfigured()` call. Added
  `vitest` + `jsdom` (this repo's first automated test coverage) and 13
  tests, including the slice-before-filter ordering in
  `parseDeeplinkStories`. `npm test` now passes cleanly.

## 0.2.0 — E1: Mobile swipe-to-vote gesture (2026-09-02)

- **feat:** touch-only swipe layer on the solo-mode card deck (`SessionView.tsx`), additive to existing tap/keyboard voting. Horizontal swipe (≥40px) moves a per-participant "browsed" card highlight; swipe up (≥60px vertical, <40px horizontal drift) casts the highlighted card as that participant's vote. Gated to `pointerType === 'touch'` via the Pointer Events API, so desktop mouse/pen input is unaffected. A dismissible hint ("Swipe to browse cards · Swipe up to vote") shows on mobile viewports until first use, tracked via the new `planning-poker:swipeHintSeen` key. Team mode is out of scope for this iteration — its Firebase-synced voting model needs separate design work.
- **chore:** closed 6 stale `approved`/`needs-review` issues (#32–#35, #37, #38) confirmed already implemented against current source — no functional change, repo housekeeping only.
- **docs:** left [#40](https://github.com/agile-toolkit/planning-poker/issues/40) (Sprint Metrics accuracy cross-reference) open with a correcting comment — the proposed date-matching heuristic isn't buildable against Sprint Metrics' actual `SprintData` shape, which has no date field.
- **docs:** refresh `GOAL.md` from the suite-wide `GOALS.md` platform thesis and rebuild `ROADMAP.md` around it; document the new `planning-poker:swipeHintSeen` key and the swipe implementation in `README.md`.
- **docs:** Added `.artefacts/GOAL.md` and `.artefacts/ROADMAP.md`, filled in `README.md` with dev commands, localStorage keys, and tech notes, and added this changelog. Docs-only pass — no behavior change; content extracted from the existing `.artefacts/BRIEF.md` run log.
- **docs:** move GOAL.md and ROADMAP.md from .artefacts/ to the repo root.
