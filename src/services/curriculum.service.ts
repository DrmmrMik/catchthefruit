/**
 * Curriculum Service - Data loader, runtime Zod validator, and Question Generator
 * 
 * Strict STACK.md compliance:
 * - Zero hardcoded curriculum in source code
 * - All content loaded from external JSON and validated with Zod at startup
 * - Generates structured questions (CurriculumItem) for GameScene
 * - Provides explanation lookups for teaching cards
 */
import {
  FruitType,
  FruitTypeSchema,
  TopicType,
  PhonicsTopicSchema,
  MorphologyTopicSchema,
  VocabularyTopicSchema,
  MathTopicSchema,
  MasterCurriculumSchema,
  MasterCurriculum,
  PhonicsTopic,
  MorphologyTopic,
  VocabularyTopic,
  MathTopic,
  PhonicsItem,
  MorphologyItem,
  VocabularyItem,
  MathItem,
  LevelConfig,
  CurriculumItem,
  OptionItem
} from '../schema/curriculum.schema';

import rawPhonics from '../../data/phonics.json';
import rawMorphology from '../../data/morphology.json';
import rawVocabulary from '../../data/vocabulary.json';
import rawMath from '../../data/math.json';

const ALL_FRUIT_TYPES = FruitTypeSchema.options;

export class CurriculumService {
  private masterCurriculum!: MasterCurriculum;
  private itemsById: Map<string, PhonicsItem | MorphologyItem | VocabularyItem | MathItem> = new Map();

  constructor(customCurriculum?: MasterCurriculum) {
    if (customCurriculum) {
      this.setCurriculum(customCurriculum);
    } else {
      this.loadDefaultCurriculum();
    }
  }

  /**
   * Loads and validates default external JSON datasets through Zod schemas.
   * Throws ZodError immediately if any dataset fails validation.
   */
  public loadDefaultCurriculum(): MasterCurriculum {
    const validatedPhonics = PhonicsTopicSchema.parse(rawPhonics);
    const validatedMorphology = MorphologyTopicSchema.parse(rawMorphology);
    const validatedVocabulary = VocabularyTopicSchema.parse(rawVocabulary);
    const validatedMath = MathTopicSchema.parse(rawMath);

    const assembled: MasterCurriculum = {
      version: '1.0.0',
      phonics: validatedPhonics,
      morphology: validatedMorphology,
      vocabulary: validatedVocabulary,
      math: validatedMath
    };

    this.setCurriculum(MasterCurriculumSchema.parse(assembled));
    return this.masterCurriculum;
  }

  /**
   * Sets and indexes an externally provided, validated MasterCurriculum
   */
  public setCurriculum(curriculum: MasterCurriculum): void {
    this.masterCurriculum = MasterCurriculumSchema.parse(curriculum);
    this.itemsById.clear();

    for (const item of this.masterCurriculum.phonics.items) {
      this.itemsById.set(item.id, item);
    }
    for (const item of this.masterCurriculum.morphology.items) {
      this.itemsById.set(item.id, item);
    }
    for (const item of this.masterCurriculum.vocabulary.items) {
      this.itemsById.set(item.id, item);
    }
    for (const item of this.masterCurriculum.math.items) {
      this.itemsById.set(item.id, item);
    }
  }

  /**
   * Returns the complete validated MasterCurriculum object
   */
  public getMasterCurriculum(): MasterCurriculum {
    return this.masterCurriculum;
  }

  /**
   * Returns topic-specific manifest
   */
  public getTopic(topic: TopicType): PhonicsTopic | MorphologyTopic | VocabularyTopic | MathTopic {
    switch (topic) {
      case 'phonics':
        return this.masterCurriculum.phonics;
      case 'morphology':
        return this.masterCurriculum.morphology;
      case 'vocabulary':
        return this.masterCurriculum.vocabulary;
      case 'math':
        return this.masterCurriculum.math;
    }
  }

  /**
   * Returns all level configs for a given topic
   */
  public getLevelsForTopic(topic: TopicType): LevelConfig[] {
    return this.getTopic(topic).levels;
  }

  /**
   * Returns a specific level config for a given topic and levelNumber
   */
  public getLevel(topic: TopicType, levelNumber: number): LevelConfig | undefined {
    const levels = this.getLevelsForTopic(topic);
    return levels.find((l) => l.levelNumber === levelNumber);
  }

  /**
   * Returns all items for a given topic
   */
  public getItemsForTopic(topic: TopicType): (PhonicsItem | MorphologyItem | VocabularyItem | MathItem)[] {
    return this.getTopic(topic).items;
  }

  /**
   * Look up any item by its unique ID
   */
  public getItemById(id: string): (PhonicsItem | MorphologyItem | VocabularyItem | MathItem) | undefined {
    return this.itemsById.get(id);
  }

  /**
   * Look up teaching explanation for a given item ID (used by TeachingCard after mistakes)
   */
  public getExplanation(itemId: string): string | undefined {
    const item = this.itemsById.get(itemId);
    return item?.explanation;
  }

