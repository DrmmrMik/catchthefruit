import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import {
  gameConfig,
  PreloadScene,
  MenuScene,
  GameScene,
  RoundSummaryScene,
  OrchardScene,
  CatchTheFruitGame
} from '../src/main';

describe('Phaser 4 Scenes Architecture', () => {
  it('registers all 5 required gameplay scenes in gameConfig', () => {
    expect(gameConfig.scene).toBeDefined();
    const scenes = gameConfig.scene as Array<unknown>;
    expect(scenes).toHaveLength(5);
    expect(scenes).toContain(PreloadScene);
    expect(scenes).toContain(MenuScene);
    expect(scenes).toContain(GameScene);
    expect(scenes).toContain(RoundSummaryScene);
    expect(scenes).toContain(OrchardScene);
  });

  it('configures fixed-timestep Arcade Physics to prevent 120Hz desynchronization', () => {
    expect(gameConfig.physics?.default).toBe('arcade');
    const arcadeConfig = gameConfig.physics?.arcade;
    expect(arcadeConfig).toBeDefined();
    expect(arcadeConfig?.fixedStep).toBe(true);
    expect(arcadeConfig?.fps).toBe(60);
  });

  it('configures mobile-first portrait aspect ratio 480x800 with autoCenter', () => {
    expect(gameConfig.width).toBe(480);
    expect(gameConfig.height).toBe(800);
    expect(gameConfig.scale?.mode).toBe(Phaser.Scale.FIT);
    expect(gameConfig.scale?.autoCenter).toBe(Phaser.Scale.CENTER_BOTH);
  });

  it('instantiates CatchTheFruitGame subclass of Phaser.Game', () => {
    const game = new CatchTheFruitGame({
      ...gameConfig,
      type: Phaser.HEADLESS
    });
    expect(game).toBeInstanceOf(Phaser.Game);
    expect(game).toBeInstanceOf(CatchTheFruitGame);
    game.destroy(true);
  });

  it('verifies scene keys and constructor instantiation', () => {
    const preload = new PreloadScene();
    expect(preload.sys.settings.key).toBe('PreloadScene');

    const menu = new MenuScene();
    expect(menu.sys.settings.key).toBe('MenuScene');

    const gameScene = new GameScene();
    expect(gameScene.sys.settings.key).toBe('GameScene');

    const roundSummary = new RoundSummaryScene();
    expect(roundSummary.sys.settings.key).toBe('RoundSummaryScene');

    const orchard = new OrchardScene();
    expect(orchard.sys.settings.key).toBe('OrchardScene');
  });

  it('verifies GameScene initializes with topic and level number parameters', () => {
    const gameScene = new GameScene();
    gameScene.init({ topic: 'morphology', levelNumber: 3 });
    // @ts-expect-error accessing private property for test verification
    expect(gameScene.topic).toBe('morphology');
    // @ts-expect-error accessing private property for test verification
    expect(gameScene.levelNumber).toBe(3);
  });

  it('verifies RoundSummaryScene initializes with performance stats', () => {
    const summary = new RoundSummaryScene();
    const testData = {
      topic: 'phonics' as const,
      levelNumber: 2,
      score: 1500,
      accuracy: 90,
      stars: 3,
      isMastered: true
    };
    summary.init(testData);
    // @ts-expect-error accessing private property for test verification
    expect(summary.summaryData).toEqual(testData);
  });
});
