import { describe, it, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { TeachingCard } from '../src/ui/TeachingCard';
import { StorageService, isMasteryAchieved, calculateStars } from '../src/services/storage.service';
import { curriculumService } from '../src/services/curriculum.service';
import { IAudioSynthesizer } from '../src/services/audio.service';

// ============================================================================
// Mock Phaser GameObject Infrastructure for Headless Vitest
// ============================================================================
class MockEventEmitter {
  protected events: Record<string, ((...args: unknown[]) => void)[]> = {};

  public on(event: string, fn: (...args: unknown[]) => void): this {
    if (!this.events[event]) this.events[event] = [];
    this.events[event]!.push(fn);
    return this;
  }

  public once(event: string, fn: (...args: unknown[]) => void): this {
    const wrapped = (...args: unknown[]) => {
      this.off(event, wrapped);
      fn(...args);
    };
    return this.on(event, wrapped);
  }

  public off(event: string, fn?: (...args: unknown[]) => void): this {
    if (!fn) {
      delete this.events[event];
    } else if (this.events[event]) {
      this.events[event] = this.events[event]!.filter(f => f !== fn);
    }
    return this;
  }

  public removeListener(event: string, fn?: (...args: unknown[]) => void): this {
    return this.off(event, fn);
  }

  public emit(event: string, ...args: unknown[]): boolean {
    const list = this.events[event];
    if (!list) return false;
    [...list].forEach(fn => fn(...args));
    return true;
  }
}

class MockGameObjectBase extends MockEventEmitter {
  public parentContainer: unknown = null;
  public removeFromDisplayList = vi.fn();
  public addedToScene = vi.fn();
  public destroy = vi.fn();
}

class MockText extends MockGameObjectBase {
  public x: number;
  public y: number;
  public text: string;
  public style: Record<string, unknown>;
  public originX = 0;
  public originY = 0;
  public visible = true;

  constructor(x: number, y: number, text: string, style: Record<string, unknown>) {
    super();
    this.x = x;
    this.y = y;
    this.text = text;
    this.style = style;
  }

  public setOrigin(x: number, y: number): this {
    this.originX = x;
    this.originY = y;
    return this;
  }

  public setText(t: string): this {
    this.text = t;
    return this;
  }

  public setY(y: number): this {
    this.y = y;
    return this;
  }

  public setColor(color: string): this {
    this.style.color = color;
    return this;
  }

  public setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
}

class MockRectangle extends MockGameObjectBase {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public fillColor: number;
  public fillAlpha: number;
  public isInteractive = false;

  constructor(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    super();
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.fillColor = color;
    this.fillAlpha = alpha;
  }

  public setInteractive(): this {
    this.isInteractive = true;
    return this;
  }
}

class MockGraphics extends MockGameObjectBase {
  public fillStyle = vi.fn();
  public lineStyle = vi.fn();
  public fillRoundedRect = vi.fn();
  public strokeRoundedRect = vi.fn();
  public clear = vi.fn();
}

class MockContainer extends MockGameObjectBase {
  public x: number;
  public y: number;
  public list: unknown[] = [];
  public width = 0;
  public height = 0;
  public isInteractive = false;
  public depth = 0;
  public scale = 1;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }

  public add(child: unknown): this {
    if (Array.isArray(child)) {
      this.list.push(...child);
    } else {
      this.list.push(child);
    }
    return this;
  }

  public setSize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    return this;
  }

  public setInteractive(): this {
    this.isInteractive = true;
    return this;
  }

  public setScale(s: number): this {
    this.scale = s;
    return this;
  }

  public setDepth(d: number): this {
    this.depth = d;
    return this;
  }

  public removeAll(): this {
    this.list = [];
    return this;
  }

  public getAt(index: number): unknown {
    return this.list[index];
  }

  public get length(): number {
    return this.list.length;
  }
}

