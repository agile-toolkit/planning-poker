# Planning Poker — Brief

## Overview

Planning Poker for Scrum teams: practice setup, multi-participant session, reveal, statistics, history. React 18, Vite, Tailwind, Firebase-capable per README, react-i18next. Deploy: GitHub Pages.

## Features

- [x] Home + learn content, solo/practice setup flow (`App.tsx`, `HomeScreen.tsx`)
- [x] Session runner — `session.*` / `setup.*` wired in `SessionView.tsx`
- [x] EN + RU + ES + BE — all four suite locales; dropdown LanguagePicker in header
- [x] Team session entry — `home.start_team` enabled when Firebase configured; disabled stub with tooltip when not
- [x] Firebase real-time team sessions — `src/firebase.ts` (isFirebaseConfigured + getFirebaseDb); `src/components/TeamSession.tsx` (host creates 4-digit PIN, participants join by PIN, lobby shows PIN + joiners, story-by-story voting with hidden votes until host reveals, host sets final estimate per story, end writes to sprintMetrics_planningPoker + planning-poker:lastSession + session history); `team.*` i18n keys in EN/ES/BE/RU; solo mode unaffected when Firebase not configured
- [x] Observer/spectator mode in team sessions — join checkbox on entry screen; `isObserver: true` in Firebase participant record; eye badge in lobby list; observers see vote progress but not card deck; excluded from vote denominator; `team.join_as_observer`, `team.observer_badge`, `team.voters_only` i18n keys in EN/ES/BE/RU
- [x] Card value legend on home screen — `home.cards_title` + `cards.*` descriptions
- [x] Card value tooltips — `cards.*` wired as `title` on all card buttons in `SessionView.tsx`
- [x] Language toggle — uses `app.switch_lang` i18n key (removes raw EN/RU strings)
- [x] Dead locale trees removed — `voting.*` and `revealed.*` deleted from all locales

## Backlog

