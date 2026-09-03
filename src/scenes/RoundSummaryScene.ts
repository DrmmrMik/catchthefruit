import Phaser from 'phaser';
import { TopicType } from '../schema/curriculum.schema';
import { curriculumService } from '../services/curriculum.service';
import { audioService } from '../services/audio.service';

export interface RoundSummaryData {
  topic: TopicType;
  levelNumber: number;
  score: number;
  accuracy: number;
  stars: number;
  isMastered: boolean;
  coinsEarned?: number;
}

export class RoundSummaryScene extends Phaser.Scene {
  private summaryData!: RoundSummaryData;

  constructor() {
    super({ key: 'RoundSummaryScene' });
  }

  init(data: RoundSummaryData): void {
    this.summaryData = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#f0fdf4');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Celebration Card Panel (400x560px)
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xffffff, 1);
    cardBg.lineStyle(3, this.summaryData.isMastered ? 0x10b981 : 0x0284c7, 1);
    cardBg.fillRoundedRect(width / 2 - 190, 70, 380, 580, 24);
    cardBg.strokeRoundedRect(width / 2 - 190, 70, 380, 580, 24);

    // Title
    const titleText = this.summaryData.isMastered ? '🎉 LEVEL MASTERED! 🎉' : '🍎 ROUND COMPLETE! 🍎';
    this.add.text(width / 2, 115, titleText, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '22px',
      color: this.summaryData.isMastered ? '#059669' : '#0369a1',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Level description
    const levelConfig = curriculumService.getLevel(this.summaryData.topic, this.summaryData.levelNumber);
    this.add.text(width / 2, 150, levelConfig?.name ?? `Level ${this.summaryData.levelNumber}`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '15px',
      color: '#334155',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 3 Crown Badges display with staggered zoom animation
    for (let s = 0; s < 3; s++) {
      const starFrame = s < this.summaryData.stars ? 'crown-star-full' : 'crown-star-empty';
      const star = this.add.image(width / 2 - 60 + s * 60, 195, 'atlas', starFrame);
      star.setDisplaySize(44, 44);
      star.setScale(0);

      this.tweens.add({
        targets: star,
        scale: 1,
        delay: 200 + s * 250,
        duration: 400,
        ease: 'Back.easeOut'
      });
    }

    // Princess Penelope sprite celebrating on the card
    const princessPose = this.summaryData.isMastered ? 'princess-catch' : 'princess-idle-1';
    const princess = this.add.image(width / 2, 255, 'atlas', princessPose);
    princess.setDisplaySize(60, 80);
    if (this.summaryData.isMastered) {
      this.tweens.add({
        targets: princess,
        y: 245,
        duration: 300,
        yoyo: true,
        repeat: 3,
        ease: 'Quad.easeOut'
      });
    }

    // Score, Accuracy & Coins Box (3-column layout)
    const statBg = this.add.graphics();
    statBg.fillStyle(0xf8fafc, 1);
    statBg.lineStyle(1, 0xe2e8f0, 1);
    statBg.fillRoundedRect(width / 2 - 165, 305, 330, 80, 14);
    statBg.strokeRoundedRect(width / 2 - 165, 305, 330, 80, 14);

    this.add.text(width / 2 - 110, 345, `Score\n${this.summaryData.score}`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#0f172a',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, 345, `Accuracy\n${this.summaryData.accuracy}%`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: this.summaryData.accuracy >= 85 ? '#059669' : '#d97706',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    const coinsCount = this.summaryData.coinsEarned ?? 100;
    this.add.text(width / 2 + 105, 345, `Coins\n+${coinsCount} 🪙`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#d97706',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    // Pedagogical message
    const feedbackMsg = this.summaryData.isMastered
      ? 'Outstanding job! You met the 85% mastery goal!'
      : 'Good practice! Try again to achieve 85% mastery to unlock the next level!';

    this.add.text(width / 2, 405, feedbackMsg, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '12px',
      color: '#475569',
      align: 'center',
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    // Buttons Container
    let btnY = 450;

    // 1. Next Level Button (if mastered and next level exists)
    const nextLevel = curriculumService.getLevel(this.summaryData.topic, this.summaryData.levelNumber + 1);
    if (this.summaryData.isMastered && nextLevel) {
      this.createButton(width / 2, btnY, 'NEXT LEVEL ▶', 0x10b981, () => {
        this.scene.start('GameScene', {
          topic: this.summaryData.topic,
          levelNumber: this.summaryData.levelNumber + 1
        });
      });
      btnY += 48;
    }

    // 2. Play Again Button
    this.createButton(width / 2, btnY, 'PLAY AGAIN 🔄', 0x0284c7, () => {
      this.scene.start('GameScene', {
        topic: this.summaryData.topic,
        levelNumber: this.summaryData.levelNumber
      });
    });
    btnY += 48;

    // 3. Castle & Marketplace Button
    this.createButton(width / 2, btnY, 'VISIT CASTLE & SHOP 🏰', 0xd946ef, () => {
      this.scene.start('CastleScene', { returnTo: 'MenuScene' });
    });
    btnY += 48;

    // 4. Orchard View Button
    this.createButton(width / 2, btnY, 'VISIT ORCHARD 🌳', 0x8b5cf6, () => {
      this.scene.start('OrchardScene', { returnTo: 'MenuScene' });
    });

    // 4. Main Menu Button (bottom)
    const menuBtn = this.add.text(width / 2, height - 50, '◀ Back to Main Menu', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#64748b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start('MenuScene');
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-140, -22, 280, 46, 14);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.add([bg, text]);
    btn.setSize(280, 46);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      audioService.playClick();
      onClick();
    });
  }
}
