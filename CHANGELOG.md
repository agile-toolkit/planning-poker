# Changelog

All notable changes to this project are documented in this file.

## Unreleased

## 0.2.5 — Redesign home-screen entry cards to match Moving Motivators (2026-09-02)

- **fix (design)**: the 3 flat pill buttons ("Practice Solo" / "Host Team
  Session" / "Join Team Session") added in 0.2.4 looked worse than
  Moving Motivators' equivalent screen — no icons, no descriptions, no
  visual grouping. Replaced with the same card-grid pattern: a bordered,
  hoverable Solo card with icon + description on the left, a "🤝 Team
  Session" labeled column with two stacked Host/Join cards on the right.
  Verified visually in both themes.
- User feedback prompted a follow-up: this exact pattern (entry-card
  grid, described in `TECH-NOTES.md`) is now duplicated by hand across
  at least 2 repos — a shared `design-system/` component is the next
  step so a 3rd implementation doesn't drift again.

## 0.2.4 — Split host/join into two dedicated screens (2026-09-02)

- **change**: the Home screen's single "Team Session" button became two —
  "Host Team Session" and "Join Team Session" — each landing directly on
  a screen scoped to that one action, matching Moving Motivators'
  pattern instead of the combined host+join form (deck picker and blind
  mode next to the PIN field) `TeamSession.tsx` used to show up front.
  `mode`'s `'entry'` state split into `'host-setup'` / `'join-setup'`;
  the in-session `'host'` / `'participant'` states are unchanged.
- **fix**: a `?joinPin=...` link now drops the visitor straight onto the
  Join screen with the PIN pre-filled, instead of landing on the Home
  screen and requiring a manual click through first.
- `parseJoinPinParam` moved from a local function in `TeamSession.tsx`
  into `src/deeplink.ts` (now covered by `deeplink.test.ts`) so both
  `App.tsx` and `TeamSession.tsx` share one implementation.
- Prompted by a user question comparing this app's session-entry UX to
  Moving Motivators'.

## 0.2.3 — Wire up team-session Firebase secrets in deploy (2026-09-02)

- **fix**: `.github/workflows/deploy.yml` never passed `VITE_FIREBASE_*`
  into the production build, so `isFirebaseConfigured()` was always
  `false` on the live site and "Start Team Session" was a permanently
  disabled stub — despite `TeamSession.tsx` being fully built (PIN/QR
  join, blind voting, observer mode, live reveal). Added the same
  secrets passthrough Moving Motivators' deploy workflow already has, so
  the live site can now use the org/repo's Firebase project instead of
  silently building without it. Added `.env.example` for local dev,
  matching Moving Motivators.
- Found via user report; confirmed root cause matched a known-working
  sibling app's setup.

## 0.2.2 — Fix accessibility gaps; remove dead code (2026-09-02)

- **fix**: two icon-only "✕" buttons (remove deep-linked story, dismiss
  the import tooltip) had only a `title` or nothing at all — added
  `aria-label` to both, matching the rest of the app's existing pattern.
- **fix**: the 4-digit team-session PIN input triggered the full
  keyboard on mobile. Added `inputMode="numeric"` and a numeric
  `pattern`.
- **chore**: deleted `src/components/HomeScreen.tsx` — a second, unused
  home-screen component; the actual home screen has always been inline
  in `App.tsx`.
- Found via a suite-wide UX/scope audit.

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
