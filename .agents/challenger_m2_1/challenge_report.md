# Challenge Report: Milestone 2 Curriculum & Zod Schema Adversarial Verification

**Author**: Challenger M2-1 (Curriculum & Zod Schema Adversarial Verifier)  
**Date**: 2026-09-03T04:42:00Z  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  

---

## 1. Executive Summary

Challenger M2-1 performed adversarial stress testing, data integrity verification, and boundary fault-injection on the Milestone 2 deliverables for "Catch the Fruit" (Grade 2 ELA & PPS Math arcade game). 

All 4 curriculum datasets (`phonics.json`, `morphology.json`, `vocabulary.json`, `math.json`), runtime Zod schemas (`curriculum.schema.ts`, `progress.schema.ts`), and service classes (`CurriculumService`, `StorageService`) were subjected to empirical testing via:
1. An automated Python verification oracle (`scripts/adversarial_curriculum_verify.py`).
2. An extensive Vitest adversarial test harness (`tests/curriculum_adversarial.test.ts`).
3. Total repository test suite execution (8 test suites, 123/123 passing tests).
4. TypeScript static verification (`npm run typecheck`, 0 errors).
5. Production bundle build (`npm run build`, clean output).
6. Build Standards Advisor verification (`~/.build-standards/bin/bsa verify .`, PASS).
7. PWA publish gate validation (`validate_pwa.py dist`, PASS).

No schema leaks, distractor collisions, ID duplications, or pedagogical deviations were found. The curriculum and schema implementation is robust, airtight, and meets all pedagogical and technical requirements.

---

## 2. Adversarial Challenges & Stress Testing

### Challenge 1: Malformed & Boundary Input Injection into Zod Schemas [Risk: LOW]
- **Assumption Challenged**: Zod schemas strictly reject malformed, partial, or out-of-range inputs at load time and provide descriptive error messages.
- **Attack Scenarios Tested**:
  1. *Missing Required Fields*: Omitted each required property (`id`, `pattern`, `ruleName`, `sound`, `word`, `sentence`, `distractorWords`, `explanation`, `fruitType`, `affixType`, `affix`, `baseWord`, `combinedWord`, `visualSegmentation`, `relationship`, `targetWord`, `matchWord`, `sentenceContext`, `operation`, `operand1`, `operand2`, `result`, `prompt`, `distractorResults`) one-by-one across all item schemas.
  2. *Invalid Enum Values*: Injected unmapped fruit types (`'mango'`, `'dragonfruit'`, `'tomato'`, `'orange_juice'`, `''`, `123`, `null`), invalid phonics patterns (`'consonant'`, `'silent_e'`), invalid affixes (`'infix'`, `'root'`), invalid vocabulary relationships (`'homonym'`, `'rhyme'`), and invalid math operations (`'multiplication'`, `'division'`).
  3. *Empty String Boundary*: Injected empty strings `""` into required fields (`id`, `word`, `sound`, `visualSegmentation`, `targetWord`, `prompt`).
  4. *Distractor Array Boundaries*: Injected empty arrays `[]`, single-element arrays `['lone']`, and arrays containing empty strings `['valid', '']` into `distractorWords` and `distractorResults`.
  5. *Level Config Boundaries*: Injected negative level numbers (`-1`), zero (`0`), floating-point levels (`1.5`), negative fall durations (`-500ms`, `0ms`), and out-of-range mastery thresholds (`-0.1`, `1.05`).
  6. *Topic Manifest Boundaries*: Injected empty levels `[]` and empty items `[]`, as well as topic literal mismatches (e.g. `topic: 'math'` in `PhonicsTopicSchema`).
  7. *Master Curriculum Boundaries*: Injected incomplete manifests missing one or more topics.
- **Empirical Findings**: In every case, Zod schemas threw `ZodError` with specific issue paths, error codes (`invalid_type`, `too_small`, `invalid_enum_value`, `invalid_literal`), and rejected the payload. Zero invalid payloads bypassed validation.
- **Verdict**: PASS.

### Challenge 2: Distractor Contamination & Target Answer Collisions [Risk: LOW]
- **Assumption Challenged**: All multiple-choice distractor options presented to 2nd-grade learners are mutually unique and strictly disjoint from the correct answer and prompt keywords.
- **Attack Scenarios Tested**:
  1. *Phonics Target Collision*: Evaluated all 66 items in `data/phonics.json` for case-insensitive, whitespace-trimmed equality between `word` and any member of `distractorWords`.
  2. *Morphology Collision*: Evaluated all 50 items in `data/morphology.json` for collisions between `combinedWord` and `distractorWords`, as well as `baseWord` and `distractorWords`.
  3. *Vocabulary Collision*: Evaluated all 44 items in `data/vocabulary.json` for collisions between `matchWord` and `distractorWords`, as well as `targetWord` and `distractorWords`.
  4. *Math Collision*: Evaluated all 40 items in `data/math.json` for numerical equality between `result` and any member of `distractorResults`.
  5. *Internal Distractor Duplication*: Checked `len(set(distractors)) == len(distractors)` for every item across all 4 datasets.
  6. *Runtime Game Options Generation*: Verified that `CurriculumService.createQuestion()` produces exactly 1 correct option and >= 2 incorrect options, with zero text collisions and distinct fruit sprites.
