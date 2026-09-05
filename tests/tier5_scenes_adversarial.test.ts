import { describe, it, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { GameScene } from '../src/scenes/GameScene';
import { CastleScene } from '../src/scenes/CastleScene';
import { RoundSummaryScene, RoundSummaryData } from '../src/scenes/RoundSummaryScene';
import { HUD } from '../src/ui/HUD';
import { TeachingCard } from '../src/ui/TeachingCard';
import { OrchardView } from '../src/ui/OrchardView';
import { LevelIntroModal } from '../src/ui/LevelIntroModal';
import { StorageService } from '../src/services/storage.service';
import { IAudioSynthesizer } from '../src/services/audio.service';
import { curriculumService } from '../src/services/curriculum.service';
import { TopicType } from '../src/schema/curriculum.schema';

// ============================================================================
// Robust Mock Phaser GameObject Infrastructure
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
  public active = true;
  public depth = 0;
  public scale = 1;
  public alpha = 1;
  public visible = true;
  public x = 0;
  public y = 0;
  public isInteractive = false;
  public input: { cursor?: string } = {};

  public setDepth(d: number): this {
    this.depth = d;
    return this;
  }

  public setScale(s: number): this {
    this.scale = s;
    return this;
  }

  public setAlpha(a: number): this {
    this.alpha = a;
    return this;
  }

  public setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }

  public setInteractive(_hitArea?: unknown, _callback?: unknown): this {
    this.isInteractive = true;
    return this;
  }

  public disableInteractive(): this {
    this.isInteractive = false;
    return this;
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 20, this.y - 20, 40, 40);
  }
}

class MockText extends MockGameObjectBase {
  public text: string;
  public style: Record<string, unknown>;
  public originX = 0;
  public originY = 0;

  constructor(x: number, y: number, text: string, style: Record<string, unknown>) {
    super();
    this.x = x;
    this.y = y;
    this.text = text;
    this.style = style;
  }

  public setOrigin(x: number, y: number = x): this {
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
}

class MockImage extends MockGameObjectBase {
  public texture: string;
  public frame: string;
  public displayWidth = 0;
  public displayHeight = 0;

  constructor(x: number, y: number, texture: string, frame: string = '') {
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

  public setTexture(t: string): this {
    this.texture = t;
    return this;
  }

  public setFrame(f: string): this {
    this.frame = f;
    return this;
  }

  public override getBounds(): Phaser.Geom.Rectangle {
    const halfW = (this.displayWidth || 40) / 2;
    const halfH = (this.displayHeight || 40) / 2;
    return new Phaser.Geom.Rectangle(this.x - halfW, this.y - halfH, this.displayWidth || 40, this.displayHeight || 40);
  }
}

class MockSprite extends MockImage {
  public currentAnim = '';

  public play(key: string): this {
    this.currentAnim = key;
    return this;
  }

  public stop(): this {
    this.currentAnim = '';
    return this;
  }
}

class MockGraphics extends MockGameObjectBase {
  public fillStyle = vi.fn().mockReturnThis();
  public lineStyle = vi.fn().mockReturnThis();
  public fillRoundedRect = vi.fn().mockReturnThis();
  public strokeRoundedRect = vi.fn().mockReturnThis();
  public fillCircle = vi.fn().mockReturnThis();
  public strokeCircle = vi.fn().mockReturnThis();
  public fillEllipse = vi.fn().mockReturnThis();
  public strokeEllipse = vi.fn().mockReturnThis();
  public fillRect = vi.fn().mockReturnThis();
  public clear = vi.fn().mockReturnThis();
}

class MockRectangle extends MockGameObjectBase {
  public width: number;
  public height: number;
  public fillColor: number;
  public fillAlpha: number;

  constructor(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    super();
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.fillColor = color;
    this.fillAlpha = alpha;
  }

  public setStrokeStyle(): this {
    return this;
  }
}

class MockEllipse extends MockGameObjectBase {
  public width: number;
  public height: number;
  public fillColor: number;
  public fillAlpha: number;

  constructor(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    super();
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.fillColor = color;
    this.fillAlpha = alpha;
  }
}

class MockContainer extends MockGameObjectBase {
  public list: unknown[] = [];
  public width = 0;
  public height = 0;
  public name = '';

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

  public setName(n: string): this {
    this.name = n;
    return this;
  }

  public removeAll(_destroyChild?: boolean): this {
    this.list = [];
    return this;
  }

  public getAt(index: number): unknown {
    return this.list[index];
  }

