import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageService,
  storageService,
  calculateStars,
  isMasteryAchieved
} from '../src/services/storage.service';
import { UserProgressSchema } from '../src/schema/progress.schema';

describe('Milestone 2 Persistence Engine & Storage Service', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.resetProgress();
  });

  describe('Star Rating Calculation Rules', () => {
    it('awards 3 stars for 100% accuracy (flawless)', () => {
      expect(calculateStars(1.0)).toBe(3);
      expect(calculateStars(100)).toBe(3);
    });

    it('awards 2 stars for >= 90% and < 100% accuracy', () => {
      expect(calculateStars(0.95)).toBe(2);
      expect(calculateStars(0.90)).toBe(2);
      expect(calculateStars(95)).toBe(2);
      expect(calculateStars(90)).toBe(2);
    });

    it('awards 1 star for >= 85% and < 90% accuracy', () => {
      expect(calculateStars(0.85)).toBe(1);
      expect(calculateStars(0.89)).toBe(1);
      expect(calculateStars(85)).toBe(1);
      expect(calculateStars(89)).toBe(1);
    });

    it('awards 0 stars for < 85% accuracy (mastery not met)', () => {
      expect(calculateStars(0.84)).toBe(0);
      expect(calculateStars(0.70)).toBe(0);
      expect(calculateStars(0.50)).toBe(0);
      expect(calculateStars(0)).toBe(0);
      expect(calculateStars(84)).toBe(0);
    });
  });

  describe('Mastery Advancement Threshold Rules', () => {
    it('requires BOTH > 85% accuracy AND >= 10 attempts', () => {
      // High accuracy but fewer than 10 attempts -> mastery NOT met
      expect(isMasteryAchieved(1.0, 5)).toBe(false);
      expect(isMasteryAchieved(1.0, 9)).toBe(false);

      // Exactly 85% on 10 attempts -> mastery NOT met (> 85% required)
      expect(isMasteryAchieved(0.85, 10)).toBe(false);
      expect(isMasteryAchieved(0.84, 12)).toBe(false);

      // > 85% on 10 or more attempts -> mastery ACHIEVED
      expect(isMasteryAchieved(0.86, 10)).toBe(true);
      expect(isMasteryAchieved(0.90, 10)).toBe(true);
      expect(isMasteryAchieved(1.0, 10)).toBe(true);
      expect(isMasteryAchieved(0.92, 15)).toBe(true);
    });
  });

  describe('Initial State & Level Progression', () => {
    it('initializes with Level 1 unlocked for all four topics and Level 2 locked', async () => {
      const progress = await storage.getProgress();

      expect(progress.unlockedLevels['phonics_1']).toBe(true);
      expect(progress.unlockedLevels['morphology_1']).toBe(true);
      expect(progress.unlockedLevels['vocabulary_1']).toBe(true);
      expect(progress.unlockedLevels['math_1']).toBe(true);

      expect(await storage.isLevelUnlocked('phonics', 1)).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(false);
      expect(await storage.isLevelUnlocked('vocabulary', 2)).toBe(false);
      expect(await storage.isLevelUnlocked('math', 2)).toBe(false);
    });

    it('does NOT unlock level 2 when accuracy is high but attempts < 10', async () => {
      const result = await storage.saveLevelResult('phonics', 1, 1.0, 1000, 8);

      expect(result.stars).toBe(3);
      expect(result.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);
    });

    it('does NOT unlock level 2 when accuracy <= 85% even with 10 attempts', async () => {
      const result = await storage.saveLevelResult('phonics', 1, 0.85, 750, 10);

      expect(result.stars).toBe(1);
      expect(result.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);
    });

    it('unlocks level 2 when accuracy > 85% on 10 attempts', async () => {
      const result = await storage.saveLevelResult('phonics', 1, 0.90, 950, 10);

      expect(result.stars).toBe(2);
      expect(result.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
      expect(result.progress.orchardGrowthStage).toBe(1);
    });

    it('retains highest stars and score across multiple attempts', async () => {
      // First attempt: 1 star
      await storage.saveLevelResult('phonics', 1, 0.85, 500, 10);
      let progress = await storage.getProgress();
      expect(progress.stars['phonics_1']).toBe(1);
      expect(progress.highScores['phonics_1']).toBe(500);

      // Second attempt: 3 stars, higher score
      await storage.saveLevelResult('phonics', 1, 1.0, 1200, 10);
      progress = await storage.getProgress();
      expect(progress.stars['phonics_1']).toBe(3);
      expect(progress.highScores['phonics_1']).toBe(1200);

      // Third attempt: 2 stars, lower score -> highest preserved
      await storage.saveLevelResult('phonics', 1, 0.90, 800, 10);
      progress = await storage.getProgress();
      expect(progress.stars['phonics_1']).toBe(3);
      expect(progress.highScores['phonics_1']).toBe(1200);
    });
  });

  describe('Consecutive Error & Spaced Repetition Tracking', () => {
    it('triggers remediation after 3 consecutive mistakes', async () => {
      // Mistake 1
      const m1 = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      expect(m1.consecutiveMistakes).toBe(1);
      expect(m1.shouldTriggerRemediation).toBe(false);

      // Mistake 2
      const m2 = await storage.recordMistake('phonics', 'ea_short_e', 'head');
      expect(m2.consecutiveMistakes).toBe(2);
      expect(m2.shouldTriggerRemediation).toBe(false);

      // Mistake 3 -> Trigger Remediation!
      const m3 = await storage.recordMistake('phonics', 'ea_short_e', 'thread');
      expect(m3.consecutiveMistakes).toBe(3);
      expect(m3.shouldTriggerRemediation).toBe(true);
      expect(storage.getConsecutiveMistakes()).toBe(3);
    });

    it('resets consecutive mistakes counter to 0 upon a correct catch', async () => {
      await storage.recordMistake('phonics', 'ai', 'rain');
      await storage.recordMistake('phonics', 'ai', 'train');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      // Correct catch resets streak
      await storage.recordCorrect('phonics', 'ai', 'brain');
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Next mistake starts at 1 again
      const nextMistake = await storage.recordMistake('phonics', 'ai', 'paint');
      expect(nextMistake.consecutiveMistakes).toBe(1);
      expect(nextMistake.shouldTriggerRemediation).toBe(false);
    });

    it('accurately accumulates per-pattern and per-word mistake statistics', async () => {
      await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      await storage.recordMistake('phonics', 'ea_short_e', 'head');
      await storage.recordMistake('phonics', 'ai', 'rain');

      const progress = await storage.getProgress();
      expect(progress.errorStats.patternErrors['ea_short_e']).toBe(3);
      expect(progress.errorStats.patternErrors['ai']).toBe(1);
      expect(progress.errorStats.wordErrors['bread']).toBe(2);
      expect(progress.errorStats.wordErrors['head']).toBe(1);
      expect(progress.errorStats.wordErrors['rain']).toBe(1);
      expect(progress.errorStats.totalAttempts).toBe(4);
    });

    it('resets consecutive mistakes explicitly via resetConsecutiveMistakes()', async () => {
      await storage.recordMistake('phonics', 'ai', 'rain');
      await storage.recordMistake('phonics', 'ai', 'train');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      await storage.resetConsecutiveMistakes();
      expect(storage.getConsecutiveMistakes()).toBe(0);
    });
  });

  describe('User Settings & Accessibility Preferences', () => {
    it('initializes with child-friendly defaults', async () => {
      const progress = await storage.getProgress();
      expect(progress.settings.sfxVolume).toBe(0.8);
      expect(progress.settings.musicVolume).toBe(0.5);
      expect(progress.settings.ttsEnabled).toBe(true);
      expect(progress.settings.highContrast).toBe(false);
    });

    it('updates and persists settings changes', async () => {
      const updated = await storage.updateSettings({
        sfxVolume: 0.3,
        highContrast: true,
        ttsEnabled: false
      });

      expect(updated.settings.sfxVolume).toBe(0.3);
      expect(updated.settings.highContrast).toBe(true);
      expect(updated.settings.ttsEnabled).toBe(false);
      expect(updated.settings.musicVolume).toBe(0.5); // Unchanged

      const retrieved = await storage.getProgress();
      expect(retrieved.settings.sfxVolume).toBe(0.3);
      expect(retrieved.settings.highContrast).toBe(true);
      expect(retrieved.settings.ttsEnabled).toBe(false);
    });

    it('validates progress data strictly against UserProgressSchema', async () => {
      const progress = await storage.getProgress();
      const parsed = UserProgressSchema.safeParse(progress);
      expect(parsed.success).toBe(true);
    });

    it('provides an initialized storageService singleton instance', async () => {
      expect(storageService).toBeDefined();
      const progress = await storageService.getProgress();
      expect(progress.unlockedLevels['phonics_1']).toBe(true);
    });
  });
});
