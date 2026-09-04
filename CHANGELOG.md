# Changelog

All notable changes to this project are documented in this file.

## Unreleased

## 0.3.1 — Replace remaining decorative emoji with SVG icons (2026-09-04)

- **feat**: finished the emoji→SVG sweep left open in 0.2.9 — replaced the
  Home screen's 🎯 (Practice Solo) and 🤝 (Team Session heading) with the
  shared `TargetIcon`/`TeamIcon`, the setup screen's 🔗 deep-link banner
  with `LinkIcon`, and all 3 observer 👁 badges in `TeamSession.tsx` with
  `EyeIcon`. `TeamIcon` and `EyeIcon` were newly added to the shared
  `icons.tsx` for this; synced the full file from `design-system/`, which
  also removes the unused, broken `HandshakeIcon` fixed upstream.
- **fix**: `TeamSession.tsx`'s hardcoded `'✓ All voted'` status text (noted
  as a known gap in 0.2.9) is now `t('team.all_voted')` — a new i18n key
  across all 4 locales — rendered with `CheckIcon` instead of a baked-in
  glyph. `voted_badge` had the same problem the other direction (`"Voted
  ✓"` baked the checkmark into the translated string); split the same way,
  checkmark rendered separately so it doesn't depend on font glyph
  coverage per locale.
- **ci**: CI Node bumped 20 → 22 and `engines` declared. `jsdom@30` requires
  Node `^22.22.2 || ^24.15.0 || >=26`, so the test step could never have passed
  on the pinned Node 20 — invisible until this release started running the
  tests in CI at all. Builds were unaffected (vite and tsc do not load jsdom).


## 0.3.0 — Session integrity, error boundary, code-splitting (2026-09-03)

- **fix**: session PINs could silently destroy a live session. The app minted a
  4-digit `Math.random()` PIN and wrote it with `set()` **without checking
  whether it was taken** — a collision dropped a team mid-vote. Worse, this app
  and Moving Motivators both wrote `sessions/<pin>` in the *same* Firebase
  project (both deploy workflows inject the same org-level `VITE_FIREBASE_*`
  secrets), so those 9,000 PINs were shared between two apps with incompatible
  schemas and either could destroy the other's session. New `src/session.ts`:
  900,000 PINs from `crypto.getRandomValues` (rejection-sampled, since `%` bias
  raises the collision rate), `claimSession` checks-then-writes with retry, and
  the path is namespaced to `sessions/planning-poker/<pin>`.
- **fix**: no session was ever deleted, so the database grew without bound and
  the PIN space saturated permanently. `createdAt` is now set by the server and
  drives a 24h TTL in the security rules; `releaseSession` frees a PIN when the
  host ends a session; joining a PIN whose session has expired reports "not
  found" rather than dropping the joiner into yesterday's session.
- **fix**: `?joinPin=` was interpolated into a database path unvalidated. Now
  constrained to digits before use.
- **feat**: `ErrorBoundary` at the root. An unexpected payload from another app
  used to unmount the tree and leave a blank page that a reload could not fix,
  because the offending data was still in localStorage. The fallback offers
  "clear this app's saved data", scoped to this app's own key prefixes.
- **perf**: entry chunk 195 kB gz → 87 kB gz. The Firebase SDK reached every
  visitor including the majority who never open a team session; split the
  config-only gate into `firebaseConfig.ts` and lazy-loaded `TeamSession` and
  `html2canvas`.
- **ci**: `npm test` now runs before `npm run build` in `deploy.yml`.

## 0.2.11 — Facilitator Mode persists across suite apps (2026-09-03)

- **fix**: `useFacilitatorMode`'s storage key changed from
  `'planning-poker:facilitatorMode'` to the shared
  `'agile-toolkit:facilitatorMode'` — user-requested so Facilitator Mode
  survives navigating to another suite app in the same tab instead of
  resetting. sessionStorage is already shared per-origin-per-tab; this
  was previously app-prefixed specifically to keep it isolated, which
  turned out to be the wrong default for a cross-app presentation
  session.

## 0.2.10 — Fix duplicated card values; hide "Why Planning Poker?" in Facilitator Mode (2026-09-03)

- **fix**: the Card Values legend showed each value twice — once in its
  own card-shaped box, once again as the leading word of the
  description (e.g. "**3** 3 — small-medium, half a day"), because the
  `cards.*` i18n strings are written to double as full standalone
  accessible labels elsewhere (`SessionView`'s card tooltips). Added a
  legend-only `cardDesc()` helper that strips the "value — " prefix
  before display; the tooltip usage is untouched. User-reported.
- **fix**: the Home screen's "Why Planning Poker?" card wasn't gated by
  Facilitator Mode at all — user-reported. Hidden while presenting,
  matching the pattern used for the rest of the suite's Home/setup
  screens.

## 0.2.9 — Replace decorative ✕ emoji with SVG icons (2026-09-03)

- **feat**: replaced 5 decorative `✕` text-glyph buttons (shortcuts-modal
  close, velocity-hint dismiss, participant remove, deep-link story
  remove, import-tooltip close) with `CloseIcon` from the new shared
  `icons.tsx`, `currentColor` throughout. Left `TeamSession.tsx`'s
  hardcoded `'✓ All voted'` status text as-is — it also has an unrelated
  pre-existing i18n gap (only the else-branch is translated) that should
  be fixed together, not addressed piecemeal here. Part of a suite-wide
  emoji→SVG sweep the user asked for; the `☕` "need a break" card value
  (a real, votable deck entry) stays untouched — it's functional data,
  not decoration.

## 0.2.8 — Facilitator Mode (2026-09-03)

- **feat**: added Facilitator (projector) Mode — a presentation toggle for
  in-room estimation sessions, bigger UI via one CSS rule (everything
  sized in `rem` scales automatically) plus hiding the nav pills and
  language picker while active. Toggled from a new header button next to
  the theme toggle, session-scoped via `sessionStorage`. Adopted from the
  shared design-system pattern (`useFacilitatorMode.ts` +
  `FacilitatorToggle.tsx`), originally built for Team Identity.

## 0.2.7 — Fix "Import from Team Identity" dropping every member name (2026-09-03)

- **fix (broken integration, payload-shape mismatch)**: `importFromTeamIdentity`
  read the correct key (`team-identity-charter`) but treated each member
  as `{name: string}` and mapped `m.name` over it — Team Identity's
  charter stores `members` as plain strings, so every entry produced
  `undefined`, got filtered out, and the button always showed "no team
  found," even with a real charter present. Found by a suite-wide
  cross-app link audit (the same audit that found Salary Formula's
  Team Identity import reading the wrong key entirely — a different
  failure shape, same root symptom: an empty result no matter what).
  Extracted into `src/teamIdentityImport.ts` (tested).

## 0.2.6 — Receive Kanban Designer's and Scrum Facilitator's session handoffs (2026-09-03)

- **fix (broken integration)**: two "Open in Planning Poker" links sent
  real data that nothing here read. Found by a suite-wide cross-app
  link audit:
  - Kanban Designer's "Send to Planning Poker" button (`?kanban-board=`,
    a base64-encoded board name) now seeds the setup screen with that
    name as the story to estimate.
  - Scrum Facilitator's ceremony "Open in Planning Poker" link
    (`?participants=Alice,Bob,Carol`) now seeds the participants
    textarea, same as the existing Team Identity import.
  - Both jump straight to the setup screen on load, same as the
    existing `?stories=` deeplink.
- `src/deeplink.ts` gains `parseKanbanBoardParam`/`parseParticipantsParam`
  (tested).

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
