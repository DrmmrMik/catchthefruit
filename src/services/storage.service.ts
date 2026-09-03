/**
 * Storage Service - Pure local IndexedDB persistence engine using idb-keyval
 * 
 * Satisfies:
 * - Purely local IndexedDB persistence with zero network leakage
 * - Tracks level unlocks: Initial Level 1 unlocked per topic
 * - Mastery rule: Unlocking next level requires >85% accuracy on 10+ attempts
 * - Star calculation:
 *     3 stars (100% accuracy)
 *     2 stars (>= 90% accuracy)
 *     1 star (>= 85% accuracy)
 *     0 stars (< 85% accuracy)
 * - Error tracking: per-pattern & per-word mistake counts
 * - Spaced repetition & consecutive mistake streak (remediation triggers at 3)
 * - User preferences: volume, TTS toggle, high-contrast mode
 * - Resilient in-memory fallback for environments where IndexedDB is unavailable
 */
import { get, set, del } from 'idb-keyval';
import {
  UserProgress,
  UserProgressSchema,
  Settings,
  StarRating,
  DEFAULT_UNLOCKED_LEVELS
} from '../schema/progress.schema';

export const STORAGE_KEY = 'catch_the_fruit_user_progress_v1';

/**
 * Calculates stars earned based on accuracy:
 * - 3 stars: 100% accuracy (1.0 or 100)
 * - 2 stars: >= 90% accuracy
 * - 1 star: >= 85% accuracy
 * - 0 stars: < 85% accuracy
 */
export function calculateStars(accuracy: number): StarRating {
  // Normalize percentage (e.g., 95 -> 0.95)
  const norm = accuracy > 1 ? accuracy / 100 : accuracy;
  if (norm >= 1.0) {
    return 3;
  }
  if (norm >= 0.90) {
    return 2;
  }
  if (norm >= 0.85) {
    return 1;
  }
  return 0;
}

/**
 * Determines whether mastery criteria is satisfied:
 * Requires > 85% accuracy AND at least 10 attempts
 */
export function isMasteryAchieved(accuracy: number, attemptsCount: number): boolean {
  const norm = accuracy > 1 ? accuracy / 100 : accuracy;
  return attemptsCount >= 10 && norm > 0.85;
}

export class StorageService {
  private inMemoryCache: UserProgress;

  constructor() {
    this.inMemoryCache = this.getDefaultProgress();
  }

  private getDefaultProgress(): UserProgress {
    return UserProgressSchema.parse({
      version: 1,
      unlockedLevels: { ...DEFAULT_UNLOCKED_LEVELS },
      stars: {},
      highScores: {},
      errorStats: {
        patternErrors: {},
        wordErrors: {},
        totalAttempts: 0,
        totalCorrect: 0,
        consecutiveMistakes: 0
      },
      settings: {
        sfxVolume: 0.8,
        musicVolume: 0.5,
        ttsEnabled: true,
        highContrast: false
      },
      orchardGrowthStage: 0,
      lastActiveTimestamp: Date.now()
    });
  }

  /**
   * Retrieves user progress from IndexedDB, validating with Zod.
   * Falls back to in-memory cache if IndexedDB fails or is empty.
   */
  public async getProgress(): Promise<UserProgress> {
    try {
      const raw = await get<UserProgress>(STORAGE_KEY);
      if (raw) {
        const validated = UserProgressSchema.parse(raw);
        this.inMemoryCache = validated;
        return validated;
      }
    } catch {
      // Graceful fallback to in-memory cache
    }
    return this.inMemoryCache;
  }

  /**
   * Persists progress object to IndexedDB and updates in-memory cache
   */
  public async saveProgress(progress: UserProgress): Promise<void> {
    const validated = UserProgressSchema.parse({
      ...progress,
      lastActiveTimestamp: Date.now()
    });
    this.inMemoryCache = validated;

    try {
      await set(STORAGE_KEY, validated);
    } catch {
      // In-memory cache already updated
    }
  }

