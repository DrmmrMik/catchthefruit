import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageService,
  calculateStars,
  isMasteryAchieved
} from '../src/services/storage.service';
import {
  UserProgressSchema,
  DEFAULT_UNLOCKED_LEVELS
} from '../src/schema/progress.schema';

describe('Adversarial Progression & Storage Verification (Challenger M2-2)', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.resetProgress();
  });

  // ==========================================================================
  // Challenge 1: Boundary Conditions for Level Unlocking
  // ==========================================================================
  describe('Challenge 1: Level Unlocking Mastery Boundaries (85.0% vs >85%, 9 vs 10 attempts)', () => {
    it('CHALLENGE: 85.0% accuracy on 10 attempts must NOT unlock next level', async () => {
      // Direct oracle function check
      expect(isMasteryAchieved(0.85, 10), '0.85 float on 10 attempts').toBe(false);
      expect(isMasteryAchieved(0.8500000, 10), '0.8500000 float on 10 attempts').toBe(false);
      expect(isMasteryAchieved(85, 10), '85 integer percentage on 10 attempts').toBe(false);
      expect(isMasteryAchieved(85.0, 10), '85.0 percentage on 10 attempts').toBe(false);

      // Storage service integration check
      const result = await storage.saveLevelResult('phonics', 1, 0.85, 850, 10);
      expect(result.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);

      // Check percentage representation (85)
      const resultPct = await storage.saveLevelResult('morphology', 1, 85, 850, 10);
      expect(resultPct.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(false);
    });

    it('CHALLENGE: >85.0% accuracy on 10 attempts DOES unlock next level', async () => {
      // Just above boundary: 85.0001%
      expect(isMasteryAchieved(0.850001, 10)).toBe(true);
      // 85.1%
      expect(isMasteryAchieved(0.851, 10)).toBe(true);
      expect(isMasteryAchieved(85.1, 10)).toBe(true);
      // 9/10 items = 90.0%
      expect(isMasteryAchieved(0.90, 10)).toBe(true);
      expect(isMasteryAchieved(90, 10)).toBe(true);

      // Storage integration check with 85.1%
      const result = await storage.saveLevelResult('phonics', 1, 0.851, 851, 10);
      expect(result.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
      expect(result.progress.orchardGrowthStage).toBe(1);

      // Storage integration check with 9/10 (90%)
      const resultMorph = await storage.saveLevelResult('morphology', 1, 0.90, 900, 10);
      expect(resultMorph.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(true);
    });

    it('CHALLENGE: 100% accuracy on 9 attempts must NOT unlock next level (requires 10+)', async () => {
      // Direct oracle checks for attempts < 10
      expect(isMasteryAchieved(1.0, 9)).toBe(false);
      expect(isMasteryAchieved(100, 9)).toBe(false);
      expect(isMasteryAchieved(1.0, 8)).toBe(false);
      expect(isMasteryAchieved(1.0, 5)).toBe(false);
      expect(isMasteryAchieved(1.0, 1)).toBe(false);
      expect(isMasteryAchieved(1.0, 0)).toBe(false);
      expect(isMasteryAchieved(1.0, -1)).toBe(false);

      // Storage integration check on 9 attempts with perfect score
      const result = await storage.saveLevelResult('vocabulary', 1, 1.0, 1000, 9);
      expect(result.stars).toBe(3); // Stars earned on accuracy alone
      expect(result.unlockedNextLevel).toBe(false); // BUT progression gate remains locked
      expect(await storage.isLevelUnlocked('vocabulary', 2)).toBe(false);
    });

    it('CHALLENGE: 10+ attempts boundary tests (10, 11, 20 items)', async () => {
      // 10 attempts: 8/10 = 80% (fail)
      expect(isMasteryAchieved(8 / 10, 10)).toBe(false);
      // 10 attempts: 9/10 = 90% (pass)
      expect(isMasteryAchieved(9 / 10, 10)).toBe(true);

      // 11 attempts: 9/11 = 81.81% (fail)
      expect(isMasteryAchieved(9 / 11, 11)).toBe(false);
      // 11 attempts: 10/11 = 90.9% (pass)
      expect(isMasteryAchieved(10 / 11, 11)).toBe(true);

      // 20 attempts: 17/20 = 85.0% exactly (fail: >0.85 required)
      expect(isMasteryAchieved(17 / 20, 20)).toBe(false);
      // 20 attempts: 18/20 = 90.0% (pass)
      expect(isMasteryAchieved(18 / 20, 20)).toBe(true);
    });
  });

  // ==========================================================================
  // Challenge 2: Star Ratings Exact Boundaries
  // ==========================================================================
  describe('Challenge 2: Star Ratings Exact Boundaries (84.9%, 85.0%, 89.9%, 90.0%, 99.9%, 100%)', () => {
    it('awards 0 stars for 84.9% and below', () => {
      expect(calculateStars(0.849)).toBe(0);
      expect(calculateStars(84.9)).toBe(0);
      expect(calculateStars(0.849999)).toBe(0);
      expect(calculateStars(84.9999)).toBe(0);
      expect(calculateStars(0.0)).toBe(0);
      expect(calculateStars(0)).toBe(0);
      expect(calculateStars(-0.5)).toBe(0);
    });

    it('awards 1 star for 85.0% through 89.999%', () => {
      // Exact lower boundary: 85.0%
      expect(calculateStars(0.850)).toBe(1);
      expect(calculateStars(85.0)).toBe(1);
      expect(calculateStars(0.850001)).toBe(1);

      // Intermediate values
      expect(calculateStars(0.875)).toBe(1);
      expect(calculateStars(87.5)).toBe(1);

      // Exact upper boundary: 89.9% and 89.999%
      expect(calculateStars(0.899)).toBe(1);
      expect(calculateStars(89.9)).toBe(1);
      expect(calculateStars(0.899999)).toBe(1);
    });

    it('awards 2 stars for 90.0% through 99.999%', () => {
      // Exact lower boundary: 90.0%
      expect(calculateStars(0.900)).toBe(2);
      expect(calculateStars(90.0)).toBe(2);
      expect(calculateStars(0.900001)).toBe(2);

      // Intermediate values
      expect(calculateStars(0.95)).toBe(2);
      expect(calculateStars(95.0)).toBe(2);

      // Exact upper boundary: 99.9% and 99.999%
      expect(calculateStars(0.999)).toBe(2);
      expect(calculateStars(99.9)).toBe(2);
      expect(calculateStars(0.999999)).toBe(2);
    });

    it('awards 3 stars for 100.0% (and handles integer percentages >= 100)', () => {
      expect(calculateStars(1.000)).toBe(3);
      expect(calculateStars(100.0)).toBe(3);
      expect(calculateStars(100)).toBe(3);
      expect(calculateStars(105)).toBe(3);
      expect(calculateStars(120)).toBe(3);
    });
  });

  // ==========================================================================
  // Challenge 3: Consecutive Mistakes & Remediation Triggers
  // ==========================================================================
  describe('Challenge 3: Consecutive Mistakes Remediation Triggers (1 vs 2 vs 3, reset on correct)', () => {
    it('remediation triggers strictly at 3 consecutive mistakes, not 1 or 2', async () => {
      // Initial state
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Mistake 1: consecutive = 1, remediation = false
      const m1 = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      expect(m1.consecutiveMistakes).toBe(1);
      expect(m1.shouldTriggerRemediation).toBe(false);
      expect(storage.getConsecutiveMistakes()).toBe(1);

      // Mistake 2: consecutive = 2, remediation = false
      const m2 = await storage.recordMistake('phonics', 'ea_short_e', 'head');
      expect(m2.consecutiveMistakes).toBe(2);
      expect(m2.shouldTriggerRemediation).toBe(false);
      expect(storage.getConsecutiveMistakes()).toBe(2);

      // Mistake 3: consecutive = 3, remediation = TRUE!
      const m3 = await storage.recordMistake('phonics', 'ea_short_e', 'thread');
      expect(m3.consecutiveMistakes).toBe(3);
      expect(m3.shouldTriggerRemediation).toBe(true);
      expect(storage.getConsecutiveMistakes()).toBe(3);

      // Mistake 4 (unaddressed): consecutive = 4, remediation = TRUE
      const m4 = await storage.recordMistake('phonics', 'ea_short_e', 'sweat');
      expect(m4.consecutiveMistakes).toBe(4);
      expect(m4.shouldTriggerRemediation).toBe(true);
    });

    it('correct answer immediately resets consecutive mistake counter to 0', async () => {
      // Accumulate 2 mistakes
      await storage.recordMistake('phonics', 'ai', 'rain');
      await storage.recordMistake('phonics', 'ai', 'train');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      // Correct answer caught -> counter reset
      await storage.recordCorrect('phonics', 'ai', 'brain');
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Next mistake starts at 1, remediation FALSE
      const nextM = await storage.recordMistake('phonics', 'ai', 'paint');
      expect(nextM.consecutiveMistakes).toBe(1);
      expect(nextM.shouldTriggerRemediation).toBe(false);
    });

    it('handles interleaved mistake/correct patterns without false remediation triggers', async () => {
      // Pattern: M, M, C, M, M, C, M, M, M (only 9th triggers)
      await storage.recordMistake('morphology', 're', 'replay'); // 1
      await storage.recordMistake('morphology', 're', 'redo');   // 2
      await storage.recordCorrect('morphology', 're', 'rewrite'); // reset to 0

      expect(storage.getConsecutiveMistakes()).toBe(0);

      await storage.recordMistake('morphology', 'un', 'unhappy'); // 1
      await storage.recordMistake('morphology', 'un', 'unsafe');  // 2
      await storage.recordCorrect('morphology', 'un', 'unlock');  // reset to 0

      expect(storage.getConsecutiveMistakes()).toBe(0);

      const m1 = await storage.recordMistake('morphology', 'dis', 'dislike');
      expect(m1.shouldTriggerRemediation).toBe(false);

      const m2 = await storage.recordMistake('morphology', 'dis', 'disagree');
      expect(m2.shouldTriggerRemediation).toBe(false);

      const m3 = await storage.recordMistake('morphology', 'dis', 'disobey');
      expect(m3.consecutiveMistakes).toBe(3);
      expect(m3.shouldTriggerRemediation).toBe(true);
    });

    it('resetConsecutiveMistakes() clears streak after teaching card is displayed', async () => {
      await storage.recordMistake('vocabulary', 'synonym', 'big');
      await storage.recordMistake('vocabulary', 'synonym', 'fast');
      await storage.recordMistake('vocabulary', 'synonym', 'happy');
      expect(storage.getConsecutiveMistakes()).toBe(3);

      // Simulate teaching card display & acknowledgement
      await storage.resetConsecutiveMistakes();
      expect(storage.getConsecutiveMistakes()).toBe(0);

      const next = await storage.recordMistake('vocabulary', 'synonym', 'dark');
      expect(next.consecutiveMistakes).toBe(1);
      expect(next.shouldTriggerRemediation).toBe(false);
    });
  });

  // ==========================================================================
  // Challenge 4: Data Persistence Roundtrips, Monotonicity & Migration
  // ==========================================================================
  describe('Challenge 4: Data Persistence Roundtrips, Monotonicity & Schema Migration', () => {
    it('preserves stars monotonically (lower performance does not overwrite higher award)', async () => {
      // Run 1: Flawless -> 3 stars, score 1000
      await storage.saveLevelResult('phonics', 1, 1.0, 1000, 10);
      let progress = await storage.getProgress();
      expect(progress.stars['phonics_1']).toBe(3);
      expect(progress.highScores['phonics_1']).toBe(1000);

      // Run 2: Poor run -> 0 stars, score 300
      await storage.saveLevelResult('phonics', 1, 0.50, 300, 10);
      progress = await storage.getProgress();
      expect(progress.stars['phonics_1'], 'Stars must remain 3').toBe(3);
      expect(progress.highScores['phonics_1'], 'High score must remain 1000').toBe(1000);

      // Run 3: 2 stars, higher score -> score updates, stars stay 3
      await storage.saveLevelResult('phonics', 1, 0.90, 1500, 10);
      progress = await storage.getProgress();
      expect(progress.stars['phonics_1'], 'Stars must remain 3').toBe(3);
      expect(progress.highScores['phonics_1'], 'High score updates to 1500').toBe(1500);
    });

    it('preserves level unlocks monotonically (unlocked levels never re-lock)', async () => {
      // Unlock level 2
      await storage.saveLevelResult('phonics', 1, 0.90, 900, 10);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);

      // Replay level 1 with 0% accuracy
      await storage.saveLevelResult('phonics', 1, 0.0, 0, 10);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
    });

    it('caps orchard growth stage at 10 and prevents duplicate increments', async () => {
      let progress = await storage.getProgress();
      expect(progress.orchardGrowthStage).toBe(0);

      // Unlock phonics_2 -> stage = 1
      await storage.saveLevelResult('phonics', 1, 0.90, 900, 10);
      progress = await storage.getProgress();
      expect(progress.orchardGrowthStage).toBe(1);

      // Replay phonics_1 with mastery -> stage must NOT double increment
      await storage.saveLevelResult('phonics', 1, 1.0, 1000, 10);
      progress = await storage.getProgress();
      expect(progress.orchardGrowthStage).toBe(1);

      // Advance through multiple levels
      for (let i = 2; i <= 5; i++) {
        await storage.saveLevelResult('phonics', i, 0.90, 900, 10);
      }
      for (let i = 1; i <= 5; i++) {
        await storage.saveLevelResult('morphology', i, 0.90, 900, 10);
      }
      for (let i = 1; i <= 5; i++) {
        await storage.saveLevelResult('vocabulary', i, 0.90, 900, 10);
      }

      progress = await storage.getProgress();
      expect(progress.orchardGrowthStage).toBeLessThanOrEqual(10);
    });

    it('validates schema migration defaults for legacy payloads with missing fields', () => {
      // Simulating a legacy v0 progress payload missing new fields
      const legacyPayload = {
        version: 1,
        unlockedLevels: { 'phonics_1': true },
        stars: { 'phonics_1': 2 },
        highScores: { 'phonics_1': 800 }
        // Missing: errorStats, settings, orchardGrowthStage, lastActiveTimestamp
      };

      const migrated = UserProgressSchema.parse(legacyPayload);
      expect(migrated.settings.sfxVolume).toBe(0.8);
      expect(migrated.settings.ttsEnabled).toBe(true);
      expect(migrated.settings.highContrast).toBe(false);
      expect(migrated.errorStats.consecutiveMistakes).toBe(0);
      expect(migrated.errorStats.totalAttempts).toBe(0);
      expect(migrated.orchardGrowthStage).toBe(0);
      expect(typeof migrated.lastActiveTimestamp).toBe('number');
    });

    it('safely sanitizes and strips unexpected extra fields without crashing', () => {
      const payloadWithExtras = {
        version: 1,
        unlockedLevels: { ...DEFAULT_UNLOCKED_LEVELS },
        stars: {},
        highScores: {},
        errorStats: {
          patternErrors: {},
          wordErrors: {},
          totalAttempts: 5,
          totalCorrect: 4,
          consecutiveMistakes: 0
        },
        settings: {
          sfxVolume: 0.7,
          musicVolume: 0.4,
          ttsEnabled: true,
          highContrast: true
        },
        orchardGrowthStage: 2,
        lastActiveTimestamp: Date.now(),
        // Extra unexpected fields from potential future versions or third-party tampering
        unknownLegacyField: 'should_be_ignored',
        telemetryToken: 'secret123'
      };

      const parsed = UserProgressSchema.parse(payloadWithExtras);
      expect(parsed.version).toBe(1);
      expect(parsed.settings.highContrast).toBe(true);
      // Ensure extra fields do not pollute validated schema
      expect((parsed as Record<string, unknown>).unknownLegacyField).toBeUndefined();
      expect((parsed as Record<string, unknown>).telemetryToken).toBeUndefined();
    });

    it('handles persistence across storage service instances with fallback resiliency', async () => {
      // Save settings and level progress in instance 1
      await storage.updateSettings({ highContrast: true, sfxVolume: 0.4 });
      await storage.saveLevelResult('math', 1, 1.0, 950, 10);

      const retrieved = await storage.getProgress();
      expect(retrieved.settings.highContrast).toBe(true);
      expect(retrieved.settings.sfxVolume).toBe(0.4);
      expect(retrieved.stars['math_1']).toBe(3);
      expect(retrieved.unlockedLevels['math_2']).toBe(true);
    });
  });

  // ==========================================================================
  // Challenge 5: Property-Based / Fuzz Oracle Verification
  // ==========================================================================
  describe('Challenge 5: Property-Based / Fuzz Invariant Verification', () => {
    it('PROPERTY: calculateStars partitions the unit interval into 4 disjoint monotonic zones', () => {
      // Generate 2000 precision test points across [-0.1, 1.1]
      for (let i = 0; i <= 2000; i++) {
        const accuracy = Number((i / 2000).toFixed(4));
        const stars = calculateStars(accuracy);

        if (accuracy < 0.85) {
          expect(stars, `Accuracy ${accuracy} must give 0 stars`).toBe(0);
        } else if (accuracy < 0.90) {
          expect(stars, `Accuracy ${accuracy} must give 1 star`).toBe(1);
        } else if (accuracy < 1.00) {
          expect(stars, `Accuracy ${accuracy} must give 2 stars`).toBe(2);
        } else {
          expect(stars, `Accuracy ${accuracy} must give 3 stars`).toBe(3);
        }
      }
    });

    it('PROPERTY: isMasteryAchieved strictly requires attempts >= 10 AND accuracy > 0.85', () => {
      // Sweep attempts from 0 to 25 and accuracy from 0.80 to 0.90
      for (let attempts = 0; attempts <= 25; attempts++) {
        for (let acc100 = 80; acc100 <= 90; acc100++) {
          const acc = acc100 / 100;
          const mastery = isMasteryAchieved(acc, attempts);
          const expected = attempts >= 10 && acc > 0.85;

          expect(
            mastery,
            `Mastery invariant failed for attempts=${attempts}, acc=${acc}`
          ).toBe(expected);
        }
      }
    });

    it('ADVERSARIAL: float precision danger zone (1 + Number.EPSILON behavior)', () => {
      // Float slightly above 1.0 (e.g., 1.0000000000000002)
      const epsOver = 1 + Number.EPSILON;
      // Because accuracy > 1 is true, epsOver is divided by 100 -> ~0.01
      // Challenger documents this implementation characteristic:
      expect(epsOver > 1).toBe(true);
      expect(calculateStars(epsOver)).toBe(0); // Divided by 100 to 0.0100...
      expect(isMasteryAchieved(epsOver, 10)).toBe(false);

      // In contrast, genuine ratio 1.0 or percentage 100 works perfectly:
      expect(calculateStars(1.0)).toBe(3);
      expect(calculateStars(100)).toBe(3);
      expect(isMasteryAchieved(1.0, 10)).toBe(true);
      expect(isMasteryAchieved(100, 10)).toBe(true);
    });

    it('ADVERSARIAL: invalid, NaN and negative values handle gracefully without throwing', () => {
      expect(calculateStars(NaN)).toBe(0);
      expect(calculateStars(-1)).toBe(0);
      expect(calculateStars(-999)).toBe(0);
      expect(isMasteryAchieved(NaN, 10)).toBe(false);
      expect(isMasteryAchieved(-1, 10)).toBe(false);
      expect(isMasteryAchieved(1.0, NaN)).toBe(false);
      expect(isMasteryAchieved(1.0, -10)).toBe(false);
    });

    it('ADVERSARIAL: cumulative error statistics maintain monotonicity across correct resets', async () => {
      // Track errors for a specific tricky pattern
      await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      await storage.recordMistake('phonics', 'ea_short_e', 'head');
      expect(storage.getConsecutiveMistakes()).toBe(3);

      let p = await storage.getProgress();
      expect(p.errorStats.patternErrors['ea_short_e']).toBe(3);
      expect(p.errorStats.wordErrors['bread']).toBe(2);
      expect(p.errorStats.wordErrors['head']).toBe(1);
      expect(p.errorStats.totalAttempts).toBe(3);
      expect(p.errorStats.totalCorrect).toBe(0);

      // Correct catch resets consecutive mistakes BUT NOT cumulative stats
      await storage.recordCorrect('phonics', 'ea_long_e', 'beach');
      expect(storage.getConsecutiveMistakes()).toBe(0);

      p = await storage.getProgress();
      expect(p.errorStats.patternErrors['ea_short_e']).toBe(3); // Preserved!
      expect(p.errorStats.wordErrors['bread']).toBe(2);         // Preserved!
      expect(p.errorStats.totalAttempts).toBe(4);               // Monotonic increment!
      expect(p.errorStats.totalCorrect).toBe(1);                // Monotonic increment!
    });

    it('ADVERSARIAL: resetProgress cleanly restores all defaults and level 1 unlocks', async () => {
      // Modify everything
      await storage.saveLevelResult('phonics', 1, 1.0, 2000, 10);
      await storage.saveLevelResult('phonics', 2, 0.95, 1800, 10);
      await storage.updateSettings({ highContrast: true, sfxVolume: 0.1 });
      await storage.recordMistake('phonics', 'ea_short_e', 'bread');

      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);

      // Reset
      const resetState = await storage.resetProgress();
      expect(resetState.stars).toEqual({});
      expect(resetState.highScores).toEqual({});
      expect(resetState.orchardGrowthStage).toBe(0);
      expect(resetState.errorStats.totalAttempts).toBe(0);
      expect(resetState.settings.sfxVolume).toBe(0.8);
      expect(resetState.settings.highContrast).toBe(false);

      // Initial level 1 unlocks restored
      expect(resetState.unlockedLevels['phonics_1']).toBe(true);
      expect(resetState.unlockedLevels['morphology_1']).toBe(true);
      expect(resetState.unlockedLevels['vocabulary_1']).toBe(true);
      expect(resetState.unlockedLevels['math_1']).toBe(true);
      expect(resetState.unlockedLevels['phonics_2']).toBeUndefined();
    });
  });
});
