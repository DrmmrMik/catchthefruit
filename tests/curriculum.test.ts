import { describe, it, expect } from 'vitest';
import {
  FruitTypeSchema,
  PhonicsTopicSchema,
  MorphologyTopicSchema,
  VocabularyTopicSchema,
  MathTopicSchema,
  MasterCurriculumSchema,
  CurriculumItemSchema,
  PhonicsItemSchema
} from '../src/schema/curriculum.schema';
import { CurriculumService, curriculumService } from '../src/services/curriculum.service';

import rawPhonics from '../data/phonics.json';
import rawMorphology from '../data/morphology.json';
import rawVocabulary from '../data/vocabulary.json';
import rawMath from '../data/math.json';

describe('Milestone 2 Curriculum & Zod Schema Validation', () => {
  describe('Zod Schema Validation of Datasets', () => {
    it('parses and validates data/phonics.json cleanly through PhonicsTopicSchema', () => {
      const parsed = PhonicsTopicSchema.safeParse(rawPhonics);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        console.error(parsed.error);
      }
    });

    it('parses and validates data/morphology.json cleanly through MorphologyTopicSchema', () => {
      const parsed = MorphologyTopicSchema.safeParse(rawMorphology);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        console.error(parsed.error);
      }
    });

    it('parses and validates data/vocabulary.json cleanly through VocabularyTopicSchema', () => {
      const parsed = VocabularyTopicSchema.safeParse(rawVocabulary);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        console.error(parsed.error);
      }
    });

    it('parses and validates data/math.json cleanly through MathTopicSchema', () => {
      const parsed = MathTopicSchema.safeParse(rawMath);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        console.error(parsed.error);
      }
    });

    it('validates combined master curriculum via MasterCurriculumSchema', () => {
      const master = {
        version: '1.0.0',
        phonics: rawPhonics,
        morphology: rawMorphology,
        vocabulary: rawVocabulary,
        math: rawMath
      };
      const parsed = MasterCurriculumSchema.safeParse(master);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid curriculum items with descriptive Zod errors', () => {
      // Invalid fruit type
      const invalidFruit = {
        id: 'bad_fruit',
        pattern: 'vowel_team',
        ruleName: 'ai',
        sound: '/ā/',
        word: 'rain',
        sentence: 'The rain fell.',
        distractorWords: ['ran', 'run'],
        explanation: 'Invalid fruit',
        fruitType: 'dragonfruit' // Not in FruitTypeSchema
      };
      expect(() => PhonicsItemSchema.parse(invalidFruit)).toThrow();

      // Less than 2 distractors
      const tooFewDistractors = {
        id: 'bad_distractors',
        pattern: 'vowel_team',
        ruleName: 'ai',
        sound: '/ā/',
        word: 'rain',
        sentence: 'The rain fell.',
        distractorWords: ['ran'], // Min 2 required
        explanation: 'Too few distractors',
        fruitType: 'apple'
      };
      expect(() => PhonicsItemSchema.parse(tooFewDistractors)).toThrow();
    });
  });

  describe('Topic A: Phonics Dataset Pedagogical Requirements', () => {
    const phonics = PhonicsTopicSchema.parse(rawPhonics);

    it('contains at least 40 curriculum words (has >= 50)', () => {
      expect(phonics.items.length).toBeGreaterThanOrEqual(40);
      expect(phonics.items.length).toBeGreaterThanOrEqual(50);
    });

    it('covers all 9 required vowel teams', () => {
      const rules = new Set(phonics.items.map((i) => i.ruleName));
      const requiredTeams = ['ai', 'ay', 'ea_long_e', 'ea_short_e', 'ee', 'ie', 'oa', 'oe', 'ui', 'ue'];
      for (const team of requiredTeams) {
        expect(rules.has(team), `Missing vowel team: ${team}`).toBe(true);
      }
    });

    it('covers all 5 required r-controlled vowels', () => {
      const rules = new Set(phonics.items.map((i) => i.ruleName));
      const requiredRControlled = ['ar', 'er', 'ir', 'or', 'ur'];
      for (const r of requiredRControlled) {
        expect(rules.has(r), `Missing r-controlled vowel: ${r}`).toBe(true);
      }
    });

    it('explicitly separates /ē/ vs /ĕ/ in "ea" vowel team with distinct sounds and explanations', () => {
      const eaLongItems = phonics.items.filter((i) => i.ruleName === 'ea_long_e');
      const eaShortItems = phonics.items.filter((i) => i.ruleName === 'ea_short_e');

      expect(eaLongItems.length).toBeGreaterThanOrEqual(5);
      expect(eaShortItems.length).toBeGreaterThanOrEqual(5);

      for (const item of eaLongItems) {
        expect(item.sound).toBe('/ē/');
        expect(item.word.includes('ea')).toBe(true);
        expect(item.explanation.toLowerCase()).toContain('/ē/');
      }

      for (const item of eaShortItems) {
        expect(item.sound).toBe('/ĕ/');
        expect(item.word.includes('ea')).toBe(true);
        expect(item.explanation.toLowerCase()).toContain('/ĕ/');
        expect(item.explanation.toLowerCase()).toContain('trickster');
      }

      // Check key exemplars mentioned in brief
      const words = new Set(phonics.items.map((i) => i.word));
      expect(words.has('beach')).toBe(true);
      expect(words.has('bread')).toBe(true);
    });

    it('ensures all phonics distractors are valid and do not equal target word', () => {
      for (const item of phonics.items) {
        expect(item.distractorWords.length).toBeGreaterThanOrEqual(2);
        for (const distractor of item.distractorWords) {
          expect(distractor.toLowerCase()).not.toBe(item.word.toLowerCase());
        }
      }
    });

    it('ensures every phonics fruitType is in FruitTypeSchema', () => {
      for (const item of phonics.items) {
        expect(FruitTypeSchema.safeParse(item.fruitType).success).toBe(true);
      }
    });
  });

  describe('Topic B: Morphology Dataset Pedagogical Requirements', () => {
    const morphology = MorphologyTopicSchema.parse(rawMorphology);

    it('covers all 12 required affixes across prefixes and suffixes', () => {
      const affixes = new Set(morphology.items.map((i) => i.affix));
      const requiredAffixes = [
        're-', 'un-', 'dis-', 'pre-',
        '-s / -es', '-ed', '-ing', '-er',
        '-est', '-ful', '-less', '-ly'
      ];
      for (const affix of requiredAffixes) {
        expect(affixes.has(affix), `Missing affix: ${affix}`).toBe(true);
      }
    });

    it('includes >= 30 distinct base words (has >= 40)', () => {
      const baseWords = new Set(morphology.items.map((i) => i.baseWord.toLowerCase()));
      expect(baseWords.size).toBeGreaterThanOrEqual(30);
      expect(baseWords.size).toBeGreaterThanOrEqual(40);
    });

    it('enforces visual morphological segmentation format e.g. "re + play → replay"', () => {
      const segmentationRegex = /^.+ \+ .+ → .+$/;
      for (const item of morphology.items) {
        expect(item.visualSegmentation).toMatch(segmentationRegex);
        expect(item.visualSegmentation).toContain(item.combinedWord);
      }
    });

    it('ensures all morphology distractors are valid and do not equal combined word', () => {
      for (const item of morphology.items) {
        expect(item.distractorWords.length).toBeGreaterThanOrEqual(2);
        for (const distractor of item.distractorWords) {
          expect(distractor.toLowerCase()).not.toBe(item.combinedWord.toLowerCase());
        }
      }
    });
  });

  describe('Topic C: Vocabulary Dataset Pedagogical Requirements', () => {
    const vocabulary = VocabularyTopicSchema.parse(rawVocabulary);

    it('includes >= 40 synonym/antonym pairs (has >= 40)', () => {
      expect(vocabulary.items.length).toBeGreaterThanOrEqual(40);
    });

    it('includes both synonyms and antonyms with balanced coverage', () => {
      const synonyms = vocabulary.items.filter((i) => i.relationship === 'synonym');
      const antonyms = vocabulary.items.filter((i) => i.relationship === 'antonym');

      expect(synonyms.length).toBeGreaterThanOrEqual(20);
      expect(antonyms.length).toBeGreaterThanOrEqual(20);
    });

    it('contextualizes all vocabulary items in grade-level sentences', () => {
      for (const item of vocabulary.items) {
        expect(item.sentenceContext.length).toBeGreaterThan(10);
        expect(item.explanation.length).toBeGreaterThan(10);
      }
    });

    it('ensures all vocabulary distractors are valid and do not equal match word', () => {
      for (const item of vocabulary.items) {
        expect(item.distractorWords.length).toBeGreaterThanOrEqual(2);
        for (const distractor of item.distractorWords) {
          expect(distractor.toLowerCase()).not.toBe(item.matchWord.toLowerCase());
        }
      }
    });
  });

  describe('Extensible Domain: PPS Grade 2 Math Dataset', () => {
    const math = MathTopicSchema.parse(rawMath);

    it('includes addition, subtraction, and skip counting items', () => {
      const ops = new Set(math.items.map((i) => i.operation));
      expect(ops.has('addition')).toBe(true);
      expect(ops.has('subtraction')).toBe(true);
      expect(ops.has('skip_counting')).toBe(true);
      expect(math.items.length).toBeGreaterThanOrEqual(35);
    });

    it('verifies addition and subtraction calculations are mathematically correct within 20', () => {
      for (const item of math.items) {
        if (item.operation === 'addition') {
          expect(item.operand1 + item.operand2).toBe(item.result);
          expect(item.result).toBeLessThanOrEqual(20);
        } else if (item.operation === 'subtraction') {
          expect(item.operand1 - item.operand2).toBe(item.result);
          expect(item.operand1).toBeLessThanOrEqual(20);
        }
      }
    });

    it('ensures all math distractor results do not equal the correct result', () => {
      for (const item of math.items) {
        expect(item.distractorResults.length).toBeGreaterThanOrEqual(2);
        for (const distractor of item.distractorResults) {
          expect(distractor).not.toBe(item.result);
        }
      }
    });
  });

  describe('CurriculumService Runtime Features', () => {
    const service = new CurriculumService();

    it('loads and validates default curriculum on instantiation', () => {
      const master = service.getMasterCurriculum();
      expect(master).toBeDefined();
      expect(master.phonics.items.length).toBeGreaterThanOrEqual(40);
      expect(master.morphology.items.length).toBeGreaterThanOrEqual(30);
      expect(master.vocabulary.items.length).toBeGreaterThanOrEqual(40);
      expect(master.math.items.length).toBeGreaterThanOrEqual(30);
    });

    it('retrieves topic manifests and level configs', () => {
      const phonicsLevels = service.getLevelsForTopic('phonics');
      expect(phonicsLevels.length).toBe(5);

      const level2 = service.getLevel('phonics', 2);
      expect(level2).toBeDefined();
      expect(level2?.name).toContain("The Trickster 'ea'");
      expect(level2?.scaffoldStage).toBe('discrimination');
    });

    it('retrieves items and explanations by ID', () => {
      const beachItem = service.getItemById('phonics_ea_beach');
      expect(beachItem).toBeDefined();
      expect(beachItem?.fruitType).toBe('peach');

      const explanation = service.getExplanation('phonics_ea_beach');
      expect(explanation).toContain('/ē/');
    });

    it('creates runtime CurriculumItem matching GameScene contract', () => {
      const beachItem = service.getItemById('phonics_ea_beach')!;
      const question = service.createQuestion(beachItem);

      expect(CurriculumItemSchema.safeParse(question).success).toBe(true);
      expect(question.targetAnswer).toBe('beach');
      expect(question.targetFruitType).toBe('peach');
      expect(question.options.length).toBeGreaterThanOrEqual(3);

      const correctOption = question.options.find((o) => o.isCorrect);
      expect(correctOption?.text).toBe('beach');
      expect(correctOption?.fruitType).toBe('peach');

      const wrongOptions = question.options.filter((o) => !o.isCorrect);
      expect(wrongOptions.length).toBeGreaterThanOrEqual(2);
      for (const opt of wrongOptions) {
        expect(opt.text).not.toBe('beach');
      }
    });

    it('generates a full round question set for a level', () => {
      const questions = service.generateQuestionSet('phonics', 1, 10);
      expect(questions.length).toBe(10);
      for (const q of questions) {
        expect(CurriculumItemSchema.safeParse(q).success).toBe(true);
        expect(q.options.some((o) => o.isCorrect)).toBe(true);
      }
    });

    it('provides an initialized default singleton instance', () => {
      expect(curriculumService).toBeDefined();
      expect(curriculumService.getMasterCurriculum().version).toBe('1.0.0');
    });
  });
});