- **Empirical Findings**:
  - Total items audited: 200 items.
  - Distractor collisions with target answer: **0**.
  - Distractor collisions with prompt/base words: **0**.
  - Duplicate distractors within items: **0**.
  - All items contain at least 2 distinct distractors.
- **Verdict**: PASS.

### Challenge 3: Global & Topic ID Uniqueness Audit [Risk: LOW]
- **Assumption Challenged**: All item IDs and level IDs are strictly unique within each topic and globally across the entire application without any namespace collisions.
- **Attack Scenarios Tested**:
  1. Checked item ID uniqueness within `phonics.json` (66 items).
  2. Checked item ID uniqueness within `morphology.json` (50 items).
  3. Checked item ID uniqueness within `vocabulary.json` (44 items).
  4. Checked item ID uniqueness within `math.json` (40 items).
  5. Tested global cross-topic item ID collisions across all 200 items.
  6. Checked level ID uniqueness across all 20 levels (5 levels * 4 topics).
  7. Checked level numbers within each topic are sequential integers starting at 1.
- **Empirical Findings**:
  - Duplicate item IDs within topics: **0**.
  - Duplicate item IDs across topics: **0** (200 unique IDs verified).
  - Duplicate level IDs: **0** (20 unique level IDs verified).
  - Level numbering: strictly 1, 2, 3, 4, 5 for all 4 topics.
- **Verdict**: PASS.

### Challenge 4: Pedagogical Specification Conformance [Risk: LOW]
- **Assumption Challenged**: The curriculum datasets strictly adhere to PA Core Standards Grade 2 requirements, Pittsburgh Public Schools benchmarks, and specific SPEC.md rules.
- **Attack Scenarios Tested**:
  1. *Phonics Breadth*: Verified >= 40 words (actual: 66 items).
  2. *Vowel Teams*: Verified all 9 required vowel teams (`ai`, `ay`, `ea` [split], `ee`, `ie`, `oa`, `oe`, `ui`, `ue`) are present.
  3. *R-Controlled Vowels*: Verified all 5 required r-controlled vowels (`ar`, `er`, `ir`, `or`, `ur`) are present.
  4. *Dual Sound "ea" Split*: Verified dedicated rules for `ea_long_e` (/ē/) and `ea_short_e` (/ĕ/), with at least 5 words each (actual: 6 each), containing benchmark exemplars `'beach'` and `'bread'`, and instructional explanations referencing trickster / sunny sounds.
  5. *Phoneme Matching*: Verified every phonics word contains the claimed vowel team or r-controlled letter sequence.
  6. *Morphology Affixes & Base Words*: Verified all 12 affixes (`re-`, `un-`, `dis-`, `pre-`, `-s / -es`, `-ed`, `-ing`, `-er`, `-est`, `-ful`, `-less`, `-ly`) are covered across >= 30 base words (actual: 49 distinct base words across 50 items).
  7. *Visual Segmentation Format*: Verified 100% of morphology items match `^.+ \+ .+ → .+$` and contain the combined word.
  8. *Vocabulary Coverage*: Verified >= 40 pairs (actual: 44 items: 22 synonyms, 22 antonyms) contextualized in 2nd-grade sentences.
  9. *Math Accuracy*: Verified all addition facts within 20, subtraction facts within 20, and skip counting facts are mathematically accurate.
  10. *Atlas Sprite Alignment*: Verified every item's `fruitType` is one of the 12 atlas fruits.
  11. *Level Pacing*: Verified fall speed duration strictly decreases from Level 1 (2800ms) to Level 5 (1800ms) across all topics.
- **Empirical Findings**: All pedagogical criteria met or exceeded with 100% compliance.
- **Verdict**: PASS.

### Challenge 5: Storage Engine Boundaries & Fault Resiliency [Risk: LOW]
- **Assumption Challenged**: Storage service properly enforces mastery progression (>85% on 10+ attempts), star rating boundaries, consecutive error remediation triggers (at 3 errors), and handles invalid inputs gracefully.
- **Attack Scenarios Tested**:
  1. Boundary testing `isMasteryAchieved`:
     - 0.85 (85.0%) on 10 attempts -> `false` (strictly >0.85 required).
     - 0.851 on 10 attempts -> `true`.
     - 1.0 (100%) on 9 attempts -> `false` (requires 10+ attempts).
     - 1.0 on 10 attempts -> `true`.
  2. Boundary testing `calculateStars`:
     - < 0.85 -> 0 stars.
     - 0.85 to 0.899 -> 1 star.
     - 0.90 to 0.999 -> 2 stars.
     - 1.0 (or 100) -> 3 stars.
  3. Consecutive error tracking:
     - 1 mistake -> `shouldTriggerRemediation: false`.
     - 2 mistakes -> `shouldTriggerRemediation: false`.
     - 3 mistakes -> `shouldTriggerRemediation: true`.
     - Correct catch -> resets consecutive counter to 0 without wiping cumulative stats.
     - `resetConsecutiveMistakes()` -> resets counter to 0.
  4. Resiliency & NaN handling: `calculateStars(NaN)` returns 0 without crashing; invalid progress payloads are sanitized via Zod defaults.