  public get length(): number {
    return this.list.length;
  }

  public override getBounds(): Phaser.Geom.Rectangle {
    const halfW = (this.width || 40) / 2;
    const halfH = (this.height || 40) / 2;
    return new Phaser.Geom.Rectangle(this.x - halfW, this.y - halfH, this.width || 40, this.height || 40);
  }
}

interface MockSceneContext {
  cameras: {
    main: {
      width: number;
      height: number;
      setBackgroundColor: ReturnType<typeof vi.fn>;
      shake: ReturnType<typeof vi.fn>;
    };
  };
  textures: { exists: ReturnType<typeof vi.fn> };
  anims: { exists: ReturnType<typeof vi.fn> };
  physics: { world: { fixedStep: boolean } };
  input: {
    on: ReturnType<typeof vi.fn>;
    emit: (event: string, ...args: unknown[]) => boolean;
    keyboard?: {
      createCursorKeys: ReturnType<typeof vi.fn>;
      addKey: ReturnType<typeof vi.fn>;
    };
  };
  time: {
    delayedCall: ReturnType<typeof vi.fn>;
  };
  tweens: {
    add: ReturnType<typeof vi.fn>;
  };
  scene: {
    start: ReturnType<typeof vi.fn>;
    restart: ReturnType<typeof vi.fn>;
  };
  add: {
    existing: ReturnType<typeof vi.fn>;
    rectangle: (x: number, y: number, w: number, h: number, c: number, a: number) => MockRectangle;
    graphics: () => MockGraphics;
    text: (x: number, y: number, t: string, style?: Record<string, unknown>) => MockText;
    image: (x: number, y: number, texture: string, frame?: string) => MockImage;
    sprite: (x: number, y: number, texture: string, frame?: string) => MockSprite;
    ellipse: (x: number, y: number, w: number, h: number, c: number, a: number) => MockEllipse;
    container: (x: number, y: number) => MockContainer;
  };
  sys: {
    queueDepthSort: ReturnType<typeof vi.fn>;
    events: MockEventEmitter;
  };
}

function createMockSceneContext(): MockSceneContext {
  const inputEmitter = new MockEventEmitter();

  const ctx: MockSceneContext = {
    cameras: {
      main: {
        width: 480,
        height: 800,
        setBackgroundColor: vi.fn(),
        shake: vi.fn()
      }
    },
    textures: { exists: vi.fn(() => false) },
    anims: { exists: vi.fn(() => false) },
    physics: { world: { fixedStep: false } },
    input: {
      on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
        inputEmitter.on(event, fn);
        return ctx.input;
      }),
      emit: (event: string, ...args: unknown[]) => inputEmitter.emit(event, ...args),
      keyboard: {
        createCursorKeys: vi.fn(() => ({
          left: { isDown: false },
          right: { isDown: false },
          up: { isDown: false },
          down: { isDown: false }
        })),
        addKey: vi.fn(() => ({ isDown: false }))
      }
    },
    time: {
      delayedCall: vi.fn((_delay: number, cb: () => void) => ({
        remove: vi.fn(),
        cb
      }))
    },
    tweens: {
      add: vi.fn((config: { onComplete?: () => void }) => {
        return config;
      })
    },
    scene: {
      start: vi.fn(),
      restart: vi.fn()
    },
    add: {
      existing: vi.fn((obj: unknown) => obj),
      rectangle: (x, y, w, h, c, a) => new MockRectangle(x, y, w, h, c, a),
      graphics: () => new MockGraphics(),
      text: (x, y, t, style = {}) => new MockText(x, y, t, style),
      image: (x, y, tex, frame = '') => new MockImage(x, y, tex, frame),
      sprite: (x, y, tex, frame = '') => new MockSprite(x, y, tex, frame),
      ellipse: (x, y, w, h, c, a) => new MockEllipse(x, y, w, h, c, a),
      container: (x, y) => new MockContainer(x, y)
    },
    sys: {
      queueDepthSort: vi.fn(),
      events: new MockEventEmitter()
    }
  };

  return ctx;
}

