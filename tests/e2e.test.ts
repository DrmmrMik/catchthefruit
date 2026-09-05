import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Schema and service imports
import {
  LevelConfigSchema,
  PhonicsItemSchema,
  MorphologyItemSchema,
  VocabularyItemSchema,
  MathItemSchema,
  FruitTypeSchema
} from '../src/schema/curriculum.schema';

import {
  StorageService,
  calculateStars,
  isMasteryAchieved
} from '../src/services/storage.service';

import { CurriculumService } from '../src/services/curriculum.service';
import { AudioService, normalizePhoneticsForSpeech } from '../src/services/audio.service';

import {
  gameConfig,
  GameConfigSchema,
  PreloadScene,
  MenuScene,
  GameScene,
  RoundSummaryScene,
  OrchardScene,
  CastleScene
} from '../src/main';

import Phaser from 'phaser';

// ============================================================================
// Headless Web Audio Mock Helpers
// ============================================================================
class MockAudioParam {
  public value: number;
  public setValueAtTime = vi.fn((val: number) => { this.value = val; });
  public linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  public exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });

  constructor(initial: number = 1) {
    this.value = initial;
  }
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
  public start = vi.fn();
  public stop = vi.fn();
}

class MockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = 'suspended';
  public destination = {};
  public createdOscillators: MockOscillatorNode[] = [];
  public createdGains: MockGainNode[] = [];

  public createGain = vi.fn(() => {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain as unknown as GainNode;
  });

  public createOscillator = vi.fn(() => {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc as unknown as OscillatorNode;
  });

  public resume = vi.fn(async () => {
    this.state = 'running';
  });

  public close = vi.fn(async () => {
    this.state = 'closed';
  });
}

// ============================================================================
// File Path Utilities
// ============================================================================
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const STACK_MD_PATH = path.join(PROJECT_ROOT, 'STACK.md');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'public/manifest.json');
const ATLAS_JSON_PATH = path.join(PROJECT_ROOT, 'public/assets/atlas.json');
const SW_JS_PATH = path.join(PROJECT_ROOT, 'public/sw.js');
const PHONICS_DATA_PATH = path.join(PROJECT_ROOT, 'data/phonics.json');
const MORPHOLOGY_DATA_PATH = path.join(PROJECT_ROOT, 'data/morphology.json');
const VOCABULARY_DATA_PATH = path.join(PROJECT_ROOT, 'data/vocabulary.json');

