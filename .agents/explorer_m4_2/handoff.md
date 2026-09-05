# Handoff Report: Curriculum Integration & Pedagogical Game Loop (Milestone 4)

**From**: Explorer M4-2 (`teamwork_preview_explorer`)  
**To**: Worker M4-1 & Project Orchestrator Gen 2 (`orchestrator_2` / `9591c55b-9b3f-4dd3-b935-d2ded5431e5a`)  
**Date**: 2026-09-05T15:44:00Z  
**Working Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_2`  
**Handoff Type**: Hard Handoff  

---

## 1. Observation

Direct observations from inspection of the codebase and test execution:

1. **Phonics & "ea" Split**:
   - In `data/phonics.json` (lines 20-33), Phonics Level 2 specifically targets `["ea_long_e", "ea_short_e"]`. Long E items (e.g. `beach`, line 188) list short E words as distractors (`["bread", "head"]`), and short E items (e.g. `bread`, line 254) list long E words as distractors (`["beach", "peach"]`).
   - In `src/services/curriculum.service.ts` (lines 187-193), `createQuestion` explicitly overrides the prompt for `ea_long_e` ("Catch words where 'ea' says /ē/ like beach!") and `ea_short_e` ("Catch the trickster word where 'ea' says /ĕ/ like bread!"), forcing sound discrimination.

2. **Morphology & Visual Segmentation**:
   - In `data/morphology.json` (lines 78-85), items provide `visualSegmentation: "re + play → replay"`.
   - In `src/services/curriculum.service.ts` (line 235), `createQuestion` sets `prompt = 'Catch: ' + item.visualSegmentation`.
   - In `src/ui/TeachingCard.ts` (lines 151-174), `TeachingCard` contains a dedicated UI container to render `config.segmentation`.
   - In `src/scenes/GameScene.ts` (lines 494-508), `triggerRemediation` instantiates `TeachingCard` WITHOUT passing `segmentation`:
     ```typescript
     new TeachingCard(this, {
       word: fruit.question.targetAnswer,
       pattern: fruit.question.subTopic,
       explanation: fruit.question.explanation ?? `Remember: look for the '${fruit.question.subTopic}' pattern!`,
       ruleTitle: `Let's Review: ${fruit.question.subTopic}`,
       topic: this.topic,
       autoSpeak: false,
       onResume: () => { ... }
     });
     ```
   - In `src/scenes/GameScene.ts` (lines 418-422), `handleCorrectCatch` displays `explanation`, but does not display `visualSegmentation`.

3. **Remediation TTS Auto-Vocalization**:
   - In `src/scenes/GameScene.ts` (line 500), `TeachingCard` is configured with `autoSpeak: false`.
   - In `src/services/audio.service.ts` (lines 511-567), `speakPrompt` provides speech synthesis with Grade 2 rate (0.9x) and phonetics normalization (`normalizePhoneticsForSpeech`), but it is not invoked automatically on remediation.

4. **Mastery Gate Discrepancy**:
   - In `src/services/storage.service.ts` (lines 55-58), `isMasteryAchieved` requires:
     ```typescript
     export function isMasteryAchieved(accuracy: number, attemptsCount: number): boolean {
       const norm = accuracy > 1 ? accuracy / 100 : accuracy;
       return attemptsCount >= 10 && norm > 0.85;
     }
     ```
   - In `src/scenes/GameScene.ts` (lines 673-682), `finishLevel` uses:
     ```typescript
     const result = await storageService.saveLevelResult(
       this.topic,
       this.levelNumber,
       accuracy,
       this.score,
       this.totalAttempts
     );
     const stars = result.stars;
     const isMastered = accuracy >= 85 || result.unlockedNextLevel;
     ```
     `accuracy >= 85` ignores `this.totalAttempts` and permits mastery at exactly 85.0%, leading to situations where `RoundSummaryScene` marks a level as mastered even when `storageService` refused to unlock the next level.

5. **Async Race Condition on Mistake 3 Remediation**:
   - In `src/scenes/GameScene.ts` (lines 341-385), `catchFruit` calls un-awaited `this.handleIncorrectCatch(fruit)`.
   - `catchFruit` starts a 250ms visual exit tween on `fruit.container`.
   - In `handleIncorrectCatch` (line 465), `await storageService.recordMistake(...)` queries IndexedDB.
   - If IDB takes >250ms, the tween finishes while `this.isRemediating` is still `false`, scheduling `spawnNextQuestionWave()` via `time.delayedCall(500, ...)`.
   - When `recordMistake` subsequently resolves and opens `TeachingCard`, the scheduled timer is still running and fires during remediation, resulting in stacked waves.

6. **HUD Star & Audio Inactivity**:
   - In `src/scenes/GameScene.ts`, `this.hud.updateStars` is never called.
   - In `src/ui/HUD.ts` (lines 169-180), tapping `bannerContainer` only performs an animation and plays a click tone; it never calls `this.speakPrompt()`.

---

## 2. Logic Chain

1. *From Observation 1*: The phonics dataset and `CurriculumService` correctly enforce discrimination between long /ē/ and short /ĕ/ for "ea" by generating questions with distractors from the opposing sound.
2. *From Observation 2*: Visual morphological segmentation (`re + play → replay`) is an explicit core requirement in SPEC.md (R1, R3) and is supported in `TeachingCard.ts`. Because `GameScene.ts` fails to look up and supply `segmentation` to `TeachingCard` and fails to show it in `handleCorrectCatch`, this pedagogical feature is currently hidden from the learner.
3. *From Observation 3*: SPEC.md specifies "No reading required to play the game itself — audio instructions say what to catch." A child experiencing 3 consecutive mistakes needs auditory guidance. Setting `autoSpeak: false` in `TeachingCard` directly impedes accessibility for struggling 2nd graders.
4. *From Observation 4*: `isMasteryAchieved` in `storageService.ts` strictly requires `accuracy > 0.85` and `attemptsCount >= 10`. Because `GameScene.ts` computes `isMastered = accuracy >= 85 || result.unlockedNextLevel`, if a player completes 8 items with 100% accuracy, `GameScene` declares mastery while `StorageService` denies level unlock. This produces an inconsistent UI where `RoundSummaryScene` shows the "NEXT LEVEL ▶" button, but the level is locked in storage.
5. *From Observation 5*: Because `catchFruit` initiates a synchronous 250ms tween without awaiting `handleIncorrectCatch`, an async delay in `recordMistake` causes the tween completion callback to evaluate `!this.isRemediating` as true. This schedules an unwanted wave spawn that overlaps with the `TeachingCard` modal.
6. *From Observation 6*: Star ratings and spoken prompts are key UX features defined in SPEC.md. Omitting `updateStars` leaves the HUD displaying 0 stars indefinitely, and omitting `speakPrompt()` in the banner click listener disables auditory re-prompts.

---

## 3. Caveats

1. **Phaser Canvas Display in Headless CI**: In headless test environments (Vitest with `Phaser.HEADLESS`), tween callbacks and timer events depend on mock clocks or explicit manual ticker updates. Unit tests for timing race conditions must mock or control `Phaser.Time.Clock`.
2. **Audio Autoplay Policies**: Mobile browsers require user interaction before `AudioContext` and `speechSynthesis` can output sound. `AudioService` provides first-touch unlock listeners, but TTS in automated test suites should be asserted against mock calls.
3. **Vitest Parallel Test Timing**: Dynamic module imports inside test bodies (such as `await import('../src/schema/progress.schema')` in `tests/curriculum_adversarial.test.ts:514`) can hit Vitest's 5s timeout under heavy parallel load. Moving imports to static top-level imports resolves this without functional impact.

---

## 4. Conclusion & Actionable Recommendations for Worker M4-1

To complete Milestone 4 with full pedagogical and architectural integrity, Worker M4-1 should implement the following targeted modifications:

### Recommendation 1: Fix Async Race Condition in `GameScene.ts`
- Maintain a reference to active wave spawn timers:
  ```typescript
  private waveSpawnTimer?: Phaser.Time.TimerEvent;
  ```
- In `triggerRemediation()`:
  ```typescript
  if (this.waveSpawnTimer) {
    this.waveSpawnTimer.remove();
    this.waveSpawnTimer = undefined;
  }
  ```
- When scheduling wave spawns in `catchFruit` and `update`, assign to `this.waveSpawnTimer`:
  ```typescript
  this.waveSpawnTimer = this.time.delayedCall(500, () => {
    this.spawnNextQuestionWave();
  });
  ```

### Recommendation 2: Pass Morphological Segmentation to `TeachingCard`
- In `GameScene.triggerRemediation`:
  ```typescript
  const rawItem = curriculumService.getItemById(fruit.question.id);
  const segmentation = rawItem && 'visualSegmentation' in rawItem ? rawItem.visualSegmentation : undefined;

  new TeachingCard(this, {
    word: fruit.question.targetAnswer,
    pattern: fruit.question.subTopic,
    explanation: fruit.question.explanation ?? `Remember: look for the '${fruit.question.subTopic}' pattern!`,
    ruleTitle: `Let's Review: ${fruit.question.subTopic}`,
    segmentation,
    topic: this.topic,
    autoSpeak: audioService.isTtsEnabled(),
    onResume: () => { ... }
  });
  ```

### Recommendation 3: Display Visual Segmentation on Correct Catch
- In `GameScene.handleCorrectCatch`:
  ```typescript
  const rawItem = curriculumService.getItemById(fruit.question.id);
  if (this.topic === 'morphology' && rawItem && 'visualSegmentation' in rawItem) {
    this.showFeedbackToast(`✨ ${rawItem.visualSegmentation}`, '#10b981');
  } else {
    const explanation = fruit.option.explanation || fruit.question.explanation;
    if (explanation) {
      this.showFeedbackToast(explanation, '#10b981');
    }
  }
  ```

### Recommendation 4: Align Mastery Evaluation in `GameScene.finishLevel`
- Import `isMasteryAchieved` from `../services/storage.service`.
- In `finishLevel`:
  ```typescript
  const isMastered = isMasteryAchieved(accuracy, this.totalAttempts) || result.unlockedNextLevel;
  ```
- Ensure `this.totalAttempts` is clamped when saving:
  ```typescript
  const result = await storageService.saveLevelResult(
    this.topic,
    this.levelNumber,
    accuracy,
    this.score,
    Math.max(1, this.totalAttempts)
  );
  ```

### Recommendation 5: Synchronize HUD Stars & Enable Prompt Banner Speech
- In `GameScene.create()`, initialize HUD stars from saved progress:
  ```typescript
  storageService.getProgress().then(progress => {
    const levelStars = progress.stars[`${this.topic}_${this.levelNumber}`] ?? 0;
    this.hud.updateStars(levelStars);
  });
  ```
- In `HUD.ts` (line 170):
  ```typescript
  this.bannerContainer.on('pointerdown', () => {
    this.audio.playClick();
    this.speakPrompt();
    // ... animation ...
  });
  ```

---

## 5. Verification Method

1. **Curriculum & Dataset Tests**:
   - Run `npx vitest run tests/curriculum.test.ts` — verify all 200 items, all 12 affixes, and the "ea" split pass validation.
2. **Mastery & Progression Boundary Tests**:
   - Run `npx vitest run tests/progression.test.ts` — verify 85.0% accuracy does NOT unlock next level, >85% does unlock, and 9 attempts fails unlock.
3. **Remediation Integration Tests**:
   - Verify `tests/storage.test.ts` and `tests/ui.test.ts` for consecutive mistake streak handling and teaching card display.
4. **Full Test Suite Execution**:
   - Run `npm test` across all suites ensuring 0 failures.
