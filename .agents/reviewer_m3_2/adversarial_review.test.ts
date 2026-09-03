import { describe, it, expect, vi } from 'vitest';
import { TeachingCard } from '../../src/ui/TeachingCard';
import { HUD } from '../../src/ui/HUD';
import { OrchardView } from '../../src/ui/OrchardView';
import { StorageService } from '../../src/services/storage.service';
import { IAudioSynthesizer, AudioService } from '../../src/services/audio.service';

// Mock UI Factory Helper for Phaser GameObjects
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

class MockImage extends MockGameObjectBase {
  public x: number;
  public y: number;
  public texture: string;
  public frame: string;
  public displayWidth = 0;
  public displayHeight = 0;
  public isInteractive = false;

  constructor(x: number, y: number, texture: string, frame: string) {
    super();
    this.x = x;
    this.y = y;
    this.texture = texture;
    this.frame = frame;
  }

  public setDisplaySize(w: number, h: number): this {
    this.displayWidth = w;
    this.displayHeight = h;
    return this;
  }

  public setInteractive(): this {
    this.isInteractive = true;
    return this;
  }

  public setFrame(f: string): this {
    this.frame = f;
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

function createMockScene() {
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
      image: vi.fn((x: number, y: number, texture: string, frame: string) => {
        return new MockImage(x, y, texture, frame);
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
    getVolume: vi.fn(() => 0.8),
    setMuted: vi.fn(),
    isMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => true),
    setTtsEnabled: vi.fn(),
    isTtsEnabled: vi.fn(() => true),
    toggleTts: vi.fn(() => false),
    isUnlocked: vi.fn(() => true),
    getAudioContext: vi.fn(() => null)
  };
}

describe('Reviewer M3-2 Adversarial Stress Suite', () => {
  let mockScene: Phaser.Scene;
  let mockStorage: StorageService;
  let mockAudio: IAudioSynthesizer;

  beforeEach(async () => {
    mockScene = createMockScene();
    mockStorage = new StorageService();
    await mockStorage.resetProgress();
    mockAudio = createMockAudio();
  });

  describe('Adversarial TeachingCard Challenge', () => {
    it('handles multiple rapid dismissal calls without duplicate callback execution or crash', async () => {
      const resumeSpy = vi.fn();
      const card = new TeachingCard(mockScene, {
        word: 'test',
        pattern: 'ea',
        explanation: 'test explanation',
        autoSpeak: false,
        onResume: resumeSpy,
        storage: mockStorage,
        audio: mockAudio
      });

      // Call dismiss concurrently 5 times
      await Promise.all([
        card.dismiss(),
        card.dismiss(),
        card.dismiss(),
        card.dismiss(),
        card.dismiss()
      ]);

      expect(resumeSpy).toHaveBeenCalledTimes(1);
    });

    it('survives and resumes when storageService.resetConsecutiveMistakes rejects', async () => {
      const failingStorage = {
        resetConsecutiveMistakes: vi.fn().mockRejectedValue(new Error('IndexedDB disk failure')),
        getProgress: vi.fn()
      } as unknown as StorageService;

      const resumeSpy = vi.fn();
      const card = new TeachingCard(mockScene, {
        word: 'test',
        pattern: 'ea',
        explanation: 'test explanation',
        autoSpeak: false,
        onResume: resumeSpy,
        storage: failingStorage,
        audio: mockAudio
      });

      await expect(card.dismiss()).resolves.toBeUndefined();
      expect(resumeSpy).toHaveBeenCalledTimes(1);
    });

    it('handles extreme consecutive mistake values in shouldTrigger', () => {
      expect(TeachingCard.shouldTrigger(-10)).toBe(false);
      expect(TeachingCard.shouldTrigger(0)).toBe(false);
      expect(TeachingCard.shouldTrigger(2.99)).toBe(false);
      expect(TeachingCard.shouldTrigger(3)).toBe(true);
      expect(TeachingCard.shouldTrigger(3.01)).toBe(true);
      expect(TeachingCard.shouldTrigger(999999)).toBe(true);
    });

    it('renders with long strings without throwing or crashing layout', () => {
      const longWord = 'supercalifragilisticexpialidocious'.repeat(3);
      const longExplanation = 'A'.repeat(500);
      const card = new TeachingCard(mockScene, {
        word: longWord,
        pattern: 'long',
        explanation: longExplanation,
        segmentation: 'super + cali → supercali',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      });

      expect(card.getWord()).toBe(longWord);
      expect(card.getExplanation()).toBe(longExplanation);
    });
  });

  describe('Adversarial HUD Challenge', () => {
    it('handles negative, fractional, and massive values for score, stars, combo', () => {
      const hud = new HUD(mockScene, { audio: mockAudio });

      hud.updateScore(-50);
      expect(hud.getScore()).toBe(-50);
      hud.updateScore(1000000);
      expect(hud.getScore()).toBe(1000000);

      hud.updateStars(-99);
      expect(hud.getStars()).toBe(0);
      hud.updateStars(99);
      expect(hud.getStars()).toBe(3);
      hud.updateStars(2.7);
      expect(hud.getStars()).toBe(2.7);

      hud.updateCombo(0);
      expect(hud.getCombo()).toBe(0);
      hud.updateCombo(1);
      expect(hud.getCombo()).toBe(1);
      hud.updateCombo(100);
      expect(hud.getCombo()).toBe(100);
    });

    it('handles rapid sound toggles and synchronizes mute state', () => {
      let isMuted = false;
      const customAudio = {
        ...createMockAudio(),
        toggleMute: vi.fn(() => {
          isMuted = !isMuted;
          return isMuted;
        }),
        isMuted: vi.fn(() => isMuted)
      };

      const hud = new HUD(mockScene, { audio: customAudio });
      expect(hud.isMuted()).toBe(false);

      hud.toggleSound();
      expect(hud.isMuted()).toBe(true);
      hud.toggleSound();
      expect(hud.isMuted()).toBe(false);
      hud.toggleSound();
      expect(hud.isMuted()).toBe(true);
    });
  });

  describe('Adversarial OrchardView Challenge', () => {
    it('clamps tree stage calculations across extreme negative and positive values', () => {
      expect(OrchardView.calculateTreeStage(-100)).toBe(1);
      expect(OrchardView.calculateTreeStage(0)).toBe(1);
      expect(OrchardView.calculateTreeStage(1)).toBe(2);
      expect(OrchardView.calculateTreeStage(2)).toBe(2);
      expect(OrchardView.calculateTreeStage(3)).toBe(3);
      expect(OrchardView.calculateTreeStage(4)).toBe(3);
      expect(OrchardView.calculateTreeStage(5)).toBe(4);
      expect(OrchardView.calculateTreeStage(6)).toBe(4);
      expect(OrchardView.calculateTreeStage(7)).toBe(5);
      expect(OrchardView.calculateTreeStage(1000)).toBe(5);
    });

    it('getTreeFrame returns valid frame keys and clamps bounds', () => {
      expect(OrchardView.getTreeFrame(-5)).toBe('tree-stage-1');
      expect(OrchardView.getTreeFrame(1)).toBe('tree-stage-1');
      expect(OrchardView.getTreeFrame(5)).toBe('tree-stage-5');
      expect(OrchardView.getTreeFrame(999)).toBe('tree-stage-5');
    });

    it('safely handles non-existent topic selection without crashing', async () => {
      const orchard = new OrchardView(mockScene, {
        topic: 'phonics',
        storage: mockStorage,
        audio: mockAudio
      });

      await orchard.selectTopic('non_existent_topic');
      expect(orchard.getCurrentTopic()).toBe('non_existent_topic');
      expect(orchard.getLevelCardsCount()).toBe(0);
    });
  });
});
