# Tier 5 Adversarial Coverage Hardening (UI & Scenes) — Handoff Report

## 1. Observation
- Target components examined:
  - `src/scenes/GameScene.ts` (lines 41-43, 142-166, 195-265, 343-350, 411-460, 570-601):
    - Clamping logic: `Phaser.Math.Clamp(dragX, 55, width - 55)` and pointer bounds checking `pointer.y > height - 140`.
    - Pause overlay lifecycle: `this.pauseOverlay = this.add.container(...).setName('pauseOverlay').setDepth(800)`.
    - Catch lockout logic: `fruit.isCaught = true` and `other.isCaught = true; other.container.disableInteractive()`.
    - Remediation trigger: `this.isRemediating = true` and wave timer cancellation.
  - `src/scenes/CastleScene.ts` (lines 32-46, 166-180, 182-294, 763-845):
    - Room switching: `switchView('outside' | 'inside')` with slot rebuilds.
    - Extreme boundary slots: `garden_left` (x=95), `garden_right` (x=445), `wall` (x=80), `seating` (x=435), `chandelier` (y=135).
    - Purchasing concurrency guard: `if (this.isActionInProgress) return; this.isActionInProgress = true;`.
  - `src/scenes/MenuScene.ts` (lines 30-34, 133-170, 172-286):
    - Selected topic parameter preservation and level card sizing (400x90px).
  - `src/scenes/OrchardScene.ts` (lines 16-33):
    - Scene parameter forwarding to `OrchardView`.
  - `src/scenes/RoundSummaryScene.ts` (lines 23-26, 137-181):
    - Navigation transitions: next level (with Level 5 boundary omit check), replay, castle, orchard, and main menu.
  - `src/ui/HUD.ts` (lines 71-129, 291-297):
    - Touch targets: pause button (64x64px), sound button (64x64px), prompt banner (450x64px).
  - `src/ui/TeachingCard.ts` (lines 218-251, 267-289):
    - Re-entrance protection: `if (this.isDismissed) return; this.isDismissed = true;`.
    - Touch targets: resume button (240x54px), listen button (150x48px).
    - Audio stop execution: `this.audio.stopSpeaking()`.
  - `src/ui/OrchardView.ts` (lines 118-129, 179-204, 285-353):
    - Touch targets: home button (64x64px), topic tabs (99x48px), level cards (430x72px).
  - `src/ui/LevelIntroModal.ts` (lines 211-244):
    - Touch target: start button (240x56px).
- Test execution output:
  - `npx vitest run tests/tier5_scenes_adversarial.test.ts`:
    ```
    Test Files  1 passed (1)
         Tests  24 passed (24)
      Duration  10.44s
    ```
  - `npm run typecheck` (`tsc --noEmit`):
    ```
    > catch-the-fruit@1.0.0 typecheck
    > tsc --noEmit
    (exited with code 0, 0 errors)
    ```
  - Full test suite `npm test`:
    ```
    Test Files  20 passed (20)
         Tests  499 passed (499)
      Duration  17.53s
    ```

## 2. Logic Chain
1. **Pause/Unpause & Remediation Invariants**:
   - `GameScene.togglePause()` creates `pauseOverlay` on odd toggles and destroys it on even toggles. Testing 50 rapid toggles confirmed that `this.pauseOverlay` is cleared and no container leak occurs.
   - During pause (`this.isPaused === true`), `update()` returns immediately without applying delta movement, freezing fruit Y coordinates. Pointerdown listeners check `!this.isPaused`, guaranteeing no accidental catches occur while paused.
   - When remediation is active (`this.isRemediating === true`), toggling pause/unpause leaves `this.isRemediating` intact until `TeachingCard.dismiss()` executes `onResume()`.

2. **Input Concurrency & Basket Boundaries**:
   - In `catchFruit()`, setting `fruit.isCaught = true` immediately blocks 30 rapid successive pointerdown events on the same fruit from incrementing `totalAttempts` more than once.
   - Concurrent fruits in the same wave are locked out simultaneously (`other.isCaught = true`, `disableInteractive()`), preventing double catches.
   - Basket X coordinate clamping with `Phaser.Math.Clamp(x, 55, 425)` guarantees that coordinates at $x < 0$ ($x = -9999$) and $x > 480$ ($x = 99999$) remain strictly bounded within $[55, 425]$, ensuring visual edges ($55 - 48 = 7\text{px} \ge 0$, $425 + 48 = 473\text{px} \le 480$) never clip offscreen.
   - Simultaneous conflicting keypresses (Left + Right, A + D) evaluate `isLeft` before `isRight`, giving deterministic direction without numerical drift or NaN.

3. **TeachingCard Re-Entrance & Audio Lifecycle**:
   - `TeachingCard.dismiss()` guards execution with `this.isDismissed = true`. 50 concurrent `dismiss()` calls result in strictly 1 execution of `onResume`, 1 emission of `resume`, 1 `audio.playClick`, 1 `audio.stopSpeaking`, and 1 `storage.resetConsecutiveMistakes`.
   - Web Speech API output is cleanly halted via `audio.stopSpeaking()`.

4. **CastleScene Room Switching & Economics**:
   - Toggling between `outside` and `inside` 20 times properly cleans and recreates 5 slot containers, swaps the background texture, and maintains coordinate accuracy.
   - Placement at canvas extremes (`garden_right` at x=445, `wall` at x=80, `chandelier` at y=135) updates `placedDecorations` without errors.
   - Gold coin deductions strictly respect balances: insufficient coins reject purchases, exact balance purchases reduce balance to 0, and rapid multi-clicks are guarded by `isActionInProgress`.

5. **RoundSummaryScene Parameter Preservation**:
   - For levels 1-4 with mastery, "NEXT LEVEL ▶" transitions to `GameScene` with `{ topic, levelNumber: levelNumber + 1 }`.
   - For level 5 boss rounds with mastery, "NEXT LEVEL" is omitted because level 6 does not exist.
   - Replay, Castle, Orchard, and Menu transitions preserve the active topic and level parameters across all 4 domains (`phonics`, `morphology`, `vocabulary`, `math`).

6. **Touch Targets Compliance ($\ge 48\text{px}$)**:
   - Measured dimensions across all UI and Scene components confirm that every interactive hitbox meets or exceeds $48\text{px}$ in width and height.

## 3. Caveats
- Browser physical digitizer hardware multi-touch interrupts (e.g. 5 fingers simultaneously touching the physical screen) were validated via simulated simultaneous pointer and container events rather than physical device hardware.
- No production game or UI logic required modifications; the existing architecture successfully withstood all adversarial attack vectors.

## 4. Conclusion
All UI and Scene components (`GameScene`, `CastleScene`, `MenuScene`, `OrchardScene`, `RoundSummaryScene`, `HUD`, `TeachingCard`, `OrchardView`, `LevelIntroModal`) have undergone Tier 5 White-Box Adversarial Coverage Hardening. The new test suite `tests/tier5_scenes_adversarial.test.ts` adds 24 stress tests. All 24 tests pass with 100% determinism, and `npm run typecheck` passes with 0 errors.

## 5. Verification Method
Execute the following verification commands in the project directory:
```bash
# 1. Run Tier 5 Scenes Adversarial Test Suite
npx vitest run tests/tier5_scenes_adversarial.test.ts

# 2. Run TypeScript strict typecheck
npm run typecheck

# 3. Run entire project test suite
npm test
```
- Invalidation conditions: Any test failure in `tests/tier5_scenes_adversarial.test.ts`, any TypeScript compilation error, or any regression in `npm test`.
