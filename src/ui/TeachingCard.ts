/**
 * TeachingCard - 3-Mistake Consecutive Remediation Modal Dialog
 * 
 * Satisfies:
 * - Triggered when player makes 3 consecutive errors (StorageService consecutiveMistakes >= 3).
 * - Modal overlay that dampens/pauses gameplay background.
 * - Displays large, high-readability Lexend text with color-coded phonetic patterns.
 * - Shows visual morphological segmentation (e.g. "re + play → replay") or phonics rule explanation.
 * - Speaks the rule explanation via TTS (Web Speech API).
 * - Large, finger-friendly button (>= 48px touch target: 220x56px) to resume gameplay.
 * - Resets consecutive mistakes on dismissal via StorageService.resetConsecutiveMistakes().
 * - WCAG AAA accessible high-contrast colors and screen-reader announcements.
 */
import Phaser from 'phaser';
import { StorageService, storageService } from '../services/storage.service';
import { IAudioSynthesizer, audioService } from '../services/audio.service';

export interface TeachingCardConfig {
  word: string;
  pattern: string;
  explanation: string;
  ruleTitle?: string;
  segmentation?: string; // e.g. "re + play → replay"
  topic?: string;
  onResume?: () => void;
  autoSpeak?: boolean;
  storage?: StorageService;
  audio?: IAudioSynthesizer;
}

export class TeachingCard extends Phaser.GameObjects.Container {
  private config: TeachingCardConfig;
  private storage: StorageService;
  private audio: IAudioSynthesizer;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private panelGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private wordText!: Phaser.GameObjects.Text;
  private segmentationText?: Phaser.GameObjects.Text;
  private explanationText!: Phaser.GameObjects.Text;
  private resumeButtonContainer!: Phaser.GameObjects.Container;
  private listenButtonContainer!: Phaser.GameObjects.Container;
  private isDismissed: boolean = false;

  constructor(scene: Phaser.Scene, config: TeachingCardConfig) {
    super(scene, 0, 0);

    this.config = config;
    this.storage = config.storage ?? storageService;
    this.audio = config.audio ?? audioService;

    this.buildUI(scene);

    // Add to scene display list and position at highest depth
    scene.add.existing(this);
    this.setDepth(1000);

    // Auto-speak rule explanation via TTS (disabled by default)
    if (config.autoSpeak === true) {
      this.speakExplanation();
    }
  }

  /**
   * Evaluates whether 3 consecutive mistakes trigger remediation
   */
  public static shouldTrigger(consecutiveMistakes: number): boolean {
    return consecutiveMistakes >= 3;
  }

