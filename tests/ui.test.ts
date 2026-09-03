import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeachingCard, TeachingCardConfig } from '../src/ui/TeachingCard';
import { HUD } from '../src/ui/HUD';
import { OrchardView } from '../src/ui/OrchardView';
import { StorageService } from '../src/services/storage.service';
import { IAudioSynthesizer } from '../src/services/audio.service';

// Mock UI Factory Helper for Phaser GameObjects in Vitest
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

describe('UI Components Unit Tests (Milestone 3)', () => {
  let mockScene: Phaser.Scene;
  let mockStorage: StorageService;
  let mockAudio: IAudioSynthesizer;

  beforeEach(async () => {
    mockScene = createMockScene();
    mockStorage = new StorageService();
    await mockStorage.resetProgress();
    mockAudio = createMockAudio();
  });

  // ==========================================================================
  // 1. TeachingCard (3-Mistake Consecutive Remediation Modal)
  // ==========================================================================
  describe('TeachingCard Remediation Modal', () => {
    it('TeachingCard.shouldTrigger() triggers strictly at 3+ consecutive mistakes', () => {
      expect(TeachingCard.shouldTrigger(0)).toBe(false);
      expect(TeachingCard.shouldTrigger(1)).toBe(false);
      expect(TeachingCard.shouldTrigger(2)).toBe(false);
      expect(TeachingCard.shouldTrigger(3)).toBe(true);
      expect(TeachingCard.shouldTrigger(5)).toBe(true);
    });

    it('instantiates TeachingCard and renders target word and rule explanation', () => {
      const config: TeachingCardConfig = {
        word: 'beach',
        pattern: 'ea_long_e',
        explanation: "'ea' has two sounds! Here it sounds like /ē/ in beach.",
        ruleTitle: 'Phonics Rule Hint',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      };

      const card = new TeachingCard(mockScene, config);
      expect(card.getWord()).toBe('beach');
      expect(card.getExplanation()).toBe("'ea' has two sounds! Here it sounds like /ē/ in beach.");
      expect(card.getSegmentation()).toBeUndefined();
      expect(mockScene.add.existing).toHaveBeenCalledWith(card);
    });

    it('renders visual morphological segmentation when provided (e.g. re + play → replay)', () => {
      const config: TeachingCardConfig = {
        word: 'replay',
        pattern: 're',
        segmentation: 're + play → replay',
        explanation: "Prefix 're-' means to do again. 'replay' means play again!",
        ruleTitle: 'Prefix Rule',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      };

      const card = new TeachingCard(mockScene, config);
      expect(card.getSegmentation()).toBe('re + play → replay');
    });

    it('speaks explanation via TTS when autoSpeak is true', () => {
      const config: TeachingCardConfig = {
        word: 'bread',
        pattern: 'ea_short_e',
        explanation: "'bread' has 'ea' but sounds like short /ĕ/!",
        ruleTitle: 'Short E Warning',
        autoSpeak: true,
        storage: mockStorage,
        audio: mockAudio
      };

      new TeachingCard(mockScene, config);
      expect(mockAudio.speakPrompt).toHaveBeenCalledWith(
        expect.stringContaining("'bread' has 'ea' but sounds like short /ĕ/!")
      );
    });

    it('resume button has >= 48px touch target dimensions (240x54px)', () => {
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Test',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      });

      const size = card.getResumeButtonSize();
      expect(size.width).toBeGreaterThanOrEqual(48);
      expect(size.height).toBeGreaterThanOrEqual(48);
      expect(size.height).toBe(54);
    });

    it('dismiss() resets consecutive mistakes, invokes onResume callback, and stops TTS', async () => {
      // Setup 3 consecutive mistakes in storage
      await mockStorage.recordMistake('phonics', 'ea', 'bread');
      await mockStorage.recordMistake('phonics', 'ea', 'bread');
      await mockStorage.recordMistake('phonics', 'ea', 'head');
      expect(mockStorage.getConsecutiveMistakes()).toBe(3);

      const resumeSpy = vi.fn();
      const card = new TeachingCard(mockScene, {
        word: 'bread',
        pattern: 'ea',
        explanation: 'Rule explanation',
        autoSpeak: false,
        onResume: resumeSpy,
        storage: mockStorage,
        audio: mockAudio
      });

      await card.dismiss();

      expect(mockAudio.playClick).toHaveBeenCalled();
      expect(mockAudio.stopSpeaking).toHaveBeenCalled();
      expect(resumeSpy).toHaveBeenCalledTimes(1);
      expect(mockStorage.getConsecutiveMistakes()).toBe(0);
    });
  });

  // ==========================================================================
  // 2. HUD (Heads-Up Display)
  // ==========================================================================
  describe('HUD (Heads-Up Display)', () => {
    it('initializes with default values and renders prompt banner', () => {
      const hud = new HUD(mockScene, {
        prompt: "Catch words with 'ea' that say /ē/!",
        subtext: 'beach, teach, leaf',
        score: 100,
        stars: 2,
        combo: 3,
        audio: mockAudio
      });

      expect(hud.getPrompt()).toBe("Catch words with 'ea' that say /ē/!");
      expect(hud.getSubtext()).toBe('beach, teach, leaf');
      expect(hud.getScore()).toBe(100);
      expect(hud.getStars()).toBe(2);
      expect(hud.getCombo()).toBe(3);
    });

    it('pause button and sound button have dimensions >= 48px (64x64px)', () => {
      const hud = new HUD(mockScene, { audio: mockAudio });

      const pauseSize = hud.getPauseButtonSize();
      expect(pauseSize.width).toBeGreaterThanOrEqual(48);
      expect(pauseSize.height).toBeGreaterThanOrEqual(48);
      expect(pauseSize.width).toBe(64);

      const soundSize = hud.getSoundButtonSize();
      expect(soundSize.width).toBeGreaterThanOrEqual(48);
      expect(soundSize.height).toBeGreaterThanOrEqual(48);
      expect(soundSize.width).toBe(64);
    });

    it('updatePrompt() updates both prompt and subtext', () => {
      const hud = new HUD(mockScene, { audio: mockAudio });
      hud.updatePrompt('Catch prefixes!', 're- and un-');

      expect(hud.getPrompt()).toBe('Catch prefixes!');
      expect(hud.getSubtext()).toBe('re- and un-');
    });

    it('updateScore() and updateCombo() update score and combo displays', () => {
      const hud = new HUD(mockScene, { audio: mockAudio });
      hud.updateScore(450);
      expect(hud.getScore()).toBe(450);

      hud.updateCombo(5);
      expect(hud.getCombo()).toBe(5);
    });

    it('updateStars() clamps stars between 0 and 3', () => {
      const hud = new HUD(mockScene, { audio: mockAudio });

      hud.updateStars(2);
      expect(hud.getStars()).toBe(2);

      hud.updateStars(5);
      expect(hud.getStars()).toBe(3);

      hud.updateStars(-1);
      expect(hud.getStars()).toBe(0);
    });

    it('toggleSound() toggles mute state and updates sound button frame', () => {
      const toggleSpy = vi.fn();
      const hud = new HUD(mockScene, {
        audio: mockAudio,
        onToggleSound: toggleSpy
      });

      expect(hud.isMuted()).toBe(false);
      hud.toggleSound();
      expect(mockAudio.toggleMute).toHaveBeenCalled();
      expect(toggleSpy).toHaveBeenCalledWith(true);
      expect(hud.isMuted()).toBe(true);
    });

    it('speakPrompt() uses AudioService to vocalize current target instruction', () => {
      const hud = new HUD(mockScene, {
        prompt: 'Target: replay',
        subtext: 're + play',
        audio: mockAudio
      });

      hud.speakPrompt();
      expect(mockAudio.playClick).toHaveBeenCalled();
      expect(mockAudio.speakPrompt).toHaveBeenCalledWith('Target: replay. re + play');
    });
  });

  // ==========================================================================
  // 3. OrchardView (Tree Visualizer & Progression Map)
  // ==========================================================================
  describe('OrchardView (Tree Visualizer & Progression Map)', () => {
    it('OrchardView.calculateTreeStage() maps growth stages to 1..5', () => {
      expect(OrchardView.calculateTreeStage(0)).toBe(1);
      expect(OrchardView.calculateTreeStage(1)).toBe(2);
      expect(OrchardView.calculateTreeStage(2)).toBe(2);
      expect(OrchardView.calculateTreeStage(3)).toBe(3);
      expect(OrchardView.calculateTreeStage(4)).toBe(3);
      expect(OrchardView.calculateTreeStage(5)).toBe(4);
      expect(OrchardView.calculateTreeStage(6)).toBe(4);
      expect(OrchardView.calculateTreeStage(7)).toBe(5);
      expect(OrchardView.calculateTreeStage(10)).toBe(5);
    });

    it('OrchardView.getTreeFrame() resolves valid atlas frame keys', () => {
      expect(OrchardView.getTreeFrame(1)).toBe('tree-stage-1');
      expect(OrchardView.getTreeFrame(2)).toBe('tree-stage-2');
      expect(OrchardView.getTreeFrame(3)).toBe('tree-stage-3');
      expect(OrchardView.getTreeFrame(4)).toBe('tree-stage-4');
      expect(OrchardView.getTreeFrame(5)).toBe('tree-stage-5');
      // Clamps boundaries safely
      expect(OrchardView.getTreeFrame(0)).toBe('tree-stage-1');
      expect(OrchardView.getTreeFrame(10)).toBe('tree-stage-5');
    });

    it('initializes OrchardView with 5 level cards for the default topic', () => {
      const orchard = new OrchardView(mockScene, {
        topic: 'phonics',
        storage: mockStorage,
        audio: mockAudio
      });

      expect(orchard.getCurrentTopic()).toBe('phonics');
      expect(orchard.getTreeStage()).toBe(1);
      expect(orchard.getLevelCardsCount()).toBe(5);
    });

    it('selectTopic() switches active curriculum topic and updates cards', async () => {
      const orchard = new OrchardView(mockScene, {
        topic: 'phonics',
        storage: mockStorage,
        audio: mockAudio
      });

      await orchard.selectTopic('morphology');
      expect(orchard.getCurrentTopic()).toBe('morphology');
      expect(orchard.getLevelCardsCount()).toBe(5);

      await orchard.selectTopic('vocabulary');
      expect(orchard.getCurrentTopic()).toBe('vocabulary');

      await orchard.selectTopic('math');
      expect(orchard.getCurrentTopic()).toBe('math');
    });

    it('setTreeStage() updates tree growth stage and clamps to 1..5', () => {
      const orchard = new OrchardView(mockScene, {
        storage: mockStorage,
        audio: mockAudio
      });

      orchard.setTreeStage(3);
      expect(orchard.getTreeStage()).toBe(3);

      orchard.setTreeStage(99);
      expect(orchard.getTreeStage()).toBe(5);

      orchard.setTreeStage(-5);
      expect(orchard.getTreeStage()).toBe(1);
    });

    it('refreshFromStorage() updates tree stage and cards from persistent progress', async () => {
      // Simulate player completing 3 levels
      await mockStorage.saveLevelResult('phonics', 1, 1.0, 1000, 10);
      await mockStorage.saveLevelResult('phonics', 2, 0.95, 950, 10);
      await mockStorage.saveLevelResult('phonics', 3, 0.90, 900, 10);

      const orchard = new OrchardView(mockScene, {
        storage: mockStorage,
        audio: mockAudio
      });

      await orchard.refreshFromStorage();
      // orchardGrowthStage should now be 3 -> tree stage 3
      expect(orchard.getTreeStage()).toBe(3);
    });
  });
});
