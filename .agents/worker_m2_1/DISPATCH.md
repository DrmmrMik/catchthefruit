# Dispatch: Worker M2-1 (Curriculum Datasets, Zod Schemas & Persistence Engine)

## Identity
- Role: Worker
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m2_1
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Mandatory Reading
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md`
3. `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`
4. `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`
5. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Milestone 2 Deliverables
1. **Zod Validation Schemas**:
   - Create `src/schema/curriculum.schema.ts`:
     - `FruitTypeSchema` (enum: 'apple', 'orange', 'grape', 'banana', 'watermelon', 'blueberry', 'strawberry', 'lemon', 'kiwi', 'peach', 'plum', 'cherry')
     - `PhonicsItemSchema` (id, pattern: vowel_team | r_controlled, ruleName, sound: string, word: string, sentence: string, distractorWords: string[], explanation: string, fruitType: FruitType)
     - `MorphologyItemSchema` (id, affixType: prefix | suffix, affix: string, baseWord: string, combinedWord: string, visualSegmentation: string [e.g. "re + play → replay"], distractorWords: string[], explanation: string, fruitType: FruitType)
     - `VocabularyItemSchema` (id, relationship: synonym | antonym, targetWord: string, matchWord: string, sentenceContext: string, distractorWords: string[], explanation: string, fruitType: FruitType)
     - `MathItemSchema` (id, operation: addition | subtraction | skip_counting, operand1: number, operand2: number, result: number, prompt: string, distractorResults: number[], explanation: string, fruitType: FruitType)
     - `LevelConfigSchema` (id, topic, levelNumber, name, description, fallSpeedDurationMs, itemsRequired, masteryAccuracyThreshold: 0.85, scaffoldStage)
     - `MasterCurriculumSchema`
   - Create `src/schema/progress.schema.ts` for IndexedDB progress data.

2. **External JSON Curriculum Datasets**:
   - Create `data/phonics.json`: >= 40 curriculum words covering 9 vowel teams (`ai`, `ay`, `ea` [with explicit /ē/ as in beach vs /ĕ/ as in bread split], `ee`, `ie`, `oa`, `oe`, `ui`, `ue`) and 5 r-controlled (`ar`, `er`, `ir`, `or`, `ur`).
   - Create `data/morphology.json`: 12 affixes (`re-`, `un-`, `dis-`, `pre-`, `-s`/`-es`, `-ed`, `-ing`, `-er`, `-est`, `-ful`, `-less`, `-ly`) across 30+ base words with visual morphological segmentation.
   - Create `data/vocabulary.json`: 40+ synonym and antonym word pairs contextualized in grade-level sentences.
   - Create `data/math.json`: Grade 2 PPS Math items (addition/subtraction within 20, mental math, skip counting).
   - Zero hardcoded curriculum in source files: all content loaded from JSON and validated by Zod at startup.

3. **Services**:
   - Create `src/services/curriculum.service.ts`:
     - Loads JSON datasets, validates against Zod schemas on startup, provides question sets, distractor generation, and explanation lookups for teaching cards.
   - Create `src/services/storage.service.ts`:
     - Uses `idb-keyval` for pure local IndexedDB persistence.
     - Tracks unlocked levels (initial: level 1 unlocked per topic).
     - Mastery rule: unlocking next level requires >85% accuracy on 10+ attempts.
     - Star calculation: 3 stars (100% accuracy), 2 stars (>= 90%), 1 star (>= 85%).
     - Error tracking: records mistakes per-pattern and per-word, tracks consecutive errors for 3-mistake remediation trigger.
     - User settings: volume, TTS toggle, contrast mode.

4. **Automated Unit Test Suites**:
   - Create `tests/curriculum.test.ts`:
     - Test that all 4 JSON files parse and validate cleanly through Zod schemas.
     - Test explicit /ē/ vs /ĕ/ "ea" split.
     - Test morphology visual segmentation format.
     - Test distractor validity (distractors do not equal correct answer).
     - Test minimum item counts (>= 40 phonics, 12 affixes across 30+ base words, 40+ vocab pairs).
   - Create `tests/storage.test.ts`:
     - Test level unlock logic (>85% over 10+ attempts).
     - Test star calculations (1, 2, 3 stars).
     - Test consecutive error tracking (triggers remediation at 3 consecutive mistakes).
     - Test IndexedDB storage roundtrip and settings update.

5. **Build & Quality Gates**:
   - `npm run typecheck` passes with 0 errors.
   - `npm test` passes 100% of tests.
   - `npm run build` succeeds.
   - `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes with `VERDICT: ✓ PASS`.
   - `python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist` passes with 0 errors, 0 warnings.

6. **Handoff**:
   - Write `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m2_1/handoff.md` with complete command logs and deliverable summaries.
   - Send completion message to parent orchestrator.

## 2026-09-03T04:30:43Z
<USER_REQUEST>
You are Worker M2-1 for "Catch the Fruit" (Milestone 2: Curriculum Datasets, Zod Schemas & Persistence Engine).
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m2_1
Your task assignment is in: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m2_1/DISPATCH.md

MANDATORY: You must read /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md before starting work.
Also read /home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md, SPEC.md, STACK.md, and /home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_1/survey_report.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute Milestone 2 deliverables:
1. Implement src/schema/curriculum.schema.ts and src/schema/progress.schema.ts using Zod.
2. Implement data/phonics.json (9 vowel teams, 5 r-controlled, explicit /ē/ vs /ĕ/ "ea" split, 40+ words).
3. Implement data/morphology.json (12 affixes, 30+ base words, "re + play → replay" visual segmentation).
4. Implement data/vocabulary.json (40+ synonym/antonym pairs in grade-level sentences).
5. Implement data/math.json (PPS grade 2 addition/subtraction within 20, mental math).
6. Implement src/services/curriculum.service.ts and src/services/storage.service.ts using idb-keyval (>85% mastery over 10+ attempts, 1-3 stars, 3-mistake remediation tracking, settings).
7. Implement tests/curriculum.test.ts and tests/storage.test.ts.
8. Verify npm run typecheck, npm test, npm run build, bsa verify, and validate_pwa.py dist pass with 0 errors and 0 warnings.
9. Write handoff.md with complete logs and send completion message when done.
</USER_REQUEST>