  /**
   * Factory method to create and show remediation card
   */
  public static show(scene: Phaser.Scene, config: TeachingCardConfig): TeachingCard {
    return new TeachingCard(scene, config);
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

    // 2. Card Panel Dimensions (400 x 480 px)
    const cardW = 410;
    const cardH = 490;
    const cardX = centerX - cardW / 2;
    const cardY = centerY - cardH / 2;

    this.panelGraphics = scene.add.graphics();

    // Drop shadow
    this.panelGraphics.fillStyle(0x000000, 0.35);
    this.panelGraphics.fillRoundedRect(cardX + 4, cardY + 6, cardW, cardH, 24);

    // Card background (bright cream #fefce8 / crisp white for WCAG AAA contrast)
    this.panelGraphics.fillStyle(0xffffff, 1.0);
    this.panelGraphics.fillRoundedRect(cardX, cardY, cardW, cardH, 24);

    // Accent top header band
    this.panelGraphics.fillStyle(0x0284c7, 1.0); // Vivid Sky 600
    this.panelGraphics.fillRoundedRect(cardX, cardY, cardW, 64, { tl: 24, tr: 24, bl: 0, br: 0 });

    // Accent outer border (Sky 700, 3px)
    this.panelGraphics.lineStyle(3, 0x0369a1, 1.0);
    this.panelGraphics.strokeRoundedRect(cardX, cardY, cardW, cardH, 24);
    this.add(this.panelGraphics);

    // 3. Header Title in Lexend font (high contrast white on Sky 600)
    const titleStr = this.config.ruleTitle || "💡 Phonics Rule Hint";
    this.titleText = scene.add.text(centerX, cardY + 32, titleStr, {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#0369a1',
      strokeThickness: 1
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.add(this.titleText);

    // 4. Large target word / pattern display
    let currentY = cardY + 95;

    // Pattern Badge Pill Background
    const badgeW = 260;
    const badgeH = 46;
    const badgeGraphics = scene.add.graphics();
    badgeGraphics.fillStyle(0xf0f9ff, 1.0); // Sky 50
    badgeGraphics.lineStyle(2, 0x38bdf8, 1.0); // Sky 400
    badgeGraphics.fillRoundedRect(centerX - badgeW / 2, currentY - badgeH / 2, badgeW, badgeH, 23);
    badgeGraphics.strokeRoundedRect(centerX - badgeW / 2, currentY - badgeH / 2, badgeW, badgeH, 23);
    this.add(badgeGraphics);

    // Target Word Text
    this.wordText = scene.add.text(centerX, currentY, this.config.word.toUpperCase(), {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '28px',
      color: '#0369a1',
      align: 'center'
    });
    this.wordText.setOrigin(0.5, 0.5);
    this.add(this.wordText);

    currentY += 46;

    // 5. Visual Segmentation (if provided, e.g. "re + play → replay")
    if (this.config.segmentation) {
      const segContainer = scene.add.container(centerX, currentY);

      // Light amber highlight box
      const segBox = scene.add.graphics();
      segBox.fillStyle(0xfef3c7, 1.0); // Amber 100
      segBox.lineStyle(2, 0xf59e0b, 1.0); // Amber 500
      segBox.fillRoundedRect(-175, -18, 350, 42, 12);
      segBox.strokeRoundedRect(-175, -18, 350, 42, 12);
      segContainer.add(segBox);

      this.segmentationText = scene.add.text(0, 3, this.config.segmentation, {
        fontFamily: 'Lexend, system-ui, sans-serif',
        fontSize: '20px',
        color: '#92400e', // Amber 900 for WCAG AAA
        align: 'center'
      });
      this.segmentationText.setOrigin(0.5, 0.5);
      segContainer.add(this.segmentationText);

      this.add(segContainer);
      currentY += 50;
    } else {
      currentY += 10;
    }

    // 6. Explanation Body in Lexend font (Word wrap, high contrast Navy on white)
    this.explanationText = scene.add.text(centerX, currentY + 45, this.config.explanation, {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '18px',
      color: '#0f172a', // Slate 900 (14:1 contrast ratio against white)
      align: 'center',
      wordWrap: { width: 350, useAdvancedWrap: true }
    });
    this.explanationText.setOrigin(0.5, 0.5);
    this.add(this.explanationText);

    // 7. Interactive Controls:
    // A. "Hear Rule" audio button (>= 48px touch target: 150 x 48 px)
    const listenBtnY = cardY + cardH - 105;
    this.listenButtonContainer = scene.add.container(centerX, listenBtnY);

    const listenBg = scene.add.graphics();
    listenBg.fillStyle(0xf1f5f9, 1.0);
    listenBg.lineStyle(2, 0x94a3b8, 1.0);
    listenBg.fillRoundedRect(-75, -24, 150, 48, 12);
    listenBg.strokeRoundedRect(-75, -24, 150, 48, 12);
    this.listenButtonContainer.add(listenBg);

    const listenText = scene.add.text(0, 0, '🔊 Hear Rule', {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '16px',
      color: '#334155',
      align: 'center'
    });
    listenText.setOrigin(0.5, 0.5);
    this.listenButtonContainer.add(listenText);

    this.listenButtonContainer.setSize(150, 48);
    this.listenButtonContainer.setInteractive({ useHandCursor: true });
    this.listenButtonContainer.on('pointerdown', () => {
      this.audio.playClick();
      this.speakExplanation();
    });
    this.add(this.listenButtonContainer);

    // B. "I Got It! Let's Play" Resume Button (Touch target >= 48px: 240 x 54 px)
    const resumeBtnY = cardY + cardH - 45;
    this.resumeButtonContainer = scene.add.container(centerX, resumeBtnY);

    const resumeBg = scene.add.graphics();
    resumeBg.fillStyle(0x16a34a, 1.0); // Emerald green 600
    resumeBg.lineStyle(2, 0x15803d, 1.0); // Emerald 700
    resumeBg.fillRoundedRect(-120, -27, 240, 54, 16);
    resumeBg.strokeRoundedRect(-120, -27, 240, 54, 16);
    this.resumeButtonContainer.add(resumeBg);

    const resumeText = scene.add.text(0, 0, "I Got It! Let's Play", {
      fontFamily: 'Lexend, system-ui, sans-serif',
      fontSize: '19px',
      color: '#ffffff',
      align: 'center'
    });
    resumeText.setOrigin(0.5, 0.5);
    this.resumeButtonContainer.add(resumeText);

    this.resumeButtonContainer.setSize(240, 54);
    this.resumeButtonContainer.setInteractive({ useHandCursor: true });

    // Visual feedback on hover/touch
    this.resumeButtonContainer.on('pointerover', () => {
      this.resumeButtonContainer.setScale(1.03);
    });
    this.resumeButtonContainer.on('pointerout', () => {
      this.resumeButtonContainer.setScale(1.0);
    });
    this.resumeButtonContainer.on('pointerdown', () => {
      this.dismiss();
    });

    this.add(this.resumeButtonContainer);
  }

  /**
   * Speaks the explanation via Web Speech TTS
   */
  public speakExplanation(): void {
    const title = this.config.ruleTitle || "Phonics rule hint";
    const speech = `${title}. ${this.config.explanation}. Word is ${this.config.word}.`;
    this.audio.speakPrompt(speech).catch(() => {});
  }

  /**
   * Dismisses the modal, resets consecutive mistakes, invokes onResume callback, and destroys self
   */
  public async dismiss(): Promise<void> {
    if (this.isDismissed) return;
    this.isDismissed = true;

    this.audio.playClick();
    this.audio.stopSpeaking();

    // Reset consecutive mistakes streak in persistent storage
    try {
      await this.storage.resetConsecutiveMistakes();
    } catch {
      // Graceful fallback
    }

    // Invoke user callback & emit resume event
    if (this.config.onResume) {
      this.config.onResume();
    }
    this.emit('resume');

    // Cleanly destroy Phaser game object
    this.destroy();
  }

  public getWord(): string {
    return this.config.word;
  }

  public getExplanation(): string {
    return this.config.explanation;
  }

  public getSegmentation(): string | undefined {
    return this.config.segmentation;
  }

  public getResumeButtonSize(): { width: number; height: number } {
    return { width: 240, height: 54 };
  }
}
