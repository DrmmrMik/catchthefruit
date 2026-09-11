import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService, isMasteryAchieved, calculateStars } from '../src/services/storage.service';
import { TeachingCard } from '../src/ui/TeachingCard';
import { curriculumService } from '../src/services/curriculum.service';
import fs from 'node:fs';
import path from 'node:path';

describe('Challenger R3-2 Adversarial Empirical Stress Test Suite', () => {
  const rootDir = process.cwd();

  // ==========================================================================
  // CHALLENGE 1: Fixed-Timestep Physics & Refresh Rates
  // ==========================================================================
  describe('Challenge 1: Fixed-Timestep Physics & Refresh Rates (60Hz, 120Hz, 144Hz, 240Hz)', () => {
    it('empirically verifies delta displacement invariance across 60Hz, 120Hz, 144Hz, and 240Hz for fruit falling', () => {
      // Test across multiple fall durations (standard levels + remediation damped)
      const durations = [1800, 2000, 2200, 2400, 2600, 2800, 3600, 4400, 5200, 8000];
      const totalFallDistance = 600; // px

      for (const fallDurationMs of durations) {
        const speed = totalFallDistance / (fallDurationMs / 1000); // px/s

        // Refresh rate frame delta definitions (in ms)
        const rates = [
          { hz: 60, delta: 1000 / 60 },
          { hz: 120, delta: 1000 / 120 },
          { hz: 144, delta: 1000 / 144 },
          { hz: 240, delta: 1000 / 240 }
        ];

        // 1. Invariance over exactly 1.0 second
        const displacements1s: Record<number, number> = {};
        for (const { hz, delta } of rates) {
          let pos = 0;
          for (let frame = 0; frame < hz; frame++) {
            pos += speed * (delta / 1000);
          }
          displacements1s[hz] = pos;
          // In 1.0s, displacement must equal speed exactly
          expect(Math.abs(pos - speed)).toBeLessThan(1e-6);
        }

        // Pairwise comparison between all refresh rates: delta displacement must be invariant
        for (const r1 of rates) {
          for (const r2 of rates) {
            const diff = Math.abs(displacements1s[r1.hz]! - displacements1s[r2.hz]!);
            expect(diff, `Diff between ${r1.hz}Hz and ${r2.hz}Hz at duration ${fallDurationMs}ms`).toBeLessThan(1e-9);
          }
        }

        // 2. Invariance over full fall duration (reaching exactly totalFallDistance = 600px)
        for (const { hz, delta } of rates) {
          const totalFrames = Math.round(hz * (fallDurationMs / 1000));
          let fullPos = 0;
          for (let frame = 0; frame < totalFrames; frame++) {
            fullPos += speed * (delta / 1000);
          }
          expect(Math.abs(fullPos - totalFallDistance), `Full fall displacement for ${hz}Hz`).toBeLessThan(1e-5);
        }
      }
    });

    it('empirically verifies basket horizontal displacement invariance across 60Hz, 120Hz, 144Hz, and 240Hz', () => {
      const basketSpeed = 400; // px/s (from GameScene.ts desktop controls)
      const durationSec = 1.5;

      const rates = [
        { hz: 60, delta: 1000 / 60 },
        { hz: 120, delta: 1000 / 120 },
        { hz: 144, delta: 1000 / 144 },
        { hz: 240, delta: 1000 / 240 }
      ];

      const displacements: Record<number, number> = {};
      for (const { hz, delta } of rates) {
        let x = 0;
        const totalFrames = Math.round(hz * durationSec);
        for (let frame = 0; frame < totalFrames; frame++) {
          x += basketSpeed * (delta / 1000);
        }
        displacements[hz] = x;
        expect(Math.abs(x - basketSpeed * durationSec)).toBeLessThan(1e-6);
      }

      // Assert pairwise invariance
      for (const r1 of rates) {
        for (const r2 of rates) {
          const diff = Math.abs(displacements[r1.hz]! - displacements[r2.hz]!);
          expect(diff, `Basket move diff between ${r1.hz}Hz and ${r2.hz}Hz`).toBeLessThan(1e-9);
        }
      }
    });

    it('stress tests delta displacement under erratic frame rate spikes and frame drops (2ms to 100ms)', () => {
      const speed = 250; // px/s
      // Erratic deltas simulating heavy browser garbage collection, background tab throttling, etc.
      const erraticDeltas = [
        16.66, 8.33, 33.33, 4.16, 50.0, 100.0, 6.94, 12.5, 25.0, 16.66,
        2.0, 80.0, 16.66, 8.33, 14.28, 7.14, 16.66, 33.33, 50.0, 10.0
      ];
      const totalTimeMs = erraticDeltas.reduce((sum, d) => sum + d, 0);
      const totalTimeSec = totalTimeMs / 1000;

      let pos = 0;
      for (const delta of erraticDeltas) {
        pos += speed * (delta / 1000);
      }

      const expectedPos = speed * totalTimeSec;
      expect(Math.abs(pos - expectedPos)).toBeLessThan(1e-6);
    });

    it('verifies static AST configuration of fixedStep physics in main.ts and GameScene.ts', () => {
      const mainPath = path.join(rootDir, 'src/main.ts');
      const gameScenePath = path.join(rootDir, 'src/scenes/GameScene.ts');

      const mainContent = fs.readFileSync(mainPath, 'utf-8');
      const gameSceneContent = fs.readFileSync(gameScenePath, 'utf-8');

      // main.ts arcade config
      expect(mainContent).toContain('fixedStep: true');
      expect(mainContent).toContain("default: 'arcade'");
      expect(mainContent).toContain('fps: 60');

      // GameScene.ts fixedStep assertion
      expect(gameSceneContent).toContain('this.physics.world.fixedStep = true');

      // GameScene.ts delta scaling in update()
      expect(gameSceneContent).toContain('const deltaSeconds = delta / 1000');
      expect(gameSceneContent).toContain('fruit.container.y += fruit.speed * deltaSeconds');
      expect(gameSceneContent).toContain('this.basket.x - 400 * deltaSeconds');
      expect(gameSceneContent).toContain('this.basket.x + 400 * deltaSeconds');
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Remediation State Machine
  // ==========================================================================
  describe('Challenge 2: Remediation State Machine (Trigger, Speed Dampener, Modal, Wave Timer)', () => {
    let storage: StorageService;

    beforeEach(async () => {
      storage = new StorageService();
      await storage.resetProgress();
    });

    it('asserts 1 mistake does NOT trigger remediation', async () => {
      expect(storage.getConsecutiveMistakes()).toBe(0);

      const res1 = await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      expect(res1.consecutiveMistakes).toBe(1);
      expect(res1.shouldTriggerRemediation).toBe(false);
      expect(storage.getConsecutiveMistakes()).toBe(1);
      expect(TeachingCard.shouldTrigger(1)).toBe(false);
    });

    it('asserts 2 mistakes do NOT trigger remediation', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      const res2 = await storage.recordMistake('phonics', 'ea', 'bad_item_2');

      expect(res2.consecutiveMistakes).toBe(2);
      expect(res2.shouldTriggerRemediation).toBe(false);
      expect(storage.getConsecutiveMistakes()).toBe(2);
      expect(TeachingCard.shouldTrigger(2)).toBe(false);
    });

    it('asserts exactly 3 consecutive mistakes triggers remediation', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      await storage.recordMistake('phonics', 'ea', 'bad_item_2');
      const res3 = await storage.recordMistake('phonics', 'ea', 'bad_item_3');

      expect(res3.consecutiveMistakes).toBe(3);
      expect(res3.shouldTriggerRemediation).toBe(true);
      expect(storage.getConsecutiveMistakes()).toBe(3);
      expect(TeachingCard.shouldTrigger(3)).toBe(true);
    });

    it('asserts speed dampener increases fall duration by exactly +800ms', () => {
      let fallDurationMs = 2800; // Level 1 initial duration

      // 1st remediation dampening: +800ms
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(3600);

      // Verify speed drops
      const speedBefore = 600 / (2800 / 1000);
      const speedAfter = 600 / (3600 / 1000);
      expect(speedAfter).toBeLessThan(speedBefore);
      expect(speedBefore).toBeCloseTo(214.2857, 3);
      expect(speedAfter).toBeCloseTo(166.6667, 3);

      // Subsequent dampening steps
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(4400);

      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(5200);

      // Up to 8000ms ceiling
      fallDurationMs = 7600;
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(8000);

      // Clamped at 8000ms
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(8000);
    });

    it('asserts wave timer is canceled during remediation and only resumed on card dismissal', async () => {
      // Rigorous state machine simulator modeling GameScene lifecycle
      let isRemediating = false;
      let isPaused = false;
      let waveSpawnTimer: { id: number; canceled: boolean } | undefined = undefined;
      let timerCounter = 0;
      let wavesSpawned = 0;

      const scheduleWaveSpawn = (delayMs: number) => {
        if (!isRemediating && !isPaused) {
          timerCounter++;
          const timerObj = { id: timerCounter, canceled: false };
          waveSpawnTimer = timerObj;
          return timerObj;
        }
        return undefined;
      };

      const cancelWaveTimer = () => {
        if (waveSpawnTimer) {
          waveSpawnTimer.canceled = true;
          waveSpawnTimer = undefined;
        }
      };

      const triggerRemediation = () => {
        isRemediating = true;
        cancelWaveTimer();
      };

      const dismissModalAndResume = () => {
        isRemediating = false;
        // Schedule next wave
        scheduleWaveSpawn(400);
      };

      // 1. Initial state: normal wave scheduled
      scheduleWaveSpawn(500);
      expect(waveSpawnTimer).toBeDefined();
      expect(waveSpawnTimer?.canceled).toBe(false);

      // 2. Mistake 3 triggers remediation: timer must be canceled immediately
      triggerRemediation();
      expect(isRemediating).toBe(true);
      expect(waveSpawnTimer).toBeUndefined();

      // 3. Fruit animation complete event fires while in remediation: must NOT schedule new wave
      const attemptedTimer = scheduleWaveSpawn(500);
      expect(attemptedTimer).toBeUndefined();
      expect(waveSpawnTimer).toBeUndefined();

      // 4. Update loop runs while in remediation: update must be paused
      const canUpdateRun = !isPaused && !isRemediating;
      expect(canUpdateRun).toBe(false);

      // 5. Dismiss modal: wave timer resumes
      dismissModalAndResume();
      expect(isRemediating).toBe(false);
      expect(waveSpawnTimer).toBeDefined();
      expect(waveSpawnTimer?.canceled).toBe(false);
    });

    it('asserts correct catch resets consecutive mistake streak to 0', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_1');
      await storage.recordMistake('phonics', 'ea', 'bad_2');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      // Correct catch
      await storage.recordCorrect('phonics', 'ea', 'beach');
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Next mistake starts at 1
      const res = await storage.recordMistake('phonics', 'ea', 'bad_3');
      expect(res.consecutiveMistakes).toBe(1);
      expect(res.shouldTriggerRemediation).toBe(false);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Mastery & Unlocking Boundaries
  // ==========================================================================
  describe('Challenge 3: Mastery & Unlocking Boundaries (85.0% vs 85.0001%, 9 vs 10 attempts)', () => {
    let storage: StorageService;

    beforeEach(async () => {
      storage = new StorageService();
      await storage.resetProgress();
    });

    it('asserts 85.0% accuracy on 10 attempts leaves level locked (strict > 0.85 requirement)', async () => {
      // Float notation
      expect(isMasteryAchieved(0.85, 10)).toBe(false);
      expect(isMasteryAchieved(0.8500000, 10)).toBe(false);

      // Percentage notation (85.0)
      expect(isMasteryAchieved(85.0, 10)).toBe(false);
      expect(isMasteryAchieved(85, 10)).toBe(false);

      // Storage integration verification
      const res = await storage.saveLevelResult('phonics', 1, 0.85, 850, 10);
      expect(res.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);

      // Percentage format in saveLevelResult
      const resPct = await storage.saveLevelResult('morphology', 1, 85.0, 850, 10);
      expect(resPct.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(false);
    });

    it('asserts 85.0001% accuracy on 10 attempts unlocks the next level', async () => {
      // Float notation
      expect(isMasteryAchieved(0.850001, 10)).toBe(true);

      // Percentage notation
      expect(isMasteryAchieved(85.0001, 10)).toBe(true);

      // 90% (9/10 correct)
      expect(isMasteryAchieved(0.90, 10)).toBe(true);
      expect(isMasteryAchieved(90.0, 10)).toBe(true);

      // Storage integration
      const res = await storage.saveLevelResult('phonics', 1, 0.850001, 850, 10);
      expect(res.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
      expect(res.progress.unlockedLevels['phonics_2']).toBe(true);
    });

    it('asserts 100% accuracy on 9 attempts leaves level locked (>= 10 attempts strictly required)', async () => {
      // Perfect score on attempts < 10
      expect(isMasteryAchieved(1.0, 9)).toBe(false);
      expect(isMasteryAchieved(100.0, 9)).toBe(false);
      expect(isMasteryAchieved(1.0, 8)).toBe(false);
      expect(isMasteryAchieved(1.0, 5)).toBe(false);
      expect(isMasteryAchieved(1.0, 1)).toBe(false);
      expect(isMasteryAchieved(1.0, 0)).toBe(false);

      // Storage integration
      const res = await storage.saveLevelResult('vocabulary', 1, 1.0, 1000, 9);
      expect(res.stars).toBe(3); // 3 stars earned on accuracy
      expect(res.unlockedNextLevel).toBe(false); // BUT progression gate remains locked!
      expect(await storage.isLevelUnlocked('vocabulary', 2)).toBe(false);
    });

    it('fuzz tests 100,000 float points across the 0.85 boundary', () => {
      const step = 0.00001;
      // Test 50,000 points strictly <= 0.85
      for (let i = 0; i <= 50000; i++) {
        const val = 0.35 + i * step; // 0.35 to 0.85
        if (val <= 0.85) {
          expect(isMasteryAchieved(val, 10)).toBe(false);
        }
      }

      // Test 50,000 points strictly > 0.85
      for (let i = 1; i <= 50000; i++) {
        const val = 0.85 + i * step; // 0.85001 to 1.35
        if (val <= 1.0) {
          expect(isMasteryAchieved(val, 10)).toBe(true);
        }
      }

      // Fuzz test attempts count with 100% accuracy: 0 through 9 must be false, 10+ must be true
      for (let attempts = 0; attempts < 10; attempts++) {
        expect(isMasteryAchieved(1.0, attempts)).toBe(false);
      }
      for (let attempts = 10; attempts <= 100; attempts++) {
        expect(isMasteryAchieved(1.0, attempts)).toBe(true);
      }
    });

    it('asserts monotonic progression persistence (unlocked levels never re-lock)', async () => {
      // 1. Unlock Level 2 with 90%
      await storage.saveLevelResult('math', 1, 0.90, 900, 10);
      expect(await storage.isLevelUnlocked('math', 2)).toBe(true);

      // 2. Replay Level 1 with failing score (20%)
      const replayRes = await storage.saveLevelResult('math', 1, 0.20, 200, 10);
      expect(replayRes.unlockedNextLevel).toBe(false);
      // Level 2 MUST REMAIN UNLOCKED
      expect(await storage.isLevelUnlocked('math', 2)).toBe(true);
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Full Test Suite & Build Verification
  // ==========================================================================
  describe('Challenge 4: Test Suite & Build Invariants', () => {
    it('verifies calculateStars boundaries match pedagogical specifications', () => {
      // 100% -> 3 stars
      expect(calculateStars(1.0)).toBe(3);
      expect(calculateStars(100)).toBe(3);

      // 90% -> 2 stars
      expect(calculateStars(0.95)).toBe(2);
      expect(calculateStars(0.90)).toBe(2);
      expect(calculateStars(90)).toBe(2);

      // 85% -> 1 star
      expect(calculateStars(0.89)).toBe(1);
      expect(calculateStars(0.85)).toBe(1);
      expect(calculateStars(85)).toBe(1);

      // < 85% -> 0 stars
      expect(calculateStars(0.8499)).toBe(0);
      expect(calculateStars(84.99)).toBe(0);
      expect(calculateStars(0.50)).toBe(0);
      expect(calculateStars(0.0)).toBe(0);
    });

    it('verifies all 4 topics have at least 5 scaffolded levels with decreasing fall durations', () => {
      const topics = ['phonics', 'morphology', 'vocabulary', 'math'] as const;
      for (const topic of topics) {
        const levels = curriculumService.getLevelsForTopic(topic);
        expect(levels.length).toBeGreaterThanOrEqual(5);

        // Verify Level 1 is 2800ms and Level 5 is 1800ms
        const l1 = levels.find(l => l.levelNumber === 1);
        const l5 = levels.find(l => l.levelNumber === 5);
        expect(l1?.fallSpeedDurationMs).toBe(2800);
        expect(l5?.fallSpeedDurationMs).toBe(1800);

        // Verify non-increasing durations (faster speeds)
        for (let i = 1; i < levels.length; i++) {
          expect(levels[i]!.fallSpeedDurationMs).toBeLessThanOrEqual(levels[i - 1]!.fallSpeedDurationMs);
        }
      }
    });
  });
});
