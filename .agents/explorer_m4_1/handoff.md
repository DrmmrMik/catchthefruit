# Handoff Report: Milestone 4 Phaser 2D Arcade Gameplay Engine

**Author**: Explorer M4-1 (`teamwork_preview_explorer`)  
**Recipient**: Worker M4-1 / Project Orchestrator  
**Date**: 2026-09-05T15:45:00Z  
**Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_1`  

---

## 1. Observation

1. **Fixed-Timestep Physics Configuration (`src/main.ts:56-64`)**:
   ```typescript
   physics: {
     default: 'arcade',
     arcade: {
       gravity: { x: 0, y: 0 },
       debug: false,
       fixedStep: true, // Guarantees identical simulation across 60Hz and 120Hz mobile digitizers
       fps: 60
     }
   }
   ```
   And `src/scenes/GameScene.ts:85`:
   ```typescript
   this.physics.world.fixedStep = true;
   ```

2. **Fruit Motion Delta Scaling (`src/scenes/GameScene.ts:301-309`)**:
   ```typescript
   const deltaSeconds = delta / 1000;
   const height = this.cameras.main.height;

   for (let i = this.activeFruits.length - 1; i >= 0; i--) {
     const fruit = this.activeFruits[i]!;
     if (fruit.isCaught) continue;

     // Move fruit downward with delta time (deterministic across 60Hz and 120Hz displays)
     fruit.container.y += fruit.speed * deltaSeconds;
   ```

3. **Fall Duration Scaling Discrepancy (`src/scenes/GameScene.ts:43, 90-92`)**:
   ```typescript
   // Line 43:
   private fallDurationMs: number = 5200;

   // Line 90-92:
   // Half-speed drop: double the duration for gentle, accessible 2nd grade gameplay
   this.fallDurationMs = (levelConfig?.fallSpeedDurationMs ?? 2600) * 2;
   ```
   In `data/phonics.json:12, 26, 40, 54, 68`:
   - Level 1: `fallSpeedDurationMs: 2800`
   - Level 2: `fallSpeedDurationMs: 2500`
   - Level 3: `fallSpeedDurationMs: 2300`
   - Level 4: `fallSpeedDurationMs: 2100`
   - Level 5: `fallSpeedDurationMs: 1800`
   `PROJECT.md:80` defines:
   `fallSpeedDurationMs: number; // 2800ms -> 1800ms`

4. **Container Interactive Hit Area Misalignment (`src/scenes/GameScene.ts:247-288`)**:
   ```typescript
   const container = this.add.container(x, y);
   const sprite = this.add.image(0, -12, 'atlas', fruitFrame);
   sprite.setDisplaySize(64, 64);
   ...
   const pillBg = this.add.graphics();
   pillBg.fillRoundedRect(-pillW / 2, 16, pillW, 30, 10);
   ...
   container.setSize(Math.max(pillW, 64), 74);
   container.setInteractive({ useHandCursor: true });
   ```
   Default `setInteractive()` on Phaser Containers builds `Rectangle(0, 0, w, h)`, omitting negative quadrant coordinates (`x < 0`, `y < 0`) where the left half of the pill and upper half of the fruit reside.

5. **Controls & Input Handling (`src/scenes/GameScene.ts:119-134`)**:
   ```typescript
   this.input.on('drag', (_pointer, gameObject, dragX) => {
     if (gameObject === this.basket ...) {
       this.basket.x = clampedX;
       if (this.princess) this.princess.x = clampedX;
     }
   });
   this.input.on('pointermove', (pointer) => {
     if (pointer.isDown && pointer.y > height - 140 ...) {
       this.basket.x = clampedX;
       if (this.princess) this.princess.x = clampedX;
     }
   });
   ```
   No `pointerdown` listener on bottom strip for instant tap-to-move; no cursor keys for keyboard navigation.

6. **Forbidden Patterns Audit (`~/.build-standards/bin/bsa verify .`)**:
   ```
   Forbidden patterns: 0 hits / 9 checked
     - raw-raf-loop: clean
     - dom-sprites: clean
     - unbatched-image-loads: clean
     - hardcoded-curriculum-logic: clean
     - naive-frame-interpolation: clean
     - unconstrained-per-frame-generation: clean
     - autocenter-on-animation-sequence: clean
     - upscale-ai-raster: clean
     - unpalette-color-drift: clean
   ```
   Grep searches for `requestAnimationFrame`, `createElement('img')`, and `new Image()` in `src/` yielded 0 hits.

7. **Test Suite Status**:
   Running `npx vitest run tests/scenes.test.ts` passed 7/7 tests in 7.89s.
   Full test suite has 14 test files and 244 passed tests; `tests/ui_adversarial.test.ts:341` intermittently times out under heavy concurrency because the timeout is set to 15000ms while running a nested vitest command that takes ~14-18s.

---

## 2. Logic Chain

1. **Observation 1 & 2 → Refresh Rate Invariance**:
   Arcade Physics is configured with `fixedStep: true` and `fps: 60`. In `GameScene.ts`, fruit downward displacement is computed per tick as `fruit.speed * (delta / 1000)`. Because delta is 16.666ms at 60Hz and 8.333ms at 120Hz, integrating over 1.0 second results in $60 \times (V \times 0.016667) = V$ at 60Hz and $120 \times (V \times 0.008333) = V$ at 120Hz. The motion is frame-rate independent.

2. **Observation 3 → Fall Duration Defect**:
   `data/phonics.json` specifies level durations between 2800ms and 1800ms, matching `SPEC.md` and `PROJECT.md`. However, `GameScene.ts:91` multiplies this value by 2 (`fallDurationMs = ... * 2`), causing actual durations of 5.6s down to 3.6s. Removing the `* 2` multiplier restores the exact 2.8s–1.8s scaling curve.

3. **Observation 4 → Touch Hit Area Defect**:
   In Phaser, a Container has an origin of `(0, 0)`. The fruit sprite is placed at `y = -12` and the pill background spans `[-pillW/2, +pillW/2]`. Calling `container.setInteractive({ useHandCursor: true })` without arguments constructs a bounding rectangle at `[0, 0, w, h]`. Any tap on the left side of the fruit (`x < 0`) or the top half (`y < 0`) fails hit detection. Defining `new Phaser.Geom.Rectangle(-w/2, -h/2, w, h)` resolves this defect and guarantees a hit target $\ge 64\text{px} \times 74\text{px}$ ($\ge 48\text{px}$ minimum).

4. **Observation 5 → Accessibility Gaps**:
   Young children who tap a location at the bottom of the screen rather than dragging will see no response because only `pointermove` is handled. Adding a `pointerdown` listener on `y > height - 140` provides instant tap-to-move. Adding cursor key bindings provides desktop keyboard accessibility.

5. **Observation 6 → Stack & Compliance Invariants**:
   No hand-rolled RAF loops exist. No DOM sprites exist. All sprites load via `atlas.png` + `atlas.json`. STACK.md forbidden patterns are 100% clean.

6. **Observation 7 → Test Verification Needs**:
   Existing tests verify scene instantiation and constructor keys (`scenes.test.ts`), but do not verify fruit falling rates, 60Hz/120Hz delta equivalence, hitboxes, collision detection, combo multipliers, or remediation dampening. A dedicated `tests/gameplay.test.ts` suite is needed.

---

## 3. Caveats

1. **Phaser Headless Rendering in Vitest**:
   Phaser unit testing in JSDOM requires canvas mocking (`tests/setup.ts`). Tests inspecting visual positions and delta ticks must instantiate `GameScene` in headless mode or exercise the mathematical update logic directly.
2. **Adversarial UI Timeout**:
   `tests/ui_adversarial.test.ts:341` has a 15000ms timeout that fails under multi-file Vitest concurrency. Increasing the timeout to 35000ms in that file prevents false-positive test suite failures.

---

## 4. Conclusion & Concrete Recommendations for Worker M4-1

Worker M4-1 should implement the following specific changes:

### Task 1: Fix Fall Speed Duration Scaling (`src/scenes/GameScene.ts`)
- Change line 43:
  ```typescript
  // Before:
  private fallDurationMs: number = 5200;
  // After:
  private fallDurationMs: number = 2800;
  ```
- Change line 91:
  ```typescript
  // Before:
  this.fallDurationMs = (levelConfig?.fallSpeedDurationMs ?? 2600) * 2;
  // After:
  this.fallDurationMs = levelConfig?.fallSpeedDurationMs ?? 2800;
  ```

### Task 2: Fix Container Interactive HitArea Centering (`src/scenes/GameScene.ts`)
- Update `createFruitItem()` lines 271, 288:
  ```typescript
  const w = Math.max(pillW, 64);
  const h = 74;
  container.setSize(w, h);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains
  );
  ```

### Task 3: Add Tap-to-Move and Keyboard Controls (`src/scenes/GameScene.ts`)
- In `create()`:
  ```typescript
  // Tap-to-move basket
  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (pointer.y > height - 140 && !this.isPaused && !this.isRemediating) {
      const clampedX = Phaser.Math.Clamp(pointer.x, 55, width - 55);
      this.basket.x = clampedX;
      if (this.princess) this.princess.x = clampedX;
    }
  });

  // Desktop keyboard controls
  this.cursors = this.input.keyboard?.createCursorKeys();
  ```
- In `update(time, delta)`:
  ```typescript
  if (this.cursors) {
    if (this.cursors.left.isDown) {
      const nextX = Phaser.Math.Clamp(this.basket.x - 400 * deltaSeconds, 55, width - 55);
      this.basket.x = nextX;
      if (this.princess) this.princess.x = nextX;
    } else if (this.cursors.right.isDown) {
      const nextX = Phaser.Math.Clamp(this.basket.x + 400 * deltaSeconds, 55, width - 55);
      this.basket.x = nextX;
      if (this.princess) this.princess.x = nextX;
    }
  }
  ```

### Task 4: Fix Mastery Boundary Alignment in `finishLevel()` (`src/scenes/GameScene.ts`)
- Change line 683:
  ```typescript
  // Before:
  const isMastered = accuracy >= 85 || result.unlockedNextLevel;
  // After:
  const isMastered = result.unlockedNextLevel || accuracy > 85;
  ```

### Task 5: Increase Timeout in `tests/ui_adversarial.test.ts`
- Line 341: Change `, 15000);` to `, 35000);`.

### Task 6: Implement Comprehensive `tests/gameplay.test.ts`
Create `tests/gameplay.test.ts` with 8+ test suites:
1. Fixed-timestep physics configuration (`fixedStep: true`, `fps: 60`, `default: 'arcade'`).
2. Mathematical 60Hz vs 120Hz delta-scaling invariance verification.
3. Fall duration scaling verification (2800ms down to 1800ms across levels 1–5).
4. Fruit container hitbox dimensions ($\ge 48\text{px}$, centered geometry).
5. Basket & Princess Penelope geometry, depth layering, and movement clamping.
6. Tap-to-catch and basket collision detection overlap.
7. Scoring, combo multipliers, and Princess coin rewards.
8. Mistake penalties, 3-mistake speed dampener ($+800\text{ms}$), and TeachingCard invocation.

---

## 5. Verification Method

1. **Run Vitest on existing and new gameplay tests**:
   ```bash
   npx vitest run tests/scenes.test.ts
   npx vitest run tests/gameplay.test.ts
   ```
2. **Run full project test suite**:
   ```bash
   npm test
   ```
3. **Verify Build Standards Advisory (BSA)**:
   ```bash
   ~/.build-standards/bin/bsa verify .
   ```
4. **Invalidation Conditions**:
   - Any test failure where 60Hz and 120Hz simulations yield different displacement.
   - Any fruit touch target with width or height $< 48\text{px}$.
   - Any occurrence of `requestAnimationFrame`, `createElement('img')`, or unbatched sprite loading.
   - Level 1 fall duration $> 2800\text{ms}$ or Level 5 fall duration $> 1800\text{ms}$ (excluding mistake dampener).
