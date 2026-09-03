# Milestone 2 Review Report: Vocabulary, Math, Services & Persistence

**Reviewer**: Reviewer M2-2 (Roles: Reviewer, Adversarial Critic)  
**Date**: 2026-09-03T04:42:00Z  
**Target Milestone**: Milestone 2 (Curriculum Datasets, Zod Schemas & Persistence Engine)  
**Target Deliverables**:
- `data/vocabulary.json`
- `data/math.json`
- `src/services/storage.service.ts`
- `src/services/curriculum.service.ts`
- `src/schema/curriculum.schema.ts`
- `src/schema/progress.schema.ts`
- Associated unit tests (`tests/curriculum.test.ts`, `tests/storage.test.ts`)

---

## 1. Executive Summary & Verdict

**Verdict**: **APPROVE**

Worker M2-1's implementation for Milestone 2 is exceptionally well-engineered, robustly validated, and completely aligned with the educational standards and technical constraints laid out in `ORIGINAL_REQUEST.md`, `SPEC.md`, `STACK.md`, and `PROJECT.md`.

All five independent verification gates passed with zero errors:
1. `npm run typecheck` → Exit 0, zero TypeScript errors.
2. `npm test` → Exit 0, 6 test files, 70/70 passing tests.
3. `npm run build` → Exit 0, production bundle compiled cleanly into `dist/`.
4. `bsa verify` → Exit 0, 100% stack compliance with archetype `2d-game-arcade`, 0 forbidden pattern hits.
5. `validate_pwa.py dist` → Exit 0, `RESULT: PASS - safe to publish`, 0 errors, 0 warnings.

---

## 2. Integrity Audit

As required by the review charter, an adversarial integrity audit was conducted:
- **Hardcoded test shortcuts**: NONE. Calculation and evaluation logic in `StorageService` and `CurriculumService` compute results from input arguments using genuine business rules rather than test-matching shims.
- **Dummy or facade implementations**: NONE. Real IndexedDB persistence is implemented with `idb-keyval` (alongside an in-memory caching layer), real Zod runtime parsing is executed on load, and all curriculum items are indexed in a runtime Map.
- **Task shortcuts / external bypassing**: NONE. Datasets were written from scratch with authentic 2nd-grade pedagogical content (44 vocabulary pairs, 40 math challenges, 58 phonics items, 50 morphology items).
- **Fabricated verification outputs**: NONE. All test and gate execution results were independently reproduced and verified by this reviewer.
- **Self-certifying assertions**: NONE. Tests comprehensively exercise positive, negative, and boundary condition paths.

**Integrity Finding**: No integrity violations detected. The implementation is authentic, sound, and complete.

---

## 3. Review Findings & Detailed Dimension Analysis

### 3.1 Vocabulary Dataset (`data/vocabulary.json` & `public/data/vocabulary.json`)
- **Quantity & Coverage**: Contains 44 curriculum items (22 synonym pairs, 22 antonym pairs), exceeding the prompt's requirement of 40+ items.
- **Sentence Context**: 100% of vocabulary items are contextualized in rich, age-appropriate 2nd-grade sentences (e.g. `"The bear is big, but the mouse is small."`, `"The hot soup was warm and soothing."`).
- **Pedagogical Alignment**: Directly supports PA Core Standard CC.1.2.2.F and PPS Grade 2 ELA benchmarks. Covers key foundational word relationships: size (`big/large`, `big/tiny`), emotions (`happy/glad`, `happy/sad`), speed (`fast/quick`, `fast/slow`), difficulty (`hard/difficult`, `hard/easy`), courage (`brave/courageous`, `brave/afraid`), and character (`kind/caring`, `kind/mean`).
- **Distractor Quality & Correctness**: Every item provides at least two distractor words. In synonym challenges, distractors are clear antonyms or contrasting terms; in antonym challenges, distractors are synonyms or unrelated terms. No distractor matches the correct `matchWord`.
- **Scaffolded Progression**: Five levels are configured with progressive drop speeds (2800ms down to 1800ms in Level 5 Boss):
  - Level 1: `Synonym Seekers` (`single_rule`)
  - Level 2: `Antonym Adventurers` (`single_rule`)
  - Level 3: `Synonym vs Antonym Discrimination` (`discrimination`)
  - Level 4: `Context Clues Mastery` (`mixed_patterns`)
  - Level 5: `Vocabulary Boss: Word Wizard` (`boss_level`)

