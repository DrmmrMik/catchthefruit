import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import {
  FruitTypeSchema,
  PhonicsItemSchema,
  MorphologyItemSchema,
  VocabularyItemSchema,
  MathItemSchema,
  LevelConfigSchema,
  PhonicsTopicSchema,
  MorphologyTopicSchema,
  VocabularyTopicSchema,
  MathTopicSchema,
  MasterCurriculumSchema,
  CurriculumItemSchema
} from '../src/schema/curriculum.schema';

import { CurriculumService } from '../src/services/curriculum.service';

import rawPhonics from '../data/phonics.json';
import rawMorphology from '../data/morphology.json';
import rawVocabulary from '../data/vocabulary.json';
import rawMath from '../data/math.json';

describe('Adversarial Curriculum & Zod Schema Stress Suite (Challenger M2-1)', () => {
  const rootDir = process.cwd();

  describe('Suite 1: Empirical Python Adversarial Oracle Execution', () => {
    it('executes python adversarial curriculum oracle with 0 errors and APPROVE verdict', () => {
      const scriptPath = path.join(rootDir, 'scripts/adversarial_curriculum_verify.py');
      expect(fs.existsSync(scriptPath), 'Oracle script must exist').toBe(true);

      const output = execSync(`python3 ${scriptPath}`, {
        encoding: 'utf-8',
        cwd: rootDir,
      });

      expect(output).toContain('VERDICT: APPROVE');
      expect(output).not.toContain('[ERROR]');
      expect(output).toContain('All adversarial checks passed cleanly.');
      expect(output).toContain('byte-identical');
      expect(output).toContain('unique distractors with zero target collisions');
    });
  });

  describe('Suite 2: Malformed Input Rejection & Descriptive Zod Error Verification', () => {
    const validPhonicsSample = {
      id: 'test_phonics_1',
      pattern: 'vowel_team' as const,
      ruleName: 'ai',
      sound: '/ā/',
      word: 'rain',
      sentence: 'The rain falls.',
      distractorWords: ['ran', 'run'],
      explanation: 'ai says /ā/',
      fruitType: 'apple' as const
    };

    const validMorphSample = {
      id: 'test_morph_1',
      affixType: 'prefix' as const,
      affix: 're-',
      baseWord: 'play',
      combinedWord: 'replay',
      visualSegmentation: 're + play → replay',
      distractorWords: ['reply', 'relay'],
      explanation: 're- means again',
      fruitType: 'orange' as const
    };

    const validVocabSample = {
      id: 'test_vocab_1',
      relationship: 'synonym' as const,
      targetWord: 'big',
      matchWord: 'large',
      sentenceContext: 'The big house is large.',
      distractorWords: ['tiny', 'small'],
      explanation: 'large means big',
      fruitType: 'grape' as const
    };

    const validMathSample = {
      id: 'test_math_1',
      operation: 'addition' as const,
      operand1: 7,
      operand2: 8,
      result: 15,
      prompt: '7 + 8 = ?',
      distractorResults: [14, 16],
      explanation: '7 + 8 = 15',
      fruitType: 'cherry' as const
    };

    const validLevelSample = {
      id: 'phonics_1',
      topic: 'phonics' as const,
      levelNumber: 1,
      name: 'Level 1',
      description: 'First Level',
      fallSpeedDurationMs: 2800,
      itemsRequired: 10,
      masteryAccuracyThreshold: 0.85,
      scaffoldStage: 'single_rule' as const
    };

    it('rejects PhonicsItem missing required fields with ZodError', () => {
      const fields = Object.keys(validPhonicsSample);
      for (const field of fields) {
        const malformed = { ...validPhonicsSample };
        delete (malformed as Record<string, unknown>)[field];
        const res = PhonicsItemSchema.safeParse(malformed);
        expect(res.success, `Should reject when missing field: ${field}`).toBe(false);
        if (!res.success) {
          expect(res.error.issues.some((issue) => issue.path.includes(field))).toBe(true);
        }
      }
    });

    it('rejects invalid fruit types with descriptive enum error', () => {
      const invalidFruits = ['mango', 'dragonfruit', 'tomato', 'orange_juice', '', 123, null, undefined];
      for (const fruit of invalidFruits) {
        const malformed = { ...validPhonicsSample, fruitType: fruit };
        const res = PhonicsItemSchema.safeParse(malformed);
        expect(res.success, `Should reject fruitType: ${String(fruit)}`).toBe(false);
        if (!res.success) {
          expect(res.error.issues[0]?.path).toContain('fruitType');
        }
      }
    });

    it('rejects empty strings in PhonicsItem fields', () => {
      const stringFields = ['id', 'ruleName', 'sound', 'word', 'sentence', 'explanation'] as const;
      for (const field of stringFields) {
        const malformed = { ...validPhonicsSample, [field]: '' };
        const res = PhonicsItemSchema.safeParse(malformed);
        expect(res.success, `Should reject empty string for ${field}`).toBe(false);
        if (!res.success) {
          expect(res.error.issues[0]?.code).toBe('too_small');
        }
      }
    });

    it('rejects PhonicsItem with fewer than 2 distractors or empty distractor strings', () => {
      // 0 distractors
      const zeroDistractors = { ...validPhonicsSample, distractorWords: [] };
      expect(PhonicsItemSchema.safeParse(zeroDistractors).success).toBe(false);

      // 1 distractor
      const oneDistractor = { ...validPhonicsSample, distractorWords: ['lone'] };
      expect(PhonicsItemSchema.safeParse(oneDistractor).success).toBe(false);

      // Empty string inside distractors
      const emptyInside = { ...validPhonicsSample, distractorWords: ['valid', ''] };
      expect(PhonicsItemSchema.safeParse(emptyInside).success).toBe(false);
    });

    it('rejects invalid Phonics pattern enum values', () => {
      const invalidPatterns = ['vowel', 'consonant', 'silent_e', 'digraph', 42];
      for (const pattern of invalidPatterns) {
        const malformed = { ...validPhonicsSample, pattern };
        expect(PhonicsItemSchema.safeParse(malformed).success).toBe(false);
      }
    });

    it('rejects MorphologyItem with missing fields or invalid affixType', () => {
      const missingFields = Object.keys(validMorphSample);
      for (const field of missingFields) {
        const malformed = { ...validMorphSample };
        delete (malformed as Record<string, unknown>)[field];
        expect(MorphologyItemSchema.safeParse(malformed).success).toBe(false);
      }

      const invalidAffixes = ['infix', 'circumfix', 'root', 'superfix'];
      for (const affixType of invalidAffixes) {
        const malformed = { ...validMorphSample, affixType };
        expect(MorphologyItemSchema.safeParse(malformed).success).toBe(false);
      }
    });

    it('rejects VocabularyItem with invalid relationship or missing context', () => {
      const invalidRelationships = ['homonym', 'rhyme', 'hypernym', 'spelling'];
      for (const relationship of invalidRelationships) {
        const malformed = { ...validVocabSample, relationship };
        expect(VocabularyItemSchema.safeParse(malformed).success).toBe(false);
      }

      const emptySentence = { ...validVocabSample, sentenceContext: '' };
      expect(VocabularyItemSchema.safeParse(emptySentence).success).toBe(false);
    });

    it('rejects MathItem with invalid operations, missing operands, or < 2 distractors', () => {
      const invalidOps = ['multiplication', 'division', 'mod', 'square'];
      for (const operation of invalidOps) {
        const malformed = { ...validMathSample, operation };
        expect(MathItemSchema.safeParse(malformed).success).toBe(false);
      }

      const oneDistractor = { ...validMathSample, distractorResults: [14] };
      expect(MathItemSchema.safeParse(oneDistractor).success).toBe(false);

      const nonNumber = { ...validMathSample, result: '15' as unknown as number };
      expect(MathItemSchema.safeParse(nonNumber).success).toBe(false);
    });

    it('rejects LevelConfig with negative numbers, zero levels, or invalid thresholds', () => {
      // Negative level number
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, levelNumber: -1 }).success).toBe(false);
      // Zero level number (positive required)
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, levelNumber: 0 }).success).toBe(false);
      // Float level number (int required)
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, levelNumber: 1.5 }).success).toBe(false);

      // Negative fall speed duration
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, fallSpeedDurationMs: -100 }).success).toBe(false);
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, fallSpeedDurationMs: 0 }).success).toBe(false);

      // Accuracy threshold out of bounds [0, 1]
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, masteryAccuracyThreshold: -0.1 }).success).toBe(false);
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, masteryAccuracyThreshold: 1.05 }).success).toBe(false);

      // Invalid scaffoldStage
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, scaffoldStage: 'ultra_boss' }).success).toBe(false);

      // Invalid topic
      expect(LevelConfigSchema.safeParse({ ...validLevelSample, topic: 'history' }).success).toBe(false);
    });

    it('rejects topic manifests with empty level or item arrays, or mismatched topic literal', () => {
      // Empty levels in PhonicsTopicSchema
      expect(PhonicsTopicSchema.safeParse({
        topic: 'phonics',
        title: 'Phonics',
        description: 'Desc',
        levels: [],
        items: [validPhonicsSample]
      }).success).toBe(false);

      // Empty items in MorphologyTopicSchema
      expect(MorphologyTopicSchema.safeParse({
        topic: 'morphology',
        title: 'Morphology',
        description: 'Desc',
        levels: [validLevelSample],
        items: []
      }).success).toBe(false);

      // Mismatched topic literal (e.g. topic: 'math' inside PhonicsTopicSchema)
      expect(PhonicsTopicSchema.safeParse({
        topic: 'math',
        title: 'Phonics',
        description: 'Desc',
        levels: [validLevelSample],
        items: [validPhonicsSample]
      }).success).toBe(false);
    });

    it('rejects MasterCurriculum missing any required topic', () => {
      const incomplete = {
        version: '1.0.0',
        phonics: rawPhonics,
        morphology: rawMorphology,
        vocabulary: rawVocabulary
        // missing math
      };
      expect(MasterCurriculumSchema.safeParse(incomplete).success).toBe(false);
    });
  });

  describe('Suite 3: Distractor Uniqueness & Contamination Stress Audit', () => {
    it('verifies Phonics distractors never equal the target word and are mutually distinct', () => {
      const phonics = PhonicsTopicSchema.parse(rawPhonics);
      for (const item of phonics.items) {
        const target = item.word.trim().toLowerCase();
        const dists = item.distractorWords.map((d) => d.trim().toLowerCase());

        expect(dists.length).toBeGreaterThanOrEqual(2);
        // Distractor must not equal target word
        expect(dists).not.toContain(target);

        // Distractors must be mutually unique within the item
        const uniqueDists = new Set(dists);
        expect(uniqueDists.size, `Duplicate distractor in ${item.id}`).toBe(dists.length);
      }
    });

    it('verifies Morphology distractors never equal combinedWord or baseWord', () => {
      const morph = MorphologyTopicSchema.parse(rawMorphology);
      for (const item of morph.items) {
        const combined = item.combinedWord.trim().toLowerCase();
        const base = item.baseWord.trim().toLowerCase();
        const dists = item.distractorWords.map((d) => d.trim().toLowerCase());

        expect(dists.length).toBeGreaterThanOrEqual(2);
        expect(dists).not.toContain(combined);
        expect(dists).not.toContain(base);

        const uniqueDists = new Set(dists);
        expect(uniqueDists.size, `Duplicate distractor in ${item.id}`).toBe(dists.length);
      }
    });

    it('verifies Vocabulary distractors never equal matchWord or targetWord', () => {
      const vocab = VocabularyTopicSchema.parse(rawVocabulary);
      for (const item of vocab.items) {
        const match = item.matchWord.trim().toLowerCase();
        const target = item.targetWord.trim().toLowerCase();
        const dists = item.distractorWords.map((d) => d.trim().toLowerCase());

        expect(dists.length).toBeGreaterThanOrEqual(2);
        expect(dists).not.toContain(match);
        expect(dists).not.toContain(target);

        const uniqueDists = new Set(dists);
        expect(uniqueDists.size, `Duplicate distractor in ${item.id}`).toBe(dists.length);
      }
    });

    it('verifies Math distractors never equal the correct result and are distinct numbers', () => {
      const math = MathTopicSchema.parse(rawMath);
      for (const item of math.items) {
        const result = item.result;
        const dists = item.distractorResults;

        expect(dists.length).toBeGreaterThanOrEqual(2);
        expect(dists).not.toContain(result);

        const uniqueDists = new Set(dists);
        expect(uniqueDists.size, `Duplicate distractor number in ${item.id}`).toBe(dists.length);
      }
    });
  });

  describe('Suite 4: Global ID Uniqueness & Reference Integrity', () => {
    it('enforces global uniqueness of item IDs across all four topic datasets', () => {
      const allItemIds = new Map<string, string>();
      const datasets = [
        { name: 'phonics', items: rawPhonics.items },
        { name: 'morphology', items: rawMorphology.items },
        { name: 'vocabulary', items: rawVocabulary.items },
        { name: 'math', items: rawMath.items }
      ];

      for (const { name, items } of datasets) {
        for (const item of items) {
          expect(allItemIds.has(item.id), `Duplicate item ID '${item.id}' found in topic '${name}' (already in '${allItemIds.get(item.id)}')`).toBe(false);
          allItemIds.set(item.id, name);
        }
      }

      const totalExpected = rawPhonics.items.length + rawMorphology.items.length + rawVocabulary.items.length + rawMath.items.length;
      expect(allItemIds.size).toBe(totalExpected);
      expect(totalExpected).toBe(200);
    });

    it('enforces global uniqueness of level IDs across all four topic datasets', () => {
      const allLevelIds = new Map<string, string>();
      const datasets = [
        { name: 'phonics', levels: rawPhonics.levels },
        { name: 'morphology', levels: rawMorphology.levels },
        { name: 'vocabulary', levels: rawVocabulary.levels },
        { name: 'math', levels: rawMath.levels }
      ];

      for (const { name, levels } of datasets) {
        for (const lvl of levels) {
          expect(allLevelIds.has(lvl.id), `Duplicate level ID '${lvl.id}' in topic '${name}'`).toBe(false);
          allLevelIds.set(lvl.id, name);
        }
      }

      expect(allLevelIds.size).toBe(20); // 5 levels * 4 topics
    });

    it('verifies level numbers within each topic are sequential integers starting at 1', () => {
      const datasets = [rawPhonics, rawMorphology, rawVocabulary, rawMath];
      for (const data of datasets) {
        const numbers = data.levels.map((l: { levelNumber: number }) => l.levelNumber);
        expect(numbers).toEqual([1, 2, 3, 4, 5]);
      }
    });
  });

  describe('Suite 5: Runtime CurriculumService Fault Injection & Boundary Stress', () => {
    it('throws ZodError on CurriculumService constructor with malformed custom curriculum', () => {
      const malformedCurriculum = {
        version: '1.0.0',
        phonics: { ...rawPhonics, topic: 'corrupted' },
        morphology: rawMorphology,
        vocabulary: rawVocabulary,
        math: rawMath
      };

      expect(() => new CurriculumService(malformedCurriculum as unknown as any)).toThrow();
    });

    it('safely handles non-existent IDs and out-of-range levels without crashing', () => {
      const service = new CurriculumService();

      expect(service.getItemById('nonexistent_id')).toBeUndefined();
      expect(service.getExplanation('nonexistent_id')).toBeUndefined();
      expect(service.getLevel('phonics', -1)).toBeUndefined();
      expect(service.getLevel('phonics', 999)).toBeUndefined();
    });

    it('generates CurriculumItem questions where targetAnswer is uniquely correct', () => {
      const service = new CurriculumService();
      const allTopics = ['phonics', 'morphology', 'vocabulary', 'math'] as const;

      for (const topic of allTopics) {
        const items = service.getItemsForTopic(topic);
        for (const item of items) {
          const question = service.createQuestion(item);

          // Must satisfy CurriculumItemSchema
          const validated = CurriculumItemSchema.safeParse(question);
          expect(validated.success).toBe(true);

          // Exactly one correct option
          const correctOpts = question.options.filter((o) => o.isCorrect);
          expect(correctOpts.length).toBe(1);
          expect(correctOpts[0]!.text).toBe(question.targetAnswer);
          expect(correctOpts[0]!.fruitType).toBe(question.targetFruitType);

          // Wrong options must not equal targetAnswer
          const wrongOpts = question.options.filter((o) => !o.isCorrect);
          expect(wrongOpts.length).toBeGreaterThanOrEqual(2);
          for (const wo of wrongOpts) {
            expect(wo.text).not.toBe(question.targetAnswer);
          }

          // All fruitTypes must be in FruitTypeSchema
          for (const opt of question.options) {
            expect(FruitTypeSchema.safeParse(opt.fruitType).success).toBe(true);
          }
        }
      }
    });

    it('generates question set with count larger than item pool (wraparound stress test)', () => {
      const service = new CurriculumService();
      // Request 100 questions from a pool of 58 or 40 items
      const questions = service.generateQuestionSet('math', 1, 100);
      expect(questions.length).toBe(100);
      for (const q of questions) {
        expect(CurriculumItemSchema.safeParse(q).success).toBe(true);
        expect(q.options.some((o) => o.isCorrect)).toBe(true);
      }
    });
  });

  describe('Suite 6: Pedagogical Text Pattern & Affix Matching Audit', () => {
    it('verifies every phonics word contains the claimed vowel team or r-controlled letters', () => {
      const phonics = PhonicsTopicSchema.parse(rawPhonics);
      for (const item of phonics.items) {
        const word = item.word.toLowerCase();
        let expectedPattern = item.ruleName;
        if (expectedPattern.startsWith('ea_')) {
          expectedPattern = 'ea';
        }
        expect(
          word.includes(expectedPattern),
          `Phonics word '${word}' for rule '${item.ruleName}' does not contain '${expectedPattern}'`
        ).toBe(true);
      }
    });

    it('verifies every morphology item combines prefix/suffix with baseWord according to English morphology', () => {
      const morph = MorphologyTopicSchema.parse(rawMorphology);
      for (const item of morph.items) {
        const combined = item.combinedWord.toLowerCase();
        const base = item.baseWord.toLowerCase();
        const affix = item.affix;

        if (item.affixType === 'prefix') {
          const prefixClean = affix.replace('-', '').toLowerCase();
          expect(
            combined.startsWith(prefixClean),
            `Combined '${combined}' should start with prefix '${prefixClean}'`
          ).toBe(true);
          expect(
            combined.includes(base),
            `Combined '${combined}' should contain base '${base}'`
          ).toBe(true);
        } else {
          // Suffix
          if (affix === '-s / -es') {
            expect(combined.endsWith('s') || combined.endsWith('es')).toBe(true);
          } else {
            const suffixClean = affix.replace('-', '').toLowerCase();
            // Handle common inflection changes (e.g. running -> ends with ing, run is base)
            expect(
              combined.endsWith(suffixClean) || combined.endsWith(suffixClean.slice(1)),
              `Combined '${combined}' should end with suffix '${suffixClean}'`
            ).toBe(true);
          }
        }
      }
    });

    it('verifies vocabulary items have distinct target and match words and rich contexts', () => {
      const vocab = VocabularyTopicSchema.parse(rawVocabulary);
      for (const item of vocab.items) {
        expect(item.targetWord.toLowerCase()).not.toBe(item.matchWord.toLowerCase());
        expect(item.sentenceContext.length).toBeGreaterThanOrEqual(15);
        expect(item.explanation.length).toBeGreaterThanOrEqual(15);
      }
    });
  });

  describe('Suite 7: Storage & Persistence Schema Boundary Stress', () => {
    it('rejects out-of-range volume and invalid settings in SettingsSchema', async () => {
      const { SettingsSchema } = await import('../src/schema/progress.schema');

      expect(SettingsSchema.safeParse({ sfxVolume: -0.1 }).success).toBe(false);
      expect(SettingsSchema.safeParse({ sfxVolume: 1.1 }).success).toBe(false);
      expect(SettingsSchema.safeParse({ musicVolume: -1 }).success).toBe(false);
      expect(SettingsSchema.safeParse({ musicVolume: 2.0 }).success).toBe(false);
      expect(SettingsSchema.safeParse({ ttsEnabled: 'yes' }).success).toBe(false);
    });

    it('validates star rating boundaries and mastery thresholds rigorously', async () => {
      const { calculateStars, isMasteryAchieved } = await import('../src/services/storage.service');

      // calculateStars
      expect(calculateStars(1.0)).toBe(3);
      expect(calculateStars(100)).toBe(3);
      expect(calculateStars(0.999)).toBe(2);
      expect(calculateStars(0.90)).toBe(2);
      expect(calculateStars(90)).toBe(2);
      expect(calculateStars(0.899)).toBe(1);
      expect(calculateStars(0.85)).toBe(1);
      expect(calculateStars(85)).toBe(1);
      expect(calculateStars(0.849)).toBe(0);
      expect(calculateStars(0.50)).toBe(0);
      expect(calculateStars(0)).toBe(0);

      // isMasteryAchieved: strictly > 0.85 AND attempts >= 10
      expect(isMasteryAchieved(0.85, 10)).toBe(false); // Exactly 0.85 is NOT > 0.85
      expect(isMasteryAchieved(0.851, 10)).toBe(true);
      expect(isMasteryAchieved(1.0, 9)).toBe(false);  // 9 attempts is < 10
      expect(isMasteryAchieved(1.0, 10)).toBe(true);
      expect(isMasteryAchieved(86, 12)).toBe(true);   // Percentage format
      expect(isMasteryAchieved(85, 12)).toBe(false);  // Exactly 85% is not > 85%
    });

    it('enforces consecutive mistake tracking and remediation trigger at exactly 3 mistakes', async () => {
      const { StorageService } = await import('../src/services/storage.service');
      const storage = new StorageService();

      // Start at 0
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Mistake 1
      const m1 = await storage.recordMistake('phonics', 'ai', 'rain');
      expect(m1.consecutiveMistakes).toBe(1);
      expect(m1.shouldTriggerRemediation).toBe(false);

      // Mistake 2
      const m2 = await storage.recordMistake('phonics', 'ai', 'rain');
      expect(m2.consecutiveMistakes).toBe(2);
      expect(m2.shouldTriggerRemediation).toBe(false);

      // Mistake 3 -> Trigger!
      const m3 = await storage.recordMistake('phonics', 'ai', 'rain');
      expect(m3.consecutiveMistakes).toBe(3);
      expect(m3.shouldTriggerRemediation).toBe(true);

      // Correct catch resets streak to 0
      await storage.recordCorrect('phonics', 'ai', 'rain');
      expect(storage.getConsecutiveMistakes()).toBe(0);
    });
  });
});

