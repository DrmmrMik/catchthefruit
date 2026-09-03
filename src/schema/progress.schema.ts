/**
 * Progress Schemas - Zod validation schemas for User Persistence Engine
 * 
 * Strict runtime validation for:
 * - Unlocked levels per topic (initial: level 1 unlocked)
 * - Stars earned per level (0, 1, 2, or 3 stars based on accuracy)
 * - Error statistics: per-pattern and per-word mistake tracking
 * - Spaced repetition & consecutive mistake streak (triggers remediation at 3)
 * - Audio and Accessibility preferences (SFX volume, TTS toggle, high contrast)
 */
import { z } from 'zod';

// ============================================================================
// 1. User Settings & Accessibility Schema
// ============================================================================

export const SettingsSchema = z.object({
  sfxVolume: z.number().min(0).max(1).default(0.8),
  musicVolume: z.number().min(0).max(1).default(0.5),
  ttsEnabled: z.boolean().default(true),
  highContrast: z.boolean().default(false)
});
export type Settings = z.infer<typeof SettingsSchema>;

// ============================================================================
// 2. Error Tracking & Spaced Repetition Schema
// ============================================================================

export const ErrorStatsSchema = z.object({
  patternErrors: z.record(z.string(), z.number()).default({}),
  wordErrors: z.record(z.string(), z.number()).default({}),
  totalAttempts: z.number().int().min(0).default(0),
  totalCorrect: z.number().int().min(0).default(0),
  consecutiveMistakes: z.number().int().min(0).default(0)
});
export type ErrorStats = z.infer<typeof ErrorStatsSchema>;

// ============================================================================
// 3. Level Result Schema
// ============================================================================

export const StarRatingSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);
export type StarRating = z.infer<typeof StarRatingSchema>;

export const LevelResultSchema = z.object({
  topic: z.string().min(1),
  levelNumber: z.number().int().positive(),
  accuracy: z.number().min(0).max(1),
  score: z.number().int().min(0),
  stars: StarRatingSchema,
  attemptsCount: z.number().int().min(1),
  completedAt: z.number().int().default(() => Date.now())
});
export type LevelResult = z.infer<typeof LevelResultSchema>;

// ============================================================================
// 4. Master User Progress Schema (IndexedDB store root)
// ============================================================================

export const DEFAULT_UNLOCKED_LEVELS: Record<string, boolean> = {
  'phonics_1': true,
  'morphology_1': true,
  'vocabulary_1': true,
  'math_1': true
};

export const PlacedDecorationsSchema = z.object({
  outside: z.record(z.string(), z.string()).default({}),
  inside: z.record(z.string(), z.string()).default({})
});
export type PlacedDecorations = z.infer<typeof PlacedDecorationsSchema>;

export const UserProgressSchema = z.object({
  version: z.number().int().default(1),
  unlockedLevels: z.record(z.string(), z.boolean()).default(DEFAULT_UNLOCKED_LEVELS),
  stars: z.record(z.string(), z.number()).default({}), // key: `${topic}_${levelNumber}` -> 1..3
  highScores: z.record(z.string(), z.number()).default({}), // key: `${topic}_${levelNumber}` -> score
  coins: z.number().int().min(0).default(0),
  inventory: z.array(z.string()).default([]),
  placedDecorations: PlacedDecorationsSchema.default({ outside: {}, inside: {} }),
  errorStats: ErrorStatsSchema.default({
    patternErrors: {},
    wordErrors: {},
    totalAttempts: 0,
    totalCorrect: 0,
    consecutiveMistakes: 0
  }),
  settings: SettingsSchema.default({
    sfxVolume: 0.8,
    musicVolume: 0.5,
    ttsEnabled: true,
    highContrast: false
  }),
  orchardGrowthStage: z.number().int().min(0).default(0),
  lastActiveTimestamp: z.number().int().default(() => Date.now())
});
export type UserProgress = z.infer<typeof UserProgressSchema>;
