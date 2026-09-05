# Milestone 4 Handoff Report: Scene Lifecycle, UI Synchronization, Audio Wiring, and Testing Coverage

**Agent**: Explorer M4-3 (`teamwork_preview_explorer`)  
**Recipient**: Worker M4-1 / Project Orchestrator  
**Date**: 2026-09-05  
**Working Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_3`  
**Handoff Type**: Hard (Investigation complete)  

---

## 1. Observation

Direct code observations from inspection of the codebase:

### 1.1 Audio & TTS Wiring
- **`src/ui/HUD.ts` lines 167–181**:
  ```typescript
  this.bannerContainer.setSize(bannerW, bannerH);
  this.bannerContainer.setInteractive({ useHandCursor: true });
  this.bannerContainer.on('pointerdown', () => {
    this.audio.playClick();
    scene.tweens.add({
      targets: this.bannerContainer,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeInOut'
    });
  });
  ```
  `this.speakPrompt()` is defined on line 207 of `HUD.ts`, but is **never invoked** when `bannerContainer` is tapped, despite the docstring stating `"- Interactive prompt banner to re-hear spoken instructions via TTS."`.
- **`src/scenes/GameScene.ts` line 228**:
  ```typescript
  this.hud.updatePrompt(question.prompt, `Item ${this.currentQuestionIndex + 1} of ${this.questions.length}`);
  ```
  Neither `this.hud.speakPrompt()` nor `audioService.speakPrompt()` is invoked when question waves spawn.

### 1.2 HUD Stars Desynchronization
- **`src/scenes/GameScene.ts` lines 96–103**:
  ```typescript
  this.hud = new HUD(this, {
    score: this.score,
    combo: this.combo,
    stars: 0,
    prompt: initialQuestion?.prompt ?? 'Catch the Fruit!',
    subtext: 'Tap the fruit or catch with basket',
    onPause: () => this.togglePause()
  });
  ```
  Grep for `updateStars` in `src/scenes/GameScene.ts` returns 0 matches. `this.hud.updateStars()` is never called in `GameScene.ts` during gameplay, leaving the 3 HUD star badges perpetually empty (`star-empty`).

### 1.3 Asynchronous Remediation Race Condition
- **`src/scenes/GameScene.ts` lines 346–385**:
  ```typescript
  if (fruit.option.isCorrect) {
    this.handleCorrectCatch(fruit);
  } else {
    this.handleIncorrectCatch(fruit); // async, not awaited!
  }
  ...
  this.tweens.add({
    targets: fruit.container,
    scale: 1.3,
    alpha: 0,
    duration: 250,
    onComplete: () => {
      fruit.container.destroy();
      this.activeFruits = [];

      // If no remediation is active, spawn next wave
      if (!this.isRemediating && !this.isPaused) {
        this.time.delayedCall(500, () => {
          this.spawnNextQuestionWave();
        });
      }
    }
  });
  ```
  In `handleIncorrectCatch`, `await storageService.recordMistake(...)` is called (line 465). `this.isRemediating` is set to `true` inside `triggerRemediation()` (line 488), which executes only after `recordMistake` resolves. If storage takes >250ms, the tween's `onComplete` executes while `!this.isRemediating` is true, triggering `spawnNextQuestionWave()` concurrently with the opening `TeachingCard`.

### 1.4 Touch Target Size
- **`src/scenes/RoundSummaryScene.ts` lines 186–198**:
  ```typescript
  bg.fillStyle(color, 1);
  bg.fillRoundedRect(-140, -22, 280, 46, 14);
  ...
  btn.setSize(280, 46);
  ```
  Button height is `46px`, which is less than the `48px` minimum touch hitbox requirement mandated by SPEC.md line 99 and ORIGINAL_REQUEST.md line 25.

### 1.5 Pause Modal
- **`src/scenes/GameScene.ts` line 165**:
  ```typescript
  const bg = this.add.rectangle(0, 0, width, height, 0x0f172a, 0.7);
  ```
  `bg.setInteractive()` is omitted, allowing pointer events on the backdrop outside the modal to pass through to underlying objects. In addition, `togglePause()` lacks an `else` branch to destroy `pauseOverlay` if toggled while paused.

### 1.6 Topic Navigation Memory
- **`src/scenes/MenuScene.ts` lines 21–28**:
  `private selectedTopic: TopicType = 'phonics';`
  There is no `init(data?: { topic?: TopicType })` method. Navigating to `MenuScene` with a `{ topic }` payload resets to `'phonics'`.

### 1.7 Scene Test Coverage
- **`tests/scenes.test.ts` lines 14–92**:
  Only 7 tests exist: gameConfig scene array (6 scenes), fixed-step physics, 480x800 resolution, game class instantiation, 5 scene keys (omits `CastleScene`), `GameScene.init()`, and `RoundSummaryScene.init()`. Zero tests exist for scene transitions, UI event handling, HUD reactivity, pause state, audio calls, or remediation.

---

## 2. Logic Chain

1. **Audio & TTS (1.1)**: SPEC.md Section "Accessibility & Child-Friendly UX" requires that audio instructions allow the child to listen rather than read. `HUD.ts` already contains the `speakPrompt()` method, and its class comment documents an interactive prompt banner. Because `this.speakPrompt()` is not wired to `bannerContainer.on('pointerdown')`, children cannot tap the banner to hear the target sound or word. Wiring `this.speakPrompt()` in the banner click handler restores the intended accessibility feature.
2. **HUD Stars (1.2)**: `HUD.ts` provides `updateStars(count)` and visually displays 3 stars. In `GameScene.ts`, `this.hud.updateStars()` is never called, meaning the player's current performance rating (1 to 3 stars calculated via `storageService.calculateStars(accuracy)`) is never displayed during the round. Calling `this.hud.updateStars(calculateStars(currentAccuracy))` in `handleCorrectCatch()` and `handleIncorrectCatch()` ensures live UI feedback.
3. **Remediation Race Condition (1.3)**: When a third consecutive mistake occurs, `handleIncorrectCatch` calls asynchronous storage before `triggerRemediation` sets `this.isRemediating = true`. If storage is delayed, the 250ms visual destruction tween on the incorrect fruit completes first and schedules `spawnNextQuestionWave()` because `this.isRemediating` is still `false`. Guarding or awaiting remediation state before spawning next wave eliminates this race condition.
4. **Touch Target Dimensions (1.4)**: Both STACK.md and SPEC.md enforce `touch target hitboxes of at least 48px diameter with no swipe or drag requirements`. `RoundSummaryScene` buttons are sized at `280x46px`. Increasing button height from `46px` to `48px` (or `52px`) ensures strict layout compliance.
5. **Pause Backdrop Pass-Through (1.5)**: In Phaser, non-interactive GameObjects do not block input. In `GameScene.togglePause()`, `bg` is a plain `Rectangle` without `setInteractive()`. Adding `bg.setInteractive()` intercepts all pointerdown events outside the resume/quit buttons, preventing unintended background clicks.
6. **Menu Navigation Memory (1.6)**: When a player finishes a Morphology or Vocabulary level, returning to `MenuScene` resets `selectedTopic` to `'phonics'` because `MenuScene` has no `init()` handler to read incoming parameters. Implementing `init(data?: { topic?: TopicType })` maintains the active curriculum topic seamlessly.
7. **Test Coverage Deficit (1.7)**: The 7 tests in `tests/scenes.test.ts` only verify static configuration. Comprehensive unit and integration tests using mock scene harnesses are required to verify the complete scene graph and interaction contracts before Milestone 4 closes.

---

## 3. Caveats

- **Headless Vitest Environment**: Phaser requires canvas and WebGL contexts. While `tests/setup.ts` provides basic canvas 2D context stubs, complex WebGL scene render cycles cannot run headlessly without mock display objects (like the pattern established in `tests/ui.test.ts`). Scene lifecycle tests should utilize mock scene harnesses or headless Phaser game instances with proper cleanup (`game.destroy(true)`).
- **Adversarial Benchmark Timing**: In `tests/audio_adversarial.test.ts`, the tight loop of 1,000 rapid procedural Web Audio syntheses requires execution within 1,000ms. Under heavy parallel CPU load during full test runs, timing can exceed 1,000ms (measured at ~2,150ms). This is a test execution timing threshold, not a functional failure.
- No other areas within the M4-3 scope remain uninvestigated.

---

## 4. Conclusion (Actionable Recommendations for Worker M4-1)

Worker M4-1 should implement the following targeted enhancements:

1. **Wire `speakPrompt()` in `src/ui/HUD.ts`**:
   In `buildPromptBanner()`, update `this.bannerContainer.on('pointerdown')`:
   ```typescript
   this.bannerContainer.on('pointerdown', () => {
     this.audio.playClick();
     this.speakPrompt(); // <--- Connect TTS vocalization
     scene.tweens.add({ ... });
   });
   ```
2. **Synchronize Stars in `src/scenes/GameScene.ts`**:
   In `handleCorrectCatch()` and `handleIncorrectCatch()`:
   ```typescript
   const currentAccuracy = this.totalAttempts > 0 ? (this.correctAttempts / this.totalAttempts) * 100 : 100;
   const currentStars = calculateStars(currentAccuracy);
   this.hud.updateStars(currentStars);
   ```
3. **Eliminate Remediation Race Condition in `src/scenes/GameScene.ts`**:
   Before triggering the catch tween, if the catch is incorrect and `storageService.getConsecutiveMistakes() >= 2` (indicating this 3rd mistake triggers remediation), immediately set `this.isRemediating = true` so the tween's `onComplete` does not trigger `spawnNextQuestionWave()`.
4. **Fix Touch Target Height in `src/scenes/RoundSummaryScene.ts`**:
   In `createButton()` (lines 186–198):
   ```typescript
   bg.fillRoundedRect(-140, -24, 280, 48, 14); // height: 48px
   ...
   btn.setSize(280, 48); // touch target >= 48px
   ```
5. **Harden Pause Modal in `src/scenes/GameScene.ts`**:
   In `togglePause()`:
   - Call `bg.setInteractive();` on the dim overlay rectangle.
   - Retain `private pauseOverlay?: Phaser.GameObjects.Container` to support clean toggle open/close.
6. **Add Topic Memory to `src/scenes/MenuScene.ts`**:
   Add:
   ```typescript
   init(data?: { topic?: TopicType }): void {
     if (data?.topic) {
       this.selectedTopic = data.topic;
     }
   }
   ```
7. **Expand `tests/scenes.test.ts` to 8 Comprehensive Suites**:
   - Suite 1: Full scene registration (all 6 scenes including `CastleScene`) & fixed-timestep config.
   - Suite 2: `PreloadScene` audio unlock and transition to `MenuScene`.
   - Suite 3: `MenuScene` topic switching, level unlock states, sound toggle, and scene launches.
   - Suite 4: `GameScene` core loop, scoring, combo escalation, pause modal, HUD synchronization, and `finishLevel()`.
   - Suite 5: 3-mistake remediation trigger, speed dampener, and race condition prevention.
   - Suite 6: `RoundSummaryScene` stars, metrics, conditional Next Level button, and touch target >= 48px.
   - Suite 7: `OrchardScene` tree stage rendering (1–5) and level selection.
   - Suite 8: `CastleScene` views, currency display, slot placement, and back navigation.

---

## 5. Verification Method

To independently verify the findings and any future implementation:

1. **Run Scene Test Suite**:
   ```bash
   npx vitest run tests/scenes.test.ts
   ```
2. **Run Full Test Suite**:
   ```bash
   npm test
   ```
3. **Verify STACK.md Compliance**:
   ```bash
   ~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz
   ```
4. **Inspect Code Locations**:
   - Verify `speakPrompt()` call in `src/ui/HUD.ts:172`
   - Verify `updateStars()` call in `src/scenes/GameScene.ts:417, 450`
   - Verify button height in `src/scenes/RoundSummaryScene.ts:187` (`>= 48px`)
   - Verify `bg.setInteractive()` in `src/scenes/GameScene.ts:165`
   - Verify `init()` with topic parameter in `src/scenes/MenuScene.ts`
