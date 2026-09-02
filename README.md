# Planning Poker

A real-time Planning Poker tool for Scrum teams — simultaneous voting, instant reveal, and educational context on estimation best practices. Run a solo/practice session on one device, or host a live multi-participant team session (PIN or QR-code join) with hidden-until-reveal voting, anchoring-bias mitigations, and session history that exports to the rest of the Agile Toolkit suite.

Part of the [Agile Tools](https://github.com/bthos) suite built on ICAgile source materials.

See [`GOAL.md`](GOAL.md) for why this app exists and [`ROADMAP.md`](ROADMAP.md) for what's next. `.artefacts/BRIEF.md` retains the full run-by-run build history.

## Stack
React 18 · TypeScript · Vite · Tailwind CSS · Firebase (optional, team sessions) · react-i18next (EN/ES/BE/RU)

## Dev commands
```bash
npm install
npm run dev      # start Vite dev server
npm run build    # tsc typecheck + production build
npm run preview  # preview the production build locally
npm test         # vitest run — src/deeplink.ts
```

## Deploy
GitHub Pages via GitHub Actions on push to `main`.

## localStorage keys

| Key | Shape | Purpose |
|-----|-------|---------|
| `planning-poker:history` | array (max 10) of `SessionHistoryEntry` — `{ id, name, date, deckType, storyCount, estimatedCount, avgPoints, stories: [{ id, title, finalEstimate, note?, votes }] }` | Rolling session history; written on every session end (solo + team), read by the in-app History screen. |
| `planning-poker:lastSession` | `{ sessionName, deckType, storyCount, estimatedCount, avgPoints, date }` | Latest-session summary; written on session end for the suite Dashboard card. |
| `planning-poker:velocityHintDismissed` | `'1'` | Set when the user dismisses the Sprint Metrics velocity chip in `SessionView`; cleared again on every new session mount. |
| `planning-poker:swipeHintSeen` | `'1'` | Set on a participant's first touch swipe in `SessionView`'s card deck; suppresses the "Swipe to browse cards · Swipe up to vote" hint on future sessions. |
| `sprintMetrics_planningPoker` | JSON array of `{ title, finalEstimate }` | Written on session end; read by Sprint Metrics to seed story points. |
| `change-planner:pendingEstimates` | `{ initiativeId, date: ISO-8601, stories: [{ title, estimate }] }` | Written on session end only when the session was opened via the `?source=change-planner&initiativeId=<id>` deep-link; read and cleared by Change Planner on its next load. |
| `theme` | `'light' \| 'dark'` | Shared suite theme-toggle convention key (same key name used across Agile Toolkit apps sharing the `github.io` origin). |

This app also *reads* (but does not own) `sprint-metrics-projects` / `sprint-metrics-active-project` / `sprint-metrics-sprints` (velocity hint) and `team-identity-charter` (participant auto-import) — see those repos for the keys they write.

## Tech notes

- **State management:** plain React `useState`/`useEffect` in `App.tsx` and the two session views (`SessionView.tsx` solo, `TeamSession.tsx` team) — no external state library.
- **Test coverage:** `src/deeplink.ts` holds the URL-parsing and history-loading functions (`parseDeeplinkStories`, `parseChangePlannerParams`, `cardKey`, `loadHistory`), split out of `App.tsx` so they're testable without triggering `App.tsx`'s module-level `isFirebaseConfigured()` call. `src/deeplink.test.ts` covers all four, including the slice-before-filter ordering in `parseDeeplinkStories` (an invalid entry within the first 50 raw entries is dropped, not backfilled from later valid ones).
- **i18n:** `react-i18next` + `i18next-browser-languagedetector`; four locale files under `src/i18n/` (`en`, `es`, `be`, `ru.json`), registered in `src/i18n/index.ts`.
- **Theme:** `darkMode: 'class'` in `tailwind.config.js`; `ThemeToggle.tsx` sets `data-theme` on `<html>` and persists to the `theme` localStorage key; an anti-flash inline script in `index.html` applies the stored/system preference before first paint.
- **Team sessions (optional):** `src/firebase.ts` exposes `isFirebaseConfigured()` / `getFirebaseDb()`; when no Firebase config is present, `home.start_team` is a disabled stub with a tooltip and solo mode is fully unaffected. When configured, `TeamSession.tsx` drives host/join/vote/reveal entirely through the Firebase Realtime Database (PIN-keyed session doc, `blindMode`/`isObserver` fields on participants/session).
- **Suite deep-link contract:** any app can open Planning Poker pre-populated with stories via `?stories=<URL-encoded JSON array of {title, description?}>` (up to 50 stories) — used today by Change Planner and Scrum Facilitator. `?source=change-planner&initiativeId=<id>` opts a session into writing `change-planner:pendingEstimates` back on session end. `?joinPin=<pin>` pre-fills the team-session join PIN (also encoded in the lobby's QR code).
- **Story drag-to-reorder** is solo-mode only: `TeamSession.tsx` has no up-front multi-story queue (the host adds one story at a time and voting starts immediately), so there is nothing to reorder yet in team mode.
- **Swipe-to-vote (solo mode only, first iteration):** `SessionView.tsx`'s per-participant card-deck row uses the Pointer Events API, gated to `pointerType === 'touch'` so desktop mouse/pen input is unaffected. Horizontal swipe (≥40px) moves a per-participant "browsed" highlight across `deckValues` without casting a vote; vertical swipe up (≥60px, with <40px horizontal drift) casts the currently highlighted card via the existing `castVote()`. Purely additive — tap and keyboard voting are unchanged. Team mode (`TeamSession.tsx`) is out of scope for this iteration; its Firebase-synced multi-device voting model needs separate design work before a touch layer is added there.

## Source materials
See `.artefacts/BRIEF.md` for full run-by-run build history and source file references.
