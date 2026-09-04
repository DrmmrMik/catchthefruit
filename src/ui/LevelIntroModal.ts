/**
 * LevelIntroModal - Pre-Level Instructions Modal Dialog
 * 
 * Satisfies:
 * - Presented before every gameplay level starts so the 2nd grade learner can read
 *   the instructions, rules, and anchor read examples at their own pace without time pressure.
 * - Displays topic badge, level title, mission prompt with highlighted read examples, and pattern tips.
 * - Large, finger-friendly button (>= 48px touch target: 240x56px) to click past and begin.
 * - WCAG AAA accessible high-contrast colors and Lexend typography.
 * - Blocks falling fruit until the user confirms readiness.
 */
import Phaser from 'phaser';
import { IAudioSynthesizer, audioService } from '../services/audio.service';

export interface LevelIntroModalConfig {
  topic: string;
  levelNumber: number;
  title: string;
  prompt: string;
  description?: string;
  targetPatterns?: string[];
  sampleWords?: string[];
  onStart: () => void;
  audio?: IAudioSynthesizer;
}

export class LevelIntroModal extends Phaser.GameObjects.Container {
  private config: LevelIntroModalConfig;
  private audio: IAudioSynthesizer;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private panelGraphics!: Phaser.GameObjects.Graphics;
  private startButtonContainer!: Phaser.GameObjects.Container;
  private isDismissed: boolean = false;

  constructor(scene: Phaser.Scene, config: LevelIntroModalConfig) {
    super(scene, 0, 0);

    this.config = config;
    this.audio = config.audio ?? audioService;

    this.buildUI(scene);

    // Add to scene display list and position at highest depth
    scene.add.existing(this);
    this.setDepth(900);
  }

  private getTopicColor(topic: string): { primary: number; border: number; text: string } {
    switch (topic.toLowerCase()) {
      case 'phonics':
        return { primary: 0x0284c7, border: 0x0369a1, text: '#0284c7' }; // Sky 600 / 700
      case 'morphology':
        return { primary: 0xd97706, border: 0xb45309, text: '#d97706' }; // Amber 600 / 700
      case 'vocabulary':
        return { primary: 0x7c3aed, border: 0x6d28d9, text: '#7c3aed' }; // Violet 600 / 700
      case 'math':
        return { primary: 0x059669, border: 0x047857, text: '#059669' }; // Emerald 600 / 700
      default:
        return { primary: 0x0284c7, border: 0x0369a1, text: '#0284c7' };
    }
  }

