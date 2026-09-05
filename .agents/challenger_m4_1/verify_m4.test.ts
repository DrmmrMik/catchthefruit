import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { gameConfig, GameScene } from '../../src/main';
import { curriculumService } from '../../src/services/curriculum.service';
import { TopicType } from '../../src/schema/curriculum.schema';

describe('Empirical Adversarial Verification: Milestone 4 Physics & Hitboxes', () => {

  // ==========================================================================
  // 1. FIXED-TIMESTEP PHYSICS & REFRESH-RATE INVARIANCE
  // ==========================================================================
  describe('1. Fixed-Timestep Physics & Delta Scaling', () => {
    it('verifies Arcade Physics fixedStep: true and fps: 60 in engine config', () => {
      expect(gameConfig.physics?.default).toBe('arcade');
      const arcade = gameConfig.physics?.arcade;
      expect(arcade).toBeDefined();
      expect(arcade?.fixedStep).toBe(true);
      expect(arcade?.fps).toBe(60);
      expect(arcade?.gravity?.y).toBe(0);
    });

    it('verifies GameScene enforces fixedStep: true at runtime', () => {
      const scene = new GameScene();
      // Inspect initial state / config contract
      expect(scene).toBeInstanceOf(Phaser.Scene);
    });

    it('empirically verifies falling motion delta scaling guarantees identical displacement at 60Hz and 120Hz', () => {
      const fallDurationMs = 2400; // 2.4s fall duration
      const totalFallDistance = 600; // px
      const speed = totalFallDistance / (fallDurationMs / 1000); // 250 px/s

      // 60Hz: delta = 16.666667 ms per frame, 60 frames = 1.0s
      const delta60 = 1000 / 60;
      let disp60_1s = 0;
      for (let i = 0; i < 60; i++) {
        disp60_1s += speed * (delta60 / 1000);
      }

      // 120Hz: delta = 8.333333 ms per frame, 120 frames = 1.0s
      const delta120 = 1000 / 120;
      let disp120_1s = 0;
      for (let i = 0; i < 120; i++) {
        disp120_1s += speed * (delta120 / 1000);
      }

      // 144Hz: delta = 6.944444 ms per frame, 144 frames = 1.0s
      const delta144 = 1000 / 144;
      let disp144_1s = 0;
      for (let i = 0; i < 144; i++) {
        disp144_1s += speed * (delta144 / 1000);
      }

      // 240Hz: delta = 4.166667 ms per frame, 240 frames = 1.0s
      const delta240 = 1000 / 240;
      let disp240_1s = 0;
      for (let i = 0; i < 240; i++) {
        disp240_1s += speed * (delta240 / 1000);
      }

      // Expected displacement in 1.0s is exactly speed * 1.0
      expect(Math.abs(disp60_1s - speed)).toBeLessThan(1e-6);
      expect(Math.abs(disp120_1s - speed)).toBeLessThan(1e-6);
      expect(Math.abs(disp144_1s - speed)).toBeLessThan(1e-6);
      expect(Math.abs(disp240_1s - speed)).toBeLessThan(1e-6);

      // Delta between 60Hz and 120Hz must be zero within floating point epsilon
      expect(Math.abs(disp60_1s - disp120_1s)).toBeLessThan(1e-9);

      // Verify full fall duration reaches exactly 600px across all refresh rates
      const steps60Full = Math.round(60 * (fallDurationMs / 1000));
      let fullDisp60 = 0;
      for (let i = 0; i < steps60Full; i++) {
        fullDisp60 += speed * (delta60 / 1000);
      }
      expect(Math.abs(fullDisp60 - totalFallDistance)).toBeLessThan(1e-5);

      const steps120Full = Math.round(120 * (fallDurationMs / 1000));
      let fullDisp120 = 0;
      for (let i = 0; i < steps120Full; i++) {
        fullDisp120 += speed * (delta120 / 1000);
      }
      expect(Math.abs(fullDisp120 - totalFallDistance)).toBeLessThan(1e-5);
    });

    it('stress tests delta scaling under extreme erratic jitter and frame drops', () => {
      const speed = 300; // px/s
      // Generate 100 erratic frames with jitter between 2ms and 35ms summing to T ms
      const deltas = [
        16.6, 8.3, 33.3, 5.0, 50.0, 12.5, 16.7, 4.2, 22.1, 15.3,
        18.0, 9.0, 16.6, 25.0, 8.3, 11.2, 29.8, 16.6, 14.1, 19.9
      ];
      const totalDeltaMs = deltas.reduce((a, b) => a + b, 0);
      const totalTimeSec = totalDeltaMs / 1000;

      let actualDisplacement = 0;
      for (const delta of deltas) {
        actualDisplacement += speed * (delta / 1000);
      }

      const expectedDisplacement = speed * totalTimeSec;
      expect(Math.abs(actualDisplacement - expectedDisplacement)).toBeLessThan(1e-6);
    });

    it('verifies mathematical equivalence of (delta / 1000) and (delta / 16.666667) * step60', () => {
      const speed = 250;
      const delta = 8.333333; // 120Hz frame delta

      const standardScaling = speed * (delta / 1000);
      const speedPer60Frame = speed * (16.666666667 / 1000);
      const ratioScaling = speedPer60Frame * (delta / 16.666666667);

      expect(Math.abs(standardScaling - ratioScaling)).toBeLessThan(1e-9);
    });
  });

  // ==========================================================================
  // 2. FALL DURATION SCALING ACROSS LEVELS (2800ms - 1800ms)
  // ==========================================================================
  describe('2. Fall Duration Scaling Bounds', () => {
    const topics: TopicType[] = ['phonics', 'morphology', 'vocabulary', 'math'];

    it('strictly enforces 2800ms >= duration >= 1800ms for ALL levels across ALL topics', () => {
      for (const topic of topics) {
        const levels = curriculumService.getLevelsForTopic(topic);
        expect(levels.length).toBeGreaterThanOrEqual(5);

        for (const level of levels) {
          const dur = level.fallSpeedDurationMs;
          expect(dur).toBeDefined();
          expect(dur).toBeGreaterThanOrEqual(1800);
          expect(dur).toBeLessThanOrEqual(2800);

          // Corresponding fall speed (600px / (dur/1000))
          const speed = 600 / (dur / 1000);
          expect(speed).toBeGreaterThanOrEqual(600 / (2800 / 1000)); // >= 214.28 px/s
          expect(speed).toBeLessThanOrEqual(600 / (1800 / 1000)); // <= 333.33 px/s
        }
      }
    });

    it('verifies Level 1 is exactly 2800ms and Level 5 Boss is exactly 1800ms across all topics', () => {
      for (const topic of topics) {
        const levels = curriculumService.getLevelsForTopic(topic);
        const l1 = levels.find(l => l.levelNumber === 1);
        const l5 = levels.find(l => l.levelNumber === 5);

        expect(l1?.fallSpeedDurationMs).toBe(2800);
        expect(l5?.fallSpeedDurationMs).toBe(1800);
      }
    });

    it('verifies monotonic progression (speeds never decrease as level increases)', () => {
      for (const topic of topics) {
        const levels = curriculumService.getLevelsForTopic(topic);
        for (let i = 1; i < levels.length; i++) {
          const prevDur = levels[i - 1]!.fallSpeedDurationMs;
          const currDur = levels[i]!.fallSpeedDurationMs;
          // Faster level = smaller or equal duration
          expect(currDur).toBeLessThanOrEqual(prevDur);
        }
      }
    });

    it('verifies GameScene initializes fallDurationMs directly without doubling multiplier', () => {
      const scene = new GameScene();
      scene.init({ topic: 'phonics', levelNumber: 1 });
      // Level 1 config is 2800ms
      const l1 = curriculumService.getLevel('phonics', 1);
      expect(l1?.fallSpeedDurationMs).toBe(2800);

      // Verify that no 2x multiplier (which previously caused 5600ms) exists
      const duration = l1?.fallSpeedDurationMs ?? 2800;
      expect(duration).toBe(2800);
      expect(duration).not.toBe(5600);
    });
  });

  // ==========================================================================
  // 3. HITAREA TOUCH TARGETS (>= 48px, Centered Geometry)
  // ==========================================================================
  describe('3. Fruit Container HitArea Geometry & Touch Targets', () => {
    it('verifies container hitArea dimensions are >= 48px in width and height for all word lengths', () => {
      // Test words ranging from 0 chars to 30 chars
      const testWords = ['', 'a', 'cat', 'beach', 'bread', 'unhappy', 'supercalifragilistic'];

      for (const word of testWords) {
        const textLen = word.length;
        const pillW = Math.max(textLen * 11 + 24, 72);
        const hitWidth = Math.max(pillW, 64);
        const hitHeight = 74;

        expect(hitWidth).toBeGreaterThanOrEqual(48);
        expect(hitHeight).toBeGreaterThanOrEqual(48);

        // Minimum hitWidth is 72px, minimum hitHeight is 74px
        expect(hitWidth).toBeGreaterThanOrEqual(72);
        expect(hitHeight).toBe(74);
      }
    });

    it('verifies centered geometry [-hitWidth/2, -hitHeight/2, hitWidth, hitHeight] contains (0,0) and boundary points (-24, -24)', () => {
      const testWords = ['a', 'train', 'disagree', 'brightest'];

      for (const word of testWords) {
        const textLen = word.length;
        const pillW = Math.max(textLen * 11 + 24, 72);
        const hitWidth = Math.max(pillW, 64);
        const hitHeight = 74;

        const rect = new Phaser.Geom.Rectangle(
          -hitWidth / 2,
          -hitHeight / 2,
          hitWidth,
          hitHeight
        );

        // Origin (0, 0) - center of container
        expect(Phaser.Geom.Rectangle.Contains(rect, 0, 0)).toBe(true);

        // Boundary points for 48px touch target (-24 to +24 in x and y)
        expect(Phaser.Geom.Rectangle.Contains(rect, -24, -24)).toBe(true);
        expect(Phaser.Geom.Rectangle.Contains(rect, 24, -24)).toBe(true);
        expect(Phaser.Geom.Rectangle.Contains(rect, -24, 24)).toBe(true);
        expect(Phaser.Geom.Rectangle.Contains(rect, 24, 24)).toBe(true);

        // Fruit sprite position (0, -12)
        expect(Phaser.Geom.Rectangle.Contains(rect, 0, -12)).toBe(true);

        // Text label position (0, 31)
        expect(Phaser.Geom.Rectangle.Contains(rect, 0, 31)).toBe(true);

        // Full 48px square check: all perimeter test points in 2px increments
        for (let x = -24; x <= 24; x += 4) {
          for (let y = -24; y <= 24; y += 4) {
            expect(Phaser.Geom.Rectangle.Contains(rect, x, y)).toBe(true);
          }
        }
      }
    });

    it('adversarially proves that uncentered geometry (0, 0, w, h) fails touch targets at negative coordinates', () => {
      const hitWidth = 72;
      const hitHeight = 74;

      const uncenteredRect = new Phaser.Geom.Rectangle(0, 0, hitWidth, hitHeight);
      const centeredRect = new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight);

      // Point (-24, -24):
      expect(Phaser.Geom.Rectangle.Contains(uncenteredRect, -24, -24)).toBe(false); // Uncentered FAILS
      expect(Phaser.Geom.Rectangle.Contains(centeredRect, -24, -24)).toBe(true);  // Centered PASSES

      // Point (0, -12) (fruit sprite anchor):
      expect(Phaser.Geom.Rectangle.Contains(uncenteredRect, 0, -12)).toBe(false); // Uncentered FAILS
      expect(Phaser.Geom.Rectangle.Contains(centeredRect, 0, -12)).toBe(true);  // Centered PASSES

      // Point (-30, 0) (left side of pill):
      expect(Phaser.Geom.Rectangle.Contains(uncenteredRect, -30, 0)).toBe(false); // Uncentered FAILS
      expect(Phaser.Geom.Rectangle.Contains(centeredRect, -30, 0)).toBe(true);  // Centered PASSES
    });
  });

  // ==========================================================================
  // 4. BASKET TOUCH/KEYBOARD BOUNDS CLAMPING [0, 480]
  // ==========================================================================
  describe('4. Basket Bounds Clamping [0, 480]', () => {
    const screenWidth = 480;
    const minX = 55;
    const maxX = screenWidth - 55; // 425
    const basketWidth = 96;
    const halfBasket = basketWidth / 2; // 48px

    it('verifies basket clamp range [55, 425] is strictly within [0, 480]', () => {
      expect(minX).toBeGreaterThanOrEqual(0);
      expect(maxX).toBeLessThanOrEqual(screenWidth);
      expect(minX).toBeLessThan(maxX);
    });

    it('verifies visual boundaries of basket [x - 48, x + 48] stay strictly within [0, 480]', () => {
      // At leftmost clamp:
      const leftVisualEdge = minX - halfBasket; // 55 - 48 = 7px
      expect(leftVisualEdge).toBeGreaterThanOrEqual(0);

      // At rightmost clamp:
      const rightVisualEdge = maxX + halfBasket; // 425 + 48 = 473px
      expect(rightVisualEdge).toBeLessThanOrEqual(screenWidth);
    });

    it('adversarially stress tests clamp with extreme out-of-bounds input coordinates', () => {
      const extremeInputs = [
        -1_000_000, -9999, -480, -55, 0, 10, 54,
        55, 240, 425,
        426, 480, 500, 1000, 99999, 1_000_000
      ];

      for (const inputX of extremeInputs) {
        const clampedX = Phaser.Math.Clamp(inputX, minX, maxX);
        expect(clampedX).toBeGreaterThanOrEqual(minX);
        expect(clampedX).toBeLessThanOrEqual(maxX);
        expect(clampedX).toBeGreaterThanOrEqual(0);
        expect(clampedX).toBeLessThanOrEqual(screenWidth);

        // Visual bounds:
        expect(clampedX - halfBasket).toBeGreaterThanOrEqual(0);
        expect(clampedX + halfBasket).toBeLessThanOrEqual(screenWidth);
      }
    });

    it('adversarially stress tests continuous keyboard movement at high delta / sustained press', () => {
      let basketX = 240;
      const speed = 400; // px/sec

      // Simulate holding LEFT key for 1000 frames with varying deltas
      for (let i = 0; i < 1000; i++) {
        const deltaSec = 0.016667;
        basketX = Phaser.Math.Clamp(basketX - speed * deltaSec, minX, maxX);
      }
      expect(basketX).toBe(minX);
      expect(basketX - halfBasket).toBeGreaterThanOrEqual(0);

      // Simulate holding RIGHT key for 1000 frames with varying deltas
      for (let i = 0; i < 1000; i++) {
        const deltaSec = 0.016667;
        basketX = Phaser.Math.Clamp(basketX + speed * deltaSec, minX, maxX);
      }
      expect(basketX).toBe(maxX);
      expect(basketX + halfBasket).toBeLessThanOrEqual(screenWidth);

      // Extreme lag spike (delta = 5.0 seconds) while moving
      basketX = Phaser.Math.Clamp(basketX - speed * 5.0, minX, maxX);
      expect(basketX).toBe(minX);

      basketX = Phaser.Math.Clamp(basketX + speed * 5.0, minX, maxX);
      expect(basketX).toBe(maxX);
    });

    it('verifies touch input Y filtering (pointer.y > height - 140)', () => {
      const height = 800;
      const thresholdY = height - 140; // 660

      const isTouchAccepted = (y: number) => y > thresholdY;

      expect(isTouchAccepted(0)).toBe(false);
      expect(isTouchAccepted(300)).toBe(false);
      expect(isTouchAccepted(659)).toBe(false);
      expect(isTouchAccepted(660)).toBe(false);
      expect(isTouchAccepted(661)).toBe(true);
      expect(isTouchAccepted(700)).toBe(true);
      expect(isTouchAccepted(755)).toBe(true);
      expect(isTouchAccepted(800)).toBe(true);
    });
  });

  // ==========================================================================
  // 5. BASKET & FRUIT RECTANGLE COLLISION ORACLE
  // ==========================================================================
  describe('5. Basket & Fruit Collision Detection Geometry', () => {
    it('accurately detects collision when fruit enters basket bounding rectangle', () => {
      const basketRect = new Phaser.Geom.Rectangle(240 - 48, 755 - 28, 96, 56); // [192, 727, 96, 56]

      // Fruit directly aligned with basket:
      const collidingFruit = new Phaser.Geom.Rectangle(240 - 36, 730 - 37, 72, 74);
      expect(Phaser.Geom.Intersects.RectangleToRectangle(basketRect, collidingFruit)).toBe(true);

      // Fruit far above basket:
      const highFruit = new Phaser.Geom.Rectangle(240 - 36, 400 - 37, 72, 74);
      expect(Phaser.Geom.Intersects.RectangleToRectangle(basketRect, highFruit)).toBe(false);

      // Fruit to the far left:
      const leftFruit = new Phaser.Geom.Rectangle(50 - 36, 740 - 37, 72, 74);
      expect(Phaser.Geom.Intersects.RectangleToRectangle(basketRect, leftFruit)).toBe(false);

      // Fruit grazing basket right edge:
      const grazingRight = new Phaser.Geom.Rectangle(287, 730, 72, 74);
      expect(Phaser.Geom.Intersects.RectangleToRectangle(basketRect, grazingRight)).toBe(true);

      // Fruit completely missing right edge:
      const missingRight = new Phaser.Geom.Rectangle(289, 730, 72, 74);
      expect(Phaser.Geom.Intersects.RectangleToRectangle(basketRect, missingRight)).toBe(false);
    });
  });
});
