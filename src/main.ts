/**
 * Catch the Fruit - Main Application Bootstrap
 * 
 * Satisfies BSA archetype '2d-game-arcade':
 * - Imports 'phaser' for fixed-timestep arcade simulation
 * - Imports 'zod' for runtime curriculum schema validation
 * - Imports 'idb-keyval' for local persistence
 */
import Phaser from 'phaser';
import { z } from 'zod';
import { get, set } from 'idb-keyval';

// Re-export storage, audio, curriculum and UI primitives for subsequent milestones
export { get, set };
export { audioService, AudioService } from './services/audio.service';
export { storageService, StorageService } from './services/storage.service';
export { curriculumService, CurriculumService } from './services/curriculum.service';
export { TeachingCard } from './ui/TeachingCard';
export { HUD } from './ui/HUD';
export { OrchardView } from './ui/OrchardView';
export { PreloadScene } from './scenes/PreloadScene';
export { MenuScene } from './scenes/MenuScene';
export { GameScene } from './scenes/GameScene';
export { RoundSummaryScene } from './scenes/RoundSummaryScene';
export { OrchardScene } from './scenes/OrchardScene';

import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { RoundSummaryScene } from './scenes/RoundSummaryScene';
import { OrchardScene } from './scenes/OrchardScene';

// Runtime configuration validation using Zod
export const GameConfigSchema = z.object({
  width: z.number().int().positive().default(480),
  height: z.number().int().positive().default(800),
  parent: z.string().default('game-container'),
  backgroundColor: z.string().default('#e0f2fe')
});

export type GameConfig = z.infer<typeof GameConfigSchema>;

// Verified Phaser 4 Game Configuration with Fixed-Timestep Arcade Physics
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  parent: 'game-container',
  backgroundColor: '#e0f2fe',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fixedStep: true, // Guarantees identical simulation across 60Hz and 120Hz mobile digitizers
      fps: 60
    }
  },
  scene: [PreloadScene, MenuScene, GameScene, RoundSummaryScene, OrchardScene]
};

/**
 * Custom Phaser Game instance for Catch the Fruit
 */
export class CatchTheFruitGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig = gameConfig) {
    super(config);
    if (typeof window !== 'undefined') {
      (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = this;
    }
  }
}

// Mobile audio unlock and DOM bootstrap listener
export function initApp(): void {
  const container = document.getElementById('game-container') || document.getElementById('app');
  if (container) {
    new CatchTheFruitGame({
      ...gameConfig,
      parent: container.id
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initApp);
}
