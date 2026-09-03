# Task Assignment: Survey Explorer 1 (Stack, Build System, BSA & Existing Workspace)

## Identity
- Role: Explorer
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Objective
Investigate and report on:
1. Current workspace structure at `/home/gallabot/Documents/antigravity/joyful-hertz`: what files already exist? What configuration is present?
2. `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`: Required libraries (phaser, zod), Forbidden patterns (raw-raf-loop, dom-sprites, unbatched-image-loads, hardcoded-curriculum-logic), packaging rules.
3. BSA tooling: Inspect `~/.build-standards/bin/bsa` and run verification checks `~/.build-standards/bin/bsa show 2d-game-arcade` and `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz`. What does bsa require/verify?
4. Recommended build stack, dependencies, Vite / TypeScript configuration, bundling, testing harness (e.g. Vitest, Playwright or mock canvas tests for Phaser).
5. Dependencies and node environment: Check node version, npm/pnpm availability, installation readiness.

## Output
Write a structured report to `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1/survey_report.md` and summarize in `handoff.md`. Send completion message when done.

## 2026-09-03T01:16:43Z
You are Survey Explorer 1 for "Catch the Fruit".
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1
Your task assignment is in: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1/DISPATCH.md
MANDATORY: You must read /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md before starting work.
Also inspect /home/gallabot/Documents/antigravity/joyful-hertz/STACK.md and run command inspections for ~/.build-standards/bin/bsa and current directory contents.

Investigate the existing project workspace, STACK rules (phaser, zod, forbidden patterns), bsa show 2d-game-arcade, bsa verify, package management, build tooling (Vite, TS), and test runner setup.
Write your full report to /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1/survey_report.md and your summary in handoff.md.
Send a completion message back to parent when done.
