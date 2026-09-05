/**
 * Tier 5 White-Box Adversarial Coverage Hardening Test Suite
 * Target Services & Schemas:
 * - src/services/audio.service.ts
 * - src/services/curriculum.service.ts
 * - src/services/storage.service.ts
 * - src/services/decoration.service.ts
 * - src/schema/curriculum.schema.ts
 * - src/schema/progress.schema.ts
 * - src/schema/decorations.schema.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AudioService,
  normalizePhoneticsForSpeech
} from '../src/services/audio.service';
import {
  CurriculumService,
  curriculumService
} from '../src/services/curriculum.service';
import {
  StorageService,
  STORAGE_KEY,
  calculateStars,
  isMasteryAchieved
} from '../src/services/storage.service';
import {
  DecorationService,
  decorationService
} from '../src/services/decoration.service';

import {
  FruitTypeSchema,
  PhonicsItemSchema,
  MorphologyItemSchema,
  VocabularyItemSchema,
  MathItemSchema,
  LevelConfigSchema,
  MasterCurriculumSchema,
  type MasterCurriculum,
  type PhonicsItem,
  type MorphologyItem,
  type VocabularyItem,
  type MathItem
} from '../src/schema/curriculum.schema';

import {
  UserProgressSchema,
  DEFAULT_UNLOCKED_LEVELS
} from '../src/schema/progress.schema';

import {
  DecorationItemSchema,
  DecorationCatalogSchema
} from '../src/schema/decorations.schema';

import rawDecorations from '../data/decorations.json';

// ============================================================================
// Web Audio API Mocks for Adversarial Testing
// ============================================================================

class MockAudioParam {
  public value: number;
  public history: Array<{ type: string; val: number; time: number }> = [];

  constructor(initial: number = 1) {
    this.value = initial;
  }

  public setValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.history.push({ type: 'setValueAtTime', val, time });
  });

  public linearRampToValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.history.push({ type: 'linearRampToValueAtTime', val, time });
  });

  public exponentialRampToValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.history.push({ type: 'exponentialRampToValueAtTime', val, time });
  });
}

class MockGainNode {
  public gain = new MockAudioParam(1);
  public connect = vi.fn();
  public disconnect = vi.fn();
}

class MockOscillatorNode {
  public type: OscillatorType = 'sine';
  public frequency = new MockAudioParam(440);
  public connect = vi.fn();
  public disconnect = vi.fn();
  public startTime: number = -1;
  public stopTime: number = -1;

  public start = vi.fn((time?: number) => {
    this.startTime = time ?? 0;
  });

  public stop = vi.fn((time?: number) => {
    this.stopTime = time ?? 0;
  });
}

class MockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = 'suspended';
  public destination = {};
  public createdOscillators: MockOscillatorNode[] = [];
  public createdGains: MockGainNode[] = [];

  public createGain = vi.fn(() => {
    if (this.state === 'closed') {
      throw new DOMException('Cannot createGain on closed AudioContext', 'InvalidStateError');
    }
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain as unknown as GainNode;
  });

  public createOscillator = vi.fn(() => {
    if (this.state === 'closed') {
      throw new DOMException('Cannot createOscillator on closed AudioContext', 'InvalidStateError');
    }
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc as unknown as OscillatorNode;
  });

  public resume = vi.fn(async () => {
    if (this.state === 'closed') {
      throw new DOMException('Cannot resume closed AudioContext', 'InvalidStateError');
    }
    this.state = 'running';
  });

  public close = vi.fn(async () => {
    this.state = 'closed';
  });
}

// ============================================================================
// Web Speech API Mocks for Adversarial Testing
// ============================================================================

class MockSpeechSynthesisUtterance {
  public text: string;
  public rate: number = 1;
  public pitch: number = 1;
  public voice: SpeechSynthesisVoice | null = null;
  public onend: (() => void) | null = null;
  public onerror: ((event: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

interface MockSpeechSynthesis {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
  speaking: boolean;
  paused: boolean;
  pending: boolean;
}

// ============================================================================
// In-Memory Backing Store for idb-keyval Mocking
// ============================================================================

const idbBackingStore = new Map<string, any>();
let idbGetShouldThrow = false;
let idbSetShouldThrow = false;

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => {
    if (idbGetShouldThrow) {
      throw new DOMException('Simulated IndexedDB Get Failure', 'QuotaExceededError');
    }
    return idbBackingStore.get(key);
  }),
  set: vi.fn(async (key: string, val: any) => {
    if (idbSetShouldThrow) {
      throw new DOMException('Simulated IndexedDB Set Failure', 'QuotaExceededError');
    }
    idbBackingStore.set(key, val);
  }),
  del: vi.fn(async (key: string) => {
    idbBackingStore.delete(key);
  })
}));

describe('Tier 5 Adversarial Coverage Hardening Suite', () => {
  // ==========================================================================
  // Domain 1: Audio Service & Web Speech API Adversarial Stress Tests
  // ==========================================================================
  describe('Domain 1: Audio Service & Speech Synthesis Adversarial Stress', () => {
    let mockContext: MockAudioContext;
    let storage: StorageService;
    let audio: AudioService;
    let mockSynth: MockSpeechSynthesis;
    let originalSpeechSynthesis: any;
    let originalUtterance: any;

    beforeEach(async () => {
      idbBackingStore.clear();
      idbGetShouldThrow = false;
      idbSetShouldThrow = false;

      mockContext = new MockAudioContext();
      storage = new StorageService();
      await storage.resetProgress();
      audio = new AudioService(mockContext as unknown as AudioContext, storage);

      originalSpeechSynthesis = (window as any).speechSynthesis;
      originalUtterance = (window as any).SpeechSynthesisUtterance;

      mockSynth = {
        speak: vi.fn((utt: MockSpeechSynthesisUtterance) => {
          // Default synchronous onend trigger
          if (utt.onend) utt.onend();
        }),
        cancel: vi.fn(),
        getVoices: vi.fn(() => [
          { name: 'Google US English', lang: 'en-US', default: true } as SpeechSynthesisVoice
        ]),
        speaking: false,
        paused: false,
        pending: false
      };

      (window as any).speechSynthesis = mockSynth;
      (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    });

    afterEach(() => {
      (window as any).speechSynthesis = originalSpeechSynthesis;
      (window as any).SpeechSynthesisUtterance = originalUtterance;
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    describe('AudioContext State Transitions (suspended, running, closed, null)', () => {
      it('starts suspended and transitions to running upon unlock', async () => {
        expect(mockContext.state).toBe('suspended');
        expect(audio.isUnlocked()).toBe(false);

        await audio.unlock();
        expect(mockContext.resume).toHaveBeenCalled();
        expect(mockContext.state).toBe('running');
        expect(audio.isUnlocked()).toBe(true);
      });

      it('safely handles concurrent unlock invocations without double-resumption error', async () => {
        expect(mockContext.state).toBe('suspended');
        await Promise.all([
          audio.unlock(),
          audio.unlock(),
          audio.unlock()
        ]);
        expect(mockContext.state).toBe('running');
        expect(audio.isUnlocked()).toBe(true);
      });

      it('survives autoplay resume rejection (NotAllowedError) without unhandled rejection', async () => {
        mockContext.resume = vi.fn().mockRejectedValue(new DOMException('Blocked by autoplay', 'NotAllowedError'));
        await expect(audio.unlock()).resolves.toBeUndefined();
        expect(audio.isUnlocked()).toBe(false);

        // Subsequent SFX calls must not crash
        expect(() => audio.playCatch()).not.toThrow();
        expect(() => audio.playMiss()).not.toThrow();
        expect(() => audio.playClick()).not.toThrow();
      });

      it('survives AudioContext in closed state when createGain/createOscillator throw InvalidStateError', async () => {
        await mockContext.close();
        expect(mockContext.state).toBe('closed');
        expect(audio.isUnlocked()).toBe(false);

        // Methods must catch InvalidStateError internally and not throw
        expect(() => audio.playCatch(false)).not.toThrow();
        expect(() => audio.playCatch(true)).not.toThrow();
        expect(() => audio.playMiss()).not.toThrow();
        expect(() => audio.playLevelComplete()).not.toThrow();
        expect(() => audio.playCombo(4)).not.toThrow();
        expect(() => audio.playClick()).not.toThrow();
        expect(() => audio.setVolume(0.3)).not.toThrow();
        expect(() => audio.setMuted(true)).not.toThrow();
        expect(() => audio.setMuted(false)).not.toThrow();
      });

      it('survives completely null AudioContext across all public methods', async () => {
        const nullAudio = new AudioService(null, storage);
        expect(nullAudio.getAudioContext()).toBeNull();
        expect(nullAudio.isUnlocked()).toBe(false);

        await expect(nullAudio.unlock()).resolves.toBeUndefined();
        expect(() => nullAudio.playCatch(true)).not.toThrow();
        expect(() => nullAudio.playCatch(false)).not.toThrow();
        expect(() => nullAudio.playMiss()).not.toThrow();
        expect(() => nullAudio.playLevelComplete()).not.toThrow();
        expect(() => nullAudio.playCombo(10)).not.toThrow();
        expect(() => nullAudio.playClick()).not.toThrow();
        expect(() => nullAudio.setVolume(0.7)).not.toThrow();
        expect(nullAudio.getVolume()).toBe(0.7);
        expect(() => nullAudio.setMuted(true)).not.toThrow();
        expect(nullAudio.isMuted()).toBe(true);
        expect(nullAudio.toggleMute()).toBe(false);
        expect(() => nullAudio.setTtsEnabled(false)).not.toThrow();
        expect(nullAudio.isTtsEnabled()).toBe(false);
      });
    });

    describe('Rapid & Concurrent Synthesizer Invocations', () => {
      it('executes 100 rapid concurrent sound calls without race condition or crash', () => {
        const initialOscCount = mockContext.createdOscillators.length;

        for (let i = 0; i < 20; i++) {
          audio.playCatch(false);
          audio.playCatch(true);
          audio.playMiss();
          audio.playLevelComplete();
          audio.playCombo(i);
          audio.playClick();
        }

        expect(mockContext.createdOscillators.length).toBeGreaterThan(initialOscCount);
      });

      it('verifies exponential ramp targets are strictly positive to avoid Web Audio RangeError', () => {
        audio.playCatch(false);
        audio.playCatch(true);
        audio.playMiss();
        audio.playLevelComplete();
        audio.playCombo(3);
        audio.playClick();

        for (const gainNode of mockContext.createdGains) {
          for (const entry of gainNode.gain.history) {
            if (entry.type === 'exponentialRampToValueAtTime') {
              expect(entry.val).toBeGreaterThan(0);
            }
          }
        }
      });

      it('handles extreme combo counts with proper pentatonic index clamping', () => {
        // Negative count -> clamped to index 0 (523.25 Hz)
        audio.playCombo(-10);
        let osc = mockContext.createdOscillators[mockContext.createdOscillators.length - 2];
        expect(osc?.frequency.value).toBe(523.25);

        // 0 count -> clamped to index 0 (523.25 Hz)
        audio.playCombo(0);
        osc = mockContext.createdOscillators[mockContext.createdOscillators.length - 2];
        expect(osc?.frequency.value).toBe(523.25);

        // Extreme large count -> clamped to last pentatonic index (1318.51 Hz)
        audio.playCombo(99999);
        osc = mockContext.createdOscillators[mockContext.createdOscillators.length - 2];
        expect(osc?.frequency.value).toBe(1318.51);

        // Float count -> doesn't crash
        expect(() => audio.playCombo(2.7)).not.toThrow();
        expect(() => audio.playCombo(NaN)).not.toThrow();
      });

      it('clamps volume strictly between 0 and 1 under boundary and extreme inputs', () => {
        audio.setVolume(-100);
        expect(audio.getVolume()).toBe(0);

        audio.setVolume(-0.0001);
        expect(audio.getVolume()).toBe(0);

        audio.setVolume(0);
        expect(audio.getVolume()).toBe(0);

        audio.setVolume(1);
        expect(audio.getVolume()).toBe(1);

        audio.setVolume(1.0001);
        expect(audio.getVolume()).toBe(1);

        audio.setVolume(999);
        expect(audio.getVolume()).toBe(1);

        audio.setVolume(Infinity);
        expect(audio.getVolume()).toBe(1);

        audio.setVolume(-Infinity);
        expect(audio.getVolume()).toBe(0);

        expect(() => audio.setVolume(NaN)).not.toThrow();
      });

      it('strictly suppresses all audio node creation when muted', () => {
        audio.setMuted(true);
        expect(audio.isMuted()).toBe(true);

        const oscCountBefore = mockContext.createdOscillators.length;
        const gainCountBefore = mockContext.createdGains.length;

        for (let i = 0; i < 20; i++) {
          audio.playCatch(false);
          audio.playCatch(true);
          audio.playMiss();
          audio.playLevelComplete();
          audio.playCombo(i);
          audio.playClick();
        }

        // Exactly zero new nodes created while muted
        expect(mockContext.createdOscillators.length).toBe(oscCountBefore);
        expect(mockContext.createdGains.length).toBe(gainCountBefore);

        // Unmute and verify playback resumes node creation
        audio.setMuted(false);
        audio.playCatch(false);
        expect(mockContext.createdOscillators.length).toBeGreaterThan(oscCountBefore);
      });

      it('handles 100 rapid mute toggles without corrupting state', () => {
        for (let i = 0; i < 100; i++) {
          audio.toggleMute();
        }
        // 100 toggles starts false -> ends false
        expect(audio.isMuted()).toBe(false);
      });
    });

    describe('Speech Synthesis Cancel, Error & Timeout Resilience', () => {
      it('cancels previous utterance before speaking a new prompt', async () => {
        await audio.speakPrompt('Catch the fruit with ai!');
        expect(mockSynth.cancel).toHaveBeenCalled();
        expect(mockSynth.speak).toHaveBeenCalled();
      });

      it('survives utterance onerror event cleanly without rejecting or hanging', async () => {
        mockSynth.speak = vi.fn((utt: MockSpeechSynthesisUtterance) => {
          if (utt.onerror) {
            utt.onerror({ error: 'not-allowed' });
          }
        });

        await expect(audio.speakPrompt('Testing error event')).resolves.toBeUndefined();
      });

      it('survives buggy browser where speech synthesis never fires onend or onerror (4s timeout guard)', async () => {
        vi.useFakeTimers();

        mockSynth.speak = vi.fn((_utt: MockSpeechSynthesisUtterance) => {
          // Neither onend nor onerror is invoked (simulates hung browser engine)
        });

        const speakPromise = audio.speakPrompt('Hanging speech test');

        // Advance 3999ms - promise still pending
        vi.advanceTimersByTime(3999);

        // Advance 1ms (total 4000ms) - timeout safety guard resolves promise
        vi.advanceTimersByTime(1);
        await expect(speakPromise).resolves.toBeUndefined();
      });

      it('updates WCAG AAA live-region #sr-announcements when present in DOM', async () => {
        const srElem = document.createElement('div');
        srElem.id = 'sr-announcements';
        document.body.appendChild(srElem);

        try {
          await audio.speakPrompt('Catch words with /ē/!');
          expect(srElem.textContent).toContain('long E');
        } finally {
          document.body.removeChild(srElem);
        }
      });

      it('resolves immediately without calling speak when TTS is disabled or muted', async () => {
        audio.setTtsEnabled(false);
        await audio.speakPrompt('This should not speak');
        expect(mockSynth.speak).not.toHaveBeenCalled();

        audio.setTtsEnabled(true);
        audio.setMuted(true);
        await audio.speakPrompt('Muted speech should not speak');
        expect(mockSynth.speak).not.toHaveBeenCalled();
      });

      it('stopSpeaking invokes speechSynthesis.cancel safely', () => {
        audio.stopSpeaking();
        expect(mockSynth.cancel).toHaveBeenCalled();
      });
    });

    describe('Phonetic Normalization for Speech Stress', () => {
      it('eliminates all dictionary slashes and converts to natural phonemes', () => {
        const input = "Words with 'ea' that say /ē/ or /ĕ/ and 'ar' saying /är/ vs /ôr/ and /ẽr/";
        const result = normalizePhoneticsForSpeech(input);

        expect(result).not.toContain('/');
        expect(result).toContain('long E');
        expect(result).toContain('short E');
        expect(result).toContain('ar');
        expect(result).toContain('or');
        expect(result).toContain('er');
      });

      it('converts morphological segmentation equations to natural speech', () => {
        const input = "re + play → replay and un + happy -> unhappy";
        const result = normalizePhoneticsForSpeech(input);

        expect(result).toContain('R E plus play makes replay');
        expect(result).toContain('U N plus happy makes unhappy');
      });

      it('converts math equations to natural spoken prompts', () => {
        expect(normalizePhoneticsForSpeech('8 + 6 = ?')).toBe('What is 8 plus 6?');
        expect(normalizePhoneticsForSpeech('15 - 7 = ?')).toBe('What is 15 minus 7?');
        expect(normalizePhoneticsForSpeech('10, 20, 30, ?')).toBe('10, 20, 30, what comes next?');
      });

      it('survives empty, whitespace, and massive 10,000 character strings', () => {
        expect(normalizePhoneticsForSpeech('')).toBe('');
        expect(normalizePhoneticsForSpeech('   ')).toBe('');

        const massive = 'Catch the word with /ē/! '.repeat(400);
        const normalized = normalizePhoneticsForSpeech(massive);
        expect(normalized).not.toContain('/');
        expect(normalized.length).toBeGreaterThan(5000);
      });
    });
  });

  // ==========================================================================
  // Domain 2: Curriculum Service & Zod Schema Adversarial Stress Tests
  // ==========================================================================
  describe('Domain 2: Curriculum Service & Zod Schema Adversarial Stress', () => {
    let curriculum: CurriculumService;

    beforeEach(() => {
      curriculum = new CurriculumService();
    });

    describe('Curriculum Query Boundaries & Unknown Handling', () => {
      it('validates master curriculum singleton through MasterCurriculumSchema', () => {
        expect(curriculumService).toBeInstanceOf(CurriculumService);
        const master = curriculumService.getMasterCurriculum();
        expect(master).toBeDefined();
        expect(MasterCurriculumSchema.safeParse(master).success).toBe(true);
      });

      it('returns undefined for non-existent or negative level numbers', () => {
        expect(curriculum.getLevel('phonics', -1)).toBeUndefined();
        expect(curriculum.getLevel('phonics', 0)).toBeUndefined();
        expect(curriculum.getLevel('phonics', 9999)).toBeUndefined();
        expect(curriculum.getLevel('morphology', -10)).toBeUndefined();
        expect(curriculum.getLevel('vocabulary', 0)).toBeUndefined();
        expect(curriculum.getLevel('math', 1000)).toBeUndefined();
      });

      it('returns undefined for non-existent item IDs and empty strings', () => {
        expect(curriculum.getItemById('non-existent-id')).toBeUndefined();
        expect(curriculum.getItemById('')).toBeUndefined();
        expect(curriculum.getItemById('null')).toBeUndefined();
        expect(curriculum.getItemById('undefined')).toBeUndefined();
      });

      it('returns undefined explanation for non-existent item IDs', () => {
        expect(curriculum.getExplanation('non-existent-id')).toBeUndefined();
        expect(curriculum.getExplanation('')).toBeUndefined();
      });

      it('handles unknown topic query safely in getTopic', () => {
        const unknown = curriculum.getTopic('unknown' as any);
        expect(unknown).toBeUndefined();
      });
    });

    describe('Question Generation Extremes & Distractor Pools', () => {
      it('returns empty array when requested question count is 0 or negative', () => {
        expect(curriculum.generateQuestionSet('phonics', 1, 0)).toEqual([]);
        expect(curriculum.generateQuestionSet('morphology', 1, -5)).toEqual([]);
      });

      it('generates large question sets (100 items) via cyclical pool wrapping without running out', () => {
        const questions = curriculum.generateQuestionSet('phonics', 1, 100);
        expect(questions.length).toBe(100);

        for (const q of questions) {
          expect(q.id).toBeDefined();
          expect(q.options.length).toBeGreaterThanOrEqual(1);
          expect(q.options.some(o => o.isCorrect)).toBe(true);
        }
      });

      it('falls back gracefully when given an out-of-range levelNumber', () => {
        const questions = curriculum.generateQuestionSet('vocabulary', 9999, 5);
        expect(questions.length).toBe(5);
        expect(questions[0]?.topic).toBe('vocabulary');
      });

      it('falls back to complete topic pool if level targetPatterns match zero items', () => {
        const master = curriculum.getMasterCurriculum();
        const customCurriculum: MasterCurriculum = JSON.parse(JSON.stringify(master));

        // Inject level with non-matching pattern
        customCurriculum.phonics.levels[0]!.targetPatterns = ['non_existent_impossible_pattern'];
        const customService = new CurriculumService(customCurriculum);

        // Must not return empty array or loop infinitely; should fall back to entire pool
        const questions = customService.generateQuestionSet('phonics', 1, 5);
        expect(questions.length).toBe(5);
        expect(questions[0]?.topic).toBe('phonics');
      });
    });

    describe('createQuestion Topic Branch Hardening', () => {
      it('correctly sets sound-discrimination prompt for ea_long_e', () => {
        const item: PhonicsItem = {
          id: 'phonics_test_ea_long',
          pattern: 'vowel_team',
          ruleName: 'ea_long_e',
          sound: '/ē/',
          word: 'beach',
          sentence: 'We walked on the sunny beach.',
          distractorWords: ['bread', 'head'],
          explanation: 'ea in beach makes the long e sound /ē/.',
          fruitType: 'peach'
        };

        const question = curriculum.createQuestion(item);
        expect(question.prompt).toContain("Catch words where 'ea' says /ē/ like beach!");
        expect(question.targetAnswer).toBe('beach');
        expect(question.options.find(o => o.isCorrect)?.text).toBe('beach');
        expect(question.options.length).toBe(3); // 1 correct + 2 distractors
      });

      it('correctly sets sound-discrimination prompt for ea_short_e', () => {
        const item: PhonicsItem = {
          id: 'phonics_test_ea_short',
          pattern: 'vowel_team',
          ruleName: 'ea_short_e',
          sound: '/ĕ/',
          word: 'bread',
          sentence: 'She baked fresh wheat bread.',
          distractorWords: ['beach', 'teach'],
          explanation: 'ea in bread is a trickster making the short e sound /ĕ/.',
          fruitType: 'apple'
        };

        const question = curriculum.createQuestion(item);
        expect(question.prompt).toContain("Catch the trickster word where 'ea' says /ĕ/ like bread!");
        expect(question.targetAnswer).toBe('bread');
        expect(question.options.find(o => o.isCorrect)?.text).toBe('bread');
      });

      it('retrieves distractor explanations from phonics catalog when distractor matches an item', () => {
        const item: PhonicsItem = {
          id: 'phonics_distractor_test',
          pattern: 'vowel_team',
          ruleName: 'ai',
          sound: '/ā/',
          word: 'rain',
          sentence: 'Rain fell on the roof.',
          distractorWords: ['beach', 'bread'], // beach and bread exist in default phonics catalog
          explanation: 'ai says long a in rain.',
          fruitType: 'blueberry'
        };

        const question = curriculum.createQuestion(item);
        const beachOption = question.options.find(o => o.text === 'beach');
        expect(beachOption?.explanation).toBeDefined();
      });

      it('correctly constructs Morphology question with visual segmentation', () => {
        const item: MorphologyItem = {
          id: 'morph_test_1',
          affixType: 'prefix',
          affix: 're-',
          baseWord: 'play',
          combinedWord: 'replay',
          visualSegmentation: 're + play → replay',
          distractorWords: ['jump', 'walk'],
          explanation: 're- means again.',
          fruitType: 'cherry'
        };

        const question = curriculum.createQuestion(item);
        expect(question.topic).toBe('morphology');
        expect(question.prompt).toBe('Catch: re + play → replay');
        expect(question.targetAnswer).toBe('replay');
        expect(question.options.find(o => o.isCorrect)?.text).toBe('replay');
        expect(question.options.length).toBe(3);
      });

      it('correctly constructs Vocabulary question for synonym vs antonym', () => {
        const synItem: VocabularyItem = {
          id: 'vocab_test_syn',
          relationship: 'synonym',
          targetWord: 'big',
          matchWord: 'large',
          sentenceContext: 'The pumpkin was big.',
          distractorWords: ['tiny', 'small'],
          explanation: 'Large is a synonym of big.',
          fruitType: 'watermelon'
        };

        const synQuestion = curriculum.createQuestion(synItem);
        expect(synQuestion.prompt).toContain('SAME as "big"');
        expect(synQuestion.targetAnswer).toBe('large');

        const antItem: VocabularyItem = {
          id: 'vocab_test_ant',
          relationship: 'antonym',
          targetWord: 'hot',
          matchWord: 'cold',
          sentenceContext: 'The soup was hot.',
          distractorWords: ['warm', 'burning'],
          explanation: 'Cold is an antonym of hot.',
          fruitType: 'orange'
        };

        const antQuestion = curriculum.createQuestion(antItem);
        expect(antQuestion.prompt).toContain('OPPOSITE of "hot"');
        expect(antQuestion.targetAnswer).toBe('cold');
      });

      it('correctly constructs Math question converting results to string', () => {
        const mathItem: MathItem = {
          id: 'math_test_1',
          operation: 'addition',
          operand1: 7,
          operand2: 8,
          result: 15,
          prompt: '7 + 8 = ?',
          distractorResults: [14, 16],
          explanation: '7 plus 8 equals 15.',
          fruitType: 'banana'
        };

        const question = curriculum.createQuestion(mathItem);
        expect(question.topic).toBe('math');
        expect(question.targetAnswer).toBe('15');
        expect(question.spokenPrompt).toBe('7 + 8 = what number?');
        expect(question.options.find(o => o.isCorrect)?.text).toBe('15');
        expect(question.options.find(o => o.text === '14')?.isCorrect).toBe(false);
      });

      it('handles excessive distractor counts beyond the 11 available alternative fruit types', () => {
        const item: PhonicsItem = {
          id: 'phonics_many_distractors',
          pattern: 'vowel_team',
          ruleName: 'ai',
          sound: '/ā/',
          word: 'rain',
          sentence: 'Rain is falling.',
          // 15 distractors (more than 11 available alternatives)
          distractorWords: [
            'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15'
          ],
          explanation: 'test',
          fruitType: 'apple'
        };

        const question = curriculum.createQuestion(item);
        expect(question.options.length).toBe(16); // 1 correct + 15 distractors
        for (const opt of question.options) {
          expect(FruitTypeSchema.safeParse(opt.fruitType).success).toBe(true);
        }
      });
    });

    describe('Curriculum Zod Schemas Strictness & Attack Vectors', () => {
      it('FruitTypeSchema rejects unknown fruits, empty strings, and non-strings', () => {
        expect(FruitTypeSchema.safeParse('apple').success).toBe(true);
        expect(FruitTypeSchema.safeParse('peach').success).toBe(true);
        expect(FruitTypeSchema.safeParse('mango').success).toBe(false);
        expect(FruitTypeSchema.safeParse('durian').success).toBe(false);
        expect(FruitTypeSchema.safeParse('').success).toBe(false);
        expect(FruitTypeSchema.safeParse(123).success).toBe(false);
        expect(FruitTypeSchema.safeParse(null).success).toBe(false);
      });

      it('PhonicsItemSchema rejects items with fewer than 2 distractors or empty strings', () => {
        const validItem = {
          id: 'ph_1',
          pattern: 'vowel_team',
          ruleName: 'ai',
          sound: '/ā/',
          word: 'rain',
          sentence: 'Rain fell.',
          distractorWords: ['train', 'brain'],
          explanation: 'ai says /ā/.',
          fruitType: 'blueberry'
        };
        expect(PhonicsItemSchema.safeParse(validItem).success).toBe(true);

        // Single distractor rejected
        expect(PhonicsItemSchema.safeParse({
          ...validItem,
          distractorWords: ['train']
        }).success).toBe(false);

        // Empty distractorWords rejected
        expect(PhonicsItemSchema.safeParse({
          ...validItem,
          distractorWords: []
        }).success).toBe(false);

        // Empty word rejected
        expect(PhonicsItemSchema.safeParse({
          ...validItem,
          word: ''
        }).success).toBe(false);

        // Invalid pattern rejected
        expect(PhonicsItemSchema.safeParse({
          ...validItem,
          pattern: 'consonant_blend'
        }).success).toBe(false);
      });

      it('MorphologyItemSchema rejects invalid affixType or missing visualSegmentation', () => {
        const validItem = {
          id: 'morph_1',
          affixType: 'prefix',
          affix: 're-',
          baseWord: 'play',
          combinedWord: 'replay',
          visualSegmentation: 're + play → replay',
          distractorWords: ['jump', 'walk'],
          explanation: 're- means again.',
          fruitType: 'cherry'
        };
        expect(MorphologyItemSchema.safeParse(validItem).success).toBe(true);

        expect(MorphologyItemSchema.safeParse({
          ...validItem,
          affixType: 'circumfix'
        }).success).toBe(false);

        expect(MorphologyItemSchema.safeParse({
          ...validItem,
          visualSegmentation: ''
        }).success).toBe(false);
      });

      it('VocabularyItemSchema rejects invalid relationship types', () => {
        const validItem = {
          id: 'voc_1',
          relationship: 'synonym',
          targetWord: 'big',
          matchWord: 'large',
          sentenceContext: 'Big dog.',
          distractorWords: ['small', 'tiny'],
          explanation: 'Synonym of big.',
          fruitType: 'plum'
        };
        expect(VocabularyItemSchema.safeParse(validItem).success).toBe(true);

        expect(VocabularyItemSchema.safeParse({
          ...validItem,
          relationship: 'homophone'
        }).success).toBe(false);
      });

      it('MathItemSchema rejects invalid operations and fewer than 2 distractorResults', () => {
        const validItem = {
          id: 'math_1',
          operation: 'addition',
          operand1: 3,
          operand2: 4,
          result: 7,
          prompt: '3 + 4 = ?',
          distractorResults: [6, 8],
          explanation: '3 + 4 = 7',
          fruitType: 'lemon'
        };
        expect(MathItemSchema.safeParse(validItem).success).toBe(true);

        expect(MathItemSchema.safeParse({
          ...validItem,
          operation: 'division'
        }).success).toBe(false);

        expect(MathItemSchema.safeParse({
          ...validItem,
          distractorResults: [6]
        }).success).toBe(false);
      });

      it('LevelConfigSchema rejects non-positive level numbers and out-of-range thresholds', () => {
        const validLevel = {
          id: 'phonics_1',
          topic: 'phonics',
          levelNumber: 1,
          name: 'Vowel Teams 1',
          description: 'Introduction to vowel teams',
          fallSpeedDurationMs: 2500,
          itemsRequired: 10,
          masteryAccuracyThreshold: 0.85,
          scaffoldStage: 'single_rule'
        };
        expect(LevelConfigSchema.safeParse(validLevel).success).toBe(true);

        // Negative levelNumber rejected
        expect(LevelConfigSchema.safeParse({
          ...validLevel,
          levelNumber: -1
        }).success).toBe(false);

        // 0 levelNumber rejected
        expect(LevelConfigSchema.safeParse({
          ...validLevel,
          levelNumber: 0
        }).success).toBe(false);

        // Non-positive fallSpeedDurationMs rejected
        expect(LevelConfigSchema.safeParse({
          ...validLevel,
          fallSpeedDurationMs: 0
        }).success).toBe(false);

        // Out-of-bounds mastery accuracy threshold rejected
        expect(LevelConfigSchema.safeParse({
          ...validLevel,
          masteryAccuracyThreshold: 1.5
        }).success).toBe(false);

        expect(LevelConfigSchema.safeParse({
          ...validLevel,
          masteryAccuracyThreshold: -0.1
        }).success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Domain 3: Storage Service & Progress Schema Adversarial Stress Tests
  // ==========================================================================
  describe('Domain 3: Storage Service & Progress Schema Adversarial Stress', () => {
    let storage: StorageService;

    beforeEach(async () => {
      idbBackingStore.clear();
      idbGetShouldThrow = false;
      idbSetShouldThrow = false;

      storage = new StorageService();
      await storage.resetProgress();
    });

    describe('Corrupted Progress Schema Recovery', () => {
      it('initializes default progress with DEFAULT_UNLOCKED_LEVELS', async () => {
        const progress = await storage.getProgress();
        expect(progress.unlockedLevels['phonics_1']).toBe(DEFAULT_UNLOCKED_LEVELS['phonics_1']);
        expect(DEFAULT_UNLOCKED_LEVELS['phonics_1']).toBe(true);
      });

      it('recovers gracefully to valid default progress when IndexedDB contains non-object primitive', async () => {
        idbBackingStore.set(STORAGE_KEY, 'corrupted_string_payload');

        const progress = await storage.getProgress();
        expect(progress).toBeDefined();
        expect(UserProgressSchema.safeParse(progress).success).toBe(true);
        expect(progress.unlockedLevels['phonics_1']).toBe(true);
      });

      it('recovers gracefully when IndexedDB contains corrupted types and negative coins', async () => {
        idbBackingStore.set(STORAGE_KEY, {
          version: 'invalid_string_version',
          coins: -99999,
          unlockedLevels: 'not_an_object',
          settings: { sfxVolume: 500 }
        });

        const progress = await storage.getProgress();
        expect(progress).toBeDefined();
        expect(UserProgressSchema.safeParse(progress).success).toBe(true);
        expect(progress.coins).toBeGreaterThanOrEqual(0);
      });

      it('recovers gracefully when IndexedDB get throws QuotaExceededError', async () => {
        idbGetShouldThrow = true;

        const progress = await storage.getProgress();
        expect(progress).toBeDefined();
        expect(UserProgressSchema.safeParse(progress).success).toBe(true);
      });

      it('survives when IndexedDB set throws QuotaExceededError during saveProgress', async () => {
        idbSetShouldThrow = true;

        const initialProgress = await storage.getProgress();
        initialProgress.coins = 500;

        // saveProgress must update in-memory cache and not throw unhandled exception
        await expect(storage.saveProgress(initialProgress)).resolves.toBeUndefined();
        expect(await storage.getCoins()).toBe(500);
      });
    });

    describe('Storage Concurrency Stress', () => {
      it('executes 50 concurrent mistake and correct recording operations without state corruption', async () => {
        const ops: Promise<any>[] = [];

        for (let i = 0; i < 25; i++) {
          ops.push(storage.recordMistake('phonics', 'ai', 'rain'));
          ops.push(storage.recordCorrect('phonics', 'ai', 'rain'));
        }

        await Promise.all(ops);

        const progress = await storage.getProgress();
        expect(progress.errorStats.totalAttempts).toBe(50);
        expect(progress.errorStats.totalCorrect).toBe(25);
        expect(progress.errorStats.patternErrors['ai']).toBe(25);
        expect(progress.errorStats.wordErrors['rain']).toBe(25);
      });

      it('handles concurrent coin additions accurately', async () => {
        const adds: Promise<number>[] = [];
        for (let i = 0; i < 20; i++) {
          adds.push(storage.addCoins(10));
        }

        await Promise.all(adds);
        const finalCoins = await storage.getCoins();
        expect(finalCoins).toBe(200);
      });

      it('handles multiple concurrent saveLevelResult across different topics and levels', async () => {
        await Promise.all([
          storage.saveLevelResult('phonics', 1, 0.95, 1000, 10),
          storage.saveLevelResult('morphology', 1, 0.90, 800, 10),
          storage.saveLevelResult('vocabulary', 1, 1.00, 1200, 10),
          storage.saveLevelResult('math', 1, 0.88, 750, 10)
        ]);

        const progress = await storage.getProgress();
        expect(progress.unlockedLevels['phonics_2']).toBe(true);
        expect(progress.unlockedLevels['morphology_2']).toBe(true);
        expect(progress.unlockedLevels['vocabulary_2']).toBe(true);
        expect(progress.unlockedLevels['math_2']).toBe(true);
      });
    });

    describe('Extreme Scores, Coins & Negative Level Numbers', () => {
      it('ignores negative or zero coin additions and handles massive balances', async () => {
        expect(await storage.addCoins(0)).toBe(0);
        expect(await storage.addCoins(-50)).toBe(0);
        expect(await storage.getCoins()).toBe(0);

        // Decimal coins floored
        await storage.addCoins(10.75);
        expect(await storage.getCoins()).toBe(10);

        // Large balance
        await storage.addCoins(100_000_000);
        expect(await storage.getCoins()).toBe(100_000_010);
      });

      it('spendCoins handles 0, negative values, and exact balance boundaries', async () => {
        await storage.addCoins(100);

        // Spending 0 returns true
        expect(await storage.spendCoins(0)).toBe(true);
        expect(await storage.getCoins()).toBe(100);

        // Spending negative returns true without altering balance
        expect(await storage.spendCoins(-50)).toBe(true);
        expect(await storage.getCoins()).toBe(100);

        // Spending balance + 1 fails
        expect(await storage.spendCoins(101)).toBe(false);
        expect(await storage.getCoins()).toBe(100);

        // Spending exact balance succeeds and leaves 0
        expect(await storage.spendCoins(100)).toBe(true);
        expect(await storage.getCoins()).toBe(0);

        // Spending from 0 fails
        expect(await storage.spendCoins(1)).toBe(false);
      });

      it('preserves higher high score when lower score is submitted later', async () => {
        await storage.saveLevelResult('phonics', 1, 0.9, 1500, 10);
        let progress = await storage.getProgress();
        expect(progress.highScores['phonics_1']).toBe(1500);

        // Lower score submitted
        await storage.saveLevelResult('phonics', 1, 0.9, 1000, 10);
        progress = await storage.getProgress();
        expect(progress.highScores['phonics_1']).toBe(1500); // Retains 1500

        // Higher score submitted
        await storage.saveLevelResult('phonics', 1, 0.9, 2000, 10);
        progress = await storage.getProgress();
        expect(progress.highScores['phonics_1']).toBe(2000);
      });

      it('handles negative or zero level numbers without crashing', async () => {
        const resultNeg = await storage.saveLevelResult('phonics', -1, 0.9, 100, 10);
        expect(resultNeg.stars).toBe(2);
        expect(await storage.isLevelUnlocked('phonics', -1)).toBe(false);
        expect(await storage.isLevelUnlocked('phonics', 0)).toBe(true); // -1 + 1 = 0 unlocked

        const resultZero = await storage.saveLevelResult('phonics', 0, 0.9, 100, 10);
        expect(resultZero.stars).toBe(2);
      });
    });

    describe('Boundary Accuracy Calculations & Mastery Advancement Oracles', () => {
      it('calculateStars verifies all decimal, percentage, and negative boundary conditions', () => {
        // 0 stars (< 85%)
        expect(calculateStars(0)).toBe(0);
        expect(calculateStars(0.5)).toBe(0);
        expect(calculateStars(0.849999)).toBe(0);
        expect(calculateStars(84.999)).toBe(0);
        expect(calculateStars(-0.5)).toBe(0);

        // 1 star (>= 85% and < 90%)
        expect(calculateStars(0.85)).toBe(1);
        expect(calculateStars(0.850001)).toBe(1);
        expect(calculateStars(0.899999)).toBe(1);
        expect(calculateStars(85)).toBe(1);
        expect(calculateStars(85.0)).toBe(1);
        expect(calculateStars(89.9)).toBe(1);

        // 2 stars (>= 90% and < 100%)
        expect(calculateStars(0.90)).toBe(2);
        expect(calculateStars(0.95)).toBe(2);
        expect(calculateStars(0.999999)).toBe(2);
        expect(calculateStars(90)).toBe(2);
        expect(calculateStars(99.9)).toBe(2);

        // 3 stars (>= 100%)
        expect(calculateStars(1.0)).toBe(3);
        expect(calculateStars(100)).toBe(3);
        expect(calculateStars(105)).toBe(3);
      });

      it('isMasteryAchieved strictly enforces > 85.0% AND >= 10 attempts boundaries', () => {
        // Exactly 85.0% does NOT meet mastery (> 0.85 required)
        expect(isMasteryAchieved(0.85, 10)).toBe(false);
        expect(isMasteryAchieved(0.8500000, 10)).toBe(false);
        expect(isMasteryAchieved(85, 10)).toBe(false);
        expect(isMasteryAchieved(85.0, 10)).toBe(false);

        // Just above 85.0% DOES meet mastery
        expect(isMasteryAchieved(0.850001, 10)).toBe(true);
        expect(isMasteryAchieved(0.851, 10)).toBe(true);
        expect(isMasteryAchieved(85.1, 10)).toBe(true);

        // 100% on 9 attempts does NOT meet mastery (>= 10 attempts required)
        expect(isMasteryAchieved(1.0, 9)).toBe(false);
        expect(isMasteryAchieved(1.0, 0)).toBe(false);
        expect(isMasteryAchieved(1.0, -5)).toBe(false);

        // 100% on 10 attempts DOES meet mastery
        expect(isMasteryAchieved(1.0, 10)).toBe(true);
        expect(isMasteryAchieved(100, 10)).toBe(true);
      });
    });

    describe('Consecutive Mistake Remediation Trigger & Reset', () => {
      it('triggers remediation on exactly the 3rd consecutive mistake and resets on correct', async () => {
        expect(storage.getConsecutiveMistakes()).toBe(0);

        // 1st mistake
        const m1 = await storage.recordMistake('phonics', 'ai', 'rain');
        expect(m1.consecutiveMistakes).toBe(1);
        expect(m1.shouldTriggerRemediation).toBe(false);

        // 2nd mistake
        const m2 = await storage.recordMistake('phonics', 'ai', 'rain');
        expect(m2.consecutiveMistakes).toBe(2);
        expect(m2.shouldTriggerRemediation).toBe(false);

        // 3rd mistake -> TRIGGERS REMEDIATION
        const m3 = await storage.recordMistake('phonics', 'ai', 'rain');
        expect(m3.consecutiveMistakes).toBe(3);
        expect(m3.shouldTriggerRemediation).toBe(true);

        // 4th mistake -> maintains remediation trigger
        const m4 = await storage.recordMistake('phonics', 'ai', 'rain');
        expect(m4.consecutiveMistakes).toBe(4);
        expect(m4.shouldTriggerRemediation).toBe(true);

        // Correct answer resets consecutive mistake streak to 0
        await storage.recordCorrect('phonics', 'ai', 'rain');
        expect(storage.getConsecutiveMistakes()).toBe(0);

        // Next mistake is 1st again
        const mNext = await storage.recordMistake('phonics', 'ai', 'rain');
        expect(mNext.consecutiveMistakes).toBe(1);
        expect(mNext.shouldTriggerRemediation).toBe(false);
      });

      it('resetConsecutiveMistakes immediately clears the mistake counter', async () => {
        await storage.recordMistake('phonics', 'ai', 'rain');
        await storage.recordMistake('phonics', 'ai', 'rain');
        expect(storage.getConsecutiveMistakes()).toBe(2);

        await storage.resetConsecutiveMistakes();
        expect(storage.getConsecutiveMistakes()).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Domain 4: Decoration Service & Schema Adversarial Stress Tests
  // ==========================================================================
  describe('Domain 4: Decoration Service & Schema Adversarial Stress', () => {
    let decService: DecorationService;
    let storage: StorageService;

    beforeEach(async () => {
      idbBackingStore.clear();
      idbGetShouldThrow = false;
      idbSetShouldThrow = false;

      decService = new DecorationService();
      storage = new StorageService();
      await storage.resetProgress();
    });

    describe('Catalog Data Validation & Filtering', () => {
      it('validates raw data/decorations.json strictly against DecorationCatalogSchema', () => {
        const parsed = DecorationCatalogSchema.safeParse(rawDecorations);
        expect(parsed.success).toBe(true);
      });

      it('verifies decorationService singleton is properly initialized and returns catalog', () => {
        expect(decorationService).toBeInstanceOf(DecorationService);
        expect(decorationService.getCatalog().items.length).toBeGreaterThan(0);
      });

      it('filters outside vs inside items correctly', () => {
        const outside = decService.getItemsByCategory('outside');
        const inside = decService.getItemsByCategory('inside');

        expect(outside.length).toBeGreaterThanOrEqual(1);
        expect(inside.length).toBeGreaterThanOrEqual(1);

        for (const item of outside) {
          expect(item.category).toBe('outside');
        }
        for (const item of inside) {
          expect(item.category).toBe('inside');
        }
      });

      it('returns empty array when filtering by unknown category', () => {
        const unknown = decService.getItemsByCategory('attic' as any);
        expect(unknown).toEqual([]);
      });

      it('retrieves item by id and returns undefined for non-existent IDs', () => {
        const first = decService.getCatalog().items[0]!;
        expect(decService.getItemById(first.id)).toEqual(first);
        expect(decService.getItemById('non_existent_item')).toBeUndefined();
        expect(decService.getItemById('')).toBeUndefined();
      });
    });

    describe('Marketplace Purchases (Insufficient vs Exact Coins, Duplicate Purchases)', () => {
      it('rejects purchase when player has insufficient coins', async () => {
        await storage.addCoins(50);

        // Item costs 60
        const success = await storage.purchaseItem('test_item_60', 60);
        expect(success).toBe(false);
        expect(await storage.getCoins()).toBe(50);
        expect(await storage.isItemOwned('test_item_60')).toBe(false);
        expect(await storage.getInventory()).not.toContain('test_item_60');
      });

      it('succeeds on EXACT coin balance, deducting to exactly zero', async () => {
        await storage.addCoins(60);

        const success = await storage.purchaseItem('exact_item', 60);
        expect(success).toBe(true);
        expect(await storage.getCoins()).toBe(0);
        expect(await storage.isItemOwned('exact_item')).toBe(true);
        expect(await storage.getInventory()).toContain('exact_item');
      });

      it('handles duplicate purchase attempts without double-charging coins', async () => {
        await storage.addCoins(200);

        // First purchase
        const success1 = await storage.purchaseItem('item_a', 75);
        expect(success1).toBe(true);
        expect(await storage.getCoins()).toBe(125);
        expect(await storage.isItemOwned('item_a')).toBe(true);

        // Duplicate purchase attempt for already owned item
        const success2 = await storage.purchaseItem('item_a', 75);
        expect(success2).toBe(true);
        expect(await storage.getCoins()).toBe(125); // Coins NOT deducted again

        // Inventory should not contain duplicate entries
        const inventory = await storage.getInventory();
        expect(inventory.filter(id => id === 'item_a').length).toBe(1);
      });

      it('allows zero-cost items to be purchased with 0 coins', async () => {
        const success = await storage.purchaseItem('free_starter_item', 0);
        expect(success).toBe(true);
        expect(await storage.isItemOwned('free_starter_item')).toBe(true);
        expect(await storage.getCoins()).toBe(0);
      });

      it('verifies buyDecoration alias behaves identically to purchaseItem', async () => {
        await storage.addCoins(100);
        const success = await storage.buyDecoration('alias_item', 40);
        expect(success).toBe(true);
        expect(await storage.getCoins()).toBe(60);
        expect(await storage.isItemOwned('alias_item')).toBe(true);
      });
    });

    describe('Decoration Placement and Removal Boundaries', () => {
      it('places decorations into outside and inside slots and allows slot overwriting', async () => {
        await storage.placeDecoration('outside', 'centerpiece', 'crystal_fountain');
        let placed = (await storage.getProgress()).placedDecorations;
        expect(placed.outside['centerpiece']).toBe('crystal_fountain');

        // Overwrite centerpiece with another decoration
        await storage.placeDecoration('outside', 'centerpiece', 'grand_statue');
        placed = (await storage.getProgress()).placedDecorations;
        expect(placed.outside['centerpiece']).toBe('grand_statue');

        // Place inside
        await storage.placeDecoration('inside', 'throne', 'royal_throne');
        placed = (await storage.getProgress()).placedDecorations;
        expect(placed.inside['throne']).toBe('royal_throne');
      });

      it('supports flexible parameter ordering in placeDecoration', async () => {
        // location first
        await storage.placeDecoration('outside', 'gate', 'iron_gate');
        // item first
        await storage.placeDecoration('velvet_rug', 'rug', 'inside');

        const placed = (await storage.getProgress()).placedDecorations;
        expect(placed.outside['gate']).toBe('iron_gate');
        expect(placed.inside['rug']).toBe('velvet_rug');
      });

      it('removes decoration from slot and handles removing from empty slot safely', async () => {
        await storage.placeDecoration('outside', 'gate', 'iron_gate');
        await storage.removeDecoration('outside', 'gate');

        let placed = (await storage.getProgress()).placedDecorations;
        expect(placed.outside['gate']).toBeUndefined();

        // Removing already empty slot does not crash
        await expect(storage.removeDecoration('outside', 'gate')).resolves.toBeDefined();
        await expect(storage.removeDecoration('inside', 'non_existent_slot')).resolves.toBeDefined();
      });
    });

    describe('Decoration Zod Schema Attacks', () => {
      it('DecorationItemSchema rejects invalid slot types, negative prices, and empty strings', () => {
        const validItem = {
          id: 'dec_1',
          name: 'Fountain',
          category: 'outside',
          slotType: 'centerpiece',
          price: 50,
          icon: 'fountain',
          description: 'A beautiful fountain'
        };
        expect(DecorationItemSchema.safeParse(validItem).success).toBe(true);

        // Invalid slotType rejected
        expect(DecorationItemSchema.safeParse({
          ...validItem,
          slotType: 'balcony'
        }).success).toBe(false);

        // Invalid category rejected
        expect(DecorationItemSchema.safeParse({
          ...validItem,
          category: 'roof'
        }).success).toBe(false);

        // Negative price rejected
        expect(DecorationItemSchema.safeParse({
          ...validItem,
          price: -10
        }).success).toBe(false);

        // Empty strings rejected
        expect(DecorationItemSchema.safeParse({
          ...validItem,
          name: ''
        }).success).toBe(false);
      });

      it('DecorationCatalogSchema rejects empty items list', () => {
        expect(DecorationCatalogSchema.safeParse({
          version: 1,
          items: []
        }).success).toBe(false);
      });
    });
  });
});
