# BRIEF — Planning Poker

## What this app does
A real-time Planning Poker (Scrum Poker) tool for distributed and co-located teams to estimate user stories using the Fibonacci sequence. Team members vote simultaneously, votes are revealed together, and facilitators guide discussion toward consensus.

## Target users
Scrum teams (developers, Scrum Masters, Product Owners) doing Sprint Planning or backlog refinement. Works for remote and in-person sessions with 2–15 participants.

## Core features (MVP)
- Session host creates a room with a shareable link
- Participants join by name (no account required)
- Story input: host enters story title/description
- Voting: each participant picks a card (½, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕)
- Reveal: all votes shown simultaneously after everyone votes
- Statistics: average, median, consensus indicator, spread visualization
- Next story: host advances to the next item
- Session history: list of estimated stories with final estimates
- Offline mode: single-device practice mode

## Educational layer
- "Why Planning Poker?" intro panel (Wideband Delphi, anchoring bias prevention)
- Card value explainer: why Fibonacci, what each number means in story points
- Consensus guide: how to facilitate discussion when votes diverge
- Reference to Scrum Meetings Guideline and ICAgile Workbook

## Tech stack
React 18 + TypeScript + Vite + Tailwind CSS. Firebase Realtime Database for live multi-user sessions. GitHub Pages deployment.

## Source materials in `.artefacts/`
- `Scrum Meetings Guideline.pdf` — ceremony facilitation including estimation
- `Workbook (ICAgile - Fundamentals of Agile)_22_11_2013.pdf` — estimation theory
- `scrum_xp-from-the-trenches-rus-final.pdf` — practical estimation guidance
- `PPCards (1).jpg` — Planning Poker card set reference image
- `PP_Master_1100x780_de.jpg` — Planning Poker master card layout reference

## i18n
English + Russian (react-i18next).

## Agentic pipeline roles
- `/vadavik` — spec & requirements validation
- `/lojma` — UX/UI design (card table, vote reveal animation, session lobby)
- `/laznik` — architecture (Firebase room model, real-time vote sync, session state machine)
- `@cmok` — implementation
- `@bahnik` — QA (multi-user sync, reveal timing, disconnect/reconnect handling)
- `@piarun` — documentation
- `@zlydni` — git commits & GitHub Pages deploy