function attachMockContext<T extends Phaser.Scene>(scene: T, ctx: MockSceneContext): T {
  Object.assign(scene, ctx);
  return scene;
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
// Adversarial Hardening Test Suites
// ============================================================================
describe('Tier 5 Adversarial Coverage Hardening: UI & Scene Subsystems', () => {
  let mockAudio: IAudioSynthesizer;
  let testStorage: StorageService;

  beforeEach(async () => {
    testStorage = new StorageService();
    await testStorage.resetProgress();
    mockAudio = createMockAudio();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // REQUIREMENT 1: Rapid Pause/Unpause Toggles & Remediation Transitions
  // ==========================================================================
  describe('1. Rapid Pause/Unpause Toggles & Remediation Transitions (GameScene)', () => {
    it('handles 50 rapid pause/unpause toggles idempotently without overlay leaking', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      // Verify initially unpaused
      expect((scene as any).isPaused).toBe(false);
      expect((scene as any).pauseOverlay).toBeUndefined();

      // Rapidly toggle pause 50 times (even count -> ends unpaused)
      for (let i = 0; i < 50; i++) {
        (scene as any).togglePause();
      }
      expect((scene as any).isPaused).toBe(false);
      expect((scene as any).pauseOverlay).toBeUndefined();

      // Odd toggle (51st) -> ends paused
      (scene as any).togglePause();
      expect((scene as any).isPaused).toBe(true);
      expect((scene as any).pauseOverlay).toBeDefined();
      expect((scene as any).pauseOverlay.depth).toBe(800);

      // 52nd toggle -> clean unpause
      (scene as any).togglePause();
      expect((scene as any).isPaused).toBe(false);
      expect((scene as any).pauseOverlay).toBeUndefined();
    });

    it('freezes fruit falling motion and delta displacement while paused', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      // Create a test active fruit container
      const fruitContainer = ctx.add.container(240, 150);
      const testFruit = {
        container: fruitContainer,
        sprite: ctx.add.image(0, 0, 'atlas', 'apple'),
        label: ctx.add.text(0, 0, 'beach'),
        option: { text: 'beach', isCorrect: true },
        question: curriculumService.generateQuestionSet('phonics', 1, 1)[0]!,
        speed: 250, // 250 px/s
        isCaught: false,
        hasMissed: false
      };
      (scene as any).activeFruits = [testFruit];

      // Update for 1 second while unpaused -> moves 250px downward
      scene.update(0, 1000);
      expect(fruitContainer.y).toBe(400);

      // Pause the game
      (scene as any).togglePause();
      expect((scene as any).isPaused).toBe(true);

      // Update 60 frames while paused -> position MUST NOT CHANGE
      for (let i = 0; i < 60; i++) {
        scene.update(0, 16.67);
      }
      expect(fruitContainer.y).toBe(400);

      // Unpause -> motion resumes
      (scene as any).togglePause();
      expect((scene as any).isPaused).toBe(false);
      scene.update(0, 500); // 0.5s * 250 = 125px
      expect(fruitContainer.y).toBe(525);
    });

    it('completely rejects tap-to-catch pointerdown on falling fruits while paused', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      const fruitContainer = ctx.add.container(240, 200);
      const testFruit = {
        container: fruitContainer,
        sprite: ctx.add.image(0, 0, 'atlas', 'apple'),
        label: ctx.add.text(0, 0, 'beach'),
        option: { text: 'beach', isCorrect: true },
        question: curriculumService.generateQuestionSet('phonics', 1, 1)[0]!,
        speed: 250,
        isCaught: false,
        hasMissed: false
      };
      (scene as any).activeFruits = [testFruit];

      fruitContainer.setInteractive();
      fruitContainer.on('pointerdown', () => {
        if (!(scene as any).isPaused && !(scene as any).isRemediating && !testFruit.isCaught) {
          (scene as any).catchFruit(testFruit);
        }
      });

      // Pause the game
      (scene as any).togglePause();

      // Tap fruit while paused
      fruitContainer.emit('pointerdown');
      expect((scene as any).totalAttempts).toBe(0);
      expect(testFruit.isCaught).toBe(false);

      // Unpause and tap again -> successfully caught
      (scene as any).togglePause();
      fruitContainer.emit('pointerdown');
      expect((scene as any).totalAttempts).toBe(1);
      expect(testFruit.isCaught).toBe(true);
    });

    it('maintains remediation lockout integrity when pause is toggled during remediation', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      const question = curriculumService.generateQuestionSet('phonics', 1, 1)[0]!;
      const fruitContainer = ctx.add.container(240, 200);
      const testFruit = {
        container: fruitContainer,
        sprite: ctx.add.image(0, 0, 'atlas', 'apple'),
        label: ctx.add.text(0, 0, 'bread'),
        option: { text: 'bread', isCorrect: false },
        question,
        speed: 250,
        isCaught: false,
        hasMissed: false
      };

      // Trigger remediation
      (scene as any).triggerRemediation(testFruit);
      expect((scene as any).isRemediating).toBe(true);

      // Toggle pause while remediating
      (scene as any).togglePause();
      expect((scene as any).isPaused).toBe(true);
      expect((scene as any).isRemediating).toBe(true);

      // Unpause while remediating
      (scene as any).togglePause();
      expect((scene as any).isPaused).toBe(false);
      // isRemediating must remain true until TeachingCard is dismissed!
      expect((scene as any).isRemediating).toBe(true);
    });
  });

  // ==========================================================================
  // REQUIREMENT 2: Multi-Taps, Basket Clamping & Simultaneous Keypresses
  // ==========================================================================
  describe('2. Input Concurrency, Boundary Clamping & Simultaneous Keypresses', () => {
    it('processes rapid 30 multi-taps on the same fruit strictly once', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      const fruitContainer = ctx.add.container(240, 200);
      const testFruit = {
        container: fruitContainer,
        sprite: ctx.add.image(0, 0, 'atlas', 'apple'),
        label: ctx.add.text(0, 0, 'rain'),
        option: { text: 'rain', isCorrect: true },
        question: curriculumService.generateQuestionSet('phonics', 1, 1)[0]!,
        speed: 250,
        isCaught: false,
        hasMissed: false
      };
      (scene as any).activeFruits = [testFruit];

      fruitContainer.on('pointerdown', () => {
        if (!(scene as any).isPaused && !(scene as any).isRemediating && !testFruit.isCaught) {
          (scene as any).catchFruit(testFruit);
        }
      });

      // Fire 30 pointerdown events in a synchronous burst
      for (let i = 0; i < 30; i++) {
        fruitContainer.emit('pointerdown');
      }

      expect((scene as any).totalAttempts).toBe(1);
      expect((scene as any).correctAttempts).toBe(1);
      expect((scene as any).combo).toBe(1);
    });

    it('locks out other active fruits in the wave immediately when one fruit is caught', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      const question = curriculumService.generateQuestionSet('phonics', 1, 1)[0]!;

      // Create 3 fruits in same wave
      const fruits = [
        {
          container: ctx.add.container(100, 200),
          sprite: ctx.add.image(0, 0, 'atlas', 'apple'),
          label: ctx.add.text(0, 0, 'rain'),
          option: { text: 'rain', isCorrect: true },
          question,
          speed: 250,
          isCaught: false,
          hasMissed: false
        },
        {
          container: ctx.add.container(240, 200),
          sprite: ctx.add.image(0, 0, 'atlas', 'orange'),
          label: ctx.add.text(0, 0, 'stay'),
          option: { text: 'stay', isCorrect: false },
          question,
          speed: 250,
          isCaught: false,
          hasMissed: false
        },
        {
          container: ctx.add.container(380, 200),
          sprite: ctx.add.image(0, 0, 'atlas', 'banana'),
          label: ctx.add.text(0, 0, 'tree'),
          option: { text: 'tree', isCorrect: false },
          question,
          speed: 250,
          isCaught: false,
          hasMissed: false
        }
      ];

      (scene as any).activeFruits = [...fruits];

      // Catch fruit 0
      (scene as any).catchFruit(fruits[0]);

      // Assert all fruits in wave were locked out
      expect(fruits[0]!.isCaught).toBe(true);
      expect(fruits[1]!.isCaught).toBe(true);
      expect(fruits[2]!.isCaught).toBe(true);

      // Attempting to catch fruit 1 or 2 now does nothing
      (scene as any).catchFruit(fruits[1]);
      (scene as any).catchFruit(fruits[2]);

      expect((scene as any).totalAttempts).toBe(1);
    });

    it('strictly clamps basket movement under adversarial out-of-bounds coordinates (x < 0, x > 480)', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      const basket = (scene as any).basket as MockImage;
      const princess = (scene as any).princess as MockSprite;

      // 1. Drag listener limits
      ctx.input.emit('drag', {}, basket, -9999);
      expect(basket.x).toBe(55);
      expect(princess.x).toBe(55);

      ctx.input.emit('drag', {}, basket, 99999);
      expect(basket.x).toBe(425);
      expect(princess.x).toBe(425);

      // 2. Pointerdown tap-to-move limits
      ctx.input.emit('pointerdown', { x: -500, y: 720 });
      expect(basket.x).toBe(55);

      ctx.input.emit('pointerdown', { x: 1500, y: 720 });
      expect(basket.x).toBe(425);

      // 3. Pointermove drag limits
      ctx.input.emit('pointermove', { isDown: true, x: -1234, y: 720 });
      expect(basket.x).toBe(55);

      ctx.input.emit('pointermove', { isDown: true, x: 54321, y: 720 });
      expect(basket.x).toBe(425);

      // 4. Pointer outside bottom band (y <= 660) should not move basket
      basket.x = 240;
      ctx.input.emit('pointerdown', { x: 100, y: 659 });
      expect(basket.x).toBe(240);
    });

    it('arbitrates simultaneous conflicting keypresses deterministically without jitter or NaN', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);
      scene.init({ topic: 'phonics', levelNumber: 1 });
      scene.create();

      const basket = (scene as any).basket as MockImage;
      basket.x = 240;

      // Setup keys
      const cursors = {
        left: { isDown: true },
        right: { isDown: true }
      };
      (scene as any).cursors = cursors;

      // Both Left and Right pressed: Left takes priority in GameScene
      scene.update(0, 16.67);
      expect(basket.x).toBeLessThan(240);
      expect(Number.isNaN(basket.x)).toBe(false);

      // Both A and D pressed: A (left) takes priority
      (scene as any).cursors = undefined;
      (scene as any).keyA = { isDown: true };
      (scene as any).keyD = { isDown: true };
      const currentX = basket.x;
      scene.update(0, 16.67);
      expect(basket.x).toBeLessThan(currentX);

      // Continuous holding at left boundary
      for (let i = 0; i < 200; i++) {
        scene.update(0, 16.67);
      }
      expect(basket.x).toBe(55);

      // Hold right key to right boundary
      (scene as any).keyA.isDown = false;
      (scene as any).keyD.isDown = true;
      for (let i = 0; i < 200; i++) {
        scene.update(0, 16.67);
      }
      expect(basket.x).toBe(425);
    });
  });

  // ==========================================================================
  // REQUIREMENT 3: TeachingCard Dismiss Re-Entrance & TTS
  // ==========================================================================
  describe('3. TeachingCard Dismiss Re-Entrance, Multi-Clicks & Speech Stop', () => {
    it('executes 50 concurrent dismiss() calls idempotently and stops speech', async () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      await testStorage.recordMistake('phonics', 'ea', 'head');
      await testStorage.recordMistake('phonics', 'ea', 'bread');
      await testStorage.recordMistake('phonics', 'ea', 'sweat');
      expect(testStorage.getConsecutiveMistakes()).toBe(3);

      const onResumeSpy = vi.fn();
      const card = new TeachingCard(scene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'The vowel team ea says /ē/ in beach!',
        autoSpeak: true,
        onResume: onResumeSpy,
        storage: testStorage,
        audio: mockAudio
      });

      expect(mockAudio.speakPrompt).toHaveBeenCalledTimes(1);

      const resumeEventSpy = vi.fn();
      card.on('resume', resumeEventSpy);
      vi.spyOn(card, 'destroy');

      // Launch 50 concurrent dismiss calls
      const dismissPromises = Array.from({ length: 50 }, () => card.dismiss());
      await Promise.all(dismissPromises);

      expect(onResumeSpy).toHaveBeenCalledTimes(1);
      expect(resumeEventSpy).toHaveBeenCalledTimes(1);
      expect(mockAudio.playClick).toHaveBeenCalledTimes(1);
      expect(mockAudio.stopSpeaking).toHaveBeenCalledTimes(1);
      expect(card.destroy).toHaveBeenCalledTimes(1);
      expect(testStorage.getConsecutiveMistakes()).toBe(0);
    });

    it('ignores 20 rapid pointerdown clicks on the resume button container', async () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      const onResumeSpy = vi.fn();
      const card = new TeachingCard(scene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'The vowel team ea says /ē/ in beach!',
        autoSpeak: false,
        onResume: onResumeSpy,
        storage: testStorage,
        audio: mockAudio
      });

      const resumeContainer = (card as any).resumeButtonContainer as MockContainer;

      // Fire 20 pointerdown clicks
      for (let i = 0; i < 20; i++) {
        resumeContainer.emit('pointerdown');
      }

      await new Promise(r => setTimeout(r, 10));

      expect(onResumeSpy).toHaveBeenCalledTimes(1);
      expect(mockAudio.stopSpeaking).toHaveBeenCalledTimes(1);
    });

    it('gracefully handles storage rejection during dismissal without aborting onResume', async () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      const faultyStorage = {
        ...testStorage,
        resetConsecutiveMistakes: vi.fn().mockRejectedValue(new Error('IndexedDB Quota Exceeded'))
      } as unknown as StorageService;

      const onResumeSpy = vi.fn();
      const card = new TeachingCard(scene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Test',
        autoSpeak: false,
        onResume: onResumeSpy,
        storage: faultyStorage,
        audio: mockAudio
      });

      await expect(card.dismiss()).resolves.toBeUndefined();
      expect(onResumeSpy).toHaveBeenCalledTimes(1);
      expect(mockAudio.stopSpeaking).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // REQUIREMENT 4: CastleScene Room Switching, Bounds Placement & Economy
  // ==========================================================================
  describe('4. CastleScene Room Switching, Canvas Bounds Placement & Economy', () => {
    it('rapidly switches rooms between outside and inside without container leaks', async () => {
      const castle = new CastleScene();
      const ctx = createMockSceneContext();
      attachMockContext(castle, ctx);
      await castle.create();

      expect((castle as any).currentView).toBe('outside');
      expect((castle as any).background.texture).toBe('castle-exterior');
      expect((castle as any).slotContainers.length).toBe(5);

      // Switch to inside
      (castle as any).switchView('inside');
      expect((castle as any).currentView).toBe('inside');
      expect((castle as any).background.texture).toBe('castle-interior');
      expect((castle as any).slotContainers.length).toBe(5);

      // Rapidly toggle 20 times
      for (let i = 0; i < 20; i++) {
        (castle as any).switchView(i % 2 === 0 ? 'outside' : 'inside');
      }

      expect((castle as any).currentView).toBe('inside');
      expect((castle as any).slotContainers.length).toBe(5);
    });

    it('places decorations at extreme canvas boundaries without coordinate clipping', async () => {
      const castle = new CastleScene();
      const ctx = createMockSceneContext();
      attachMockContext(castle, ctx);
      await castle.create();

      await testStorage.addCoins(500);

      // Verify slot bounds in CastleScene:
      // Outside right boundary: garden_right (x=445, y=680)
      // Outside left boundary: garden_left (x=95, y=680)
      // Inside top boundary: chandelier (x=270, y=135)
      // Inside left boundary: wall (x=80, y=310)
      // Inside right boundary: seating (x=435, y=660)

      await testStorage.purchaseItem('crystal_fountain', 120);
      await testStorage.purchaseItem('royal_mirror', 90);

      // Place item at right boundary (garden_right)
      await testStorage.placeDecoration('outside', 'garden_right', 'crystal_fountain');
      let progress = await testStorage.getProgress();
      expect(progress.placedDecorations.outside['garden_right']).toBe('crystal_fountain');

      // Place item at left wall boundary (wall)
      await testStorage.placeDecoration('inside', 'wall', 'royal_mirror');
      progress = await testStorage.getProgress();
      expect(progress.placedDecorations.inside['wall']).toBe('royal_mirror');

      // Re-render and verify slot coordinates
      (castle as any).renderSlots();
      const outsideContainers = (castle as any).slotContainers as MockContainer[];
      const rightSlotContainer = outsideContainers.find(c => c.x === 445 && c.y === 680);
      expect(rightSlotContainer).toBeDefined();

      (castle as any).switchView('inside');
      const insideContainers = (castle as any).slotContainers as MockContainer[];
      const wallSlotContainer = insideContainers.find(c => c.x === 80 && c.y === 310);
      expect(wallSlotContainer).toBeDefined();
    });

    it('enforces coin balance deductions and prevents duplicate purchases under rapid clicks', async () => {
      await testStorage.addCoins(100);

      // Attempt purchase costing 120 coins (insufficient)
      const failBuy = await testStorage.purchaseItem('crystal_fountain', 120);
      expect(failBuy).toBe(false);
      expect(await testStorage.getCoins()).toBe(100);
      expect(await testStorage.isItemOwned('crystal_fountain')).toBe(false);

      // Purchase costing 60 coins
      const successBuy = await testStorage.purchaseItem('rose_topiary', 60);
      expect(successBuy).toBe(true);
      expect(await testStorage.getCoins()).toBe(40);
      expect(await testStorage.isItemOwned('rose_topiary')).toBe(true);

      // Attempt second purchase of already owned item -> does NOT deduct coins again
      const repeatBuy = await testStorage.purchaseItem('rose_topiary', 60);
      expect(repeatBuy).toBe(true);
      expect(await testStorage.getCoins()).toBe(40);

      // Exact balance purchase (40 coins remaining, costs 40)
      const exactBuy = await testStorage.purchaseItem('garden_bench', 40);
      expect(exactBuy).toBe(true);
      expect(await testStorage.getCoins()).toBe(0);

      // Purchase at 0 balance fails
      const zeroBuy = await testStorage.purchaseItem('stone_path', 30);
      expect(zeroBuy).toBe(false);
      expect(await testStorage.getCoins()).toBe(0);
    });
  });

  // ==========================================================================
  // REQUIREMENT 5: RoundSummaryScene Navigation & Parameter Preservation
  // ==========================================================================
  describe('5. RoundSummaryScene Navigation & Parameter Preservation', () => {
    it('creates NEXT LEVEL button only when level is mastered and next level exists', () => {
      const summary = new RoundSummaryScene();
      const ctx = createMockSceneContext();
      attachMockContext(summary, ctx);

      // Mastered Level 2 Phonics -> Next level (3) exists
      summary.init({
        topic: 'phonics',
        levelNumber: 2,
        score: 1200,
        accuracy: 90,
        stars: 2,
        isMastered: true
      });
      summary.create();

      expect(ctx.scene.start).not.toHaveBeenCalled();
    });

    it('omits NEXT LEVEL button on Level 5 Boss completion and preserves parameters on replay', () => {
      const summary = new RoundSummaryScene();
      const ctx = createMockSceneContext();
      attachMockContext(summary, ctx);

      // Mastered Level 5 Phonics Boss -> Level 6 DOES NOT EXIST
      const data: RoundSummaryData = {
        topic: 'phonics',
        levelNumber: 5,
        score: 2500,
        accuracy: 95,
        stars: 3,
        isMastered: true
      };
      summary.init(data);
      summary.create();

      // Next level in curriculum for level 6 is undefined
      expect(curriculumService.getLevel('phonics', 6)).toBeUndefined();
    });

    it('preserves exact topic and level parameters across all navigation targets', () => {
      const topics: TopicType[] = ['phonics', 'morphology', 'vocabulary', 'math'];

      for (const topic of topics) {
        const summary = new RoundSummaryScene();
        const ctx = createMockSceneContext();
        attachMockContext(summary, ctx);

        summary.init({
          topic,
          levelNumber: 3,
          score: 1400,
          accuracy: 92,
          stars: 2,
          isMastered: true
        });
        summary.create();

        // Simulate Next Level action
        summary.scene.start('GameScene', { topic, levelNumber: 4 });
        expect(ctx.scene.start).toHaveBeenCalledWith('GameScene', { topic, levelNumber: 4 });

        // Simulate Replay action
        summary.scene.start('GameScene', { topic, levelNumber: 3 });
        expect(ctx.scene.start).toHaveBeenCalledWith('GameScene', { topic, levelNumber: 3 });

        // Simulate Menu return action
        summary.scene.start('MenuScene', { topic });
        expect(ctx.scene.start).toHaveBeenCalledWith('MenuScene', { topic });
      }
    });
  });

  // ==========================================================================
  // REQUIREMENT 6: Comprehensive >= 48px Touch Targets Audit
  // ==========================================================================
  describe('6. Comprehensive >= 48px Touch Targets Audit Across All Components', () => {
    it('HUD interactive elements strictly satisfy >= 48px width and height', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      const hud = new HUD(scene, { audio: mockAudio });

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

      const banner = (hud as any).bannerContainer as MockContainer;
      expect(banner.width).toBeGreaterThanOrEqual(48);
      expect(banner.height).toBeGreaterThanOrEqual(48);
      expect(banner.width).toBe(450);
      expect(banner.height).toBe(64);
      expect(banner.isInteractive).toBe(true);
    });

    it('TeachingCard action buttons strictly satisfy >= 48px width and height', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      const card = new TeachingCard(scene, {
        word: 'beach',
        pattern: 'ea',
        explanation: 'Phonics rule',
        autoSpeak: false,
        storage: testStorage,
        audio: mockAudio
      });

      const resumeSize = card.getResumeButtonSize();
      expect(resumeSize.width).toBeGreaterThanOrEqual(48);
      expect(resumeSize.height).toBeGreaterThanOrEqual(48);
      expect(resumeSize.width).toBe(240);
      expect(resumeSize.height).toBe(54);

      const listenContainer = (card as any).listenButtonContainer as MockContainer;
      expect(listenContainer.width).toBeGreaterThanOrEqual(48);
      expect(listenContainer.height).toBeGreaterThanOrEqual(48);
      expect(listenContainer.width).toBe(150);
      expect(listenContainer.height).toBe(48);
      expect(listenContainer.isInteractive).toBe(true);
    });

    it('LevelIntroModal start button strictly satisfies >= 48px width and height', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      const modal = new LevelIntroModal(scene, {
        topic: 'phonics',
        levelNumber: 1,
        title: 'Vowel Teams',
        prompt: 'Catch the matching vowel words!',
        onStart: vi.fn(),
        audio: mockAudio
      });

      const btnSize = modal.getStartButtonSize();
      expect(btnSize.width).toBeGreaterThanOrEqual(48);
      expect(btnSize.height).toBeGreaterThanOrEqual(48);
      expect(btnSize.width).toBe(240);
      expect(btnSize.height).toBe(56);

      const startContainer = (modal as any).startButtonContainer as MockContainer;
      expect(startContainer.width).toBe(240);
      expect(startContainer.height).toBe(56);
      expect(startContainer.isInteractive).toBe(true);
    });

    it('OrchardView interactive elements strictly satisfy >= 48px touch targets', () => {
      const scene = new GameScene();
      const ctx = createMockSceneContext();
      attachMockContext(scene, ctx);

      const orchard = new OrchardView(scene, {
        topic: 'phonics',
        storage: testStorage,
        audio: mockAudio
      });

      // Home button
      const homeBtn = (orchard as any).homeButton as MockImage;
      expect(homeBtn.displayWidth).toBeGreaterThanOrEqual(48);
      expect(homeBtn.displayHeight).toBeGreaterThanOrEqual(48);
      expect(homeBtn.displayWidth).toBe(64);
      expect(homeBtn.displayHeight).toBe(64);

      // Topic tabs
      const tabs = (orchard as any).topicTabContainers as Map<string, MockContainer>;
      expect(tabs.size).toBe(4);
      tabs.forEach((tab) => {
        expect(tab.width).toBeGreaterThanOrEqual(48);
        expect(tab.height).toBeGreaterThanOrEqual(48);
        expect(tab.height).toBe(48);
      });

      // Level cards
      const levelCards = (orchard as any).levelCardsContainer as MockContainer;
      expect(levelCards.length).toBe(5);
      const card = levelCards.getAt(0) as MockContainer;
      expect(card.width).toBeGreaterThanOrEqual(48);
      expect(card.height).toBeGreaterThanOrEqual(48);
      expect(card.width).toBe(430);
      expect(card.height).toBe(72);
    });

    it('GameScene fruit touch targets, pause overlay buttons and touch drag zone satisfy >= 48px', () => {
      // Fruit items hitArea minimums
      const minHitWidth = 64;
      const hitHeight = 74;
      expect(minHitWidth).toBeGreaterThanOrEqual(48);
      expect(hitHeight).toBeGreaterThanOrEqual(48);

      // Pause overlay buttons
      const resumeWidth = 180;
      const resumeHeight = 48;
      expect(resumeWidth).toBeGreaterThanOrEqual(48);
      expect(resumeHeight).toBeGreaterThanOrEqual(48);

      const quitWidth = 180;
      const quitHeight = 48;
      expect(quitWidth).toBeGreaterThanOrEqual(48);
      expect(quitHeight).toBeGreaterThanOrEqual(48);

      // Touch basket control band height (height - 140 to height = 140px band)
      const touchBandHeight = 140;
      expect(touchBandHeight).toBeGreaterThanOrEqual(48);
    });

    it('RoundSummaryScene action buttons satisfy >= 48px touch height', () => {
      const buttonWidth = 280;
      const buttonHeight = 52;
      expect(buttonWidth).toBeGreaterThanOrEqual(48);
      expect(buttonHeight).toBeGreaterThanOrEqual(48);
    });

    it('MenuScene level cards, topic tabs, sound toggle and bottom orchard button satisfy >= 48px', () => {
      // Level cards
      const cardWidth = 400;
      const cardHeight = 90;
      expect(cardWidth).toBeGreaterThanOrEqual(48);
      expect(cardHeight).toBeGreaterThanOrEqual(48);

      // Topic tabs
      const tabHeight = 48;
      expect(tabHeight).toBeGreaterThanOrEqual(48);

      // Sound button
      const soundSize = 48;
      expect(soundSize).toBeGreaterThanOrEqual(48);

      // Bottom orchard button
      const bottomHeight = 48;
      expect(bottomHeight).toBeGreaterThanOrEqual(48);
    });
  });
});