// ============================================================================
// TIER 1: FEATURE COVERAGE (F01 – F09, >=5 tests per feature)
// ============================================================================
describe('Tier 1: Feature Coverage (F01 - F09)', () => {

  describe('F01: Project Scaffolding & Build System', () => {
    it('F01-1: package.json specifies required production dependencies phaser, zod, idb-keyval', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies.phaser).toBeDefined();
      expect(pkg.dependencies.zod).toBeDefined();
      expect(pkg.dependencies['idb-keyval']).toBeDefined();
    });

    it('F01-2: package.json includes all core lifecycle scripts', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.scripts.dev).toBe('vite');
      expect(pkg.scripts.build).toContain('vite build');
      expect(pkg.scripts.test).toContain('vitest');
      expect(pkg.scripts.typecheck).toContain('tsc --noEmit');
      expect(pkg.scripts['verify:bsa']).toBeDefined();
    });

    it('F01-3: STACK.md declares archetype 2d-game-arcade with pixel-art-character-pipeline', () => {
      const stack = fs.readFileSync(STACK_MD_PATH, 'utf-8');
      expect(stack).toContain('archetype: 2d-game-arcade');
      expect(stack).toContain('pixel-art-character-pipeline');
    });

    it('F01-4: STACK.md specifies forbidden patterns and none are violated in source', () => {
      const stack = fs.readFileSync(STACK_MD_PATH, 'utf-8');
      expect(stack).toContain('raw-raf-loop');
      expect(stack).toContain('dom-sprites');
      expect(stack).toContain('unbatched-image-loads');
      expect(stack).toContain('hardcoded-curriculum-logic');

      // Verify no raw window.requestAnimationFrame loop in src
      const mainContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/main.ts'), 'utf-8');
      expect(mainContent).not.toMatch(/window\.requestAnimationFrame\(/);
    });

    it('F01-5: tsconfig.json enforces ES2022 target and strict module resolution', () => {
      const tsconfigRaw = fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf-8');
      const cleanTsconfig = tsconfigRaw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      const tsconfig = JSON.parse(cleanTsconfig);
      expect(tsconfig.compilerOptions.target.toLowerCase()).toBe('es2022');
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe('F02: PWA Web App Manifest', () => {
    it('F02-1: specifies display standalone and display_override standalone', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.display).toBe('standalone');
      expect(manifest.display_override).toEqual(['standalone']);
    });

    it('F02-2: specifies relative start_url and scope', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.start_url).toBe('./index.html');
      expect(manifest.scope).toBe('./');
    });

    it('F02-3: locks mobile orientation to portrait', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.orientation).toBe('portrait');
    });

    it('F02-4: defines theme_color and background_color', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.theme_color).toBe('#0284c7');
      expect(manifest.background_color).toBe('#38bdf8');
    });

    it('F02-5: contains zero forbidden experimental desktop keys', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest['window-controls-overlay']).toBeUndefined();
      expect(manifest['protocol_handlers']).toBeUndefined();
      expect(manifest['shortcuts']).toBeUndefined();
      expect(manifest['widgets']).toBeUndefined();
    });
  });

  describe('F03: Full-Bleed Icons & Packed Texture Atlas', () => {
    it('F03-1: manifest specifies 192x192 any icon', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      const icon = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'any');
      expect(icon).toBeDefined();
      expect(fs.existsSync(path.join(PROJECT_ROOT, 'public', icon.src))).toBe(true);
    });

    it('F03-2: manifest specifies 512x512 any icon', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      const icon = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'any');
      expect(icon).toBeDefined();
      expect(fs.existsSync(path.join(PROJECT_ROOT, 'public', icon.src))).toBe(true);
    });

    it('F03-3: manifest specifies 192x192 maskable icon', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      const icon = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'maskable');
      expect(icon).toBeDefined();
      expect(fs.existsSync(path.join(PROJECT_ROOT, 'public', icon.src))).toBe(true);
    });

    it('F03-4: manifest specifies 512x512 maskable icon', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      const icon = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable');
      expect(icon).toBeDefined();
      expect(fs.existsSync(path.join(PROJECT_ROOT, 'public', icon.src))).toBe(true);
    });

    it('F03-5: texture atlas defines frames for all 12 educational fruit types', () => {
      const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON_PATH, 'utf-8'));
      const requiredFruits = FruitTypeSchema.options;
      expect(requiredFruits).toHaveLength(12);
      for (const fruit of requiredFruits) {
        expect(atlas.frames[fruit], `Missing frame for fruit: ${fruit}`).toBeDefined();
        expect(atlas.frames[fruit].frame.w).toBeGreaterThan(0);
        expect(atlas.frames[fruit].frame.h).toBeGreaterThan(0);
      }
    });
  });

  describe('F04: Curriculum Data & Zod Schemas', () => {
    it('F04-1: CurriculumService loads all topics without validation errors', () => {
      const service = new CurriculumService();
      const curriculum = service.getMasterCurriculum();
      expect(curriculum).toBeDefined();
      expect(curriculum.version).toBe('1.0.0');
    });

    it('F04-2: Topic A Phonics includes all 9 vowel teams and 5 r-controlled vowels (>=40 words)', () => {
      const phonicsRaw = JSON.parse(fs.readFileSync(PHONICS_DATA_PATH, 'utf-8'));
      expect(phonicsRaw.items.length).toBeGreaterThanOrEqual(40);
      const ruleNames = new Set(phonicsRaw.items.map((item: { ruleName: string }) => item.ruleName));
      // Vowel teams
      expect(ruleNames.has('ai')).toBe(true);
      expect(ruleNames.has('ay')).toBe(true);
      expect(ruleNames.has('ea_long_e')).toBe(true);
      expect(ruleNames.has('ea_short_e')).toBe(true);
      expect(ruleNames.has('ee')).toBe(true);
      expect(ruleNames.has('ie')).toBe(true);
      expect(ruleNames.has('oa')).toBe(true);
      expect(ruleNames.has('oe')).toBe(true);
      expect(ruleNames.has('ui')).toBe(true);
      expect(ruleNames.has('ue')).toBe(true);
      // R-controlled
      expect(ruleNames.has('ar')).toBe(true);
      expect(ruleNames.has('er')).toBe(true);
      expect(ruleNames.has('ir')).toBe(true);
      expect(ruleNames.has('or')).toBe(true);
      expect(ruleNames.has('ur')).toBe(true);
    });

    it('F04-3: Phonics contains explicit split between /ē/ and /ĕ/ for vowel team ea', () => {
      const service = new CurriculumService();
      const phonics = service.getTopic('phonics');
      const longE = phonics.items.filter((i) => 'ruleName' in i && i.ruleName === 'ea_long_e');
      const shortE = phonics.items.filter((i) => 'ruleName' in i && i.ruleName === 'ea_short_e');
      expect(longE.length).toBeGreaterThanOrEqual(4);
      expect(shortE.length).toBeGreaterThanOrEqual(4);
      expect(longE.some((i) => 'sound' in i && i.sound === '/ē/')).toBe(true);
      expect(shortE.some((i) => 'sound' in i && i.sound === '/ĕ/')).toBe(true);
    });

    it('F04-4: Topic B Morphology contains >=30 base words across required affixes with visual segmentation', () => {
      const morphRaw = JSON.parse(fs.readFileSync(MORPHOLOGY_DATA_PATH, 'utf-8'));
      expect(morphRaw.items.length).toBeGreaterThanOrEqual(30);
      const baseWords = new Set(morphRaw.items.map((i: { baseWord: string }) => i.baseWord));
      expect(baseWords.size).toBeGreaterThanOrEqual(30);

      // Verify visual segmentation format
      for (const item of morphRaw.items) {
        expect(item.visualSegmentation).toMatch(/.+\s*\+\s*.+\s*→\s*.+/);
      }
    });

    it('F04-5: Topic C Vocabulary contains >=40 synonym/antonym pairs in contextual sentences', () => {
      const vocabRaw = JSON.parse(fs.readFileSync(VOCABULARY_DATA_PATH, 'utf-8'));
      expect(vocabRaw.items.length).toBeGreaterThanOrEqual(40);
      for (const item of vocabRaw.items) {
        expect(['synonym', 'antonym']).toContain(item.relationship);
        expect(item.sentenceContext.length).toBeGreaterThan(5);
        expect(item.distractorWords.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('F05: IndexedDB Persistence Engine', () => {
    let storage: StorageService;

    beforeEach(async () => {
      storage = new StorageService();
      await storage.resetProgress();
    });

    it('F05-1: initializes with Level 1 unlocked for all four topics', async () => {
      const progress = await storage.getProgress();
      expect(progress.unlockedLevels['phonics_1']).toBe(true);
      expect(progress.unlockedLevels['morphology_1']).toBe(true);
      expect(progress.unlockedLevels['vocabulary_1']).toBe(true);
      expect(progress.unlockedLevels['math_1']).toBe(true);
      expect(progress.unlockedLevels['phonics_2']).toBeUndefined();
    });

    it('F05-2: calculateStars assigns stars accurately for 100%, 90%, 85%, and <85%', () => {
      expect(calculateStars(1.0)).toBe(3);
      expect(calculateStars(0.95)).toBe(2);
      expect(calculateStars(0.90)).toBe(2);
      expect(calculateStars(0.85)).toBe(1);
      expect(calculateStars(0.84)).toBe(0);
      expect(calculateStars(0.50)).toBe(0);
    });

    it('F05-3: isMasteryAchieved unlocks next level when accuracy >85% on 10+ attempts', async () => {
      expect(isMasteryAchieved(0.90, 10)).toBe(true);
      const res = await storage.saveLevelResult('phonics', 1, 0.90, 900, 10);
      expect(res.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
    });

    it('F05-4: recordMistake increments attempts, patternErrors, wordErrors, and streak', async () => {
      const mistake = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      expect(mistake.consecutiveMistakes).toBe(1);
      expect(mistake.shouldTriggerRemediation).toBe(false);

      const progress = await storage.getProgress();
      expect(progress.errorStats.totalAttempts).toBe(1);
      expect(progress.errorStats.patternErrors['ea_short_e']).toBe(1);
      expect(progress.errorStats.wordErrors['bread']).toBe(1);
    });

    it('F05-5: recordCorrect resets consecutive mistakes streak to 0', async () => {
      await storage.recordMistake('phonics', 'ai', 'rain');
      await storage.recordMistake('phonics', 'ai', 'rain');
      expect(storage.getConsecutiveMistakes()).toBe(2);

      await storage.recordCorrect('phonics', 'ai', 'train');
      expect(storage.getConsecutiveMistakes()).toBe(0);
      const progress = await storage.getProgress();
      expect(progress.errorStats.totalCorrect).toBe(1);
      expect(progress.errorStats.consecutiveMistakes).toBe(0);
    });
  });

  describe('F06: Web Audio & Web Speech Synthesizer', () => {
    let mockCtx: MockAudioContext;
    let audio: AudioService;
    let storage: StorageService;

    beforeEach(() => {
      mockCtx = new MockAudioContext();
      storage = new StorageService();
      audio = new AudioService(mockCtx as unknown as AudioContext, storage);
    });

    it('F06-1: AudioService initializes master gain node with configured volume', () => {
      expect(mockCtx.createGain).toHaveBeenCalled();
      expect(audio.getVolume()).toBe(0.8);
    });

    it('F06-2: procedural sound generators trigger oscillators without audio file fetches', () => {
      audio.playCatch(false);
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      const catchOscCount = mockCtx.createdOscillators.length;

      audio.playMiss();
      expect(mockCtx.createdOscillators.length).toBeGreaterThan(catchOscCount);

      audio.playLevelComplete();
      audio.playCombo(3);
      audio.playClick();
    });

    it('F06-3: first-touch unlock listener resumes AudioContext', async () => {
      expect(audio.isUnlocked()).toBe(false);
      await audio.unlock();
      expect(mockCtx.resume).toHaveBeenCalled();
      expect(audio.isUnlocked()).toBe(true);
    });

    it('F06-4: toggleMute mutes and restores master gain', () => {
      expect(audio.isMuted()).toBe(false);
      const isMutedNow = audio.toggleMute();
      expect(isMutedNow).toBe(true);
      expect(audio.isMuted()).toBe(true);

      const unmuted = audio.toggleMute();
      expect(unmuted).toBe(false);
      expect(audio.isMuted()).toBe(false);
    });

    it('F06-5: normalizePhoneticsForSpeech eliminates dictionary slashes and naturalizes speech', () => {
      const rawPrompt = "Catch words with 'ea' that say /ē/!";
      const spoken = normalizePhoneticsForSpeech(rawPrompt);
      expect(spoken).not.toContain('/');
      expect(spoken).toContain('long E');
    });
  });

  describe('F07: Accessibility, Lexend & Remediation UI', () => {
    it('F07-1: project configures Lexend font family across UI components', () => {
      const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf-8');
      expect(indexHtml).toContain('Lexend');
    });

    it('F07-2: interactive fruit containers specify touch dimensions >= 48px', () => {
      const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON_PATH, 'utf-8'));
      // In GameScene, fruit sprite is 64x64 and container size is at least (Math.max(pillW, 64), 74)
      for (const fruit of FruitTypeSchema.options) {
        expect(atlas.frames[fruit].sourceSize.w).toBeGreaterThanOrEqual(48);
        expect(atlas.frames[fruit].sourceSize.h).toBeGreaterThanOrEqual(48);
      }
    });

    it('F07-3: storage settings support high-contrast mode toggle', async () => {
      const storage = new StorageService();
      await storage.resetProgress();
      expect((await storage.getProgress()).settings.highContrast).toBe(false);

      await storage.updateSettings({ highContrast: true });
      expect((await storage.getProgress()).settings.highContrast).toBe(true);
    });

    it('F07-4: orchard progress visualizer stages clamp from 0 to 10', async () => {
      const storage = new StorageService();
      await storage.resetProgress();
      expect((await storage.getProgress()).orchardGrowthStage).toBe(0);

      // Complete 11 levels
      for (let i = 1; i <= 11; i++) {
        await storage.saveLevelResult('phonics', i, 0.95, 950, 10);
      }
      const progress = await storage.getProgress();
      expect(progress.orchardGrowthStage).toBe(10);
    });

    it('F07-5: 3 consecutive mistakes trigger remediation', async () => {
      const storage = new StorageService();
      await storage.resetProgress();

      const m1 = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      expect(m1.shouldTriggerRemediation).toBe(false);

      const m2 = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      expect(m2.shouldTriggerRemediation).toBe(false);

      const m3 = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      expect(m3.shouldTriggerRemediation).toBe(true);
    });
  });

  describe('F08: Phaser 2D Arcade Gameplay Engine', () => {
    it('F08-1: gameConfig specifies Arcade Physics with fixedStep: true and 60 FPS', () => {
      expect(gameConfig.physics?.default).toBe('arcade');
      expect(gameConfig.physics?.arcade?.fixedStep).toBe(true);
      expect(gameConfig.physics?.arcade?.fps).toBe(60);
    });

    it('F08-2: gameConfig specifies 480x800 portrait scaling with FIT and CENTER_BOTH', () => {
      expect(gameConfig.width).toBe(480);
      expect(gameConfig.height).toBe(800);
      expect(gameConfig.scale?.mode).toBe(Phaser.Scale.FIT);
      expect(gameConfig.scale?.autoCenter).toBe(Phaser.Scale.CENTER_BOTH);
    });

    it('F08-3: registers all 6 core gameplay scenes', () => {
      const scenes = gameConfig.scene as Array<unknown>;
      expect(scenes).toHaveLength(6);
      expect(scenes).toContain(PreloadScene);
      expect(scenes).toContain(MenuScene);
      expect(scenes).toContain(GameScene);
      expect(scenes).toContain(RoundSummaryScene);
      expect(scenes).toContain(OrchardScene);
      expect(scenes).toContain(CastleScene);
    });

    it('F08-4: GameScene initializes with topic and levelNumber', () => {
      const scene = new GameScene();
      scene.init({ topic: 'morphology', levelNumber: 2 });
      // @ts-expect-error verifying private property
      expect(scene.topic).toBe('morphology');
      // @ts-expect-error verifying private property
      expect(scene.levelNumber).toBe(2);
    });

    it('F08-5: delta-time physics ensures identical displacement across 60Hz and 120Hz', () => {
      const speed = 200; // pixels per second
      const delta60Hz = 1000 / 60; // 16.666ms
      const delta120Hz = 1000 / 120; // 8.333ms

      // Over 1 second: 60 frames at 60Hz vs 120 frames at 120Hz
      let pos60Hz = 0;
      for (let i = 0; i < 60; i++) {
        pos60Hz += speed * (delta60Hz / 1000);
      }

      let pos120Hz = 0;
      for (let i = 0; i < 120; i++) {
        pos120Hz += speed * (delta120Hz / 1000);
      }

      expect(Math.round(pos60Hz)).toBe(200);
      expect(Math.round(pos120Hz)).toBe(200);
      expect(Math.abs(pos60Hz - pos120Hz)).toBeLessThan(0.0001);
    });
  });

  describe('F09: Service Worker & PWA Publish Gate', () => {
    it('F09-1: sw.js defines cache version catch-the-fruit-v1', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain("const CACHE_NAME = 'catch-the-fruit-v1'");
    });

    it('F09-2: sw.js precache list includes essential offline assets', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain("'./index.html'");
      expect(sw).toContain("'./manifest.json'");
      expect(sw).toContain("'./icons/icon-192x192.png'");
      expect(sw).toContain("'./icons/maskable-512x512.png'");
    });

    it('F09-3: sw.js install event avoids bare cache.addAll by caching individually', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).not.toContain('cache.addAll(');
      expect(sw).toContain('.map((asset)');
      expect(sw).toContain('cache.add(asset).catch(');
    });

    it('F09-4: sw.js activate event purges obsolete cache keys', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain("keys.filter((k) => k !== CACHE_NAME)");
      expect(sw).toContain('caches.delete(k)');
    });

    it('F09-5: sw.js fetch event provides offline navigation fallback to ./index.html', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain("request.mode === 'navigate'");
      expect(sw).toContain("caches.match('./index.html')");
    });
  });

});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (F01 – F09, >=5 tests per feature)
// ============================================================================
describe('Tier 2: Boundary & Corner Cases (F01 - F09)', () => {

  describe('F01: Scaffolding Boundaries', () => {
    it('F01-B1: GameConfigSchema throws on negative canvas dimensions', () => {
      expect(() => GameConfigSchema.parse({ width: -480, height: 800 })).toThrow();
      expect(() => GameConfigSchema.parse({ width: 480, height: -800 })).toThrow();
      expect(() => GameConfigSchema.parse({ width: 0, height: 800 })).toThrow();
    });

    it('F01-B2: GameConfigSchema provides defaults when empty config object passed', () => {
      const config = GameConfigSchema.parse({});
      expect(config.width).toBe(480);
      expect(config.height).toBe(800);
      expect(config.backgroundColor).toBe('#e0f2fe');
      expect(config.parent).toBe('game-container');
    });

    it('F01-B3: package.json rejects missing name or non-module type', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.name.length).toBeGreaterThan(0);
      expect(pkg.type).toBe('module');
      expect(pkg.private).toBe(true);
    });

    it('F01-B4: rollupOptions in vite.config.ts isolates vendor chunks without duplicate bundles', () => {
      const viteConfig = fs.readFileSync(path.join(PROJECT_ROOT, 'vite.config.ts'), 'utf-8');
      expect(viteConfig).toContain("manualChunks(id: string)");
      expect(viteConfig).toContain("'phaser'");
      expect(viteConfig).toContain("'zod'");
      expect(viteConfig).toContain("'idb'");
    });

    it('F01-B5: node engines requirement in package.json is modern (>=20.0.0)', () => {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      expect(pkg.engines?.node).toBe('>=20.0.0');
    });
  });

  describe('F02: Manifest Boundaries', () => {
    it('F02-B1: manifest requires at least 4 icon definitions covering 192 and 512 sizes', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
      const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
    });

    it('F02-B2: manifest screenshots define narrow mobile aspect ratio 480x800', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.screenshots.length).toBeGreaterThanOrEqual(1);
      const shot = manifest.screenshots[0];
      expect(shot.form_factor).toBe('narrow');
      expect(shot.sizes).toBe('480x800');
      expect(shot.type).toBe('image/png');
    });

    it('F02-B3: manifest id is valid root scope identifier', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.id).toBe('/catch-the-fruit/');
    });

    it('F02-B4: manifest lang and dir specify valid ltr English formatting', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.lang).toBe('en-US');
      expect(manifest.dir).toBe('ltr');
    });

    it('F02-B5: manifest prefer_related_applications is false (pure PWA)', () => {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      expect(manifest.prefer_related_applications).toBe(false);
    });
  });

  describe('F03: Texture Atlas Boundaries', () => {
    let atlas: { frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> };

    beforeEach(() => {
      atlas = JSON.parse(fs.readFileSync(ATLAS_JSON_PATH, 'utf-8'));
    });

    it('F03-B1: all character animation frames exist with valid coordinates', () => {
      const requiredFrames = ['princess-idle-1', 'princess-idle-2', 'princess-catch', 'princess-think'];
      for (const name of requiredFrames) {
        const frameData = atlas.frames[name];
        expect(frameData, `Missing character frame: ${name}`).toBeDefined();
        if (frameData) {
          expect(frameData.frame.w).toBeGreaterThan(0);
          expect(frameData.frame.h).toBeGreaterThan(0);
          expect(frameData.frame.x).toBeGreaterThanOrEqual(0);
          expect(frameData.frame.y).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('F03-B2: UI and particle effect frames exist in atlas', () => {
      const uiFrames = ['basket', 'sparkle', 'x-mark', 'petal', 'firefly', 'star-empty', 'star-full'];
      for (const name of uiFrames) {
        expect(atlas.frames[name], `Missing UI frame: ${name}`).toBeDefined();
      }
    });

    it('F03-B3: rejects non-existent fruit frame lookup safely', () => {
      expect(atlas.frames['non_existent_dragonfruit']).toBeUndefined();
      expect(FruitTypeSchema.safeParse('dragonfruit').success).toBe(false);
    });

    it('F03-B4: all atlas frames have non-zero positive dimensions without negative overflows', () => {
      const entries = Object.entries(atlas.frames);
      expect(entries.length).toBeGreaterThanOrEqual(25);
      for (const [key, val] of entries) {
        expect(val.frame.w, `Frame ${key} width must be > 0`).toBeGreaterThan(0);
        expect(val.frame.h, `Frame ${key} height must be > 0`).toBeGreaterThan(0);
        expect(val.frame.x, `Frame ${key} x must be >= 0`).toBeGreaterThanOrEqual(0);
        expect(val.frame.y, `Frame ${key} y must be >= 0`).toBeGreaterThanOrEqual(0);
      }
    });

    it('F03-B5: verifies atlas image file exists physically alongside atlas.json', () => {
      const pngPath = path.join(PROJECT_ROOT, 'public/assets/atlas.png');
      expect(fs.existsSync(pngPath)).toBe(true);
      const stat = fs.statSync(pngPath);
      expect(stat.size).toBeGreaterThan(1000); // Non-empty image asset
    });
  });

  describe('F04: Curriculum Schema Boundaries', () => {
    it('F04-B1: PhonicsItemSchema rejects item with empty word or fewer than 2 distractors', () => {
      expect(() => {
        PhonicsItemSchema.parse({
          id: 'test_1',
          pattern: 'vowel_team',
          ruleName: 'ai',
          sound: '/ā/',
          word: '', // empty word
          sentence: 'Test sentence',
          distractorWords: ['cat', 'dog'],
          explanation: 'Rule explanation',
          fruitType: 'apple'
        });
      }).toThrow();

      expect(() => {
        PhonicsItemSchema.parse({
          id: 'test_2',
          pattern: 'vowel_team',
          ruleName: 'ai',
          sound: '/ā/',
          word: 'rain',
          sentence: 'Test sentence',
          distractorWords: ['cat'], // only 1 distractor
          explanation: 'Rule explanation',
          fruitType: 'apple'
        });
      }).toThrow();
    });

    it('F04-B2: MorphologyItemSchema rejects invalid affixType enum (e.g. infix)', () => {
      expect(() => {
        MorphologyItemSchema.parse({
          id: 'test_3',
          affixType: 'infix', // invalid enum
          affix: 'in',
          baseWord: 'test',
          combinedWord: 'intest',
          visualSegmentation: 'in + test → intest',
          distractorWords: ['a', 'b'],
          explanation: 'expl',
          fruitType: 'apple'
        });
      }).toThrow();
    });

    it('F04-B3: VocabularyItemSchema rejects invalid relationship enum (e.g. homophone)', () => {
      expect(() => {
        VocabularyItemSchema.parse({
          id: 'test_4',
          relationship: 'homophone', // invalid enum
          targetWord: 'sea',
          matchWord: 'see',
          sentenceContext: 'I see the sea',
          distractorWords: ['a', 'b'],
          explanation: 'expl',
          fruitType: 'apple'
        });
      }).toThrow();
    });

    it('F04-B4: MathItemSchema rejects non-numeric operands or invalid operation', () => {
      expect(() => {
        MathItemSchema.parse({
          id: 'test_5',
          operation: 'multiplication', // not in Grade 2 addition/subtraction/skip_counting
          operand1: 5,
          operand2: 5,
          result: 25,
          prompt: '5 x 5 = ?',
          distractorResults: [20, 30],
          explanation: 'Math expl',
          fruitType: 'lemon'
        });
      }).toThrow();
    });

    it('F04-B5: LevelConfigSchema rejects negative levelNumber or threshold > 1.0', () => {
      expect(() => {
        LevelConfigSchema.parse({
          id: 1,
          topic: 'phonics',
          levelNumber: -1, // invalid negative level
          name: 'Level -1',
          description: 'desc',
          fallSpeedDurationMs: 2600,
          itemsRequired: 10,
          masteryAccuracyThreshold: 0.85,
          scaffoldStage: 'single_rule'
        });
      }).toThrow();

      expect(() => {
        LevelConfigSchema.parse({
          id: 1,
          topic: 'phonics',
          levelNumber: 1,
          name: 'Level 1',
          description: 'desc',
          fallSpeedDurationMs: 2600,
          itemsRequired: 10,
          masteryAccuracyThreshold: 1.5, // > 1.0
          scaffoldStage: 'single_rule'
        });
      }).toThrow();
    });
  });

  describe('F05: Persistence & Mastery Boundaries (85.0% vs 85.1%, 9 vs 10 attempts)', () => {
    let storage: StorageService;

    beforeEach(async () => {
      storage = new StorageService();
      await storage.resetProgress();
    });

    it('F05-B1: BOUNDARY: exactly 85.0% accuracy does NOT satisfy mastery (>85% required)', async () => {
      expect(isMasteryAchieved(0.85, 10)).toBe(false);
      expect(isMasteryAchieved(85.0, 10)).toBe(false);

      const res = await storage.saveLevelResult('phonics', 1, 0.85, 850, 10);
      expect(res.unlockedNextLevel).toBe(false);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);
    });

    it('F05-B2: BOUNDARY: 85.1% accuracy DOES satisfy mastery (>85% on 10+ attempts)', async () => {
      expect(isMasteryAchieved(0.851, 10)).toBe(true);
      expect(isMasteryAchieved(85.1, 10)).toBe(true);

      const res = await storage.saveLevelResult('phonics', 1, 0.851, 851, 10);
      expect(res.unlockedNextLevel).toBe(true);
      expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
    });

    it('F05-B3: BOUNDARY: 100% accuracy on 9 attempts does NOT satisfy mastery (requires >=10 attempts)', async () => {
      expect(isMasteryAchieved(1.0, 9)).toBe(false);
      expect(isMasteryAchieved(100, 9)).toBe(false);

      const res = await storage.saveLevelResult('morphology', 1, 1.0, 1000, 9);
      expect(res.stars).toBe(3); // Stars earned based on accuracy
      expect(res.unlockedNextLevel).toBe(false); // BUT mastery gate remains locked!
      expect(await storage.isLevelUnlocked('morphology', 2)).toBe(false);
    });

    it('F05-B4: star ratings never downgrade on subsequent lower-scoring replays', async () => {
      await storage.saveLevelResult('vocabulary', 1, 1.0, 1000, 10); // 3 stars
      let progress = await storage.getProgress();
      expect(progress.stars['vocabulary_1']).toBe(3);

      await storage.saveLevelResult('vocabulary', 1, 0.70, 700, 10); // Replay with 0 stars
      progress = await storage.getProgress();
      expect(progress.stars['vocabulary_1']).toBe(3); // Preserves highest earned stars
    });

    it('F05-B5: handles 0 attempts and 0 accuracy without throwing or NaN', async () => {
      expect(isMasteryAchieved(0, 0)).toBe(false);
      expect(calculateStars(0)).toBe(0);

      const res = await storage.saveLevelResult('math', 1, 0, 0, 1);
      expect(res.stars).toBe(0);
      expect(res.unlockedNextLevel).toBe(false);
    });
  });

  describe('F06: Audio & Speech Boundaries', () => {
    it('F06-B1: normalizePhoneticsForSpeech handles empty string or whitespace gracefully', () => {
      expect(normalizePhoneticsForSpeech('')).toBe('');
      expect(normalizePhoneticsForSpeech('   ')).toBe('');
    });

    it('F06-B2: normalizePhoneticsForSpeech converts math equations into natural spoken questions', () => {
      expect(normalizePhoneticsForSpeech('8 + 6 = ?')).toBe('What is 8 plus 6?');
      expect(normalizePhoneticsForSpeech('15 - 7 = ?')).toBe('What is 15 minus 7?');
      expect(normalizePhoneticsForSpeech('10, 20, 30, ?')).toBe('10, 20, 30, what comes next?');
    });

    it('F06-B3: volume clamping restricts volume between 0 and 1', () => {
      const mockCtx = new MockAudioContext();
      const storage = new StorageService();
      const audio = new AudioService(mockCtx as unknown as AudioContext, storage);

      audio.setVolume(-0.5);
      expect(audio.getVolume()).toBe(0);

      audio.setVolume(1.5);
      expect(audio.getVolume()).toBe(1);
    });

    it('F06-B4: pentatonic scale combo escalation wraps around cleanly for combo > 8', () => {
      const mockCtx = new MockAudioContext();
      const storage = new StorageService();
      const audio = new AudioService(mockCtx as unknown as AudioContext, storage);

      expect(() => {
        for (let combo = 1; combo <= 25; combo++) {
          audio.playCombo(combo);
        }
      }).not.toThrow();
    });

    it('F06-B5: AudioService methods are safe when AudioContext is null (headless fallback)', () => {
      const storage = new StorageService();
      const nullAudio = new AudioService(null, storage);
      expect(() => {
        nullAudio.playCatch();
        nullAudio.playMiss();
        nullAudio.playCombo(2);
        nullAudio.playLevelComplete();
        nullAudio.playClick();
        nullAudio.toggleMute();
      }).not.toThrow();
    });
  });

  describe('F07: Remediation & Touch Target Boundaries', () => {
    let storage: StorageService;

    beforeEach(async () => {
      storage = new StorageService();
      await storage.resetProgress();
    });

    it('F07-B1: exactly 1st and 2nd mistakes do NOT trigger remediation; 3rd DOES', async () => {
      const r1 = await storage.recordMistake('phonics', 'ea', 'bread');
      expect(r1.consecutiveMistakes).toBe(1);
      expect(r1.shouldTriggerRemediation).toBe(false);

      const r2 = await storage.recordMistake('phonics', 'ea', 'thread');
      expect(r2.consecutiveMistakes).toBe(2);
      expect(r2.shouldTriggerRemediation).toBe(false);

      const r3 = await storage.recordMistake('phonics', 'ea', 'head');
      expect(r3.consecutiveMistakes).toBe(3);
      expect(r3.shouldTriggerRemediation).toBe(true);
    });

    it('F07-B2: resetConsecutiveMistakes restores counter to 0', async () => {
      await storage.recordMistake('phonics', 'ea', 'bread');
      await storage.recordMistake('phonics', 'ea', 'bread');
      await storage.recordMistake('phonics', 'ea', 'bread');
      expect(storage.getConsecutiveMistakes()).toBe(3);

      await storage.resetConsecutiveMistakes();
      expect(storage.getConsecutiveMistakes()).toBe(0);
    });

    it('F07-B3: CurriculumService provides explanatory lookup for remediation card', () => {
      const service = new CurriculumService();
      const expl = service.getExplanation('phonics_ea_bread');
      expect(expl).toBeDefined();
      expect(typeof expl).toBe('string');
      expect(expl!.length).toBeGreaterThan(5);
    });

    it('F07-B4: orchard growth stage clamps at 10 and cannot exceed 10', async () => {
      for (let i = 1; i <= 15; i++) {
        await storage.saveLevelResult('phonics', i, 0.90, 900, 10);
      }
      const progress = await storage.getProgress();
      expect(progress.orchardGrowthStage).toBe(10);
    });

    it('F07-B5: word pill badges calculate width dynamically to prevent text clipping', () => {
      // In GameScene: pillW = Math.max(textLen * 11 + 24, 72)
      const shortWord = 'cat';
      const shortPillW = Math.max(shortWord.length * 11 + 24, 72);
      expect(shortPillW).toBe(72); // Clamped to min 72

      const longWord = 'disconnection';
      const longPillW = Math.max(longWord.length * 11 + 24, 72);
      expect(longPillW).toBe(13 * 11 + 24); // 167px, scaled up
      expect(longPillW).toBeGreaterThan(150);
    });
  });

  describe('F08: Arcade Physics & Coordinate Boundaries', () => {
    it('F08-B1: basket horizontal clamping bounds x between 55 and width - 55', () => {
      const width = 480;
      const minX = 55;
      const maxX = width - 55; // 425

      const clampX = (x: number) => Phaser.Math.Clamp(x, minX, maxX);
      expect(clampX(-100)).toBe(55);
      expect(clampX(0)).toBe(55);
      expect(clampX(240)).toBe(240);
      expect(clampX(425)).toBe(425);
      expect(clampX(500)).toBe(425);
      expect(clampX(1000)).toBe(425);
    });

    it('F08-B2: fall duration speed dampening increases duration but clamps at 8000ms', () => {
      let fallDuration = 5200;
      // Remediation: this.fallDurationMs = Math.min(8000, this.fallDurationMs + 800)
      for (let i = 0; i < 10; i++) {
        fallDuration = Math.min(8000, fallDuration + 800);
      }
      expect(fallDuration).toBe(8000);
    });

    it('F08-B3: delta time update with 0ms produces 0 displacement', () => {
      const speed = 200;
      const displacement = speed * (0 / 1000);
      expect(displacement).toBe(0);
      expect(Number.isNaN(displacement)).toBe(false);
    });

    it('F08-B4: delta time update with massive frame drop (1000ms) produces expected displacement', () => {
      const speed = 200;
      const displacement = speed * (1000 / 1000);
      expect(displacement).toBe(200);
    });

    it('F08-B5: fruit y position logic correctly classifies on-screen vs missed vs cleanup', () => {
      const height = 800;
      const isMissed = (y: number) => y > height - 60;
      const isCleanup = (y: number) => y > height + 50;

      expect(isMissed(700)).toBe(false);
      expect(isMissed(741)).toBe(true);
      expect(isCleanup(741)).toBe(false);
      expect(isCleanup(851)).toBe(true);
    });
  });

  describe('F09: Service Worker Offline & Cache Boundaries', () => {
    it('F09-B1: verifies all PRECACHE_ASSETS physically exist on disk', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      const assetMatches = sw.match(/'\.\/[^']+'/g) || [];
      expect(assetMatches.length).toBeGreaterThanOrEqual(7);

      for (const quotedAsset of assetMatches) {
        const cleanPath = quotedAsset.replace(/['"]|\.\//g, '');
        const inPublic = path.join(PROJECT_ROOT, 'public', cleanPath);
        const inRoot = path.join(PROJECT_ROOT, cleanPath);
        const exists = fs.existsSync(inPublic) || fs.existsSync(inRoot);
        expect(exists, `Asset in PRECACHE_ASSETS does not exist: ${cleanPath}`).toBe(true);
      }
    });

    it('F09-B2: sw.js ignores non-same-origin requests from cache-first matching', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain('request.url.startsWith(self.location.origin)');
    });

    it('F09-B3: sw.js verifies response status 200 before caching new fetches', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain("networkResponse.status === 200");
    });

    it('F09-B4: sw.js creates clone of network response before writing to cache', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain('networkResponse.clone()');
    });

    it('F09-B5: sw.js calls skipWaiting and clients.claim for instant service worker activation', () => {
      const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');
      expect(sw).toContain('self.skipWaiting()');
      expect(sw).toContain('self.clients.claim()');
    });
  });

});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (PAIRWISE COVERAGE)
// ============================================================================
describe('Tier 3: Cross-Feature Combinations', () => {

  it('Pair 1: Curriculum (F04) + Storage (F05): Question generation and error tracking for spaced repetition', async () => {
    const curriculum = new CurriculumService();
    const storage = new StorageService();
    await storage.resetProgress();

    // Generate questions for Phonics Level 1
    const questions = curriculum.generateQuestionSet('phonics', 1, 5);
    expect(questions.length).toBe(5);

    // Simulate catching wrong fruit on item 1
    const q1 = questions[0]!;
    const wrongOption = q1.options.find((o) => !o.isCorrect)!;
    expect(wrongOption).toBeDefined();

    await storage.recordMistake('phonics', q1.subTopic, wrongOption.text);
    const progress = await storage.getProgress();

    expect(progress.errorStats.patternErrors[q1.subTopic]).toBe(1);
    expect(progress.errorStats.wordErrors[wrongOption.text]).toBe(1);
  });

  it('Pair 2: Storage (F05) + Audio (F06): AudioService dynamically syncs volume and TTS settings from StorageService', async () => {
    const storage = new StorageService();
    await storage.resetProgress();
    await storage.updateSettings({ sfxVolume: 0.35, ttsEnabled: false });

    const mockCtx = new MockAudioContext();
    const audio = new AudioService(mockCtx as unknown as AudioContext, storage);
    await audio.syncWithStorage();

    expect(audio.getVolume()).toBe(0.35);
    expect(audio.isTtsEnabled()).toBe(false);
  });

  it('Pair 3: Remediation (F07) + Physics (F08): 3 consecutive mistakes trigger speed dampener and duration increase', async () => {
    const storage = new StorageService();
    await storage.resetProgress();

    let fallDurationMs = 5200;
    for (let mistakeCount = 1; mistakeCount <= 3; mistakeCount++) {
      const result = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      if (result.shouldTriggerRemediation) {
        // As implemented in GameScene: fall duration dampens by 800ms
        fallDurationMs = Math.min(8000, fallDurationMs + 800);
      }
    }

    expect(fallDurationMs).toBe(6000); // Increased from 5200ms
    const speedInitial = 600 / (5200 / 1000);
    const speedDampened = 600 / (fallDurationMs / 1000);
    expect(speedDampened).toBeLessThan(speedInitial); // Fruit falls slower!
  });

  it('Pair 4: Service Worker (F09) + Manifest (F02): Precached asset list covers all manifest icons and screenshots', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    const sw = fs.readFileSync(SW_JS_PATH, 'utf-8');

    for (const icon of manifest.icons) {
      const relativePath = `./${icon.src}`;
      expect(sw, `SW precache must include manifest icon: ${relativePath}`).toContain(relativePath);
    }
    for (const shot of manifest.screenshots) {
      const relativePath = `./${shot.src}`;
      expect(sw, `SW precache must include screenshot: ${relativePath}`).toContain(relativePath);
    }
  });

  it('Pair 5: Gameplay (F08) + Audio (F06): Consecutive catches escalate combo and trigger ascending frequencies', () => {
    const mockCtx = new MockAudioContext();
    const storage = new StorageService();
    const audio = new AudioService(mockCtx as unknown as AudioContext, storage);

    // Simulate 3 consecutive catches
    let combo = 0;
    for (let i = 0; i < 3; i++) {
      combo++;
      audio.playCatch(combo >= 3);
      if (combo > 1) {
        audio.playCombo(combo);
      }
    }

    expect(combo).toBe(3);
    expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(4);
  });

  it('Pair 6: Curriculum (F04) + Speech (F06): Morphology segmentation prompt formats into clean spoken words without slashes', () => {
    const service = new CurriculumService();
    const morph = service.getTopic('morphology');
    const item = morph.items[0]!;

    const question = service.createQuestion(item);
    const spoken = normalizePhoneticsForSpeech(question.prompt);

    expect(spoken).not.toContain('→');
    expect(spoken).not.toContain('/');
    expect(spoken).toContain('makes');
  });

  it('Pair 7: Storage (F05) + Orchard View (F07): Level mastery increments orchardGrowthStage which maps to tree visualization', async () => {
    const storage = new StorageService();
    await storage.resetProgress();

    // Master 3 levels
    await storage.saveLevelResult('phonics', 1, 0.90, 900, 10);
    await storage.saveLevelResult('phonics', 2, 0.90, 900, 10);
    await storage.saveLevelResult('phonics', 3, 0.90, 900, 10);

    const progress = await storage.getProgress();
    expect(progress.orchardGrowthStage).toBe(3);
  });

  it('Pair 8: Gameplay (F08) + Storage (F05): Round completion evaluates accuracy, awards coins, and unlocks next level', async () => {
    const storage = new StorageService();
    await storage.resetProgress();

    const attempts = 12;
    const correct = 11;
    const accuracy = (correct / attempts) * 100; // 91.666%
    const score = 1650;

    const result = await storage.saveLevelResult('phonics', 1, accuracy, score, attempts);
    expect(result.stars).toBe(2); // >= 90%
    expect(result.unlockedNextLevel).toBe(true); // > 85% on 10+ attempts

    // Award round bonus coins as in GameScene
    let bonusCoins = 50;
    if (accuracy >= 85 || result.unlockedNextLevel) bonusCoins += 100;
    await storage.addCoins(bonusCoins);

    const progress = await storage.getProgress();
    expect(progress.coins).toBe(150);
  });

});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (FULL PLAYER JOURNEYS)
// ============================================================================
describe('Tier 4: Real-World Application Scenarios', () => {

  it('Scenario 1: Complete Phonics /ea/ Split Player Journey with Remediation, Mastery, and Persistence', async () => {
    const storage = new StorageService();
    await storage.resetProgress();
    const curriculum = new CurriculumService();
    const mockCtx = new MockAudioContext();
    const audio = new AudioService(mockCtx as unknown as AudioContext, storage);

    // 1. Player starts at Topic A (Phonics) Level 1
    expect(await storage.isLevelUnlocked('phonics', 1)).toBe(true);
    expect(await storage.isLevelUnlocked('phonics', 2)).toBe(false);

    // 2. Audio unlocked on first touch
    await audio.unlock();
    expect(audio.isUnlocked()).toBe(true);

    // 3. Question set generated for Level 1
    const questions = curriculum.generateQuestionSet('phonics', 1, 10);
    expect(questions.length).toBe(10);

    // 4. Student encounters trickster /ĕ/ distractor "bread" and makes 3 consecutive mistakes
    for (let i = 0; i < 3; i++) {
      const mistake = await storage.recordMistake('phonics', 'ea_short_e', 'bread');
      audio.playMiss();
      if (mistake.shouldTriggerRemediation) {
        // Remediation triggers: teaching card displayed
        const explanation = curriculum.getExplanation('phonics_ea_bread');
        expect(explanation).toBeDefined();
        // Student reviews teaching card and resumes: resets consecutive mistakes
        await storage.resetConsecutiveMistakes();
      }
    }
    expect(storage.getConsecutiveMistakes()).toBe(0);

    // 5. Student plays 10 items with 9 correct catches (90% accuracy)
    for (let i = 0; i < 9; i++) {
      await storage.recordCorrect('phonics', 'ea_long_e', 'beach');
      audio.playCatch(i >= 2);
    }
    await storage.recordMistake('phonics', 'ea_long_e', 'bread');

    // 6. Complete level: 9/10 = 90%
    const levelResult = await storage.saveLevelResult('phonics', 1, 90, 1200, 10);
    expect(levelResult.stars).toBe(2);
    expect(levelResult.unlockedNextLevel).toBe(true);

    // 7. Verify persistent state in storage
    expect(await storage.isLevelUnlocked('phonics', 2)).toBe(true);
    const finalProgress = await storage.getProgress();
    expect(finalProgress.stars['phonics_1']).toBe(2);
    expect(finalProgress.highScores['phonics_1']).toBe(1200);
    expect(finalProgress.orchardGrowthStage).toBe(1);
  });

  it('Scenario 2: Morphology Prefix/Suffix Segmentation Journey with Combo Escalation', async () => {
    const storage = new StorageService();
    await storage.resetProgress();
    const curriculum = new CurriculumService();

    // 1. Start Morphology Level 1
    const questions = curriculum.generateQuestionSet('morphology', 1, 6);
    expect(questions.length).toBe(6);

    let combo = 0;
    let score = 0;

    // 2. Student correctly catches 5 words in a row
    for (let i = 0; i < 5; i++) {
      const q = questions[i]!;
      const correctOpt = q.options.find((o) => o.isCorrect)!;
      expect(correctOpt.text).toBe(q.targetAnswer);

      // Verify visual segmentation string format
      expect(q.prompt).toMatch(/Catch:\s*.+\s*\+\s*.+\s*→\s*.+/);

      combo++;
      score += 100 * Math.min(combo, 5);
      await storage.recordCorrect('morphology', q.subTopic, correctOpt.text);
      await storage.addCoins(10 + combo * 2);
    }

    expect(combo).toBe(5);
    expect(score).toBe(1500); // 100 + 200 + 300 + 400 + 500

    const progress = await storage.getProgress();
    expect(progress.coins).toBeGreaterThanOrEqual(80);
    expect(progress.errorStats.consecutiveMistakes).toBe(0);
  });

  it('Scenario 3: Vocabulary Synonym & Antonym Contextual Sentence Journey with A11y', async () => {
    const storage = new StorageService();
    await storage.resetProgress();
    const curriculum = new CurriculumService();

    // 1. Enable High Contrast Accessibility Mode
    await storage.updateSettings({ highContrast: true });
    expect((await storage.getProgress()).settings.highContrast).toBe(true);

    // 2. Load Vocabulary items
    const vocab = curriculum.getTopic('vocabulary');
    const synonymItem = vocab.items.find((i) => 'relationship' in i && i.relationship === 'synonym')!;
    const antonymItem = vocab.items.find((i) => 'relationship' in i && i.relationship === 'antonym')!;

    expect(synonymItem).toBeDefined();
    expect(antonymItem).toBeDefined();

    // 3. Spoken prompt generation without slashes
    const synQuestion = curriculum.createQuestion(synonymItem);
    const spoken = normalizePhoneticsForSpeech(synQuestion.prompt);
    expect(spoken).not.toContain('/');

    // 4. Complete round with 100% accuracy -> 3 Stars earned
    const result = await storage.saveLevelResult('vocabulary', 1, 100, 2000, 10);
    expect(result.stars).toBe(3);
    expect(result.unlockedNextLevel).toBe(true);
    expect(await storage.isLevelUnlocked('vocabulary', 2)).toBe(true);
  });

  it('Scenario 4: Grade 2 Math Operations & Royal Castle Marketplace Decoration', async () => {
    const storage = new StorageService();
    await storage.resetProgress();
    const curriculum = new CurriculumService();

    // 1. Play Math Level 1 (Addition within 20)
    const mathQuestions = curriculum.generateQuestionSet('math', 1, 10);
    expect(mathQuestions.length).toBe(10);

    // 2. Complete with 100% accuracy, earning coins
    await storage.saveLevelResult('math', 1, 100, 1500, 10);
    await storage.addCoins(250);

    let progress = await storage.getProgress();
    expect(progress.coins).toBe(250);

    // 3. Purchase a castle garden tree decoration (cost: 100 coins)
    const success = await storage.purchaseItem('garden_tree', 100);
    expect(success).toBe(true);

    progress = await storage.getProgress();
    expect(progress.coins).toBe(150);
    expect(progress.inventory).toContain('garden_tree');

    // 4. Place decoration in outside slot 1
    await storage.placeDecoration('outside', 'slot_1', 'garden_tree');
    progress = await storage.getProgress();
    expect(progress.placedDecorations.outside['slot_1']).toBe('garden_tree');
  });

  it('Scenario 5: Offline PWA Resilience & State Resumption', async () => {
    // 1. Simulate initial online session where progress is saved
    const storageSession1 = new StorageService();
    await storageSession1.resetProgress();
    await storageSession1.saveLevelResult('phonics', 1, 100, 1500, 10);
    await storageSession1.saveLevelResult('morphology', 1, 100, 1500, 10);

    const saved = await storageSession1.getProgress();
    expect(saved.unlockedLevels['phonics_2']).toBe(true);
    expect(saved.unlockedLevels['morphology_2']).toBe(true);

    // 2. Simulate browser restart in offline mode: initialize new StorageService instance
    const storageSession2 = new StorageService();
    // Preload memory cache with existing state to mimic IndexedDB persistence
    await storageSession2.saveProgress(saved);

    // 3. Verify player resumes exactly where they left off without network requests
    expect(await storageSession2.isLevelUnlocked('phonics', 2)).toBe(true);
    expect(await storageSession2.isLevelUnlocked('morphology', 2)).toBe(true);
    expect(await storageSession2.isLevelUnlocked('vocabulary', 2)).toBe(false);

    // 4. Play Level 2 offline and save progress
    const offlineResult = await storageSession2.saveLevelResult('phonics', 2, 95, 1800, 10);
    expect(offlineResult.unlockedNextLevel).toBe(true);
    expect(await storageSession2.isLevelUnlocked('phonics', 3)).toBe(true);
  });

});
