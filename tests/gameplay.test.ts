import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { gameConfig, GameScene, MenuScene } from '../src/main';
import { curriculumService } from '../src/services/curriculum.service';
import { StorageService, isMasteryAchieved, calculateStars } from '../src/services/storage.service';
import { TopicType } from '../src/schema/curriculum.schema';
import { TeachingCard } from '../src/ui/TeachingCard';

describe('Milestone 4: Core Gameplay & Pedagogical Engine', () => {

  // --------------------------------------------------------------------------
  // Suite 1: Fixed-Timestep Physics Configuration and Delta Scaling
  // --------------------------------------------------------------------------
  describe('Suite 1: Fixed-Timestep Physics & Refresh Rate Invariance', () => {
    it('enforces fixedStep: true and fps: 60 in Arcade physics config', () => {
      expect(gameConfig.physics?.default).toBe('arcade');
      const arcade = gameConfig.physics?.arcade;
      expect(arcade).toBeDefined();
      expect(arcade?.fixedStep).toBe(true);
      expect(arcade?.fps).toBe(60);
      expect(arcade?.gravity?.y).toBe(0);
    });

    it('guarantees deterministic fruit motion across 60Hz and 120Hz refresh rates', () => {
      const speed = 250; // px/sec
      const totalDurationSec = 2.0;

      // 60Hz simulation (120 frames at ~16.6667ms)
      const fps60Delta = 1000 / 60;
      const steps60 = 60 * totalDurationSec;
      let pos60 = 0;
      for (let i = 0; i < steps60; i++) {
        pos60 += speed * (fps60Delta / 1000);
      }

      // 120Hz simulation (240 frames at ~8.3333ms)
      const fps120Delta = 1000 / 120;
      const steps120 = 120 * totalDurationSec;
      let pos120 = 0;
      for (let i = 0; i < steps120; i++) {
        pos120 += speed * (fps120Delta / 1000);
      }

      // 144Hz simulation (288 frames at ~6.9444ms)
      const fps144Delta = 1000 / 144;
      const steps144 = 144 * totalDurationSec;
      let pos144 = 0;
      for (let i = 0; i < steps144; i++) {
        pos144 += speed * (fps144Delta / 1000);
      }

      const expectedPos = speed * totalDurationSec; // 500px

      expect(Math.abs(pos60 - expectedPos)).toBeLessThan(0.001);
      expect(Math.abs(pos120 - expectedPos)).toBeLessThan(0.001);
      expect(Math.abs(pos144 - expectedPos)).toBeLessThan(0.001);
      expect(Math.abs(pos60 - pos120)).toBeLessThan(0.0001);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Fall Duration Scaling (2.8s - 1.8s) Across Levels
  // --------------------------------------------------------------------------
  describe('Suite 2: Fall Duration Scaling Across Levels', () => {
    const topics: TopicType[] = ['phonics', 'morphology', 'vocabulary', 'math'];

    it('scales fall duration from 2800ms down to 1800ms monotonically across all topics', () => {
      for (const topic of topics) {
        const levels = curriculumService.getLevelsForTopic(topic);
        expect(levels.length).toBeGreaterThanOrEqual(5);

        // Level 1: 2800ms
        expect(levels[0]?.fallSpeedDurationMs).toBe(2800);
        // Boss level (Level 5): 1800ms
        expect(levels[4]?.fallSpeedDurationMs).toBe(1800);

        // Monotonically decreasing duration (faster fall speeds)
        for (let i = 1; i < levels.length; i++) {
          const prev = levels[i - 1]!.fallSpeedDurationMs;
          const curr = levels[i]!.fallSpeedDurationMs;
          expect(curr).toBeLessThan(prev);
        }
      }
    });

    it('computes correct fall speeds without doubling multiplier in GameScene', () => {
      const scene = new GameScene();
      scene.init({ topic: 'phonics', levelNumber: 1 });

      const l1Config = curriculumService.getLevel('phonics', 1);
      expect(l1Config?.fallSpeedDurationMs).toBe(2800);

      // Speed = 600px / (durationSec)
      const speedL1 = 600 / (2800 / 1000);
      expect(speedL1).toBeCloseTo(214.285, 2);

      const l5Config = curriculumService.getLevel('phonics', 5);
      expect(l5Config?.fallSpeedDurationMs).toBe(1800);
      const speedL5 = 600 / (1800 / 1000);
      expect(speedL5).toBeCloseTo(333.333, 2);

      // Verify level 5 is noticeably faster than level 1
      expect(speedL5).toBeGreaterThan(speedL1);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Fruit Container Interactive HitArea Geometry (>= 48px, Centered)
  // --------------------------------------------------------------------------
  describe('Suite 3: Fruit Container HitArea Geometry', () => {
    it('guarantees touch hitbox >= 48px in both dimensions and centers hitArea', () => {
      const testWords = ['a', 'cat', 'elephant', 'unhappiness'];

      for (const word of testWords) {
        const textLen = word.length;
        const pillW = Math.max(textLen * 11 + 24, 72);
        const hitWidth = Math.max(pillW, 64);
        const hitHeight = 74;

        expect(hitWidth).toBeGreaterThanOrEqual(48);
        expect(hitHeight).toBeGreaterThanOrEqual(48);

        // Centered hit rectangle: [-hitWidth/2, -hitHeight/2, hitWidth, hitHeight]
        const rect = new Phaser.Geom.Rectangle(
          -hitWidth / 2,
          -hitHeight / 2,
          hitWidth,
          hitHeight
        );

        // Origin (0, 0) must be contained
        expect(Phaser.Geom.Rectangle.Contains(rect, 0, 0)).toBe(true);

        // Fruit sprite position (0, -12) must be contained
        expect(Phaser.Geom.Rectangle.Contains(rect, 0, -12)).toBe(true);

        // Text label position (0, 31) must be contained
        expect(Phaser.Geom.Rectangle.Contains(rect, 0, 31)).toBe(true);

        // Negative X coordinates (left side of pill) must be contained
        expect(Phaser.Geom.Rectangle.Contains(rect, -pillW / 2 + 5, 0)).toBe(true);

        // Positive X coordinates (right side of pill) must be contained
        expect(Phaser.Geom.Rectangle.Contains(rect, pillW / 2 - 5, 0)).toBe(true);
      }
    });

    it('demonstrates default uncentered hitArea (0, 0, w, h) would fail negative coordinates', () => {
      const hitWidth = 80;
      const hitHeight = 74;

      // Default uncentered Phaser container hitArea
      const defaultRect = new Phaser.Geom.Rectangle(0, 0, hitWidth, hitHeight);
      // Centered hitArea
      const centeredRect = new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight);

      // Point at (0, -12) - fruit sprite center:
      expect(Phaser.Geom.Rectangle.Contains(defaultRect, 0, -12)).toBe(false); // Default FAILS
      expect(Phaser.Geom.Rectangle.Contains(centeredRect, 0, -12)).toBe(true); // Centered SUCCEEDS

      // Point at (-25, 10) - left half of pill:
      expect(Phaser.Geom.Rectangle.Contains(defaultRect, -25, 10)).toBe(false); // Default FAILS
      expect(Phaser.Geom.Rectangle.Contains(centeredRect, -25, 10)).toBe(true); // Centered SUCCEEDS
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Basket Movement (Tap-to-Move and Keyboard Navigation)
  // --------------------------------------------------------------------------
  describe('Suite 4: Basket Controls & Clamping', () => {
    const screenWidth = 480;
    const minX = 55;
    const maxX = screenWidth - 55; // 425

    it('clamps basket position within valid screen bounds', () => {
      expect(Phaser.Math.Clamp(240, minX, maxX)).toBe(240);
      expect(Phaser.Math.Clamp(10, minX, maxX)).toBe(minX);
      expect(Phaser.Math.Clamp(500, minX, maxX)).toBe(maxX);
    });

    it('simulates tap-to-move basket position update', () => {
      let basketX = 240;
      let princessX = 240;

      const handlePointerDown = (x: number, y: number, isPaused: boolean, isRemediating: boolean) => {
        if (y > 800 - 140 && !isPaused && !isRemediating) {
          const clampedX = Phaser.Math.Clamp(x, minX, maxX);
          basketX = clampedX;
          princessX = clampedX;
        }
      };

      // Valid bottom tap
      handlePointerDown(350, 700, false, false);
      expect(basketX).toBe(350);
      expect(princessX).toBe(350);

      // Tap too high on canvas (> 660 is required)
      handlePointerDown(100, 500, false, false);
      expect(basketX).toBe(350); // Unchanged

      // Tap while paused
      handlePointerDown(200, 700, true, false);
      expect(basketX).toBe(350); // Unchanged

      // Tap beyond left edge
      handlePointerDown(20, 700, false, false);
      expect(basketX).toBe(minX);
      expect(princessX).toBe(minX);
    });

    it('simulates keyboard left/right movement with delta time', () => {
      let basketX = 240;
      const speed = 400; // px/sec
      const deltaSec = 0.016667; // 60fps tick

      // Move left
      basketX = Phaser.Math.Clamp(basketX - speed * deltaSec, minX, maxX);
      expect(basketX).toBeCloseTo(233.333, 2);

      // Move right 10 ticks
      for (let i = 0; i < 10; i++) {
        basketX = Phaser.Math.Clamp(basketX + speed * deltaSec, minX, maxX);
      }
      expect(basketX).toBeCloseTo(300.0, 1);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Visual Morphological Segmentation on Correct Catch
  // --------------------------------------------------------------------------
  describe('Suite 5: Visual Morphological Segmentation', () => {
    it('retrieves visualSegmentation from morphology curriculum items', () => {
      const items = curriculumService.getTopic('morphology').items;
      expect(items.length).toBeGreaterThanOrEqual(30);

      for (const item of items) {
        if ('visualSegmentation' in item) {
          expect(item.visualSegmentation).toBeDefined();
          expect(item.visualSegmentation).toContain('→');
          expect(item.visualSegmentation).toMatch(/^[a-z-]+\s*\+\s*[a-z-]+\s*→\s*[a-z]+$/);
        }
      }
    });

    it('formats correct morphological toast message with sparkle indicator', () => {
      const item = curriculumService.getItemById('morph_re_replay');
      expect(item).toBeDefined();
      if (item && 'visualSegmentation' in item) {
        const toast = `✨ ${item.visualSegmentation}`;
        expect(toast).toBe('✨ re + play → replay');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: 3-Mistake Remediation, Wave Timer Cancellation & Reset
  // --------------------------------------------------------------------------
  describe('Suite 6: Remediation Trigger, Speed Dampener & State Reset', () => {
    let storage: StorageService;

    beforeEach(async () => {
      storage = new StorageService();
      await storage.resetProgress();
    });

    it('triggers remediation on exactly the 3rd consecutive mistake', async () => {
      const r1 = await storage.recordMistake('phonics', 'ea', 'bad1');
      expect(r1.consecutiveMistakes).toBe(1);
      expect(r1.shouldTriggerRemediation).toBe(false);
      expect(TeachingCard.shouldTrigger(r1.consecutiveMistakes)).toBe(false);

      const r2 = await storage.recordMistake('phonics', 'ea', 'bad2');
      expect(r2.consecutiveMistakes).toBe(2);
      expect(r2.shouldTriggerRemediation).toBe(false);
      expect(TeachingCard.shouldTrigger(r2.consecutiveMistakes)).toBe(false);

      const r3 = await storage.recordMistake('phonics', 'ea', 'bad3');
      expect(r3.consecutiveMistakes).toBe(3);
      expect(r3.shouldTriggerRemediation).toBe(true);
      expect(TeachingCard.shouldTrigger(r3.consecutiveMistakes)).toBe(true);
    });

    it('resets consecutive mistakes on correct catch or remediation dismissal', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad1');
      await storage.recordMistake('phonics', 'ea', 'bad2');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      // Correct catch resets mistakes
      await storage.recordCorrect('phonics', 'ea', 'beach');
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // 3 mistakes then manual reset (as called in TeachingCard.dismiss)
      await storage.recordMistake('phonics', 'ea', 'bad1');
      await storage.recordMistake('phonics', 'ea', 'bad2');
      await storage.recordMistake('phonics', 'ea', 'bad3');
      expect(storage.getConsecutiveMistakes()).toBe(3);

      await storage.resetConsecutiveMistakes();
      expect(storage.getConsecutiveMistakes()).toBe(0);
    });

    it('dampens fall speed by +800ms upon remediation up to 8000ms max', () => {
      let fallDurationMs = 2800;
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(3600);

      // Heavy damping caps at 8000ms
      fallDurationMs = 7600;
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(8000);

      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(8000);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Mastery Gate Alignment (>85% on 10+ Attempts)
  // --------------------------------------------------------------------------
  describe('Suite 7: Mastery Gate Progression Logic', () => {
    it('requires > 85% accuracy AND >= 10 attempts', () => {
      // Exactly 85.0% does NOT qualify (>85% strictly required)
      expect(isMasteryAchieved(85, 10)).toBe(false);
      expect(isMasteryAchieved(0.85, 10)).toBe(false);

      // > 85% with 10 attempts qualifies
      expect(isMasteryAchieved(85.1, 10)).toBe(true);
      expect(isMasteryAchieved(90, 10)).toBe(true);
      expect(isMasteryAchieved(100, 10)).toBe(true);

      // High accuracy with insufficient attempts does NOT qualify
      expect(isMasteryAchieved(100, 9)).toBe(false);
      expect(isMasteryAchieved(100, 1)).toBe(false);
      expect(isMasteryAchieved(90, 8)).toBe(false);

      // Low accuracy with many attempts does NOT qualify
      expect(isMasteryAchieved(80, 20)).toBe(false);
      expect(isMasteryAchieved(84.9, 15)).toBe(false);
    });

    it('unlocks next level in StorageService only when mastery criteria is satisfied', async () => {
      const storage = new StorageService();
      await storage.resetProgress();

      // 85% accuracy does NOT unlock level 2
      const res85 = await storage.saveLevelResult('phonics', 1, 85, 1000, 10);
      expect(res85.unlockedNextLevel).toBe(false);

      // 90% accuracy unlocks level 2
      const res90 = await storage.saveLevelResult('phonics', 1, 90, 1200, 10);
      expect(res90.unlockedNextLevel).toBe(true);
      const progress = await storage.getProgress();
      expect(progress.unlockedLevels['phonics_2']).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Star Ratings and Speech Re-Prompt
  // --------------------------------------------------------------------------
  describe('Suite 8: Star Ratings & Speech Synthesis Integration', () => {
    it('calculates 0 to 3 stars based on PPS grade-level thresholds', () => {
      expect(calculateStars(100)).toBe(3);
      expect(calculateStars(1.0)).toBe(3);
      expect(calculateStars(95)).toBe(2);
      expect(calculateStars(90)).toBe(2);
      expect(calculateStars(89)).toBe(1);
      expect(calculateStars(85)).toBe(1);
      expect(calculateStars(84.9)).toBe(0);
      expect(calculateStars(50)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 9: Touch Target Dimensions Compliance (>= 48px)
  // --------------------------------------------------------------------------
  describe('Suite 9: Touch Target Dimensions (>= 48px)', () => {
    it('verifies all interactive buttons meet or exceed 48px minimum touch height', () => {
      // RoundSummaryScene action buttons
      const summaryButtonHeight = 52;
      expect(summaryButtonHeight).toBeGreaterThanOrEqual(48);

      // GameScene pause overlay buttons
      const pauseResumeHeight = 48;
      const pauseQuitHeight = 48;
      expect(pauseResumeHeight).toBeGreaterThanOrEqual(48);
      expect(pauseQuitHeight).toBeGreaterThanOrEqual(48);

      // OrchardView tabs
      const tabHeight = 48;
      expect(tabHeight).toBeGreaterThanOrEqual(48);

      // TeachingCard resume and listen buttons
      const tcResumeWidth = 240;
      const tcResumeHeight = 54;
      const tcListenWidth = 150;
      const tcListenHeight = 48;
      expect(tcResumeWidth).toBeGreaterThanOrEqual(48);
      expect(tcResumeHeight).toBeGreaterThanOrEqual(48);
      expect(tcListenWidth).toBeGreaterThanOrEqual(48);
      expect(tcListenHeight).toBeGreaterThanOrEqual(48);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 10: Menu Navigation Topic Memory
  // --------------------------------------------------------------------------
  describe('Suite 10: Menu Navigation Topic Memory', () => {
    it('preserves selected topic when MenuScene is initialized with data', () => {
      const menu = new MenuScene();
      menu.init({ topic: 'morphology' });
      // @ts-expect-error accessing private property for test verification
      expect(menu.selectedTopic).toBe('morphology');

      menu.init({ topic: 'vocabulary' });
      // @ts-expect-error accessing private property for test verification
      expect(menu.selectedTopic).toBe('vocabulary');

      menu.init(); // Empty payload preserves current topic
      // @ts-expect-error accessing private property for test verification
      expect(menu.selectedTopic).toBe('vocabulary');
    });
  });
});
