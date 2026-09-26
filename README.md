# Planning Poker

A real-time Planning Poker tool for Scrum teams — simultaneous voting, instant reveal, and educational context on estimation best practices. Run a solo/practice session on one device, or host a live multi-participant team session (session-code or QR-code join, end-to-end encrypted, no account) with hidden-until-reveal voting, anchoring-bias mitigations, and session history that exports to the rest of the Agile Toolkit suite.

Part of the [Agile Tools](https://github.com/bthos) suite built on ICAgile source materials.

See [`GOAL.md`](GOAL.md) for why this app exists and [`ROADMAP.md`](ROADMAP.md) for what's next. `.artefacts/BRIEF.md` retains the full run-by-run build history.

## Stack
React 18 · TypeScript · Vite · Tailwind CSS · MQTT.js + nostr-tools over public relays (team sessions) · react-i18next (EN/ES/BE/RU)

## Dev commands
```bash
npm install
npm run dev      # start Vite dev server
npm run build    # tsc typecheck + production build
npm run preview  # preview the production build locally
npm test         # vitest run
```

## Deploy
GitHub Pages via GitHub Actions on push to `main`. No secrets or environment variables are needed — team sessions use free public relays that need no account (see **Team sessions** below).

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
| `planning-poker:facilitatorMode` (`sessionStorage`) | `'1' \| '0'` | Facilitator (projector) mode toggle — per-tab, not persisted across sessions. See `src/components/useFacilitatorMode.ts`. |

This app also *reads* (but does not own) `sprint-metrics-projects` / `sprint-metrics-active-project` / `sprint-metrics-sprints` (velocity hint) and `team-identity-charter` (participant auto-import) — see those repos for the keys they write.

## Tech notes

- **State management:** plain React `useState`/`useEffect` in `App.tsx` and the two session views (`SessionView.tsx` solo, `TeamSession.tsx` team) — no external state library.
- **Test coverage:** `src/deeplink.ts` holds the URL-parsing and history-loading functions (`parseDeeplinkStories`, `parseChangePlannerParams`, `parseKanbanBoardParam`, `parseParticipantsParam`, `cardKey`, `loadHistory`), split out of `App.tsx` so they're testable in isolation. `src/deeplink.test.ts` covers all of them, including the slice-before-filter ordering in `parseDeeplinkStories` (an invalid entry within the first 50 raw entries is dropped, not backfilled from later valid ones).
- **i18n:** `react-i18next` + `i18next-browser-languagedetector`; four locale files under `src/i18n/` (`en`, `es`, `be`, `ru.json`), registered in `src/i18n/index.ts`.
- **Theme:** `darkMode: 'class'` in `tailwind.config.js`; `ThemeToggle.tsx` sets `data-theme` on `<html>` and persists to the `theme` localStorage key; an anti-flash inline script in `index.html` applies the stored/system preference before first paint.
- **Team sessions:** no backend and no account. `src/live/` (kept identical in Moving Motivators) connects every client to two public MQTT brokers (`broker.hivemq.com:8884`, `broker.emqx.io:8084`) *and* two public Nostr relays (`relay.damus.io`, `nos.lol`, plain `wss://` on 443) at once, publishing to all of them and de-duplicating on receipt — so a network that blocks the MQTT ports still works over Nostr. Each peer owns one small state object (`room.ts`): re-sent every 10 s as a heartbeat, dropped after 35 s of silence, retained on MQTT so late joiners catch up, plus a hello/re-announce handshake for Nostr. The host generates a 10-character session code; PBKDF2 turns it into an AES-GCM key and an unrelated public room id (`crypto.ts`), so relays only ever see a random topic and ciphertext. The code travels in the join link's fragment (`#join=…`), which browsers never send to a server.
  - **Only numbers go over the wire** (`src/liveSession.ts`, validated field-by-field on receipt): the host sends phase, round number, deck index and blind flag; participants send an alias index, observer flag, a "voted" bit, and their card *index* only after the host reveals that round. Story titles stay on the host's screen (participants see "Story N") and nobody types a name — each participant is a random animal alias (`live/aliases.ts`).
  - The Home screen offers "Host Team Session" and "Join Team Session" as two separate entry points (`mode: 'host-setup' | 'join-setup'` before a session exists, `'host' | 'participant'` once in one); a `#join=<code>` link opens straight onto Join with the code pre-filled. Both buttons are disabled only while the browser is offline. If no relay is reachable within 10 s the session screen says so (likely a firewall).
- **Suite deep-link contract:** any app can open Planning Poker pre-populated with stories via `?stories=<URL-encoded JSON array of {title, description?}>` (up to 50 stories) — used today by Change Planner. `?source=change-planner&initiativeId=<id>` opts a session into writing `change-planner:pendingEstimates` back on session end. `#join=<code>` (fragment, not query) pre-fills the team-session join code (also encoded in the lobby's QR code). `?kanban-board=<base64 UTF-8 board name>` (Kanban Designer's "Send to Planning Poker") seeds a single story from the board's name. `?participants=<comma-separated names>` (Scrum Facilitator's ceremony "Open in Planning Poker") seeds the participants textarea. Any of `?stories=`, `?kanban-board=`, or `?participants=` jumps straight to the setup screen instead of Home.
- **Story drag-to-reorder** is solo-mode only: `TeamSession.tsx` has no up-front multi-story queue (the host adds one story at a time and voting starts immediately), so there is nothing to reorder yet in team mode.
- **Swipe-to-vote (solo mode only, first iteration):** `SessionView.tsx`'s per-participant card-deck row uses the Pointer Events API, gated to `pointerType === 'touch'` so desktop mouse/pen input is unaffected. Horizontal swipe (≥40px) moves a per-participant "browsed" highlight across `deckValues` without casting a vote; vertical swipe up (≥60px, with <40px horizontal drift) casts the currently highlighted card via the existing `castVote()`. Purely additive — tap and keyboard voting are unchanged. Team mode (`TeamSession.tsx`) is out of scope for this iteration; its relay-synced multi-device voting model needs separate design work before a touch layer is added there.

## Source materials
See `.artefacts/BRIEF.md` for full run-by-run build history and source file references.
