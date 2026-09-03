/**
 * Curriculum Schemas - Zod validation schemas for Catch the Fruit
 * 
 * Strict runtime validation for:
 * - 12 Fruit types with corresponding texture atlas frames
 * - Topic A: Phonics (9 vowel teams, 5 r-controlled, explicit ea /ē/ vs /ĕ/ split)
 * - Topic B: Morphology (12 affixes, 30+ base words, visual segmentation)
 * - Topic C: Vocabulary (synonym/antonym pairs in grade-level sentences)
 * - Extensible Topic: Grade 2 PPS Math (addition/subtraction within 20, skip counting)
 * - Level configs and Master Curriculum manifest
 */
import { z } from 'zod';

// ============================================================================
// 1. Core Enumerations & Primitives
// ============================================================================

export const FruitTypeSchema = z.enum([
  'apple',
  'orange',
  'grape',
  'banana',
  'watermelon',
  'blueberry',
  'strawberry',
  'lemon',
  'kiwi',
  'peach',
  'plum',
  'cherry'
]);
export type FruitType = z.infer<typeof FruitTypeSchema>;

export const TopicTypeSchema = z.enum([
  'phonics',
  'morphology',
  'vocabulary',
  'math'
]);
export type TopicType = z.infer<typeof TopicTypeSchema>;

export const ScaffoldStageSchema = z.enum([
  'single_rule',
  'discrimination',
  'mixed_patterns',
  'boss_level'
]);
export type ScaffoldStage = z.infer<typeof ScaffoldStageSchema>;

// ============================================================================
// 2. Topic A: Phonics Schema
// ============================================================================

export const PhonicsPatternTypeSchema = z.enum([
  'vowel_team',
  'r_controlled'
]);
export type PhonicsPatternType = z.infer<typeof PhonicsPatternTypeSchema>;

export const PhonicsItemSchema = z.object({
  id: z.string().min(1),
  pattern: PhonicsPatternTypeSchema,
  ruleName: z.string().min(1), // e.g. 'ai', 'ay', 'ea_long_e', 'ea_short_e', 'ee', 'ie', 'oa', 'oe', 'ui', 'ue', 'ar', 'er', 'ir', 'or', 'ur'
  sound: z.string().min(1),    // e.g. '/ē/', '/ĕ/', '/ā/', '/ō/', '/ū/', '/är/', '/ẽr/', '/ôr/'
  word: z.string().min(1),
  sentence: z.string().min(1),
  distractorWords: z.array(z.string().min(1)).min(2),
  explanation: z.string().min(1),
  fruitType: FruitTypeSchema
});
export type PhonicsItem = z.infer<typeof PhonicsItemSchema>;

// ============================================================================
// 3. Topic B: Morphology Schema
// ============================================================================

export const AffixTypeSchema = z.enum([
  'prefix',
  'suffix'
]);
export type AffixType = z.infer<typeof AffixTypeSchema>;

export const MorphologyItemSchema = z.object({
  id: z.string().min(1),
  affixType: AffixTypeSchema,
  affix: z.string().min(1),          // e.g. 're-', 'un-', 'dis-', 'pre-', '-s', '-ed', '-ing', etc.
  baseWord: z.string().min(1),       // e.g. 'play', 'jump', 'quick'
  combinedWord: z.string().min(1),   // e.g. 'replay', 'jumped', 'quickly'
  visualSegmentation: z.string().min(1), // e.g. "re + play → replay"
  distractorWords: z.array(z.string().min(1)).min(2),
  explanation: z.string().min(1),
  fruitType: FruitTypeSchema
});
export type MorphologyItem = z.infer<typeof MorphologyItemSchema>;

// ============================================================================
// 4. Topic C: Vocabulary Schema
// ============================================================================

export const VocabularyRelationshipSchema = z.enum([
  'synonym',
  'antonym'
]);
export type VocabularyRelationship = z.infer<typeof VocabularyRelationshipSchema>;

export const VocabularyItemSchema = z.object({
  id: z.string().min(1),
  relationship: VocabularyRelationshipSchema,
  targetWord: z.string().min(1),
  matchWord: z.string().min(1),
  sentenceContext: z.string().min(1),
  distractorWords: z.array(z.string().min(1)).min(2),
  explanation: z.string().min(1),
  fruitType: FruitTypeSchema
});
export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;