  private buildUI(scene: Phaser.Scene): void {
    const screenWidth = 480;
    const screenHeight = 800;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // 1. Semi-transparent backdrop overlay to dampen background gameplay
    this.backdrop = scene.add.rectangle(centerX, centerY, screenWidth, screenHeight, 0x071b2e, 0.85);
    this.backdrop.setInteractive(); // Intercepts clicks behind modal
    this.add(this.backdrop);

    // 2. Card Panel Dimensions (410 x 510 px)
    const cardW = 410;
    const cardH = 510;
    const cardX = centerX - cardW / 2;
    const cardY = centerY - cardH / 2;

    const topicColor = this.getTopicColor(this.config.topic);

    this.panelGraphics = scene.add.graphics();

    // Drop shadow
    this.panelGraphics.fillStyle(0x000000, 0.35);
    this.panelGraphics.fillRoundedRect(cardX + 4, cardY + 6, cardW, cardH, 24);

    // Card background (Pure white for pristine contrast)
    this.panelGraphics.fillStyle(0xffffff, 1.0);
    this.panelGraphics.fillRoundedRect(cardX, cardY, cardW, cardH, 24);

    // Accent top header band
    this.panelGraphics.fillStyle(topicColor.primary, 1.0);
    this.panelGraphics.fillRoundedRect(cardX, cardY, cardW, 70, { tl: 24, tr: 24, bl: 0, br: 0 });

    // Outer border (3px)
    this.panelGraphics.lineStyle(3, topicColor.border, 1.0);
    this.panelGraphics.strokeRoundedRect(cardX, cardY, cardW, cardH, 24);
    this.add(this.panelGraphics);

    // 3. Header: Level Badge & Title
    const badgeStr = `⭐ LEVEL ${this.config.levelNumber}: ${this.config.topic.toUpperCase()} ⭐`;
    const badgeText = scene.add.text(centerX, cardY + 22, badgeStr, {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add(badgeText);

    const titleText = scene.add.text(centerX, cardY + 46, this.config.title, {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '19px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 380, useAdvancedWrap: true }
    }).setOrigin(0.5);
    this.add(titleText);

    let currentY = cardY + 95;

    // 4. "Your Mission" Label
    const missionLabel = scene.add.text(centerX, currentY, '🎯 YOUR MISSION', {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '15px',
      color: topicColor.text,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add(missionLabel);

    currentY += 28;

    // 5. High-contrast Mission Prompt Box with read examples
    const promptBoxW = 370;
    const promptBoxH = 110;
    const promptBox = scene.add.graphics();
    promptBox.fillStyle(0xf8fafc, 1.0); // Slate 50
    promptBox.lineStyle(2, 0x94a3b8, 1.0); // Slate 400
    promptBox.fillRoundedRect(centerX - promptBoxW / 2, currentY, promptBoxW, promptBoxH, 16);
    promptBox.strokeRoundedRect(centerX - promptBoxW / 2, currentY, promptBoxW, promptBoxH, 16);
    this.add(promptBox);

    const promptText = scene.add.text(centerX, currentY + promptBoxH / 2, this.config.prompt, {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '18px',
      color: '#0f172a', // Slate 900 (17.8:1 contrast)
      align: 'center',
      fontStyle: 'bold',
      wordWrap: { width: promptBoxW - 30, useAdvancedWrap: true }
    }).setOrigin(0.5);
    this.add(promptText);

    currentY += promptBoxH + 20;

    // 6. Anchor Read Examples / Pattern Badges
    if (this.config.sampleWords && this.config.sampleWords.length > 0) {
      const examplesLabel = scene.add.text(centerX, currentY, '✨ LOOK FOR EXAMPLES LIKE:', {
        fontFamily: 'Lexend, system-ui, sans-serif',
        fontSize: '13px',
        color: '#475569',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add(examplesLabel);

      currentY += 24;

      const wordsStr = this.config.sampleWords.map(w => `"${w}"`).join('   •   ');
      const examplesBoxW = 350;
      const examplesBoxH = 44;
      const examplesBg = scene.add.graphics();
      examplesBg.fillStyle(0xf0fdf4, 1.0); // Emerald 50
      examplesBg.lineStyle(2, 0x86efac, 1.0); // Emerald 300
      examplesBg.fillRoundedRect(centerX - examplesBoxW / 2, currentY, examplesBoxW, examplesBoxH, 12);
      examplesBg.strokeRoundedRect(centerX - examplesBoxW / 2, currentY, examplesBoxW, examplesBoxH, 12);
      this.add(examplesBg);

      const wordsText = scene.add.text(centerX, currentY + examplesBoxH / 2, wordsStr, {
        fontFamily: 'Lexend, system-ui, sans-serif',
        fontSize: '17px',
        color: '#15803d', // Emerald 700
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);
      this.add(wordsText);

      currentY += examplesBoxH + 18;
    } else if (this.config.description) {
      const descText = scene.add.text(centerX, currentY + 15, this.config.description, {
        fontFamily: 'Lexend, system-ui, sans-serif',
        fontSize: '15px',
        color: '#334155',
        align: 'center',
        wordWrap: { width: 350, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.add(descText);

      currentY += 50;
    }

    // 7. Helpful Child-friendly Gameplay Tip
    const tipText = scene.add.text(centerX, currentY + 12, '💡 Catch matching fruit with the basket or tap them directly!', {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '13px',
      color: '#64748b',
      align: 'center',
      wordWrap: { width: 360, useAdvancedWrap: true }
    }).setOrigin(0.5);
    this.add(tipText);

    // 8. "Start Level! Let's Play!" Button (Touch target >= 48px: 240 x 56 px)
    const btnY = cardY + cardH - 46;
    this.startButtonContainer = scene.add.container(centerX, btnY);

    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0x16a34a, 1.0); // Emerald green 600
    btnBg.lineStyle(2, 0x15803d, 1.0); // Emerald 700
    btnBg.fillRoundedRect(-120, -28, 240, 56, 16);
    btnBg.strokeRoundedRect(-120, -28, 240, 56, 16);
    this.startButtonContainer.add(btnBg);

    const btnText = scene.add.text(0, 0, "Let's Play! 🍎", {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    this.startButtonContainer.add(btnText);

    this.startButtonContainer.setSize(240, 56);
    this.startButtonContainer.setInteractive({ useHandCursor: true });

    this.startButtonContainer.on('pointerover', () => {
      this.startButtonContainer.setScale(1.03);
    });
    this.startButtonContainer.on('pointerout', () => {
      this.startButtonContainer.setScale(1.0);
    });
    this.startButtonContainer.on('pointerdown', () => {
      this.dismiss();
    });

    this.add(this.startButtonContainer);
  }

  /**
   * Dismisses the modal and starts level gameplay
   */
  public dismiss(): void {
    if (this.isDismissed) return;
    this.isDismissed = true;

    this.audio.playClick();

    if (this.config.onStart) {
      this.config.onStart();
    }
    this.emit('start');

    this.destroy();
  }

  public getStartButtonSize(): { width: number; height: number } {
    return { width: 240, height: 56 };
  }

  public getPrompt(): string {
    return this.config.prompt;
  }

  public getTitle(): string {
    return this.config.title;
  }
}
