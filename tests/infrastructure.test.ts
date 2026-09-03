import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { GameConfigSchema, gameConfig } from '../src/main';

describe('Milestone 1 Infrastructure Verification', () => {
  it('Phaser is loaded and exposes its runtime version', () => {
    expect(Phaser).toBeDefined();
    expect(typeof Phaser.VERSION).toBe('string');
  });

  it('Zod validates configuration and assigns defaults', () => {
    const raw = {};
    const parsed = GameConfigSchema.parse(raw);
    expect(parsed.width).toBe(480);
    expect(parsed.height).toBe(800);
    expect(parsed.parent).toBe('game-container');
  });

  it('Zod rejects invalid configurations', () => {
    expect(() => GameConfigSchema.parse({ width: -10 })).toThrow();
  });

  it('Phaser GameConfig enforces fixed-step Arcade Physics', () => {
    expect(gameConfig.physics?.default).toBe('arcade');
    expect(gameConfig.physics?.arcade?.fixedStep).toBe(true);
    expect(gameConfig.physics?.arcade?.fps).toBe(60);
  });

  it('Phaser GameConfig enforces portrait 480x800 responsive FIT scale', () => {
    expect(gameConfig.width).toBe(480);
    expect(gameConfig.height).toBe(800);
    expect(gameConfig.scale?.mode).toBe(Phaser.Scale.FIT);
    expect(gameConfig.scale?.autoCenter).toBe(Phaser.Scale.CENTER_BOTH);
  });
});