// ============================================================================
// 5. Extensible Domain: PPS Grade 2 Math Schema
// ============================================================================

export const MathOperationSchema = z.enum([
  'addition',
  'subtraction',
  'skip_counting'
]);
export type MathOperation = z.infer<typeof MathOperationSchema>;

export const MathItemSchema = z.object({
  id: z.string().min(1),
  operation: MathOperationSchema,
  operand1: z.number(),
  operand2: z.number(),
  result: z.number(),
  prompt: z.string().min(1),
  distractorResults: z.array(z.number()).min(2),
  explanation: z.string().min(1),
  fruitType: FruitTypeSchema
});
export type MathItem = z.infer<typeof MathItemSchema>;

// ============================================================================
// 6. Level Configuration Schema
// ============================================================================

export const LevelConfigSchema = z.object({
  id: z.union([z.string(), z.number()]),
  topic: TopicTypeSchema,
  levelNumber: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1),
  fallSpeedDurationMs: z.number().positive(),
  itemsRequired: z.number().int().positive().default(10),
  masteryAccuracyThreshold: z.number().min(0).max(1).default(0.85),
  scaffoldStage: ScaffoldStageSchema,
  targetPatterns: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  spokenPrompt: z.string().optional()
});
export type LevelConfig = z.infer<typeof LevelConfigSchema>;

// ============================================================================
// 7. Topic Manifest Schemas
// ============================================================================

export const PhonicsTopicSchema = z.object({
  topic: z.literal('phonics'),
  title: z.string().min(1),
  description: z.string().min(1),
  levels: z.array(LevelConfigSchema).min(1),
  items: z.array(PhonicsItemSchema).min(1)
});
export type PhonicsTopic = z.infer<typeof PhonicsTopicSchema>;

export const MorphologyTopicSchema = z.object({
  topic: z.literal('morphology'),
  title: z.string().min(1),
  description: z.string().min(1),
  levels: z.array(LevelConfigSchema).min(1),
  items: z.array(MorphologyItemSchema).min(1)
});
export type MorphologyTopic = z.infer<typeof MorphologyTopicSchema>;

export const VocabularyTopicSchema = z.object({
  topic: z.literal('vocabulary'),
  title: z.string().min(1),
  description: z.string().min(1),
  levels: z.array(LevelConfigSchema).min(1),
  items: z.array(VocabularyItemSchema).min(1)
});
export type VocabularyTopic = z.infer<typeof VocabularyTopicSchema>;

export const MathTopicSchema = z.object({
  topic: z.literal('math'),
  title: z.string().min(1),
  description: z.string().min(1),
  levels: z.array(LevelConfigSchema).min(1),
  items: z.array(MathItemSchema).min(1)
});
export type MathTopic = z.infer<typeof MathTopicSchema>;

// ============================================================================
// 8. Master Curriculum Schema
// ============================================================================

export const MasterCurriculumSchema = z.object({
  version: z.string().default('1.0.0'),
  phonics: PhonicsTopicSchema,
  morphology: MorphologyTopicSchema,
  vocabulary: VocabularyTopicSchema,
  math: MathTopicSchema
});
export type MasterCurriculum = z.infer<typeof MasterCurriculumSchema>;

// ============================================================================
// 9. Runtime Gameplay Item Schemas (CurriculumEngine ↔ GameScene)
// ============================================================================

export const OptionItemSchema = z.object({
  text: z.string().min(1),
  fruitType: FruitTypeSchema,
  isCorrect: z.boolean(),
  explanation: z.string().optional()
});
export type OptionItem = z.infer<typeof OptionItemSchema>;

export const CurriculumItemSchema = z.object({
  id: z.string().min(1),
  topic: TopicTypeSchema,
  subTopic: z.string().min(1),
  prompt: z.string().min(1),
  spokenPrompt: z.string().optional(),
  targetAnswer: z.string().min(1),
  targetFruitType: FruitTypeSchema,
  options: z.array(OptionItemSchema).min(1),
  explanation: z.string().optional()
});
export type CurriculumItem = z.infer<typeof CurriculumItemSchema>;