### 3.2 Math Dataset (`data/math.json` & `public/data/math.json`)
- **Quantity & Scope**: Contains 40 items:
  - 16 mental addition facts within 20.
  - 16 mental subtraction facts within 20.
  - 8 skip counting patterns (by 2s up to 20, by 5s up to 35, by 10s up to 70).
- **Mathematical Correctness**: Every single arithmetic operation was independently verified:
  - All addition sums satisfy `operand1 + operand2 === result` and `result <= 20`.
  - All subtraction differences satisfy `operand1 - operand2 === result`, `result >= 0`, and `operand1 <= 20`.
  - All skip counting items correctly extend the arithmetic progression.
- **Distractor Validity**: Every item includes at least two numeric distractors. All distractors are plausible numbers within grade-level range, and none equal the target `result`.
- **Explanations**: Clear explanatory feedback is provided for every item, explicitly calling out key mental math strategies such as doubles facts (`"8 + 8 = 16 (doubles fact!)"`), halves (`"18 - 9 = 9 (half of 18!)"`), and doubles subtraction.

### 3.3 Storage & Persistence Service (`src/services/storage.service.ts`)
- **Mastery Advancement Rule (`>85%` over `10+` attempts)**:
  - Implemented in `isMasteryAchieved(accuracy, attemptsCount)`:
    ```typescript
    const norm = accuracy > 1 ? accuracy / 100 : accuracy;
    return attemptsCount >= 10 && norm > 0.85;
    ```
  - Strictly requires `attemptsCount >= 10` AND `norm > 0.85`.
  - Verified edge cases:
    - `accuracy = 1.0, attempts = 9` → `false` (does NOT unlock).
    - `accuracy = 0.85, attempts = 10` → `false` (does NOT unlock; strictly `> 0.85` required).
    - `accuracy = 0.86, attempts = 10` → `true` (UNLOCKS).
    - `accuracy = 0.90, attempts = 10` → `true` (UNLOCKS).
  - Normalization correctly handles both decimal ratios (`0.90`) and percentages (`90`).
- **Star Rating Thresholds**:
  - Implemented in `calculateStars(accuracy)`:
    - 3 stars: `norm >= 1.0` (100% accuracy)
    - 2 stars: `norm >= 0.90` (>= 90% accuracy)
    - 1 star: `norm >= 0.85` (>= 85% accuracy)
    - 0 stars: `norm < 0.85` (< 85% accuracy)
  - Evaluated and verified across standard and boundary percentages (100%, 95%, 90%, 89%, 85%, 84%).
- **Error Tracking & Spaced Repetition**:
  - Increments `totalAttempts`, `patternErrors[pattern]`, and `wordErrors[word]`.
  - Tracks `consecutiveMistakes`. When `consecutiveMistakes >= 3`, returns `shouldTriggerRemediation: true`.
  - Correct catches reset `consecutiveMistakes` to 0.
  - Includes explicit `resetConsecutiveMistakes()` method for use after displaying teaching cards.
- **Persistence & Fallback Resilience**:
  - Uses `idb-keyval` for pure local persistence with zero network leakage.
  - Initial state unlocks Level 1 for all four topics: `phonics_1`, `morphology_1`, `vocabulary_1`, `math_1`.
  - Preserves highest star rating and highest score across repeated attempts.
  - If IndexedDB is blocked (e.g. private browsing mode) or unavailable (headless test runner), operations seamlessly fall back to `this.inMemoryCache` without throwing unhandled rejections.

### 3.4 Curriculum Service (`src/services/curriculum.service.ts`)
- **Startup Validation**:
  - `loadDefaultCurriculum()` parses `rawPhonics`, `rawMorphology`, `rawVocabulary`, and `rawMath` through their respective Zod schemas (`PhonicsTopicSchema`, `MorphologyTopicSchema`, `VocabularyTopicSchema`, `MathTopicSchema`) and validates the assembled composite against `MasterCurriculumSchema`.
  - Invalid schema payloads throw immediately on startup, preventing runtime crashes in gameplay scenes.
