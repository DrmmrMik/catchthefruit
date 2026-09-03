import Phaser from 'phaser';
import { audioService } from '../services/audio.service';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Background daylight gradient / sky color
    this.cameras.main.setBackgroundColor('#e0f2fe');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading title
    this.add.text(width / 2, height / 2 - 80, '👑 Princess Penelope 🍎', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '28px',
      color: '#0f172a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 40, 'Catch the Fruit • Princesses Wear Pants World', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '15px',
      color: '#475569'
    }).setOrigin(0.5);

    // Progress bar background
    const progressBg = this.add.graphics();
    progressBg.fillStyle(0xcfd8dc, 1);
    progressBg.fillRoundedRect(width / 2 - 140, height / 2, 280, 24, 12);

    // Progress bar fill
    const progressBar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x10b981, 1);
      progressBar.fillRoundedRect(width / 2 - 138, height / 2 + 2, 276 * value, 20, 10);
    });

    // Loading status text
    const loadingText = this.add.text(width / 2, height / 2 + 45, 'Loading Royal Orchard...', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#64748b'
    }).setOrigin(0.5);

    this.load.on('complete', () => {
      loadingText.setText('Tap Anywhere to Enter Kingdom!');
    });

    // Load packed texture atlas and magical background image
    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    this.load.image('background', 'assets/background.jpg');
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Register Princess Penelope idle breathing animation
    if (this.textures.exists('atlas') && !this.anims.exists('princess-idle')) {
      this.anims.create({
        key: 'princess-idle',
        frames: [
          { key: 'atlas', frame: 'princess-idle-1' },
          { key: 'atlas', frame: 'princess-idle-2' }
        ],
        frameRate: 2,
        repeat: -1
      });
    }

    // Hint text for audio unlock
    const tapPrompt = this.add.text(width / 2, height / 2 + 100, '👉 Tap to Play 👈', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '20px',
      color: '#0369a1',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tapPrompt,
      scale: 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    let hasStarted = false;
    const startGame = () => {
      if (hasStarted) return;
      hasStarted = true;

      // Non-blocking fire-and-forget audio unlock
      audioService.unlock().catch(() => {});
      try {
        audioService.playClick();
      } catch {
        // Ignore audio errors during initial gesture
      }

      this.scene.start('MenuScene');
    };

    // 1. Full-screen interactive hit zone covering entire canvas
    const fullScreenZone = this.add.zone(width / 2, height / 2, width, height);
    fullScreenZone.setInteractive({ useHandCursor: true });
    fullScreenZone.on('pointerdown', startGame);

    // 2. Direct button interaction
    tapPrompt.setInteractive({ useHandCursor: true });
    tapPrompt.on('pointerdown', startGame);

    // 3. Scene-level input event
    this.input.on('pointerdown', startGame);

    // 4. Keyboard accessibility (Space / Enter)
    this.input.keyboard?.on('keydown-SPACE', startGame);
    this.input.keyboard?.on('keydown-ENTER', startGame);
  }
}