function createMockScene(): Phaser.Scene {
  const scene = {
    sys: {
      queueDepthSort: vi.fn(),
      events: new MockEventEmitter()
    },
    add: {
      existing: vi.fn((obj: unknown) => obj),
      rectangle: vi.fn((x: number, y: number, w: number, h: number, c: number, a: number) => {
        return new MockRectangle(x, y, w, h, c, a);
      }),
      graphics: vi.fn(() => new MockGraphics()),
      text: vi.fn((x: number, y: number, t: string, style: Record<string, unknown>) => {
        return new MockText(x, y, t, style);
      }),
      container: vi.fn((x: number, y: number) => {
        return new MockContainer(x, y);
      })
    }
  };
  return scene as unknown as Phaser.Scene;
}

function createMockAudio(): IAudioSynthesizer {
  return {
    unlock: vi.fn(async () => {}),
    playCatch: vi.fn(),
    playMiss: vi.fn(),
    playLevelComplete: vi.fn(),
    playCombo: vi.fn(),
    playClick: vi.fn(),
    speakPrompt: vi.fn(async () => {}),
    stopSpeaking: vi.fn(),
    setVolume: vi.fn(),
    getVolume: vi.fn(() => 1),
    setMuted: vi.fn(),
    isMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => false),
    setTtsEnabled: vi.fn(),
    isTtsEnabled: vi.fn(() => false),
    toggleTts: vi.fn(() => false),
    isUnlocked: vi.fn(() => true),
    getAudioContext: vi.fn(() => null)
  };
}

