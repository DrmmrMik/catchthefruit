# Detailed Architecture & Gameplay Engine Analysis (Milestone 4)

**Investigator**: Explorer M4-1 (`teamwork_preview_explorer`)  
**Date**: 2026-09-05T15:45:00Z  
**Target Milestone**: Milestone 4 — Phaser 2D Arcade Gameplay Engine  
**Workspace**: `/home/gallabot/Documents/antigravity/joyful-hertz`  

---

## 1. Executive Summary

This investigation evaluates the current codebase against all technical, architectural, and pedagogical requirements for **Milestone 4: Phaser 2D Arcade Gameplay Engine**.

### Core Findings Matrix

| Focus Area | Current Status | Identified Gaps / Actions for Worker M4-1 |
|---|---|---|
| **1. Fixed-Timestep Physics (60Hz / 120Hz)** | Implemented in `gameConfig` (`fixedStep: true`, `fps: 60`). Delta scaling used in `GameScene.update()`. | Game objects are Containers without Arcade Physics bodies; delta scaling in `update()` handles multi-refresh rates, but needs dedicated simulation unit tests to prove mathematical invariance at 60Hz and 120Hz. |
| **2. Falling Fruit Mechanics** | 12 questions/level, 1 target + 1-2 distractors, 3 horizontal lanes, speed calculated from duration. | **Critical Discrepancy**: `GameScene.ts:91` doubles fall duration (`fallSpeedDurationMs * 2`), yielding 5.6s–3.6s instead of specified 2.8s–1.8s. Must remove `* 2`. |
| **3. Hitbox & Touch Targets** | Fruit sprite 64x64px, pill badge 72-120px x 30px, atlas frames 80x80px. | **Input Hit Area Bug**: Container children are centered at `(0, 0)`, but default `container.setInteractive()` creates `Rectangle(0, 0, w, h)`, missing the left (`x < 0`) and top (`y < 0`) halves. Must use centered hitArea `Rectangle(-w/2, -h/2, w, h)`. |
| **4. Basket & Princess Avatar Mechanics** | Princess Penelope (80x108px) and Royal Basket (96x56px) render with drag movement. | Missing tap-to-move (tapping bottom area without dragging doesn't move basket) and missing desktop keyboard arrow controls (Left/Right, A/D). |
| **5. Tap-to-Catch & Collision Detection** | Direct `pointerdown` on fruit + `RectangleToRectangle` overlap for basket catch. | Double-catch guard is present. Remaining active fruits in wave lock out and fade smoothly. |
| **6. Forbidden Patterns** | 100% clean across all 9 BSA checks (`raw-raf-loop`, `dom-sprites`, `unbatched-image-loads`, etc.). | Zero RAF loops found. Zero DOM sprites found. Single packed texture atlas (`atlas.png` + `atlas.json`) supplies all 12 fruits, UI, and characters. |
| **7. Test Suite Coverage** | 14 test files, 244 tests passing. `scenes.test.ts` has 7 basic structural tests. | Comprehensive gameplay test suite (`tests/gameplay.test.ts`) is missing for fruit physics, fall scaling, hitboxes, collision, scoring, combos, and remediation. |

---

## 2. Focus Area 1: Fixed-Timestep Physics at 60Hz and 120Hz

### 2.1 Configuration in `src/main.ts`

Lines 46–66 of `src/main.ts`:
```typescript
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  parent: 'game-container',
  backgroundColor: '#e0f2fe',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fixedStep: true, // Guarantees identical simulation across 60Hz and 120Hz mobile digitizers
      fps: 60
    }
  },
  scene: [PreloadScene, MenuScene, GameScene, RoundSummaryScene, OrchardScene, CastleScene]
};
```

In `src/scenes/GameScene.ts`:
```typescript
Line 85: this.physics.world.fixedStep = true;
```

### 2.2 Delta Handling & Motion Integration

In `src/scenes/GameScene.ts` (lines 273–274, 301–309):
```typescript
// Speed calculation: pixels per second to cross 600px
const speed = 600 / (this.fallDurationMs / 1000);

// Update loop:
const deltaSeconds = delta / 1000;
fruit.container.y += fruit.speed * deltaSeconds;
```

### 2.3 Mathematical Invariance Proof (60Hz vs 120Hz)

Let target speed $V = 600 / 2.8 \approx 214.2857 \text{ px/s}$.
- Over 1.0 second on a **60Hz display**:
  $$\text{Number of frames} = 60, \quad \Delta t = \frac{1000}{60} \text{ ms} = \frac{1}{60} \text{ s}$$
  $$\Delta y_{60} = \sum_{i=1}^{60} V \cdot \frac{1}{60} = 60 \cdot \left(V \cdot \frac{1}{60}\right) = V \cdot 1.0 = 214.2857 \text{ px}$$
- Over 1.0 second on a **120Hz display**:
  $$\text{Number of frames} = 120, \quad \Delta t = \frac{1000}{120} \text{ ms} = \frac{1}{120} \text{ s}$$
  $$\Delta y_{120} = \sum_{i=1}^{120} V \cdot \frac{1}{120} = 120 \cdot \left(V \cdot \frac{1}{120}\right) = V \cdot 1.0 = 214.2857 \text{ px}$$

$$\Delta y_{60} - \Delta y_{120} = 0.0000 \text{ px}$$

Because displacement per tick is scaled by `deltaSeconds`, double-speed motion on 120Hz displays is strictly eliminated.

### 2.4 Arcade Physics Bodies vs Container Update

- `fruit.container` is a `Phaser.GameObjects.Container` containing the fruit sprite, pill background, and text label.
- In Phaser, containers with Arcade Physics bodies can encounter origin alignment issues and nested transform bugs.
- The current manual Euler integration (`y += speed * deltaSeconds`) inside `update(time, delta)` provides rock-solid reliability across all rendering backends.
- `gameConfig.physics.arcade.fixedStep = true` is set, and `this.physics.world.fixedStep = true` is set.
- **Worker Action**: Keep the delta-time integration in `update()`, and provide unit tests that explicitly verify that simulating 60 updates @ 16.666ms and 120 updates @ 8.333ms yields identical vertical distance.

---

## 3. Focus Area 2: Falling Fruit Mechanics

### 3.1 Fall Duration Scaling (2.8s → 1.8s)

The external curriculum datasets (`data/phonics.json`, `data/morphology.json`, `data/vocabulary.json`, `data/math.json`) specify the following progression:

| Level | Scaffold Stage | Fall Duration (`fallSpeedDurationMs`) | Speed (px/s to cover 600px) |
|---|---|---|---|
| Level 1 | `single_rule` | **2800 ms** (2.8s) | 214.29 px/s |
| Level 2 | `discrimination` | **2500 ms** (2.5s) | 240.00 px/s |
| Level 3 | `mixed_patterns` | **2300 ms** (2.3s) | 260.87 px/s |
| Level 4 | `mixed_patterns` | **2100 ms** (2.1s) | 285.71 px/s |
| Level 5 (Boss) | `boss_level` | **1800 ms** (1.8s) | 333.33 px/s |

#### The Defect in `GameScene.ts:91`
```typescript
// Line 43:
private fallDurationMs: number = 5200;

// Line 90-91:
// Half-speed drop: double the duration for gentle, accessible 2nd grade gameplay
this.fallDurationMs = (levelConfig?.fallSpeedDurationMs ?? 2600) * 2;
```
- **Impact**: Multiplied by 2, Level 1 takes 5.6 seconds and Level 5 takes 3.6 seconds. This contradicts `SPEC.md` ("2-3 seconds to cross screen") and `PROJECT.md` line 80 (`2800ms -> 1800ms`).
- **Remedy for Worker M4-1**:
  ```typescript
  this.fallDurationMs = levelConfig?.fallSpeedDurationMs ?? 2800;
  ```

### 3.2 Spawning Waves and Lane Distribution

- `questions` array contains 12 items (`curriculumService.generateQuestionSet(this.topic, this.levelNumber, 12)`).
- Each wave extracts the current item's options: 1 correct target + 1–2 distractors (sorted randomly).
- Lanes are computed dynamically:
  ```typescript
  const laneCount = Math.min(optionsToSpawn.length, 3);
  const laneWidth = (width - 80) / laneCount;
  const spawnX = 50 + idx * laneWidth + laneWidth / 2 + (Math.random() * 20 - 10);
  const spawnY = 120 + Math.random() * 20;
  ```
- Waves spawn sequentially:
  - After catch: 500ms delay before next question wave.
  - After all fruits in wave fall off screen: 400ms delay.
  - After remediation card dismissal: 400ms delay.
  - Round end: 1200ms delay after 12th item to transition to `RoundSummaryScene`.

### 3.3 Touch Target Hitboxes (>= 48px) and the HitArea Centering Defect

- **Atlas frame**: 80x80px for all 12 fruits.
- **Rendered Fruit Sprite**: 64x64px (`sprite.setDisplaySize(64, 64)`).
- **Word Pill Background**: width `Math.max(textLen * 11 + 24, 72)` x 30px height.
- **Container Size**: `container.setSize(Math.max(pillW, 64), 74)`.
- **The Defect**:
  In `GameScene.ts` line 288:
  ```typescript
  container.setInteractive({ useHandCursor: true });
  ```
  When called without a custom geometry, Phaser creates `Rectangle(0, 0, width, height)`.
  However, inside the container:
  - `sprite` is at `(0, -12)` (centered horizontally, top is at `y = -44`).
  - `pillBg` starts at `x = -pillW / 2` and extends to `+pillW / 2`.
  - `label` is at `(0, 31)` with origin `0.5`.
  Because the children extend into negative coordinates relative to container origin `(0,0)`, the left half (`x < 0`) and top half (`y < 0`) of the visual fruit are **unclickable**!
- **Remedy for Worker M4-1**:
  ```typescript
  const w = Math.max(pillW, 64);
  const h = 74;
  container.setSize(w, h);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains
  );
  ```
  This creates a symmetrical hit area centered on `(0, 0)` with width $\ge 64\text{px}$ and height $74\text{px}$, fully enclosing both the fruit and word badge and exceeding the 48px touch target standard.

---

## 4. Focus Area 3: Catcher Basket, Princess Penelope, and Collision

### 4.1 Visual Components

- **Princess Penelope Sprite**:
  - Frame: `atlas` -> `princess-idle-1` (and `princess-idle-2` animation cycle).
  - Size: 80x108px.
  - Position: `x = width / 2`, `y = height - 72`.
  - Depth: 50.
  - Celebratory state: On correct catch, plays hop tween (`y -= 22`) + golden sparkles, sets frame `princess-catch`.
  - Mistake state: On wrong catch, displays `princess-think` for 700ms.
- **Royal Basket Image**:
  - Frame: `atlas` -> `basket` (128x64 source frame).
  - Size: 96x56px.
  - Position: `x = width / 2`, `y = height - 45`.
  - Depth: 60.

### 4.2 Movement Controls & Tap-to-Move Gap

Current controls in `GameScene.ts` (lines 119–134):
- Drag on basket: clamps `basket.x` to `[55, width - 55]`, syncs `princess.x`.
- Drag on bottom zone: `input.on('pointermove')` while `pointer.isDown && pointer.y > height - 140`.
- **Gaps Identified**:
  1. **No Tap-to-Move**: If a child taps once at `(100, 720)` without dragging, `pointermove` does not fire. The basket does not move to the tapped lane!
  2. **No Keyboard Controls**: Left/Right arrow keys or A/D keys are not bound.
- **Remedy for Worker M4-1**:
  Add tap-to-move listener on the bottom strip:
  ```typescript
  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (pointer.y > height - 140 && !this.isPaused && !this.isRemediating) {
      const clampedX = Phaser.Math.Clamp(pointer.x, 55, width - 55);
      this.basket.x = clampedX;
      if (this.princess) this.princess.x = clampedX;
    }
  });
  ```
  And add cursor keys handling in `update()`:
  ```typescript
  if (this.cursors.left.isDown) {
    const nextX = Phaser.Math.Clamp(this.basket.x - 400 * deltaSeconds, 55, width - 55);
    this.basket.x = nextX;
    if (this.princess) this.princess.x = nextX;
  } else if (this.cursors.right.isDown) {
    const nextX = Phaser.Math.Clamp(this.basket.x + 400 * deltaSeconds, 55, width - 55);
    this.basket.x = nextX;
    if (this.princess) this.princess.x = nextX;
  }
  ```

### 4.3 Tap-to-Catch vs Basket Collision

- **Tap-to-Catch**:
  Direct tap on fruit container triggers `catchFruit(fruit)`. No dragging required. Satisfies SPEC accessibility requirement: *"All fruit is touchable — tap to catch. No drag, no swipe."*
- **Basket Collision**:
  In `update()`:
  ```typescript
  const fruitBounds = fruit.container.getBounds();
  const basketBounds = this.basket.getBounds();
  if (Phaser.Geom.Intersects.RectangleToRectangle(fruitBounds, basketBounds)) {
    this.catchFruit(fruit);
  }
  ```
- **Double-Catch Guard**:
  ```typescript
  if (fruit.isCaught) return;
  fruit.isCaught = true;
  ```
  And all sibling fruits in the wave are immediately locked out (`other.isCaught = true`, `disableInteractive()`, tween alpha to 0 over 300ms).

---

## 5. Focus Area 4: Forbidden Patterns Verification

Verification against `STACK.md` archetype `2d-game-arcade`:

| Pattern | Rule | Codebase Audit Result |
|---|---|---|
| `raw-raf-loop` | FORBIDDEN | **0 occurrences**. Grep search for `requestAnimationFrame` returned 0 hits in `src/`. All simulation is governed by Phaser's Scene manager. |
| `dom-sprites` | FORBIDDEN | **0 occurrences**. Grep search for `createElement` and `new Image` returned 0 hits in `src/`. All visual sprites are Phaser Canvas/WebGL objects. |
| `unbatched-image-loads` | FORBIDDEN | **0 occurrences**. All 12 fruit sprites, UI elements, star ratings, and character frames are packed into `public/assets/atlas.png` + `public/assets/atlas.json`. Preload loads 1 atlas and 3 full-screen JPG background art plates. |
| `hardcoded-curriculum-logic` | FORBIDDEN | **0 occurrences**. All words, affixes, synonyms/antonyms, and math equations are loaded from `data/*.json` and validated by Zod. |
| `bsa verify .` | REQUIRED | **0 hits across all 9 forbidden checks**. |

---

## 6. Focus Area 5: Inspection of Existing Code, Discrepancies & Recommendations

### Summary of Identified Discrepancies

1. **Fall Duration Doubled**:
   `GameScene.ts:91` multiplies duration by 2.
   *Fix*: Remove `* 2`, use `levelConfig?.fallSpeedDurationMs ?? 2800`.
2. **Container Interactive HitArea Alignment**:
   Container children are centered around `(0, 0)`, but default hit area starts at `(0, 0)`.
   *Fix*: Set `new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h)`.
3. **Missing Basket Tap-to-Move**:
   Tapping at the bottom without dragging leaves the basket stationary.
   *Fix*: Add `pointerdown` check at `y > height - 140` to position basket.
4. **Missing Keyboard Controls for Accessibility**:
   No arrow key navigation for the basket.
   *Fix*: Initialize `cursors = this.input.keyboard.createCursorKeys()` and update `basket.x` in `update()`.
5. **Mastery Boundary Consistency in `finishLevel()`**:
   Line 683 has `const isMastered = accuracy >= 85 || result.unlockedNextLevel;`.
   Storage service `isMasteryAchieved` requires strictly `accuracy > 85.0%`.
   *Fix*: Use `result.unlockedNextLevel` directly or `accuracy > 85`.
6. **Morphology Visual Segmentation Banner**:
   On correct catch in morphology, show `fruit.question.prompt` (which contains `re + play → replay`) or dedicated segmentation banner.
7. **Test Suite Execution Timeout in `ui_adversarial.test.ts`**:
   `tests/ui_adversarial.test.ts:341` executes python oracle with 15000ms timeout. Under full-suite load, it took 17566ms.
   *Recommendation*: Increase timeout from 15000ms to 35000ms.

---

## 7. Recommended Test Suite: `tests/gameplay.test.ts`

Worker M4-1 should implement a dedicated, comprehensive gameplay test suite covering:
1. **60Hz vs 120Hz Delta Simulation Invariance**:
   Simulate 60 ticks @ 16.6667ms and 120 ticks @ 8.3333ms. Verify final `y` position delta is $< 0.001\text{px}$.
2. **Fall Speed Scaling Across All Levels**:
   Verify Level 1 duration = 2800ms, Level 5 duration = 1800ms, speed calculation $600 / (T / 1000)$.
3. **Hitbox Dimensions & Interactive HitArea**:
   Verify container width $\ge 64\text{px}$, height $74\text{px}$, hitArea covers negative and positive quadrants around $(0,0)$.
4. **Basket Dimensions & Positioning**:
   Verify basket 96x56px, position `y = 755`, clamping bounds `[55, 425]`.
5. **Princess Penelope Animations**:
   Verify registration of `princess-idle` (frames `princess-idle-1`, `princess-idle-2`), `princess-catch`, `princess-think`.
6. **Tap-to-Catch & Basket Collision Overlap**:
   Verify that `catchFruit()` marks `isCaught = true`, locks sibling fruits, updates score, combo, and coin counts.
7. **Score & Combo Mechanics**:
   Verify combo increments, score multiplier $100 \times \min(\text{combo}, 5)$, coin award $10 + \min(\text{combo} \times 2, 20)$.
8. **Remediation Triggering**:
   Verify 3 consecutive wrong catches trigger speed dampener ($+800\text{ms}$) and remediation card.
9. **Forbidden Pattern Invariants**:
   AST grep checks ensuring zero `requestAnimationFrame` and zero `createElement('img')`.
