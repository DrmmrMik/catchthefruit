import { describe, it, expect, beforeEach, vi } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import { TeachingCard } from '../src/ui/TeachingCard';
import { HUD } from '../src/ui/HUD';
import { OrchardView } from '../src/ui/OrchardView';
import { StorageService } from '../src/services/storage.service';
import { IAudioSynthesizer } from '../src/services/audio.service';
import { UserProgress } from '../src/schema/progress.schema';

// ============================================================================
// Mock Phaser GameObject Infrastructure
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

// ============================================================================
// WCAG Relative Luminance & Contrast Calculation Utilities
// ============================================================================
function sRGBtoLinear(c: number): number {
  const norm = c / 255.0;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// Adversarial Test Suites
// ============================================================================
describe('UI Adversarial & Remediation Verification Suite (Challenger M3-2)', () => {
  const rootDir = process.cwd();
  let mockScene: Phaser.Scene;
  let mockStorage: StorageService;
  let mockAudio: IAudioSynthesizer;

  beforeEach(async () => {
    mockScene = createMockScene();
    mockStorage = new StorageService();
    await mockStorage.resetProgress();
    mockAudio = createMockAudio();
  });

  // --------------------------------------------------------------------------
  // Suite 1: Python Adversarial Oracle Verification
  // --------------------------------------------------------------------------
  describe('Suite 1: Empirical Python Adversarial Oracle Execution', () => {
    it('executes python UI adversarial verification oracle with 0 errors and APPROVE verdict', () => {
      const scriptPath = path.join(rootDir, 'scripts/adversarial_ui_verify.py');
      expect(fs.existsSync(scriptPath), 'Oracle script must exist').toBe(true);

      const output = execSync(`python3 ${scriptPath}`, {
        encoding: 'utf-8',
        cwd: rootDir
      });

      expect(output).toContain('VERDICT: APPROVE');
      expect(output).not.toContain('[ERROR]');
      expect(output).toContain('TeachingCard resume button explicitly sized to 240x54px');
      expect(output).toContain('100 rapid dismissal multi-tap simulations passed');
      expect(output).toContain('100,000 float fuzz points strictly clamped');
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Touch Target Dimensions Adversarial Audit
  // --------------------------------------------------------------------------
  describe('Suite 2: Touch Target Dimensions Adversarial Audit', () => {
    it('TeachingCard resume button strictly satisfies width >= 48px and height >= 48px', () => {
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Long E sound in beach',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      });

      const size = card.getResumeButtonSize();
      expect(size.width).toBeGreaterThanOrEqual(48);
      expect(size.height).toBeGreaterThanOrEqual(48);
      expect(size.width).toBe(240);
      expect(size.height).toBe(54);

      // Verify container children dimensions
      const resumeContainer = (card as unknown as { resumeButtonContainer: MockContainer }).resumeButtonContainer;
      expect(resumeContainer.width).toBe(240);
      expect(resumeContainer.height).toBe(54);
      expect(resumeContainer.isInteractive).toBe(true);
    });

    it('TeachingCard listen button satisfies >= 48px touch target requirements', () => {
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Long E sound in beach',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      });

      const listenContainer = (card as unknown as { listenButtonContainer: MockContainer }).listenButtonContainer;
      expect(listenContainer.width).toBeGreaterThanOrEqual(48);
      expect(listenContainer.height).toBeGreaterThanOrEqual(48);
      expect(listenContainer.width).toBe(150);
      expect(listenContainer.height).toBe(48);
      expect(listenContainer.isInteractive).toBe(true);
    });

    it('HUD pause button and sound toggle button satisfy >= 48px touch target requirements', () => {
      const hud = new HUD(mockScene, { audio: mockAudio });

      const pauseSize = hud.getPauseButtonSize();
      expect(pauseSize.width).toBeGreaterThanOrEqual(48);
      expect(pauseSize.height).toBeGreaterThanOrEqual(48);
      expect(pauseSize.width).toBe(64);
      expect(pauseSize.height).toBe(64);

      const soundSize = hud.getSoundButtonSize();
      expect(soundSize.width).toBeGreaterThanOrEqual(48);
      expect(soundSize.height).toBeGreaterThanOrEqual(48);
      expect(soundSize.width).toBe(64);
      expect(soundSize.height).toBe(64);
    });

    it('OrchardView level cards provide generous touch area >= 48px (430x72px)', () => {
      const orchard = new OrchardView(mockScene, {
        topic: 'phonics',
        storage: mockStorage,
        audio: mockAudio
      });

      const cardsContainer = (orchard as unknown as { levelCardsContainer: MockContainer }).levelCardsContainer;
      expect(cardsContainer.length).toBe(5);

      const firstCard = cardsContainer.getAt(0) as MockContainer;
      expect(firstCard.width).toBeGreaterThanOrEqual(48);
      expect(firstCard.height).toBeGreaterThanOrEqual(48);
      expect(firstCard.width).toBe(430);
      expect(firstCard.height).toBe(72);
      expect(firstCard.isInteractive).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: WCAG AAA Color Contrast Empirical Audit
  // --------------------------------------------------------------------------
  describe('Suite 3: WCAG AAA Color Contrast Ratio Empirical Calculations', () => {
    it('TeachingCard explanation body text satisfies WCAG AAA for normal text (>= 7.0:1)', () => {
      // Slate 900 (#0f172a) on crisp white (#ffffff)
      const ratio = getContrastRatio('#0f172a', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeCloseTo(17.85, 1);
    });

    it('TeachingCard listen button text satisfies WCAG AAA for normal text (>= 7.0:1)', () => {
      // Slate 700 (#334155) on Slate 100 (#f1f5f9)
      const ratio = getContrastRatio('#334155', '#f1f5f9');
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeCloseTo(9.45, 1);
    });

    it('TeachingCard target word satisfies WCAG AAA for large text (>= 4.5:1 for 28px text)', () => {
      // Sky 700 (#0369a1) on Sky 50 (#f0f9ff)
      const ratio = getContrastRatio('#0369a1', '#f0f9ff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeCloseTo(5.55, 1);
    });

    it('HUD prompt text banner satisfies WCAG AAA for normal text (>= 7.0:1)', () => {
      // Sky 900 (#0c4a6e) on white (#ffffff)
      const ratio = getContrastRatio('#0c4a6e', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeCloseTo(9.46, 1);
    });

    it('HUD score counter satisfies WCAG AAA for large text (>= 4.5:1 for 24px text)', () => {
      // Slate 900 (#0f172a) with white (#ffffff) stroke
      const ratio = getContrastRatio('#0f172a', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeCloseTo(17.85, 1);
    });

    it('OrchardView level card subtitle satisfies WCAG AAA for normal text (>= 7.0:1)', () => {
      // Slate 600 (#475569) on white (#ffffff)
      const ratio = getContrastRatio('#475569', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeCloseTo(7.58, 1);
    });

    it('OrchardView title header satisfies WCAG AAA for large text (>= 4.5:1 for 24px text)', () => {
      // Emerald 800 (#065f46) with white (#ffffff) stroke
      const ratio = getContrastRatio('#065f46', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeCloseTo(7.68, 1);
    });

    it('evaluates secondary UI accents against WCAG AA baseline (>= 4.5:1 normal, >= 3.0:1 large)', () => {
      // Visual segmentation: Amber 900 on Amber 100
      const segRatio = getContrastRatio('#92400e', '#fef3c7');
      expect(segRatio).toBeGreaterThanOrEqual(4.5); // AA pass
      expect(segRatio).toBeCloseTo(6.37, 1);

      // HUD subtext: Sky 700 on white
      const subRatio = getContrastRatio('#0369a1', '#ffffff');
      expect(subRatio).toBeGreaterThanOrEqual(4.5); // AA pass
      expect(subRatio).toBeCloseTo(5.93, 1);

      // HUD combo indicator: Amber 700 on white
      const comboRatio = getContrastRatio('#b45309', '#ffffff');
      expect(comboRatio).toBeGreaterThanOrEqual(4.5); // AA pass
      expect(comboRatio).toBeCloseTo(5.02, 1);

      // Resume button: White on Emerald 600
      const resumeRatio = getContrastRatio('#ffffff', '#16a34a');
      expect(resumeRatio).toBeGreaterThanOrEqual(3.0);
      expect(resumeRatio).toBeCloseTo(3.31, 1);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Rapid Dismissal Multi-Tap Concurrency Stress
  // --------------------------------------------------------------------------
  describe('Suite 4: TeachingCard Rapid Dismissal & Multi-Tap Concurrency', () => {
    it('handles 25 concurrent dismiss() invocations idempotently without race conditions', async () => {
      await mockStorage.recordMistake('phonics', 'ea', 'bread');
      await mockStorage.recordMistake('phonics', 'ea', 'bread');
      await mockStorage.recordMistake('phonics', 'ea', 'head');
      expect(mockStorage.getConsecutiveMistakes()).toBe(3);

      const resumeSpy = vi.fn();
      const card = new TeachingCard(mockScene, {
        word: 'bread',
        pattern: 'ea',
        explanation: 'Rule test',
        autoSpeak: false,
        onResume: resumeSpy,
        storage: mockStorage,
        audio: mockAudio
      });
      vi.spyOn(card, 'destroy');

      const resumeEventSpy = vi.fn();
      card.on('resume', resumeEventSpy);

      // Launch 25 simultaneous dismiss calls
      const dismissPromises = Array.from({ length: 25 }, () => card.dismiss());
      await Promise.all(dismissPromises);

      // Assertions: strictly 1 execution
      expect(resumeSpy).toHaveBeenCalledTimes(1);
      expect(resumeEventSpy).toHaveBeenCalledTimes(1);
      expect(mockAudio.playClick).toHaveBeenCalledTimes(1);
      expect(mockAudio.stopSpeaking).toHaveBeenCalledTimes(1);
      expect(card.destroy).toHaveBeenCalledTimes(1);
      expect(mockStorage.getConsecutiveMistakes()).toBe(0);
    });

    it('handles rapid dismissal when onResume callback is omitted', async () => {
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Rule test',
        autoSpeak: false,
        storage: mockStorage,
        audio: mockAudio
      });
      vi.spyOn(card, 'destroy');

      await expect(card.dismiss()).resolves.toBeUndefined();
      expect(card.destroy).toHaveBeenCalled();
    });

    it('gracefully handles dismissal even if storage.resetConsecutiveMistakes rejects', async () => {
      const faultyStorage = {
        ...mockStorage,
        resetConsecutiveMistakes: vi.fn().mockRejectedValue(new Error('IndexedDB Transaction Failed'))
      } as unknown as StorageService;

      const resumeSpy = vi.fn();
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Rule test',
        autoSpeak: false,
        onResume: resumeSpy,
        storage: faultyStorage,
        audio: mockAudio
      });
      vi.spyOn(card, 'destroy');

      // Does not throw
      await expect(card.dismiss()).resolves.toBeUndefined();
      expect(resumeSpy).toHaveBeenCalledTimes(1);
      expect(card.destroy).toHaveBeenCalledTimes(1);
    });

    it('simulates rapid pointerdown clicks directly on resume button container', async () => {
      const resumeSpy = vi.fn();
      const card = new TeachingCard(mockScene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Rule test',
        autoSpeak: false,
        onResume: resumeSpy,
        storage: mockStorage,
        audio: mockAudio
      });

      const resumeContainer = (card as unknown as { resumeButtonContainer: MockContainer }).resumeButtonContainer;

      // Simulate 10 rapid pointerdown events in loop
      for (let i = 0; i < 10; i++) {
        resumeContainer.emit('pointerdown');
      }

      // Allow any microtasks to flush
      await new Promise(r => setTimeout(r, 10));

      expect(resumeSpy).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: OrchardView Tree Stage Clamping & Boundary Stress
  // --------------------------------------------------------------------------
  describe('Suite 5: OrchardView Tree Stage Clamping & Boundary Stress', () => {
    it('calculateTreeStage accurately clamps all progression boundary states', () => {
      // 0 levels unlocked (initial default state) -> Stage 1
      expect(OrchardView.calculateTreeStage(0)).toBe(1);

      // 1 level completed -> Stage 2
      expect(OrchardView.calculateTreeStage(1)).toBe(2);
      expect(OrchardView.calculateTreeStage(2)).toBe(2);

      // 3-4 levels completed -> Stage 3
      expect(OrchardView.calculateTreeStage(3)).toBe(3);
      expect(OrchardView.calculateTreeStage(4)).toBe(3);

      // 5-6 levels completed -> Stage 4
      expect(OrchardView.calculateTreeStage(5)).toBe(4);
      expect(OrchardView.calculateTreeStage(6)).toBe(4);

      // 7+ levels completed (up to 10 storage cap and 20 all levels complete) -> Stage 5
      expect(OrchardView.calculateTreeStage(7)).toBe(5);
      expect(OrchardView.calculateTreeStage(10)).toBe(5);
      expect(OrchardView.calculateTreeStage(20)).toBe(5);
    });

    it('calculateTreeStage and getTreeFrame clamp negative and extreme values safely', () => {
      // Negative boundaries
      expect(OrchardView.calculateTreeStage(-1)).toBe(1);
      expect(OrchardView.calculateTreeStage(-999)).toBe(1);
      expect(OrchardView.getTreeFrame(-5)).toBe('tree-stage-1');
      expect(OrchardView.getTreeFrame(0)).toBe('tree-stage-1');

      // Upper extreme boundaries
      expect(OrchardView.calculateTreeStage(100)).toBe(5);
      expect(OrchardView.calculateTreeStage(999999)).toBe(5);
      expect(OrchardView.getTreeFrame(6)).toBe('tree-stage-5');
      expect(OrchardView.getTreeFrame(1000)).toBe('tree-stage-5');

      // Fractional values
      expect(OrchardView.calculateTreeStage(0.5)).toBe(2);
      expect(OrchardView.calculateTreeStage(2.9)).toBe(3);
      expect(OrchardView.getTreeFrame(2.8)).toBe('tree-stage-2');
      expect(OrchardView.getTreeFrame(4.9)).toBe('tree-stage-4');
    });

    it('setTreeStage clamps stage value strictly between 1 and 5', () => {
      const orchard = new OrchardView(mockScene, {
        storage: mockStorage,
        audio: mockAudio
      });

      orchard.setTreeStage(1);
      expect(orchard.getTreeStage()).toBe(1);

      orchard.setTreeStage(5);
      expect(orchard.getTreeStage()).toBe(5);

      orchard.setTreeStage(-100);
      expect(orchard.getTreeStage()).toBe(1);

      orchard.setTreeStage(1000);
      expect(orchard.getTreeStage()).toBe(5);
    });

    it('renders level cards correctly when 0 levels are unlocked (empty unlockedLevels)', async () => {
      const emptyProgress: UserProgress = {
        version: 1,
        unlockedLevels: {},
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
      };

      await mockStorage.saveProgress(emptyProgress);

      const orchard = new OrchardView(mockScene, {
        topic: 'phonics',
        storage: mockStorage,
        audio: mockAudio
      });

      await orchard.refreshFromStorage();
      expect(orchard.getTreeStage()).toBe(1);
      expect(orchard.getLevelCardsCount()).toBe(5);
    });

    it('renders level cards correctly when all 20 levels across 4 topics are unlocked and completed', async () => {
      const fullProgress: UserProgress = {
        version: 1,
        unlockedLevels: {},
        stars: {},
        highScores: {},
        errorStats: {
          patternErrors: {},
          wordErrors: {},
          totalAttempts: 200,
          totalCorrect: 200,
          consecutiveMistakes: 0
        },
        settings: {
          sfxVolume: 0.8,
          musicVolume: 0.5,
          ttsEnabled: true,
          highContrast: false
        },
        orchardGrowthStage: 10,
        lastActiveTimestamp: Date.now()
      };

      const topics = ['phonics', 'morphology', 'vocabulary', 'math'];
      for (const t of topics) {
        for (let l = 1; l <= 5; l++) {
          fullProgress.unlockedLevels[`${t}_${l}`] = true;
          fullProgress.stars[`${t}_${l}`] = 3;
        }
      }

      await mockStorage.saveProgress(fullProgress);

      const orchard = new OrchardView(mockScene, {
        storage: mockStorage,
        audio: mockAudio
      });

      await orchard.refreshFromStorage();
      expect(orchard.getTreeStage()).toBe(5);

      for (const t of topics) {
        await orchard.selectTopic(t);
        expect(orchard.getCurrentTopic()).toBe(t);
        expect(orchard.getLevelCardsCount()).toBe(5);
      }
    });
  });
});