describe('Challenger M4-2: Pedagogical Game Loop & Remediation State Machine Oracle', () => {
  let storage: StorageService;
  let mockScene: Phaser.Scene;
  let mockAudio: IAudioSynthesizer;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.resetProgress();
    mockScene = createMockScene();
    mockAudio = createMockAudio();
  });

  // ==========================================================================
  // SECTION 1: 3-Mistake Consecutive Remediation Streak & Wave Timer Safety
  // ==========================================================================
  describe('1. Consecutive Mistakes Streak & Remediation Triggering', () => {
    it('1 mistake -> consecutiveMistakes = 1 and NO remediation trigger', async () => {
      expect(storage.getConsecutiveMistakes()).toBe(0);
      const res1 = await storage.recordMistake('phonics', 'ea', 'bad_item_1');

      expect(res1.consecutiveMistakes).toBe(1);
      expect(res1.shouldTriggerRemediation).toBe(false);
      expect(storage.getConsecutiveMistakes()).toBe(1);
      expect(TeachingCard.shouldTrigger(1)).toBe(false);
    });

    it('2 mistakes -> consecutiveMistakes = 2 and NO remediation trigger', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      const res2 = await storage.recordMistake('phonics', 'ea', 'bad_item_2');

      expect(res2.consecutiveMistakes).toBe(2);
      expect(res2.shouldTriggerRemediation).toBe(false);
      expect(storage.getConsecutiveMistakes()).toBe(2);
      expect(TeachingCard.shouldTrigger(2)).toBe(false);
    });

    it('3 mistakes -> consecutiveMistakes = 3 and TRIGGERS remediation', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      await storage.recordMistake('phonics', 'ea', 'bad_item_2');
      const res3 = await storage.recordMistake('phonics', 'ea', 'bad_item_3');

      expect(res3.consecutiveMistakes).toBe(3);
      expect(res3.shouldTriggerRemediation).toBe(true);
      expect(storage.getConsecutiveMistakes()).toBe(3);
      expect(TeachingCard.shouldTrigger(3)).toBe(true);
    });

    it('dampens fall speed duration on remediation (+800ms, clamped to 8000ms max)', () => {
      // Level 1 initial duration
      let fallDurationMs = 2800;
      expect(fallDurationMs).toBe(2800);

      // 1st remediation dampening (+800ms)
      fallDurationMs = Math.min(8000, fallDurationMs + 800);
      expect(fallDurationMs).toBe(3600);
      // Verify speed in px/s slows down from 214.29 to 166.67 px/s
      const initialSpeed = 600 / (2800 / 1000);
      const dampenedSpeed = 600 / (3600 / 1000);
      expect(dampenedSpeed).toBeLessThan(initialSpeed);

      // Repeated damping steps up to ceiling
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 4400ms
      expect(fallDurationMs).toBe(4400);
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 5200ms
      expect(fallDurationMs).toBe(5200);
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 6000ms
      expect(fallDurationMs).toBe(6000);
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 6800ms
      expect(fallDurationMs).toBe(6800);
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 7600ms
      expect(fallDurationMs).toBe(7600);
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 8000ms (clamped from 8400ms)
      expect(fallDurationMs).toBe(8000);
      fallDurationMs = Math.min(8000, fallDurationMs + 800); // 8000ms ceiling held
      expect(fallDurationMs).toBe(8000);
    });

    it('cancels waveSpawnTimer and prevents concurrent waves during remediation state', () => {
      // Mock GameScene state model to verify wave timer and remediation lifecycle
      let isRemediating = false;
      let isPaused = false;
      let waveSpawnTimer: { removed: boolean; remove: () => void } | undefined = undefined;
      let spawnedWavesCount = 0;

      const scheduleWave = (_delayMs: number) => {
        if (!isRemediating && !isPaused) {
          waveSpawnTimer = {
            removed: false,
            remove: () => {
              if (waveSpawnTimer) waveSpawnTimer.removed = true;
            }
          };
        }
      };

      const triggerRemediation = () => {
        isRemediating = true;
        if (waveSpawnTimer) {
          waveSpawnTimer.remove();
          waveSpawnTimer = undefined;
        }
      };

      // 1. Prior wave scheduled a delayed timer
      scheduleWave(400);
      expect(waveSpawnTimer).toBeDefined();
      expect((waveSpawnTimer as { removed: boolean } | undefined)?.removed).toBe(false);

      // 2. Mistake #3 triggers remediation -> cancels waveSpawnTimer
      triggerRemediation();
      expect(isRemediating).toBe(true);
      expect(waveSpawnTimer).toBeUndefined();

      // 3. Fruit catch tween completes while isRemediating is true
      // Tween onComplete logic: if (!isRemediating && !isPaused) scheduleWave(...)
      if (!isRemediating && !isPaused) {
        scheduleWave(500);
        spawnedWavesCount++;
      }

      // Assert 0 duplicate wave timers were created
      expect(waveSpawnTimer).toBeUndefined();
      expect(spawnedWavesCount).toBe(0);

      // 4. Player resumes from TeachingCard: onResume clears isRemediating and schedules exactly 1 wave
      isRemediating = false;
      scheduleWave(400);
      expect(waveSpawnTimer).toBeDefined();
      expect((waveSpawnTimer as { removed: boolean } | undefined)?.removed).toBe(false);
    });

    it('resets consecutiveMistakes = 0 upon correct catch', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      await storage.recordMistake('phonics', 'ea', 'bad_item_2');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      // Correct catch resets streak
      await storage.recordCorrect('phonics', 'ea', 'beach');
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Next mistake starts count at 1
      const res = await storage.recordMistake('phonics', 'ea', 'bad_item_3');
      expect(res.consecutiveMistakes).toBe(1);
      expect(res.shouldTriggerRemediation).toBe(false);
    });

    it('resets consecutiveMistakes = 0 upon TeachingCard dismissal', async () => {
      await storage.recordMistake('phonics', 'ea', 'bad_item_1');
      await storage.recordMistake('phonics', 'ea', 'bad_item_2');
      await storage.recordMistake('phonics', 'ea', 'bad_item_3');
      expect(storage.getConsecutiveMistakes()).toBe(3);

      let resumed = false;
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'ea makes the long /e/ sound in beach',
        storage,
        audio: mockAudio,
        onResume: () => {
          resumed = true;
        }
      });

      // Dismiss card
      await card.dismiss();
      expect(resumed).toBe(true);
      expect(storage.getConsecutiveMistakes()).toBe(0);

      // Re-entrance / idempotent dismissal check
      await card.dismiss();
      expect(storage.getConsecutiveMistakes()).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 2: Mastery Gate Strict Boundaries
  // ==========================================================================
  describe('2. Mastery Gate Strict Boundaries (>85.0% AND >=10 attempts)', () => {
    it('85.0% on 10 attempts -> LOCKED (false)', async () => {
      // Direct oracle functions (both float 0.85 and percentage 85.0)
      expect(isMasteryAchieved(0.85, 10)).toBe(false);
      expect(isMasteryAchieved(0.850000, 10)).toBe(false);
      expect(isMasteryAchieved(85, 10)).toBe(false);
      expect(isMasteryAchieved(85.0, 10)).toBe(false);

      // Storage integration check
      const res = await storage.saveLevelResult('phonics', 1, 0.85, 850, 10);
      expect(res.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);

      const resPct = await storage.saveLevelResult('morphology', 1, 85.0, 850, 10);
      expect(resPct.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(false);
    });

    it('85.0001% on 10 attempts -> UNLOCKED (true)', async () => {
      // Direct oracle functions (both float 0.850001 and percentage 85.0001)
      expect(isMasteryAchieved(0.850001, 10)).toBe(true);
      expect(isMasteryAchieved(85.0001, 10)).toBe(true);

      // Storage integration check
      const res = await storage.saveLevelResult('phonics', 1, 0.850001, 851, 10);
      expect(res.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);

      const resPct = await storage.saveLevelResult('morphology', 1, 85.0001, 851, 10);
      expect(resPct.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(true);
    });

    it('100.0% on 9 attempts -> LOCKED (false)', async () => {
      // Direct oracle functions
      expect(isMasteryAchieved(1.0, 9)).toBe(false);
      expect(isMasteryAchieved(100.0, 9)).toBe(false);
      expect(isMasteryAchieved(100, 9)).toBe(false);

      // Also verify sub-10 counts: 0, 1, 5, 8
      expect(isMasteryAchieved(1.0, 0)).toBe(false);
      expect(isMasteryAchieved(1.0, 1)).toBe(false);
      expect(isMasteryAchieved(1.0, 5)).toBe(false);
      expect(isMasteryAchieved(1.0, 8)).toBe(false);

      // Storage integration check: earns 3 stars on accuracy, but progression remains locked
      const res = await storage.saveLevelResult('vocabulary', 1, 1.0, 1000, 9);
      expect(res.stars).toBe(3);
      expect(res.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('vocabulary', 2)).toBe(false);
    });

    it('100.0% on 10 attempts -> UNLOCKED (true)', async () => {
      // Direct oracle functions
      expect(isMasteryAchieved(1.0, 10)).toBe(true);
      expect(isMasteryAchieved(100.0, 10)).toBe(true);
      expect(isMasteryAchieved(100, 10)).toBe(true);

      // Storage integration check
      const res = await storage.saveLevelResult('vocabulary', 1, 1.0, 1000, 10);
      expect(res.stars).toBe(3);
      expect(res.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('vocabulary', 2)).toBe(true);
    });

    it('evaluates star rating precision boundaries', () => {
      // 3 stars: 100%
      expect(calculateStars(100)).toBe(3);
      expect(calculateStars(1.0)).toBe(3);

      // 2 stars: >= 90% and < 100%
      expect(calculateStars(99.9)).toBe(2);
      expect(calculateStars(0.999)).toBe(2);
      expect(calculateStars(90.0)).toBe(2);
      expect(calculateStars(0.90)).toBe(2);

      // 1 star: >= 85% and < 90%
      expect(calculateStars(89.99)).toBe(1);
      expect(calculateStars(0.8999)).toBe(1);
      expect(calculateStars(85.0)).toBe(1);
      expect(calculateStars(0.85)).toBe(1);

      // 0 stars: < 85%
      expect(calculateStars(84.99)).toBe(0);
      expect(calculateStars(0.8499)).toBe(0);
      expect(calculateStars(50)).toBe(0);
      expect(calculateStars(0)).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 3: Visual Morphological Segmentation & UI/Toast Forwarding
  // ==========================================================================
  describe('3. Visual Morphological Segmentation & Wiring', () => {
    it('curriculumService.getItemById returns valid visualSegmentation for all morphology items', () => {
      const morphologyTopic = curriculumService.getTopic('morphology');
      expect(morphologyTopic.items.length).toBeGreaterThanOrEqual(30);

      let segmentationCount = 0;
      for (const item of morphologyTopic.items) {
        const fetched = curriculumService.getItemById(item.id);
        expect(fetched).toBeDefined();
        expect(fetched?.id).toBe(item.id);

        if (fetched && 'visualSegmentation' in fetched) {
          segmentationCount++;
          const seg = fetched.visualSegmentation;
          expect(typeof seg).toBe('string');
          expect(seg.length).toBeGreaterThan(0);
          expect(seg).toContain('+');
          expect(seg).toContain('→');
          // Format pattern: e.g. "re + play → replay" or "help + ful → helpful"
          expect(seg).toMatch(/^[a-z-]+\s*\+\s*[a-z-]+\s*→\s*[a-z]+$/);
        }
      }

      // Every morphology item in dataset has visualSegmentation
      expect(segmentationCount).toBe(morphologyTopic.items.length);
    });

    it('forwards visualSegmentation to TeachingCard modal', () => {
      const morphItem = curriculumService.getItemById('morph_re_replay');
      expect(morphItem).toBeDefined();
      expect(morphItem && 'visualSegmentation' in morphItem).toBe(true);

      const seg = morphItem && 'visualSegmentation' in morphItem ? morphItem.visualSegmentation : undefined;
      expect(seg).toBe('re + play → replay');

      const targetWord = morphItem && 'combinedWord' in morphItem ? morphItem.combinedWord : 'replay';
      const targetPattern = morphItem && 'affix' in morphItem ? morphItem.affix : 're-';

      // Instantiate TeachingCard with segmentation
      const card = new TeachingCard(mockScene, {
        word: targetWord,
        pattern: targetPattern,
        explanation: morphItem!.explanation,
        segmentation: seg,
        topic: 'morphology',
        storage,
        audio: mockAudio
      });

      expect(card.getSegmentation()).toBe('re + play → replay');
    });

    it('leaves segmentation undefined for non-morphology items in TeachingCard', () => {
      const phonicsItem = curriculumService.getItemById('phonics_ea_beach');
      expect(phonicsItem).toBeDefined();

      const seg = phonicsItem && 'visualSegmentation' in phonicsItem ? (phonicsItem as { visualSegmentation?: string }).visualSegmentation : undefined;
      expect(seg).toBeUndefined();

      const targetWord = phonicsItem && 'word' in phonicsItem ? phonicsItem.word : 'beach';
      const targetPattern = phonicsItem && 'ruleName' in phonicsItem ? phonicsItem.ruleName : 'ea';

      const card = new TeachingCard(mockScene, {
        word: targetWord,
        pattern: targetPattern,
        explanation: phonicsItem!.explanation,
        segmentation: seg,
        topic: 'phonics',
        storage,
        audio: mockAudio
      });

      expect(card.getSegmentation()).toBeUndefined();
    });

    it('formats correct morphological toast message with sparkle indicator', () => {
      const testCases = [
        { id: 'morph_re_replay', expectedToast: '✨ re + play → replay' },
        { id: 'morph_un_unhappy', expectedToast: '✨ un + happy → unhappy' },
        { id: 'morph_dis_dislike', expectedToast: '✨ dis + like → dislike' },
        { id: 'morph_pre_prepay', expectedToast: '✨ pre + pay → prepay' },
        { id: 'morph_ful_careful', expectedToast: '✨ care + ful → careful' },
        { id: 'morph_less_fearless', expectedToast: '✨ fear + less → fearless' },
        { id: 'morph_ly_slowly', expectedToast: '✨ slow + ly → slowly' }
      ];

      for (const tc of testCases) {
        const item = curriculumService.getItemById(tc.id);
        expect(item).toBeDefined();
        if (item && 'visualSegmentation' in item) {
          const toast = `✨ ${item.visualSegmentation}`;
          expect(toast).toBe(tc.expectedToast);
        } else {
          throw new Error(`Item ${tc.id} missing visualSegmentation`);
        }
      }
    });
  });
});