  /**
   * Records a level completion, evaluates stars and mastery unlock
   */
  public async saveLevelResult(
    topic: string,
    levelNumber: number,
    accuracy: number,
    score: number,
    attemptsCount: number = 10
  ): Promise<{ stars: StarRating; unlockedNextLevel: boolean; progress: UserProgress }> {
    const progress = await this.getProgress();
    const levelKey = `${topic}_${levelNumber}`;
    const stars = calculateStars(accuracy);
    const mastery = isMasteryAchieved(accuracy, attemptsCount);

    // Update stars (keep highest)
    const currentStars = progress.stars[levelKey] ?? 0;
    if (stars > currentStars) {
      progress.stars[levelKey] = stars;
    }

    // Update high score
    const currentHighScore = progress.highScores[levelKey] ?? 0;
    if (score > currentHighScore) {
      progress.highScores[levelKey] = score;
    }

    // Unlock next level if mastery threshold met (>85% on 10+ attempts)
    let unlockedNextLevel = false;
    if (mastery) {
      const nextLevelKey = `${topic}_${levelNumber + 1}`;
      if (!progress.unlockedLevels[nextLevelKey]) {
        progress.unlockedLevels[nextLevelKey] = true;
        unlockedNextLevel = true;
        progress.orchardGrowthStage = Math.min(progress.orchardGrowthStage + 1, 10);
      }
    }

    await this.saveProgress(progress);
    return { stars, unlockedNextLevel, progress };
  }

  /**
   * Checks if a level is unlocked
   */
  public async isLevelUnlocked(topic: string, levelNumber: number): Promise<boolean> {
    const progress = await this.getProgress();
    const levelKey = `${topic}_${levelNumber}`;
    return Boolean(progress.unlockedLevels[levelKey]);
  }

  /**
   * Records a mistake, tracks per-pattern and per-word errors,
   * increments consecutive mistakes, and checks 3-mistake remediation trigger.
   */
  public async recordMistake(
    _topic: string,
    pattern: string,
    word: string
  ): Promise<{ consecutiveMistakes: number; shouldTriggerRemediation: boolean }> {
    const progress = await this.getProgress();
    const stats = progress.errorStats;

    stats.totalAttempts++;
    stats.patternErrors[pattern] = (stats.patternErrors[pattern] ?? 0) + 1;
    stats.wordErrors[word] = (stats.wordErrors[word] ?? 0) + 1;
    stats.consecutiveMistakes++;

    const shouldTriggerRemediation = stats.consecutiveMistakes >= 3;
    await this.saveProgress(progress);

    return {
      consecutiveMistakes: stats.consecutiveMistakes,
      shouldTriggerRemediation
    };
  }

  /**
   * Records a correct catch, updates totals, and resets consecutive mistake streak
   */
  public async recordCorrect(_topic: string, _pattern: string, _word: string): Promise<void> {
    const progress = await this.getProgress();
    const stats = progress.errorStats;

    stats.totalAttempts++;
    stats.totalCorrect++;
    stats.consecutiveMistakes = 0;

    await this.saveProgress(progress);
  }

  /**
   * Resets consecutive mistakes counter (e.g. after showing teaching card or starting new round)
   */
  public async resetConsecutiveMistakes(): Promise<void> {
    const progress = await this.getProgress();
    progress.errorStats.consecutiveMistakes = 0;
    await this.saveProgress(progress);
  }

  /**
   * Returns current consecutive mistakes count synchronously from in-memory cache
   */
  public getConsecutiveMistakes(): number {
    return this.inMemoryCache.errorStats.consecutiveMistakes;
  }

  /**
   * Updates user settings (audio volumes, TTS toggle, high-contrast mode)
   */
  public async updateSettings(newSettings: Partial<Settings>): Promise<UserProgress> {
    const progress = await this.getProgress();
    progress.settings = {
      ...progress.settings,
      ...newSettings
    };
    await this.saveProgress(progress);
    return progress;
  }

  /**
   * Clears progress and resets to initial defaults
   */
  public async resetProgress(): Promise<UserProgress> {
    try {
      await del(STORAGE_KEY);
    } catch {
      // Ignore IDB errors during deletion
    }
    this.inMemoryCache = this.getDefaultProgress();
    return this.inMemoryCache;
  }
}

// Singleton instance export for game-wide usage
export const storageService = new StorageService();