- **Game Contract Compliance**:
  - `createQuestion()` constructs runtime `CurriculumItem` instances matching the GameScene interface contract: `id`, `topic`, `subTopic`, `prompt`, `spokenPrompt`, `targetAnswer`, `targetFruitType`, `options` (`text`, `fruitType`, `isCorrect`, `explanation`), and `explanation`.
  - `generateQuestionSet()` filters items by level `targetPatterns` when defined, shuffles the candidate pool, and builds complete round batches.
- **Teaching Card Explanations**:
  - Indexes all items by ID in a `Map`, allowing O(1) lookup via `getExplanation(itemId)`.

---

## 4. Adversarial Challenges & Stress Testing

### Challenge 1: Non-Uniform Distractor Fruit Shuffling [Minor / Informational]
- **Observation**: In `getDistractorFruitTypes`, array shuffling uses `[...available].sort(() => 0.5 - Math.random())`.
- **Analysis**: While `sort(() => 0.5 - Math.random())` is adequate for small arrays (11 fruit elements) when selecting 2 visual distractor fruits, it is not mathematically uniform.
- **Blast Radius**: None in current gameplay; distractor fruits are varied and visually distinct.
- **Mitigation Recommendation**: For future milestones, consider adopting a standard Fisher-Yates shuffle helper if cryptographically uniform distribution is desired.

### Challenge 2: Question Pool Depletion Edge Case [Minor / Informational]
- **Observation**: In `generateQuestionSet`:
  ```typescript
  while (selected.length < targetCount) {
    const item = shuffled[idx % shuffled.length];
    if (item) { selected.push(item); }
    idx++;
  }
  ```
- **Analysis**: If `shuffled.length === 0` (e.g., if a future custom level config defines patterns that match zero items, and no fallback were provided), `shuffled.length` would be 0, causing an infinite loop. Currently, `if (filtered.length > 0) { pool = filtered; }` prevents empty filter pools, and all schemas require `items.min(1)`.
- **Mitigation Recommendation**: Add an explicit defensive guard `if (shuffled.length === 0) return [];` to guarantee termination even if an invalid custom dataset is injected.

### Challenge 3: Default Parameter in `saveLevelResult` [Minor / Informational]
- **Observation**: `saveLevelResult(topic, levelNumber, accuracy, score, attemptsCount: number = 10)` defaults `attemptsCount` to 10.
- **Analysis**: If an upstream scene in Milestone 4 completes a short practice round with fewer than 10 attempts and omits `attemptsCount`, it could inadvertently trigger mastery unlock.
- **Mitigation Recommendation**: Milestone 4 developers must ensure the actual round attempt count is explicitly passed into `saveLevelResult`.

---

## 5. Verified Claims Summary

| Claim from Worker M2-1 | Verification Method | Result |
|-------------------------|---------------------|--------|
| TypeScript typechecks with 0 errors | `npm run typecheck` | PASS (code 0) |
| 70 unit tests passing across 6 test suites | `npm test` | PASS (70/70 passed) |
| Production build succeeds | `npm run build` | PASS (code 0) |
| 100% BSA compliance with STACK.md | `~/.build-standards/bin/bsa verify .` | PASS (clean) |
| PWA publish gate passes with 0 errors/warnings | `python3 validate_pwa.py dist` | PASS (0 errors, 0 warnings) |
| 40+ vocabulary pairs in contextual sentences | Inspected `data/vocabulary.json` (44 items) | PASS |
| Addition/subtraction within 20 & skip counting | Inspected `data/math.json` (40 items) | PASS |
| Unlock rule requires `attempts >= 10 && accuracy > 0.85` | Inspected `storage.service.ts` + unit tests | PASS |
| Star rating thresholds (100% = 3, >=90% = 2, >=85% = 1) | Inspected `storage.service.ts` + unit tests | PASS |
| 3-consecutive-mistakes remediation trigger | Inspected `storage.service.ts` + unit tests | PASS |
| Startup Zod schema validation | Inspected `curriculum.service.ts` + unit tests | PASS |

---

## 6. Conclusion

Milestone 2 fulfills all requirements from the brief, specifications, and architecture documents. The work is approved for integration, and the project is ready to proceed to Milestone 3 (Audio, Remediation & Visual UI).