  /**
   * Generates a randomized list of distinct fruit types excluding the given one
   */
  private getDistractorFruitTypes(excluded: FruitType, count: number): FruitType[] {
    const available = ALL_FRUIT_TYPES.filter((f) => f !== excluded);
    // Shuffle available
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Converts a curriculum item into a runtime CurriculumItem with options for GameScene
   */
  public createQuestion(
    item: PhonicsItem | MorphologyItem | VocabularyItem | MathItem,
    levelPrompt?: string,
    levelSpokenPrompt?: string
  ): CurriculumItem {
    let subTopic = '';
    let prompt = levelPrompt || '';
    let spokenPrompt = levelSpokenPrompt || prompt;
    let targetAnswer = '';
    const targetFruitType: FruitType = item.fruitType;
    const options: OptionItem[] = [];

    if ('ruleName' in item) {
      // PhonicsItem
      subTopic = item.ruleName;
      targetAnswer = item.word;
      if (!prompt) {
        prompt = `Catch the '${item.ruleName}' sound: ${item.sound}!`;
        spokenPrompt = `Catch words with ${item.ruleName} that say ${item.sound}!`;
      }
      options.push({
        text: item.word,
        fruitType: item.fruitType,
        isCorrect: true,
        explanation: item.explanation
      });

      const distractorFruits = this.getDistractorFruitTypes(item.fruitType, item.distractorWords.length);
      item.distractorWords.forEach((dw, idx) => {
        const fruit = distractorFruits[idx] ?? 'lemon';
        options.push({
          text: dw,
          fruitType: fruit,
          isCorrect: false,
          explanation: item.explanation
        });
      });

      return {
        id: item.id,
        topic: 'phonics',
        subTopic,
        prompt,
        spokenPrompt,
        targetAnswer,
        targetFruitType,
        options,
        explanation: item.explanation
      };
    } else if ('affix' in item) {
      // MorphologyItem
      subTopic = item.affix;
      targetAnswer = item.combinedWord;
      if (!prompt) {
        prompt = `Catch: ${item.visualSegmentation}`;
        spokenPrompt = `Catch ${item.combinedWord}!`;
      }
      options.push({
        text: item.combinedWord,
        fruitType: item.fruitType,
        isCorrect: true,
        explanation: item.explanation
      });

      const distractorFruits = this.getDistractorFruitTypes(item.fruitType, item.distractorWords.length);
      item.distractorWords.forEach((dw, idx) => {
        const fruit = distractorFruits[idx] ?? 'grape';
        options.push({
          text: dw,
          fruitType: fruit,
          isCorrect: false,
          explanation: item.explanation
        });
      });

      return {
        id: item.id,
        topic: 'morphology',
        subTopic,
        prompt,
        spokenPrompt,
        targetAnswer,
        targetFruitType,
        options,
        explanation: item.explanation
      };
    } else if ('relationship' in item) {
      // VocabularyItem
      subTopic = item.relationship;
      targetAnswer = item.matchWord;
      const relLabel = item.relationship === 'synonym' ? 'SAME as' : 'OPPOSITE of';
      if (!prompt) {
        prompt = `Catch the word that means the ${relLabel} "${item.targetWord}"!`;
        spokenPrompt = `Catch the word that means the ${relLabel} ${item.targetWord}! ${item.sentenceContext}`;
      }
      options.push({
        text: item.matchWord,
        fruitType: item.fruitType,
        isCorrect: true,
        explanation: item.explanation
      });

      const distractorFruits = this.getDistractorFruitTypes(item.fruitType, item.distractorWords.length);
      item.distractorWords.forEach((dw, idx) => {
        const fruit = distractorFruits[idx] ?? 'plum';
        options.push({
          text: dw,
          fruitType: fruit,
          isCorrect: false,
          explanation: item.explanation
        });
      });

      return {
        id: item.id,
        topic: 'vocabulary',
        subTopic,
        prompt,
        spokenPrompt,
        targetAnswer,
        targetFruitType,
        options,
        explanation: item.explanation
      };
    } else {
      // MathItem
      subTopic = item.operation;
      targetAnswer = String(item.result);
      if (!prompt) {
        prompt = item.prompt;
        spokenPrompt = item.prompt.replace('?', 'what number?');
      }
      options.push({
        text: String(item.result),
        fruitType: item.fruitType,
        isCorrect: true,
        explanation: item.explanation
      });

      const distractorFruits = this.getDistractorFruitTypes(item.fruitType, item.distractorResults.length);
      item.distractorResults.forEach((dr, idx) => {
        const fruit = distractorFruits[idx] ?? 'kiwi';
        options.push({
          text: String(dr),
          fruitType: fruit,
          isCorrect: false,
          explanation: item.explanation
        });
      });

      return {
        id: item.id,
        topic: 'math',
        subTopic,
        prompt,
        spokenPrompt,
        targetAnswer,
        targetFruitType,
        options,
        explanation: item.explanation
      };
    }
  }

  /**
   * Generates a round's worth of questions for a specific topic and level
   */
  public generateQuestionSet(topic: TopicType, levelNumber: number, count?: number): CurriculumItem[] {
    const level = this.getLevel(topic, levelNumber);
    const items = this.getItemsForTopic(topic);
    const targetCount = count ?? (level?.itemsRequired ?? 10);

    // Filter by targetPatterns if level defines them
    let pool = items;
    if (level?.targetPatterns && level.targetPatterns.length > 0) {
      const patterns = new Set(level.targetPatterns);
      const filtered = items.filter((item) => {
        if ('ruleName' in item) {
          return patterns.has(item.ruleName);
        }
        if ('affix' in item) {
          return patterns.has(item.affix);
        }
        if ('relationship' in item) {
          return patterns.has(item.relationship);
        }
        if ('operation' in item) {
          return patterns.has(item.operation);
        }
        return true;
      });
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected: (PhonicsItem | MorphologyItem | VocabularyItem | MathItem)[] = [];

    // Fill up to targetCount (repeating if pool is smaller than required)
    let idx = 0;
    while (selected.length < targetCount) {
      const item = shuffled[idx % shuffled.length];
      if (item) {
        selected.push(item);
      }
      idx++;
    }

    return selected.map((item) =>
      this.createQuestion(item, level?.prompt, level?.spokenPrompt)
    );
  }
}

// Singleton instance export for game-wide usage
export const curriculumService = new CurriculumService();
