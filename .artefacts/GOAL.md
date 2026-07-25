# Planning Poker — Goal

## Problem
Scrum teams need a fast, unbiased way to agree on story-point estimates together — in person or remote — without buying a dedicated paid tool, and without re-typing the resulting numbers into the other planning tools (velocity tracking, initiative sizing, sprint planning) they already use across the Agile Toolkit suite.

## Audience
Scrum Masters, facilitators, product owners, and developers running sprint planning or backlog refinement — either solo (practicing the flow or estimating alone) or as a synchronous team, frequently on a phone during an in-person workshop while a shared screen projects the host view.

## Success criteria
1. A facilitator can run a complete solo session — add stories, vote with a configurable card deck (Fibonacci / T-shirt / powers-of-2), reveal, record final estimates — entirely client-side, no account or backend required.
2. A team can host and join a real-time multi-participant session via a 4-digit PIN or QR code, with votes hidden from other participants until the host reveals, when Firebase is configured.
3. Completed sessions persist across visits (rolling history) and their results reach Sprint Metrics, Change Planner, and shareable text/image exports without manual re-entry.
4. Anchoring-bias mitigations — hidden-until-reveal voting, blind/anonymous participant labels, per-round countdown timer — are available in team sessions.
5. The full UI works in the suite's four standard locales (EN/ES/BE/RU) and is operable end-to-end by keyboard alone.

## Non-goals
- Not a full project-management or issue-tracker replacement — no general backlog CRUD beyond a session's own story list.
- No custom auth or user accounts — team sessions are ephemeral and PIN-based; anyone with the PIN can join.
- No server-side analytics or storage beyond the live Firebase Realtime Database record needed to run an active team session.
- No in-app chat or video — verbal/video discussion during a session is assumed to happen in an external tool.
