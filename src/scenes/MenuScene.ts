import Phaser from 'phaser';
import { TopicType } from '../schema/curriculum.schema';
import { storageService } from '../services/storage.service';
import { audioService } from '../services/audio.service';
import { curriculumService } from '../services/curriculum.service';

interface TopicOption {
  key: TopicType;
  title: string;
  icon: string;
  accentColor: number;
}

const TOPICS: TopicOption[] = [
  { key: 'phonics', title: 'Phonics', icon: 'apple', accentColor: 0x10b981 },
  { key: 'morphology', title: 'Prefix & Suffix', icon: 'orange', accentColor: 0xf59e0b },
  { key: 'vocabulary', title: 'Vocabulary', icon: 'grape', accentColor: 0x8b5cf6 },
  { key: 'math', title: 'Math 1-20', icon: 'strawberry', accentColor: 0xef4444 }
];

export class MenuScene extends Phaser.Scene {
  private selectedTopic: TopicType = 'phonics';
  private levelButtonsContainer!: Phaser.GameObjects.Container;
  private soundButton!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'MenuScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#f0f9ff');
    const width = this.cameras.main.width;

    // Header Background
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0284c7, 1);
    headerBg.fillRect(0, 0, width, 110);

    // Title text
    this.add.text(width / 2, 38, '🍎 Catch the Fruit! 🍇', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 70, '2nd Grade ELA & Math Orchard', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '13px',
      color: '#bae6fd'
    }).setOrigin(0.5);

    // Sound toggle button (top right, 48px target)
    const isMuted = audioService.isMuted();
    this.soundButton = this.add.image(width - 40, 40, 'atlas', isMuted ? 'btn-sound-off' : 'btn-sound');
    this.soundButton.setDisplaySize(48, 48);
    this.soundButton.setInteractive({ useHandCursor: true });
    this.soundButton.on('pointerdown', () => {
      const nowMuted = !audioService.isMuted();
      audioService.setMuted(nowMuted);
      this.soundButton.setFrame(nowMuted ? 'btn-sound-off' : 'btn-sound');
    });

    // Orchard View button (top left, 48px target)
    const orchardBtn = this.add.container(48, 40);
    const orchardIcon = this.add.image(0, 0, 'atlas', 'tree-stage-3');
    orchardIcon.setDisplaySize(40, 40);
    orchardBtn.add(orchardIcon);
    orchardBtn.setSize(48, 48);
    orchardBtn.setInteractive({ useHandCursor: true });
    orchardBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start('OrchardScene', { returnTo: 'MenuScene' });
    });

    // Topic Selection Tabs (Horizontal row of 4 pills)
    this.createTopicTabs();

    // Level list container
    this.levelButtonsContainer = this.add.container(0, 185);
    await this.renderLevelButtons();
  }

  private createTopicTabs(): void {
    const width = this.cameras.main.width;
    const tabWidth = (width - 40) / 4;
    const startX = 20 + tabWidth / 2;
    const tabY = 145;

    TOPICS.forEach((topic, idx) => {
      const tabX = startX + idx * tabWidth;
      const isSelected = this.selectedTopic === topic.key;

      const tabContainer = this.add.container(tabX, tabY);
      const bg = this.add.graphics();
      bg.fillStyle(isSelected ? topic.accentColor : 0xffffff, 1);
      bg.lineStyle(2, topic.accentColor, 1);
      bg.fillRoundedRect(-tabWidth / 2 + 4, -24, tabWidth - 8, 48, 12);
      bg.strokeRoundedRect(-tabWidth / 2 + 4, -24, tabWidth - 8, 48, 12);

      const label = this.add.text(0, 0, topic.title, {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '11px',
        color: isSelected ? '#ffffff' : '#1e293b',
        fontStyle: isSelected ? 'bold' : 'normal',
        align: 'center'
      }).setOrigin(0.5);

      tabContainer.add([bg, label]);
      tabContainer.setSize(tabWidth - 8, 48);
      tabContainer.setInteractive({ useHandCursor: true });

      tabContainer.on('pointerdown', async () => {
        if (this.selectedTopic !== topic.key) {
          audioService.playClick();
          this.selectedTopic = topic.key;
          this.scene.restart();
        }
      });
    });
  }

  private async renderLevelButtons(): Promise<void> {
    this.levelButtonsContainer.removeAll(true);
    const width = this.cameras.main.width;
    const levels = curriculumService.getLevelsForTopic(this.selectedTopic);

    const progress = await storageService.getProgress();

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]!;
      const y = i * 110 + 20;
      const isUnlocked = await storageService.isLevelUnlocked(this.selectedTopic, level.levelNumber);
      const stars = progress.stars[`${this.selectedTopic}_${level.levelNumber}`] ?? 0;

      const levelCard = this.add.container(width / 2, y);

      // Card Background (400x95px, touch area >= 48px)
      const bg = this.add.graphics();
      if (isUnlocked) {
        bg.fillStyle(0xffffff, 1);
        bg.lineStyle(2, 0x0284c7, 1);
        bg.fillRoundedRect(-200, -45, 400, 90, 16);
        bg.strokeRoundedRect(-200, -45, 400, 90, 16);
      } else {
        bg.fillStyle(0xf1f5f9, 1);
        bg.lineStyle(1, 0xcbd5e1, 1);
        bg.fillRoundedRect(-200, -45, 400, 90, 16);
        bg.strokeRoundedRect(-200, -45, 400, 90, 16);
      }
      levelCard.add(bg);

      // Left Fruit / Lock Icon
      const icon = this.add.image(-155, 0, 'atlas', isUnlocked ? (level.levelNumber === 5 ? 'watermelon' : 'apple') : 'card-panel');
      icon.setDisplaySize(52, 52);
      if (!isUnlocked) {
        icon.setAlpha(0.4);
      }
      levelCard.add(icon);

      // Level Title & Description
      const titleColor = isUnlocked ? '#0f172a' : '#94a3b8';
      const titleText = this.add.text(-110, -26, level.name, {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '15px',
        color: titleColor,
        fontStyle: 'bold'
      });

      const descText = this.add.text(-110, -3, level.description, {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '12px',
        color: isUnlocked ? '#475569' : '#94a3b8',
        wordWrap: { width: 230 }
      });
      levelCard.add([titleText, descText]);

      // Star Badges or Locked Label
      if (isUnlocked) {
        for (let s = 0; s < 3; s++) {
          const starFrame = s < stars ? 'star-full' : 'star-empty';
          const star = this.add.image(130 + s * 22, -20, 'atlas', starFrame);
          star.setDisplaySize(20, 20);
          levelCard.add(star);
        }

        const playBtn = this.add.text(150, 18, 'PLAY ▶', {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '13px',
          color: '#0284c7',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        levelCard.add(playBtn);
      } else {
        const lockText = this.add.text(145, 0, '🔒 Locked', {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '12px',
          color: '#94a3b8'
        }).setOrigin(0.5);
        levelCard.add(lockText);
      }

      levelCard.setSize(400, 90);

      if (isUnlocked) {
        levelCard.setInteractive({ useHandCursor: true });
        levelCard.on('pointerdown', () => {
          audioService.playClick();
          this.scene.start('GameScene', {
            topic: this.selectedTopic,
            levelNumber: level.levelNumber
          });
        });
      }

      this.levelButtonsContainer.add(levelCard);
    }

    // Bottom "Visit My Tree Orchard" button
    const orchardBottomBtn = this.add.container(width / 2, 750);
    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(0x10b981, 1);
    bottomBg.fillRoundedRect(-160, -24, 320, 48, 24);
    const bottomText = this.add.text(0, 0, '🌳 View Fruit Orchard Progress', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    orchardBottomBtn.add([bottomBg, bottomText]);
    orchardBottomBtn.setSize(320, 48);
    orchardBottomBtn.setInteractive({ useHandCursor: true });
    orchardBottomBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start('OrchardScene', { returnTo: 'MenuScene' });
    });
  }
}
