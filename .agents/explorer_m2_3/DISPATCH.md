# Dispatch: Explorer M2-3 (Persistence Engine, Services & Test Architecture)

## Identity
- Role: Explorer
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_3
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Mandatory Reading
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md`
3. `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`
4. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md`

## Milestone 2 Scope: Persistence Engine & Services
- Design `src/services/storage.service.ts` using `idb-keyval` to handle:
  - User progress tracking: unlocked levels, completed levels, 1-3 star calculation, high scores.
  - Mastery progression rules: unlocking next level requires >85% accuracy over 10+ attempts.
  - Remediation error tracking: per-pattern and per-word mistake counts, tracking consecutive mistakes for the 3-mistake speed dampener.
  - User settings: sound volume, speech TTS toggle, contrast mode.
- Design `src/services/curriculum.service.ts`:
  - Runtime validation of all JSON datasets using Zod schemas at startup.
  - Question and distractor generator for game sessions, dynamic level loader, explanation lookup for teaching cards.
- Design comprehensive Vitest test suites:
  - `tests/curriculum.test.ts` (schema validation, data completeness, edge cases, distractor validity).
  - `tests/storage.test.ts` (unlock logic, star scoring, error accumulation, persistence roundtrips).

## Output
Write report to `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_3/report.md` and summary in `handoff.md`. Send completion message when done.

## 2026-09-03T01:45:03Z
You are Explorer M2-3 for "Catch the Fruit" (Milestone 2: Persistence Engine, Services & Test Architecture).
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_3
Your task assignment is in: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m2_3/DISPATCH.md

MANDATORY: You must read /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md before starting work.
Also read /home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md, SPEC.md, and /home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md.

Design src/services/storage.service.ts (idb-keyval, >85% accuracy unlocks, 1-3 stars, 3-error tracking), src/services/curriculum.service.ts (Zod validation, item generation, level loading), and Vitest test specs for tests/curriculum.test.ts and tests/storage.test.ts.
Write report.md and handoff.md. Send completion message back to parent when done.

