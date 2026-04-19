# BRIEF

Derived per [`agent-state.NO-BRIEF.md`](https://github.com/agile-toolkit/.github/blob/main/agent-state.NO-BRIEF.md). There was **no prior** `BRIEF.md`. Sources: `README.md`, `src/i18n/en.json` / `ru.json`, `src/`. Generated **2026-04-19**.

## Product scope (from `README.md`)

- **Planning Poker** for Scrum teams: simultaneous voting, instant reveal, estimation education.
- Stack includes **Firebase** (README); team mode implied.
- Deploy: GitHub Pages via Actions on `main`.

## Build

- `npm run build` — **passes** (verified **2026-04-19**).

## TODO / FIXME in `src/`

- None.

## i18n — unused subtrees vs current UI

The live session UI uses the **`session.*`** and **`setup.*`** trees (`SessionView.tsx`, `App.tsx`). These **`en.json` sections appear unused** (no literal `t('…')` in `src/`):

- **`voting.*`** — duplicate labels of voting phase (superseded by `session.*`).
- **`revealed.*`** — post-reveal copy (superseded by `session.*` statistics block).
- **`cards.*`** — long descriptions for each card value; **vote buttons render raw numeric `v`** (`SessionView.tsx`, `CARD_VALUES`) instead of `t(\`cards.${key}\`)`.

**Home / README gap**

- Keys **`home.start_team`**, **`home.cards_title`** exist but **no control** uses them: home only shows **`home.start_practice`** (`App.tsx` ~lines 119–127). README promises team / Firebase path — **feature not surfaced in UI** beyond `home.team_note`.

## Hardcoded user-visible strings

- Language toggle shows raw **`EN` / `RU`** (`App.tsx` ~71) instead of `lang.*` keys present in `en.json`.

## Classification (NO-BRIEF)

- **Status:** `in-progress` — build passes; README/i18n promise team session + rich card copy not fully wired.
- **First next task:** Either remove dead **`voting.*`**, **`revealed.*`**, **`cards.*`** blocks from `src/i18n/en.json` + `ru.json`, **or** wire `cards.*` as `title` / tooltip on each vote button in `SessionView.tsx` and use `home.start_team` for a second CTA that enters Firebase team flow (if implemented).
