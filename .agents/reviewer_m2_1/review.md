# Milestone 2 Review Report: Phonics, Morphology & Schemas Review

**Reviewer**: Reviewer M2-1 (Roles: reviewer, critic)  
**Date**: 2026-09-03T04:41:00Z  
**Target Milestone**: Milestone 2 (Phonics, Morphology & Schemas)  
**Target Worker**: Worker M2-1  
**Working Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/reviewer_m2_1`

---

## Review Summary

**Verdict**: **APPROVE**

Worker M2-1 has delivered a complete, high-quality, and pedagogically sound implementation of the curriculum schemas, external datasets, persistence engine, and automated test suites for Milestone 2. 

### Key Assessment Highlights
1. **Curriculum Completeness**:
   - **Phonics**: 58 curriculum items (exceeds >= 40 requirement), containing all 9 required vowel teams (`ai`, `ay`, `ea` [long/short split], `ee`, `ie`, `oa`, `oe`, `ui`, `ue`) and all 5 required r-controlled vowels (`ar`, `er`, `ir`, `or`, `ur`).
   - **Explicit "ea" Split**: Explicit pedagogical separation of `ea_long_e` (/ē/ sound, 6 items including *beach*, *peach*, *leaf*) and `ea_short_e` (/ĕ/ trickster sound, 6 items including *bread*, *head*, *thread*). Level 2 is dedicated exclusively to discriminating between these two sounds.
   - **Morphology**: 50 curriculum items across all 12 required affixes (`re-`, `un-`, `dis-`, `pre-`, `-s / -es`, `-ed`, `-ing`, `-er`, `-est`, `-ful`, `-less`, `-ly`) using 49 distinct base words (exceeds >= 30 requirement). Every item enforces the visual segmentation format (e.g. `"re + play → replay"`).
   - **Vocabulary**: 44 items (22 synonym pairs, 22 antonym pairs) contextualized in 2nd-grade sentences (exceeds >= 40 requirement).
   - **Extensible Math**: 40 mental math items covering addition/subtraction within 20 and skip counting, with verified mathematical accuracy.
2. **Schema & Architectural Discipline**:
   - Strict Zod schemas in `src/schema/curriculum.schema.ts` and `src/schema/progress.schema.ts`.
   - Zero hardcoded curriculum logic in source code, fully respecting STACK.md archetype `2d-game-arcade`.
   - Data stored in external JSON files in `data/` and mirrored in `public/data/`.
3. **Persistence Engine**:
   - Pure local persistence via `idb-keyval` with zero telemetry or network leakage.
   - Level 1 initially unlocked across all topics; subsequent level unlock strictly requires mastery (>85% accuracy on 10+ attempts).
   - 3-star rating model (3 stars for 100%, 2 stars for >=90%, 1 star for >=85%, 0 stars for <85%).
   - Consecutive error tracking triggering remediation at 3 consecutive mistakes; resets counter on correct catch.
4. **Integrity & Quality Gates**:
   - Zero integrity violations detected (no hardcoded test outputs, no facade implementations, no test bypassing).
   - All 5 independent verification commands executed and passed cleanly:
     - `npm run typecheck` (0 errors)
     - `npm test` (70/70 passing across 6 test suites)
     - `npm run build` (Clean production bundle in 1.12s)
     - `~/.build-standards/bin/bsa verify .` (VERDICT: PASS, 0 forbidden pattern hits)
     - `python3 .../validate_pwa.py dist` (RESULT: PASS - safe to publish)

---

## Findings

### [Minor] Finding 1: Array Shuffling Entropy in `generateQuestionSet`
- **What**: In `src/services/curriculum.service.ts` line 365, shuffling of question candidates uses `sort(() => 0.5 - Math.random())`.
- **Where**: `src/services/curriculum.service.ts:365`
- **Why**: `sort(() => 0.5 - Math.random())` exhibits non-uniform permutation distribution in V8.
- **Suggestion**: For future game scene optimization in Milestone 4, consider replacing with a classic in-place Fisher-Yates shuffle algorithm. For Milestone 2 curriculum delivery and 10-item sets, this is completely acceptable.

---

## Verified Claims

- **Claim 1**: "Topic A word list covers 9 vowel teams and 5 r-controlled vowels with >= 40 words"  
  → **Verified via**: Independent inspection of `data/phonics.json` and `tests/curriculum.test.ts`. Confirmed 58 total items covering `ai`, `ay`, `ea_long_e`, `ea_short_e`, `ee`, `ie`, `oa`, `oe`, `ui`, `ue`, `ar`, `er`, `ir`, `or`, `ur`. → **PASS**

- **Claim 2**: "Explicit /ē/ vs /ĕ/ 'ea' split implemented with separate rules and words"  
  → **Verified via**: Direct inspection of `data/phonics.json` lines 188-318 and test assertion `explicitly separates /ē/ vs /ĕ/ in "ea" vowel team`. Level 2 explicitly models this distinction with trickster explanations. → **PASS**

- **Claim 3**: "Topic B includes 12 affixes across 30+ base words with visual segmentation"  
  → **Verified via**: Direct count in `data/morphology.json`. 50 items across 12 affixes (`re-`, `un-`, `dis-`, `pre-`, `-s / -es`, `-ed`, `-ing`, `-er`, `-est`, `-ful`, `-less`, `-ly`) using 49 distinct base words. Every item matches `^.+ \+ .+ → .+$`. → **PASS**

- **Claim 4**: "Topic C word list includes >= 40 synonym/antonym pairs with sentence prompts"  
  → **Verified via**: Direct inspection of `data/vocabulary.json`. 44 items (22 synonyms, 22 antonyms) with sentence context. → **PASS**

- **Claim 5**: "Curriculum data validated through strict Zod schemas with zero exceptions"  
  → **Verified via**: `PhonicsTopicSchema`, `MorphologyTopicSchema`, `VocabularyTopicSchema`, `MathTopicSchema`, and `MasterCurriculumSchema` validation in `tests/curriculum.test.ts`. → **PASS**

- **Claim 6**: "Persistence engine unlocks level only upon mastery (>85% on 10+ attempts)"  
  → **Verified via**: Unit tests in `tests/storage.test.ts` testing 8 attempts (no unlock), 85% on 10 attempts (no unlock), and >85% on 10 attempts (unlock confirmed). → **PASS**

- **Claim 7**: "Spaced repetition and 3 consecutive error remediation trigger"  
  → **Verified via**: `storage.recordMistake` tracking `consecutiveMistakes` and returning `shouldTriggerRemediation: true` at 3, with reset to 0 upon `storage.recordCorrect`. → **PASS**

- **Claim 8**: "Passes all verification gates: typecheck, test, build, bsa verify, validate_pwa"  
  → **Verified via**: Independent execution of all 5 commands in reviewer turn. → **PASS**

---

## Adversarial Challenge & Stress-Testing

### Challenge Summary
- **Overall risk assessment**: **LOW**

### Challenges & Failure Mode Analysis

#### [Low] Challenge 1: Empty Dataset / Zero Items Infinite Loop Potential
- **Assumption challenged**: `generateQuestionSet` assumes `items` has at least 1 item when filling up to `targetCount`.
- **Attack scenario**: If an empty custom curriculum were passed without validation, `while (selected.length < targetCount)` would loop infinitely.
- **Mitigation & Finding**: The Zod schemas for all topic manifests (`PhonicsTopicSchema`, etc.) strictly enforce `items: z.array(...).min(1)`. Because `CurriculumService` invokes Zod `.parse()` before setting the curriculum, an empty item array is rejected immediately at parse time, preventing the infinite loop.

#### [Low] Challenge 2: Distractor Collision or Exhaustion
- **Assumption challenged**: Distractor fruits in `getDistractorFruitTypes` must not collide with the target fruit.
- **Attack scenario**: If an item requests more distractor fruit types than available (11 available), array slicing would return undefined slots.
- **Mitigation & Finding**: The code includes fallback defaults (`fruit = distractorFruits[idx] ?? 'lemon'`), and curriculum items have only 2 to 3 distractors, well below the 11 available alternative fruit types.

#### [Low] Challenge 3: In-Memory Fallback vs Real IndexedDB
- **Assumption challenged**: Browser execution requires IndexedDB persistence, while CI/test environments lack native IndexedDB.
- **Attack scenario**: Running tests in Node/JSDOM without fake-indexeddb throws runtime errors, or failing IDB writes lose data.
- **Mitigation & Finding**: `StorageService` maintains a synchronous in-memory cache validated via `UserProgressSchema` and wraps `idb-keyval` operations in `try/catch` blocks. In browser environments, data persists to IndexedDB; in test environments, operations complete deterministically in memory.

---

## Coverage Gaps

- None identified for Milestone 2 scope. The data contracts cleanly align with Milestone 3 (Audio/Remediation) and Milestone 4 (Phaser GameScene).

## Unverified Items

- None. All deliverables and claims were independently tested and verified.

---

## Verdict Rationale

Worker M2-1's work strictly adheres to all requirements in `ORIGINAL_REQUEST.md`, `SPEC.md`, `STACK.md`, and `DISPATCH.md`. There are no regressions, no integrity violations, no hardcoded curriculum logic, and all tests and publication gates pass cleanly. The verdict is **APPROVE**.
