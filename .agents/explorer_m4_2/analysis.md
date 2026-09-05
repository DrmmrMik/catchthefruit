# Technical Analysis: Curriculum Integration and Pedagogical Game Loop (Milestone 4)

**Explorer**: Explorer M4-2 (`teamwork_preview_explorer`)  
**Date**: 2026-09-05  
**Working Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_2`  
**Parent**: Project Orchestrator (`9591c55b-9b3f-4dd3-b935-d2ded5431e5a`)  

---

## 1. Executive Summary

This investigation examines the curriculum integration, question/distractor generation, scoring and combo dynamics, mastery evaluation, and the 3-mistake consecutive remediation loop across `CurriculumService`, `StorageService`, `AudioService`, `GameScene`, `TeachingCard`, and `HUD`.

Overall, the foundational data structures and services built in Milestone 2 and 3 are robust:
- Zod runtime validation ensures schema integrity for all 4 curriculum domains (Phonics, Morphology, Vocabulary, Math) across 200 items and 20 levels.
- `StorageService` provides purely local IndexedDB persistence with verified monotonicity for stars, high scores, and error tracking.
- `AudioService` features sophisticated phonetics normalization for TTS and procedural Web Audio synthesis.

However, several critical pedagogical integrations, synchronization gaps, and async race conditions exist in `GameScene.ts` and `HUD.ts` that Worker M4-1 must resolve:
1. **Remediation Race Condition**: `catchFruit` launches a 250ms visual exit tween before `handleIncorrectCatch` (an async IDB operation) resolves. When remediation triggers on mistake 3, a duplicate wave can be scheduled before the `TeachingCard` appears, resulting in stacked waves upon dismissal.
2. **Missing Morphological Segmentation in Remediation & Catch**: While `TeachingCard` supports rendering visual segmentation (`re + play → replay`), `GameScene.triggerRemediation` fails to pass `segmentation` to `TeachingCard`. Furthermore, `GameScene.handleCorrectCatch` does not display visual segmentation.
3. **TTS Auto-Vocalization Disabled**: `GameScene` instantiates `TeachingCard` with `autoSpeak: false`, leaving struggling 2nd graders to read dense text without auditory support.
4. **Mastery Check Discrepancy**: In `GameScene.finishLevel`, `const isMastered = accuracy >= 85 || result.unlockedNextLevel` permits mastery at exactly 85.0% and ignores the 10+ attempts requirement, diverging from `isMasteryAchieved` (>85% and >=10 attempts).
5. **HUD Synchronization Gaps**: HUD stars are initialized to 0 and never updated during gameplay. In addition, tapping the HUD prompt banner does not trigger `speakPrompt()`.

---

## 2. Curriculum Integration & Question / Distractor Generation

### 2.1 Topic A: Phonics (Vowel Teams & R-Controlled Vowels)
- **Dataset**: `data/phonics.json` contains 58 words covering 9 vowel teams (`ai`, `ay`, `ea_long_e`, `ea_short_e`, `ee`, `ie`, `oa`, `oe`, `ui`, `ue`) and 5 r-controlled vowels (`ar`, `er`, `ir`, `or`, `ur`).
- **The "ea" Trickster Split**:
  - `ea_long_e` items (e.g. *beach*, *teach*, *leaf*, *dream*, *clean*, *peach*) have sound `/ē/` and distractors from short E words (*bread*, *head*, *sweat*, *heavy*, *spread*).
  - `ea_short_e` items (e.g. *bread*, *head*, *thread*, *sweat*, *spread*, *heavy*) have sound `/ĕ/` and distractors from long E words (*beach*, *peach*, *teach*, *clean*).
  - **Educational Impact**: Because both target and distractors share the identical letter pairing `"ea"`, the child cannot guess by visual letter matching alone; they must decode the phonetic sound.
- **Generation Logic (`CurriculumService.createQuestion`)**:
  - In `src/services/curriculum.service.ts` (lines 187-197):
    ```typescript
    if (item.ruleName === 'ea_long_e') {
      prompt = "Catch words where 'ea' says /ē/ like beach!";
      spokenPrompt = prompt;
    } else if (item.ruleName === 'ea_short_e') {
      prompt = "Catch the trickster word where 'ea' says /ĕ/ like bread!";
      spokenPrompt = prompt;
    }
    ```
  - For distractors, `distractorExplanation` attempts to look up the distractor word in `phonics.json` so the corrective card or toast can explain why that specific word was wrong.

### 2.2 Topic B: Morphology (Prefixes & Suffixes)
- **Dataset**: `data/morphology.json` contains 50 items covering 12 affixes across 49 distinct base words.
  - Prefixes: `re-` (again), `un-` (not/opposite), `dis-` (not/opposite of), `pre-` (before).
  - Suffixes: `-s / -es` (more than one), `-ed` (past tense), `-ing` (happening now), `-er` (one who/more), `-est` (most), `-ful` (full of), `-less` (without), `-ly` (how).
- **Visual Segmentation**:
  - Every item contains `visualSegmentation: "re + play → replay"`.
  - In `createQuestion`:
    - `prompt = "Catch: " + item.visualSegmentation;`
    - `spokenPrompt = "Catch " + item.combinedWord + "!";`
  - In `AudioService`, `normalizePhoneticsForSpeech` translates `"re + play → replay"` to `"R E plus play makes replay"`.
- **Gap Identified**:
  - In `GameScene.ts` (lines 418-422), on correct catch:
    ```typescript
    const explanation = fruit.option.explanation || fruit.question.explanation;
    if (explanation) {
      this.showFeedbackToast(explanation, '#10b981');
    }
    ```
    This displays the textual explanation (e.g. `"'re-' means again: replay means play again!"`), but misses displaying the visual morphological segmentation (`re + play → replay`) as required by SPEC R1 and Acceptance Criteria.

### 2.3 Topic C: Vocabulary (Synonyms & Antonyms)
- **Dataset**: `data/vocabulary.json` contains 44 items (22 synonyms, 22 antonyms).
- **Pedagogical Distractors**:
  - For synonym questions (target: *big*, match: *large*), distractors are the antonyms (*tiny*, *small*).
  - For antonym questions (target: *big*, match: *small*), distractors are the synonyms (*large*, *huge*).
- **Contextualization**:
  - `prompt = Catch the word that means the SAME as "big"!`
  - `spokenPrompt = Catch the word that means the SAME as big! The big elephant was so large!`
  - Sentence context enriches semantic learning in compliance with SPEC line 182.

---

## 3. Scoring, Combo Mechanics, Round Completion & Mastery

### 3.1 Scoring & Combo Formula
- **Correct Catch**:
  - `combo++`
  - Score increment: `points = 100 * Math.min(combo, 5)` (100, 200, 300, 400, 500 max).
  - Coin gain: `10 + Math.min(combo * 2, 20)` coins.
  - Audio: `playCatch(combo >= 3)` triggers bonus 4-note ascending arpeggio; `playCombo(combo)` triggers pentatonic frequency escalation.
- **Incorrect Catch**:
  - `combo = 0`
  - Score deduction: `score = Math.max(0, score - 25)`
  - Audio: `playMiss()` (gentle descending glide 260Hz → 175Hz).
  - Screen shake: `shake(200, 0.008)`.
  - Visual: Red X mark animation (`x-mark`).
- **Missed Correct Fruit (Offscreen)**:
  - `combo = 0`
  - Score is NOT penalized (as per SPEC: "let it fall off screen = item not counted").
  - Gentle reminder toast: `Missed: "${fruit.option.text}" (${fruit.question.subTopic})`.

### 3.2 Round Structure
- Rounds generate 12 question waves (`generateQuestionSet(this.topic, this.levelNumber, 12)`).
- Each wave spawns 1 target fruit and 1-2 distractor fruits across horizontal lanes.
- When any fruit is caught, other fruits in that wave are immediately locked out and faded, ensuring exactly 1 attempt per wave.
- After all 12 items have passed, `finishLevel()` is invoked.

### 3.3 Star Ratings (1-3 Stars)
- Calculated by `calculateStars(accuracy)` in `StorageService`:
  - **3 Stars**: 100% accuracy (`norm >= 1.0`).
  - **2 Stars**: >= 90% accuracy (`norm >= 0.90`).
  - **1 Star**: >= 85% accuracy (`norm >= 0.85`).
  - **0 Stars**: < 85% accuracy.
- **Gap Identified**:
  - `GameScene.ts` never invokes `this.hud.updateStars(...)`.
  - The HUD stars remain at 0 throughout the gameplay scene.

### 3.4 Mastery Evaluation Discrepancy
- **Mastery Rule in `StorageService` (`isMasteryAchieved`)**:
  ```typescript
  export function isMasteryAchieved(accuracy: number, attemptsCount: number): boolean {
    const norm = accuracy > 1 ? accuracy / 100 : accuracy;
    return attemptsCount >= 10 && norm > 0.85;
  }
  ```
  Strictly requires:
  1. `attemptsCount >= 10`
  2. `accuracy > 85%` (e.g. 85.1%, 9/10 = 90%).
- **Implementation in `GameScene.finishLevel` (lines 681-682)**:
  ```typescript
  const stars = result.stars;
  const isMastered = accuracy >= 85 || result.unlockedNextLevel;
  ```
- **The Inconsistency**:
  1. If a player catches 8 out of 8 items (100% accuracy, but only 8 attempts because 4 fell off screen):
     - `storageService.saveLevelResult` evaluates `mastery = false` (attempts < 10), so `result.unlockedNextLevel = false`.
     - But `GameScene` evaluates `accuracy >= 85` (`100 >= 85`) as `true`, marking `isMastered = true`.
     - `RoundSummaryScene` displays "🎉 LEVEL MASTERED! 🎉" and renders a "NEXT LEVEL ▶" button, even though level progression remains locked in storage!
  2. At exactly 85.0% (e.g. 17/20 items), `isMasteryAchieved` returns `false` (SPEC requires `>85%`), but `accuracy >= 85` evaluates to `true`.
- **Recommendation**:
  In `GameScene.finishLevel`, compute `isMastered` strictly using:
  ```typescript
  const isMastered = isMasteryAchieved(accuracy, this.totalAttempts) || result.unlockedNextLevel;
  ```

---

## 4. The 3-Mistake Consecutive Remediation Loop

### 4.1 Trigger & State Flow
1. Player catches an incorrect fruit.
2. `handleIncorrectCatch` logs the error via `storageService.recordMistake(topic, pattern, word)`.
3. `StorageService` increments `errorStats.consecutiveMistakes`.
4. When `consecutiveMistakes >= 3`, `mistakeResult.shouldTriggerRemediation` is `true`.
5. `GameScene.triggerRemediation(fruit)` is invoked.

### 4.2 Speed Dampening
- Fall duration is increased by 800ms:
  `this.fallDurationMs = Math.min(8000, this.fallDurationMs + 800);`
- Slower fall speed gives the child more time to read and decode incoming words on subsequent waves.

### 4.3 TeachingCard Presentation & Gaps
- `TeachingCard.ts` provides:
  - Darkened backdrop overlay blocking input (`depth: 1000`).
  - High-contrast Lexend card panel (410x490px).
  - Target word badge.
  - Optional visual segmentation box (`segmentationText`).
  - Explanation body.
  - "🔊 Hear Rule" button (150x48px touch target).
  - "I Got It! Let's Play" resume button (240x54px touch target).
  - Dismissal logic: stops TTS, resets consecutive mistakes in storage (`storage.resetConsecutiveMistakes()`), and invokes `onResume()`.

- **Gap A: Missing Segmentation in Remediation**:
  - `TeachingCard` has a dedicated, beautiful amber container for `config.segmentation` (lines 151-174).
  - But `GameScene.triggerRemediation` does NOT pass `segmentation`:
    ```typescript
    new TeachingCard(this, {
      word: fruit.question.targetAnswer,
      pattern: fruit.question.subTopic,
      explanation: fruit.question.explanation ?? `Remember: look for the '${fruit.question.subTopic}' pattern!`,
      ruleTitle: `Let's Review: ${fruit.question.subTopic}`,
      topic: this.topic,
      autoSpeak: false, // <-- GAP B
      onResume: () => { ... }
    });
    ```
  - For morphology questions, `segmentation` is completely blank.

- **Gap B: `autoSpeak` is Disabled (`autoSpeak: false`)**:
  - SPEC R3 & Teaching Methodology 5: "No reading required to play the game itself — audio instructions (recorded voice or TTS) say what to catch."
  - When remediation triggers after 3 failures, the child is likely frustrated and needs auditory instruction.
  - Disabling `autoSpeak` forces the child to read the card manually or notice the small "Hear Rule" button.
  - `autoSpeak` should be set to `true` (or `audioService.isTtsEnabled()`).

---

## 5. Identified Edge Cases & Race Conditions

### 5.1 Async Race Condition: Double Wave Spawning on Mistake 3
- **Mechanism**:
  1. User catches wrong fruit.
  2. `catchFruit` starts:
     - It calls `this.handleIncorrectCatch(fruit);` without awaiting it.
     - It immediately starts a 250ms scale-down tween on `fruit.container`.
  3. `handleIncorrectCatch` is async:
     - It performs `await storageService.recordMistake(...)`, which queries IndexedDB.
  4. If IDB takes >250ms (common on mobile or initial DB open):
     - The 250ms tween completes first!
     - In tween `onComplete`:
       ```typescript
       if (!this.isRemediating && !this.isPaused) {
         this.time.delayedCall(500, () => {
           this.spawnNextQuestionWave();
         });
       }
       ```
       Because `recordMistake` hasn't resolved yet, `this.isRemediating` is still `false`!
       A new wave is scheduled for 500ms in the future.
     - 50ms later, `recordMistake` finishes and calls `this.triggerRemediation(fruit)`.
     - `TeachingCard` opens and `this.isRemediating = true`.
     - 450ms later, the previously scheduled wave timer fires while the TeachingCard is open!
     - When the player dismisses `TeachingCard`, `onResume` schedules ANOTHER wave!
- **Consequence**: Two waves fall at the same time; question indices desynchronize; game state corrupts.
- **Resolution**:
  Store pending wave spawn timers in a class field (`private waveTimer?: Phaser.Time.TimerEvent`) and explicitly cancel it (`if (this.waveTimer) this.waveTimer.remove()`) whenever entering remediation or pause. Alternatively, track a synchronous in-memory streak count to set `this.isRemediating = true` immediately in `catchFruit`.

### 5.2 HUD Prompt Banner Tap Does Not Speak
- In `HUD.ts` (lines 169-180):
  ```typescript
  this.bannerContainer.on('pointerdown', () => {
    this.audio.playClick();
    scene.tweens.add({ ... });
  });
  ```
  `HUD` has `public speakPrompt(): void` at line 207, but the `pointerdown` listener never calls it!
  Tapping the prompt banner should call `this.speakPrompt()`.

### 5.3 Zero Total Attempts Edge Case in `finishLevel`
- If a player lets all 12 fruits fall without tapping or catching:
  `this.totalAttempts = 0`.
  In `finishLevel`:
  `const accuracy = this.totalAttempts > 0 ? (this.correctAttempts / this.totalAttempts) * 100 : 0;`
  `storageService.saveLevelResult(this.topic, this.levelNumber, accuracy, this.score, this.totalAttempts);`
  If `this.totalAttempts === 0` is passed to `saveLevelResult`:
  `LevelResultSchema` requires `attemptsCount: z.number().int().min(1)`.
  Passing 0 risks runtime Zod validation rejection if `saveLevelResult` does not clamp to 1.
- **Resolution**:
  Pass `Math.max(1, this.totalAttempts)` to `saveLevelResult`.

### 5.4 Test Timeout in `tests/curriculum_adversarial.test.ts`
- In `tests/curriculum_adversarial.test.ts` line 514:
  `it('rejects out-of-range volume and invalid settings in SettingsSchema', async () => { ... })`
  This test uses dynamic `await import('../src/schema/progress.schema')`.
  Under heavy Vitest parallel test load following the python oracle execution in Suite 1, this dynamic import hit the 5000ms Vitest timeout.
- Converting to static imports at top of file avoids this dynamic import delay.

---

## 6. Matrix of Findings & Recommendations

| # | Subsystem | Issue Observed | Severity | Recommended Fix |
|---|-----------|----------------|----------|-----------------|
| 1 | `GameScene` | Async race condition in `catchFruit` vs `recordMistake` causing double wave spawns on remediation | High | Add `waveTimer?: Phaser.Time.TimerEvent` and cancel it in `triggerRemediation()` |
| 2 | `GameScene` / `TeachingCard` | Morphological segmentation (`re + play → replay`) not passed to `TeachingCard` | Medium | Look up raw item from `curriculumService.getItemById(fruit.question.id)` and pass `segmentation` |
| 3 | `GameScene` | `autoSpeak: false` in `TeachingCard` instantiation | Medium | Set `autoSpeak: true` (or `audioService.isTtsEnabled()`) |
| 4 | `GameScene` | Visual morphological segmentation not shown on correct catch | Medium | Show `item.visualSegmentation` in positive feedback toast/banner on morphology correct catch |
| 5 | `GameScene` | Inconsistent mastery evaluation in `finishLevel` (`accuracy >= 85` vs `isMasteryAchieved`) | High | Use `isMasteryAchieved(accuracy, this.totalAttempts)` |
| 6 | `GameScene` | HUD star counter is never updated during gameplay | Low | Update HUD stars in `create()` and dynamically as attempts accumulate |
| 7 | `HUD` | Tapping prompt banner does not trigger TTS vocalization | Medium | Call `this.speakPrompt()` inside `bannerContainer.on('pointerdown')` |
| 8 | `GameScene` | `totalAttempts = 0` passed to `saveLevelResult` | Low | Clamp with `Math.max(1, this.totalAttempts)` |