- **Empirical Findings**: All storage boundaries operate strictly to specification.
- **Verdict**: PASS.

---

## 3. Stress Test Results Matrix

| # | Test Scenario | Expected Result | Actual Result | Status |
|---|---------------|-----------------|---------------|--------|
| 1 | Python curriculum verification oracle execution | 0 errors, APPROVE verdict | 0 errors, APPROVE verdict | **PASS** |
| 2 | `data/` vs `public/data/` JSON byte comparison | Identical byte length & hash | 4/4 files byte-identical | **PASS** |
| 3 | PhonicsItemSchema missing field rejection | Throws ZodError on any omitted key | Throws ZodError on every omitted key | **PASS** |
| 4 | FruitTypeSchema invalid fruit rejection | Rejects 'mango', 'dragonfruit', etc. | Rejects all non-atlas fruit types | **PASS** |
| 5 | PhonicsItemSchema empty string rejection | Throws ZodError with too_small code | Throws ZodError on empty strings | **PASS** |
| 6 | Distractor array minimum length (<2) rejection | Throws ZodError | Throws ZodError on 0 or 1 distractors | **PASS** |
| 7 | LevelConfig negative / 0 / float levelNumber | Throws ZodError | Throws ZodError | **PASS** |
| 8 | LevelConfig negative / 0 fallSpeedDurationMs | Throws ZodError | Throws ZodError | **PASS** |
| 9 | LevelConfig out-of-range mastery threshold | Throws ZodError for <0 or >1 | Throws ZodError | **PASS** |
| 10 | Topic manifests with empty levels / items | Throws ZodError | Throws ZodError | **PASS** |
| 11 | Phonics distractors collision test (66 items) | 0 collisions with target word | 0 collisions | **PASS** |
| 12 | Morphology distractors collision test (50 items)| 0 collisions with combined/base | 0 collisions | **PASS** |
| 13 | Vocabulary distractors collision test (44 items)| 0 collisions with match/target | 0 collisions | **PASS** |
| 14 | Math distractor results collision test (40 items)| 0 collisions with result number | 0 collisions | **PASS** |
| 15 | Intra-item distractor duplication check | 0 duplicate distractors in any item | 0 duplicates found | **PASS** |
| 16 | Cross-topic item ID global uniqueness (200 items)| 0 cross-topic ID collisions | 200 unique IDs verified | **PASS** |
| 17 | Level ID uniqueness across topics (20 levels) | 0 duplicate level IDs | 20 unique level IDs verified | **PASS** |
| 18 | Phonics curriculum word count & rule coverage | >=40 words, 9 teams, 5 r-controlled | 66 items, 100% coverage | **PASS** |
| 19 | "ea" dual sound split (/ē/ vs /ĕ/) | Distinct rules, 'beach' & 'bread' | 6 long, 6 short, exemplars present| **PASS** |
| 20 | Morphology affixes & base words | 12 affixes, >=30 base words | 12 affixes, 49 base words | **PASS** |
| 21 | Morphology visual segmentation format | `^.+ \+ .+ → .+$` with combinedWord | 50/50 items conform strictly | **PASS** |
| 22 | Vocabulary pairs & sentence context | >=40 pairs, sentenceContext > 15 | 44 items, rich sentences | **PASS** |
| 23 | Math arithmetic verification within 20 | Mathematically correct addition/sub | 40/40 items correct | **PASS** |
| 24 | CurriculumService runtime question generation | Options conform to CurriculumItemSchema| 100% valid questions generated | **PASS** |
| 25 | CurriculumService wraparound question generator | Generates count > pool without crash | Successfully generated 100 items | **PASS** |
| 26 | Storage mastery rule boundary (>85%, 10+ items)| Rejects 85.0% or 9 items, accepts 85.1%| Exact boundary enforced | **PASS** |
| 27 | Storage star ratings boundaries (85/90/100%) | Correctly maps 0, 1, 2, 3 stars | 100% accurate star partitions | **PASS** |
| 28 | Consecutive mistakes remediation trigger | Triggers at exactly 3 consecutive | Consecutive: 1=F, 2=F, 3=T, correct=0| **PASS** |

---

## 4. Unchallenged Areas

- **Phaser 2D Canvas & WebGL Rendering**: Interactive fruit physics, sprite drawing, and canvas collision detection are scheduled for Milestone 4 (Phaser 2D Arcade Gameplay Engine).
- **Web Audio API Hardware Playback & Web Speech Synthesizer**: Actual audio device hardware playback and browser SpeechSynthesis voices are scheduled for Milestone 3 (Audio, Remediation & Visual UI).

---

## 5. Final Verdict

**Verdict**: **APPROVE**  
The Milestone 2 curriculum datasets, Zod validation schemas, and persistence layer satisfy all requirements of `ORIGINAL_REQUEST.md`, `SPEC.md`, `STACK.md`, and `PROJECT.md`. The project is ready to advance to Milestone 3.