- [x] [#32] Feature: Observer/spectator mode in team sessions — join as observer (no vote card, excluded from consensus denominator); `team.join_as_observer` i18n key; host-only visibility badge
- [x] [#33] UX: Story drag-to-reorder during estimation session — native HTML5 drag events, grip handle on story rows in SessionView.tsx (solo mode); team mode out of scope this run (see Tech notes)
- [x] [#34] Integration: Sprint Metrics velocity hint in session header — reads `sprint-metrics-projects` (falls back to legacy `sprint-metrics-sprints`), shows trailing 3-sprint avg velocity chip in SessionView header; dismissible; only when >=3 sprints exist; `session.velocity_hint`/`session.velocity_hint_dismiss` i18n keys
- [ ] [#35] Feature: Anonymous/blind voting mode — hide participant names during voting phase to prevent anchoring bias; `blindMode: boolean` in Firebase session doc; `team.blind_mode_label/hint/anonymous_voter` i18n keys; host always sees real names; ~30 LOC in TeamSession.tsx
- [ ] [#36] Integration: Planning Poker → Change Planner estimate sync — detect `?source=change-planner&initiativeId=<id>` query param; write `change-planner:pendingEstimates` localStorage on session end; Change Planner side tracked separately; ~20 LOC in SessionView.tsx App.tsx
- [ ] [#37] UX: Per-story discussion notes after reveal — optional textarea after host sets final estimate; `SessionStory.note?: string` in types.ts; shown in history view; included in Copy Results text export; team mode: host writes to Firebase, participants read-only; ~40 LOC
- [ ] [#38] UX: QR code PIN sharing in team session lobby — render `<QRCode value={joinUrl} />` below PIN display (qrcode.react); auto-read `?joinPin=` param to pre-fill join form; `team.qr_scan_label` i18n key; ~20 LOC
- [ ] [#39] UX: Swipe-to-select card gesture on mobile — Pointer Events API (no dependency); swipe L/R to browse cards, swipe up to cast vote; `session.swipe_hint` i18n key; dismissible first-use hint stored in `planning-poker:swipeHintSeen`; ~50 LOC in SessionView.tsx
- [ ] [#40] Integration: Estimation accuracy cross-reference with Sprint Metrics — read `planning-poker:history` + `sprint-metrics:sprints`; match sessions to sprints by date; show Accuracy tab in history screen with committed vs delivered table; `history.accuracy_tab/accuracy_no_data` i18n keys; read-only, no new dependency
- [x] [#21] Feature: Firebase real-time team sessions — implemented (see above)
- [x] [#3] Feature: Add ES and BE locales to match suite standard — implemented
- [x] [#4] Integration: Export session results to Sprint Metrics — implemented
- [x] [#5] Feature: Per-round voting timer — Off/30s/60s/90s selector in setup; countdown badge in story card; auto-reveal at 0 — implemented
- [x] [#6] Feature: Custom card deck selection (Fibonacci, T-shirt, powers-of-2) — implemented
- [x] [#7] UX: Keyboard accessibility — full keyboard navigation for card voting and story flow
- [x] [#8] Integration: Change Planner → Planning Poker deep-link for effort estimation — implemented
- [x] [#12] Integration: Write planning-poker:lastSession to localStorage for Dashboard card — implemented
- [x] [#13] Feature: Session history persistence in localStorage — implemented
- [x] [#14] UX: Reveal animation and consensus celebration — implemented
- [x] [#15] Integration: Team Identity → Planning Poker participant auto-import — implemented
- [x] [#16] Integration: Scrum Facilitator → Planning Poker sprint planning deep-link — documented (PP side already implemented via `?stories=`; Scrum Facilitator side tracked in scrum-facilitator repo)
- [x] [#19] UX: Header unification — AppHeader + LanguagePicker (white, sticky, h-14)
- [x] [#20] Feature: light/dark theme support — ThemeToggle + `darkMode: 'class'` + dark: Tailwind variants across all screens
- [x] [#17] Feature: Session results export — share image and copy summary text

## localStorage keys

- `sprintMetrics_planningPoker` — JSON array of `{ title, finalEstimate }` objects; written when session ends; read by Sprint Metrics and the Dashboard reader.
- `planning-poker:lastSession` — *(proposed #12)* session-level summary for the Dashboard card: `{ sessionName, deckType, storyCount, estimatedCount, avgPoints, date }`.
- `planning-poker:history` — array of up to 10 past `SessionHistoryEntry` objects (id, name, date, deckType, storyCount, estimatedCount, avgPoints, stories[]); written on session end; read by History screen on load.
- `planning-poker:velocityHintDismissed` — transient flag set when the user dismisses the Sprint Metrics velocity hint chip in `SessionView`; cleared on every new session mount (#34).

## Tech notes

- Wire Firebase team mode when implementing `home.start_team` CTA fully.
- **`?stories=` deep-link contract** (suite integration point): any app can open Planning Poker with pre-populated stories by appending `?stories=<URL-encoded JSON array of {title, description?}>` to the PP URL. Implemented in issue #8. Change Planner uses this today; Scrum Facilitator sprint-planning phase is the next consumer (tracked in scrum-facilitator repo).
- **Story drag-to-reorder (#33)** scoped to solo mode only: `TeamSession.tsx` has no batch pending-story queue to reorder — the host adds one story at a time and voting starts immediately (`handleStartVoting`), unlike solo mode's up-front story list in `SessionView.tsx`. Extending reorder to team mode would require first adding a multi-story lobby queue to `TeamSession.tsx` (a larger, separate change) before a `storyOrder: string[]` Firebase array would have anything to reorder.

## Agent Log

### 2026-07-05 — feat: Sprint Metrics velocity hint in session header (#34)
- Done: verified CI green on `main` (latest Deploy to GitHub Pages run for 1108350 completed/success — prior 5min deploy timeout note is resolved); implemented #34 — `readTrailingVelocity()` in `SessionView.tsx` reads `sprint-metrics-projects` (active project via `sprint-metrics-active-project`, falling back to the first project, then to the legacy flat `sprint-metrics-sprints` key) and averages the trailing 3 sprints' `completed` story points; chip renders in the session header when >= 3 sprints of data exist, reading once on session mount; dismiss button sets `planning-poker:velocityHintDismissed` in localStorage, cleared again on every new session mount so the hint reappears next session; `session.velocity_hint`/`session.velocity_hint_dismiss` i18n keys added to EN/ES/BE/RU; solo mode only (`SessionView.tsx`), team mode (`TeamSession.tsx`) out of scope per issue spec; verified visually in a Playwright-driven browser session (chip shows "Avg velocity: 30 pts/sprint" for seeded 20/30/40-point sprints, dismiss button removes it)
- Remaining: #35 (blind voting), #36 (PP↔Change Planner sync), #37 (per-story notes), #38 (QR PIN sharing), #39 (swipe-to-vote), #40 (estimation accuracy cross-reference) — all awaiting human review; #35/#36/#37 already past 7-day auto-approve threshold (created 2026-06-26, due 2026-07-03) as of this run
- Next task: check issues for human feedback; auto-approve #35/#36/#37 if still needs-review and implement first approved; #38/#39/#40 reach threshold 2026-07-05 (created 2026-06-28) — also eligible; else research cycle for next market/integration/UX opportunity

### 2026-07-02 — feat: story drag-to-reorder in solo session (#33)
- Done: added `draggedStoryId`/`dragOverStoryId` state and `reorderStories()` in `SessionView.tsx`; pending-story `<li>` rows are now `draggable` (HTML5 drag events) except the currently-estimating story, which is fixed in place but still a valid drop target for others; CSS-only six-dot grip glyph (`⠿`) shown next to draggable rows; `reorderStories()` reorders only the pending-story subsequence, leaving already-estimated stories' slots untouched, so `nextStory()` picks up the new order; no i18n keys added (visual-only interaction, per issue spec); team mode (`TeamSession.tsx`) intentionally out of scope — see Tech notes
- Remaining: #34 (Sprint Metrics velocity hint) approved, next in queue; #35 (blind voting), #36 (PP↔Change Planner sync), #37 (per-story notes), #38 (QR PIN sharing), #39 (swipe-to-vote), #40 (estimation accuracy cross-reference) — all awaiting human review
- Next task: verify CI for 7a0848a (PR #42, feat: story drag-to-reorder #33) — build job succeeded but deploy-pages step exceeded 5min timeout during this run, re-check `gh run view`/Actions tab; then implement #34 (Sprint Metrics velocity hint — read `sprint-metrics:sprints` from localStorage in App.tsx/SessionView.tsx at session start, one-time read; if >=3 sprints exist compute trailing 3-sprint avg velocity; dismissible chip in SessionView header using `planning-poker:velocityHintDismissed` localStorage key reset per session; `session.velocity_hint`/`session.velocity_hint_dismiss` i18n keys in EN/ES/BE/RU; solo mode only per issue implementation notes, mirroring #33's scoping)

### 2026-06-30 — feat: observer/spectator mode in team sessions (#32)
- Done: added `isObserver?: boolean` to `FirebaseParticipant` interface; `joinAsObserver` state + checkbox on join entry screen; `handleJoin` writes `isObserver: true` to Firebase when checked; `voterEntries`/`voterCount` exclude observers from vote denominator; host lobby shows 👁 badge for observers; host voting list shows "Observer" label (no vote status) for observer entries; observer participant sees watch screen (story title + 👁 badge + vote progress) instead of card deck; `team.join_as_observer`, `team.observer_badge`, `team.voters_only` i18n keys added to EN/ES/BE/RU; auto-approved #32, #33, #34 (all past 7-day threshold)
- Remaining: #33 (drag-to-reorder, approved), #34 (velocity hint, approved)
- Next task: implement #33 (story drag-to-reorder — HTML5 drag events; grip handle on story rows in SessionView.tsx; solo always, team host-only; `storyOrder: string[]` in Firebase for team mode)

### 2026-06-28 — research: QR code PIN sharing, mobile swipe-to-vote, estimation accuracy
- Done: created #38 (QR code PIN sharing in lobby — qrcode.react, ?joinPin= param), #39 (swipe-to-select card on mobile — Pointer Events API, no dependency), #40 (estimation accuracy cross-reference with Sprint Metrics — history Accuracy tab, read-only); all set to Backlog pending needs-review; project board Backlog status not set (GraphQL proxying disabled this session)
- Remaining: awaiting human review on #32–#40
- Next task: check issues for human feedback; #32, #33, #34 reach 7-day auto-approve threshold on 2026-06-29 — implement first approved; #35, #36, #37 reach threshold on 2026-07-03

### 2026-06-26 — research: blind voting mode, PP→Change Planner sync, per-story notes
- Done: created #35 (anonymous/blind voting mode in TeamSession.tsx), #36 (PP→Change Planner bidirectional estimate sync via `change-planner:pendingEstimates` localStorage), #37 (per-story discussion notes after reveal, stored in SessionStory.note, shown in history + export); all set to Backlog pending needs-review
- Remaining: awaiting human review on #32, #33, #34, #35, #36, #37
- Next task: check issues for human feedback; if any of #32–#37 approved, implement first approved

### 2026-06-22 — research: observer mode, story reorder, Sprint Metrics velocity hint
- Done: closed already-implemented approved issues #5, #7, #21; created #32 (observer/spectator mode in team sessions), #33 (story drag-to-reorder), #34 (Sprint Metrics velocity hint in session header); all set to Backlog
- Remaining: awaiting human review on #32, #33, #34
- Next task: check issues for human feedback; implement first approved item among #32, #33, #34

### 2026-06-19 — feat: Firebase real-time team sessions (#21)
- Done: `src/firebase.ts` (isFirebaseConfigured + getFirebaseDb, pattern from moving-motivators); `src/components/TeamSession.tsx` (host creates 4-digit PIN session written to Realtime DB, participants join by PIN, lobby shows PIN + participant list, story-by-story voting phase with hidden votes, host reveal, host sets final estimate per story, next-story or end, end writes sprintMetrics_planningPoker + planning-poker:lastSession + history entry); updated App.tsx to enable team CTA when Firebase configured and render TeamSession in `team` phase; added `team.*` i18n keys (20 keys) to EN/ES/BE/RU; solo mode unaffected when Firebase not configured; `firebase@^11.10.0` added
- Remaining: none — all known BRIEF features done
- Next task: check issues for human feedback

### 2026-06-19 — research: found approved #21 Firebase team sessions
- Done: checked open issues; found #21 (Firebase real-time team sessions) with `approved` label — unimplemented; set project status to In Progress; added to BRIEF Backlog
- Remaining: #21 to implement
- Next task: implement #21 — add `src/firebase.ts` (isFirebaseConfigured + getFirebaseDb, copy moving-motivators pattern); add `src/components/TeamSession.tsx` (host creates PIN, participants join, voting phase, reveal, end writes to localStorage); enable home.start_team CTA when Firebase configured; add `team.*` i18n keys (host_session, join_session, pin_label, waiting_for_players, start_voting, your_vote, waiting_for_votes, reveal, final_estimate, next_story, end_session) to EN/ES/BE/RU; solo mode must remain unaffected when Firebase not configured

### 2026-06-15 — feat: keyboard accessibility (#7)
- Done #7: added `aria-pressed` to all card vote buttons and final-estimate buttons; added `aria-label` (with participant name) to remove-participant ✕ buttons; added `focus-visible:ring-2 focus-visible:ring-brand-500` focus ring to card and story list buttons; added `useEffect` to focus the first card button when `currentStoryId` changes (story transition); added global `keydown` handler for `Enter`=reveal, `→`=next story, `R`=reset votes, `?`=toggle shortcut legend; added `?` button in action row with `aria-expanded`; added shortcut legend modal (role=dialog, aria-modal) with `<kbd>` tags; added `aria-keyshortcuts` on Reveal/Next/Reset buttons; added 5 i18n keys (`shortcuts_title`, `shortcut_reveal`, `shortcut_next`, `shortcut_reset`, `shortcut_help`) and `common.close` to all 4 locales; wrapped card row with `role=group aria-label={participant.name}` and final-estimate row with `role=group`
- Remaining approved issues: none
- Next task: check issues for human feedback; research cycle for next improvements

### 2026-06-11 — feat: per-round voting timer (#5)
- Done #5: added `timerDuration: number | null` to `PokerSession` in `types.ts`; added `selectedTimer` state (null|30|60|90) in `App.tsx` with 4-button Off/30s/60s/90s picker in setup UI; `startSession()` passes `timerDuration` to session; in `SessionView.tsx` added `timeLeft` state with three effects — reset on story/revealed change, setTimeout countdown tick, auto-reveal at 0 when votes exist; timer badge displayed in current story card header with color progression (gray → amber → red/pulse at ≤5s); `aria-live=polite` for screen readers; `session.timer_label` i18n key added to EN/ES/BE/RU; setup keys `timer_label/off/30s/60s/90s` added to all 4 locales; closed stale implemented issues #3/#4/#6/#8/#12/#13/#15/#16/#17/#19/#20
- Remaining approved issues: #7 (keyboard accessibility), #21 (Firebase team sessions)
- Next task: implement #7 (keyboard accessibility: aria-pressed on card buttons, focus-visible ring for keyboard-only, focus to first card on story transition, keyboard shortcut Enter=reveal/→=next-story/R=reset-votes, aria-label on ✕ buttons, ? key opens shortcut legend overlay)

### 2026-06-08 — feat: reveal animation and consensus celebration (#14)
- Done #14: added CSS keyframes `pp-vote-ring` (box-shadow ring on selected card), `pp-reveal-flip` (3D perspective flip on vote badges), `pp-consensus-glow` (green glow pulse) to `index.css` — all wrapped in `@media (prefers-reduced-motion: no-preference)`; in `SessionView.tsx` added `recentVotes: Set<string>` state (tracks participants who just voted, cleared after 500ms) and `revealAnimating: boolean` state (set true on reveal, cleared after 1.5s); `castVote` adds participant to `recentVotes` → selected card gets `pp-vote-ring` class; `reveal` sets `revealAnimating = true` → left-panel vote badges get `pp-reveal-flip` with 50ms-per-participant staggered delay; `resetVotes` clears `revealAnimating`; consensus stat block gets `pp-consensus-glow` when `consensus === true` and revealed
- Remaining approved issues: #21 (Firebase team sessions), #5 (voting timer), #7 (keyboard accessibility)
- Next task: check issues for human feedback; implement next approved item among #5 (voting timer), #7 (keyboard accessibility)

### 2026-06-05 — feat: session history persistence (#13)
- Done #13: added `SessionHistoryEntry` + `SessionHistoryStory` types to `types.ts`; in `App.tsx` added `loadHistory()` reading `planning-poker:history` localStorage, `sessionHistory` state initialized from localStorage, `expandedSession` state; in `handleSessionBack` now builds a `SessionHistoryEntry` and prepends to history (capped at 10), writing to `planning-poker:history`; replaced in-memory story list with persistent session history view in `phase === 'history'` — shows session cards (name, date, deck, estimated/total, avg pts) expandable to show story-level estimates + votes; added `history.no_history`, `history.clear`, `history.story_count`, `history.avg` i18n keys to EN/ES/BE/RU; removed unused `stories` state and `pokerSessionToStories` function
- Remaining approved issues: #21 (Firebase team sessions), #14 (reveal animation), #5 (voting timer), #7 (keyboard accessibility)
- Next task: check issues for human feedback; implement next approved item among #14 (reveal animation), #5 (voting timer), #7 (keyboard accessibility)

### 2026-05-30 — feat: session results export (#17)
- Done #17: added `results.copyResults`, `results.saveImage`, `results.copied` i18n keys to EN/ES/BE/RU; in `SessionView.tsx` added `copyResults()` (Clipboard API plain-text table: session name, deck type, date header + story/estimate rows) and `saveImage()` (html2canvas @2x capture of results card triggered as PNG download); buttons appear in the "Completed estimates" card header; installed `html2canvas ^1.4.1`
- Remaining approved issues: #21 (Firebase team sessions), #13 (session history), #14 (reveal animation), #5 (voting timer), #7 (keyboard accessibility)
- Next task: check issues for human feedback; implement next approved item

### 2026-05-30 — feat: light/dark theme support (#20)
- Done #20: added `darkMode: 'class'` to `tailwind.config.js`; anti-flash inline script in `index.html`; copied `ThemeToggle.tsx` from design-system into `src/components/`; added `<ThemeToggle />` in `<AppHeader>` children slot; updated all Tailwind color classes in `App.tsx`, `SessionView.tsx`, `AppHeader.tsx`, `LanguagePicker.tsx`, and `index.css` with `dark:` variants — light theme is now the default, dark mode toggled via localStorage `theme` key and system preference on first load
- Remaining approved issues: #17 (results export), #21 (Firebase team sessions), #13 (session history), #14 (reveal animation), #5 (voting timer), #7 (keyboard accessibility)
- Next task: implement #17 (session results export: "Copy Results" button writes plain-text table to clipboard via Clipboard API; "Save as PNG" button captures results card via html2canvas and triggers download; i18n keys `results.copyResults` and `results.saveImage` in EN/ES/BE/RU)

### 2026-05-27 — feat: header unification — AppHeader + LanguagePicker (#19)
- Done #19: copied `AppHeader.tsx` + `LanguagePicker.tsx` from design-system into `src/components/`; replaced dark `bg-gray-800` header block in `App.tsx` with `<AppHeader title={t('app.title')} onTitleClick={() => setPhase('home')} navItems={[learn, history(conditional)]} />`; removed inline 4-button language switcher; header is now white, sticky, h-14, consistent with suite
- Remaining approved issues: #20 (dark mode), #17 (results export), #21 (Firebase team sessions), #13 (session history), #14 (reveal animation), #5 (voting timer), #7 (keyboard accessibility)
- Next task: check issues for human feedback; implement next approved item

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
