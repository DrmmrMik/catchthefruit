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

  init(data?: { topic?: TopicType }): void {
    if (data?.topic) {
      this.selectedTopic = data.topic;
    }
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#f0f9ff');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background Image with gentle wash
    if (this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setAlpha(0.28);
    }

    // Header Background (2-tier layout with high-contrast backdrop)
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0c4a6e, 0.95); // Sky 900 for WCAG AAA contrast
    headerBg.fillRect(0, 0, width, 118);

    // Tier 1: Utility Controls (y=26)
    // Orchard View button (top left, x=36, y=26, hitbox >= 48px)
    const orchardBtn = this.add.container(36, 26);
    const orchardIcon = this.add.image(0, 0, 'atlas', 'tree-stage-3');
    orchardIcon.setDisplaySize(40, 40);
    orchardBtn.add(orchardIcon);
    orchardBtn.setSize(48, 48);
    orchardBtn.setInteractive({ useHandCursor: true });
    orchardBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start('OrchardScene', { returnTo: 'MenuScene' });
    });

    // Castle & Marketplace button (top left, x=108, y=26, hitbox >= 48px)
    const castleBtn = this.add.container(108, 26);
    const castleBg = this.add.graphics();
    castleBg.fillStyle(0xd946ef, 1);
    castleBg.fillRoundedRect(-36, -18, 72, 36, 16);
    const castleLabel = this.add.text(0, 0, '🏰 Shop', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    castleBtn.add([castleBg, castleLabel]);
    castleBtn.setSize(72, 48);
    castleBtn.setInteractive({ useHandCursor: true });
    castleBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start('CastleScene', { returnTo: 'MenuScene' });
    });

    // Coin Counter Badge (top right, x=360, y=26)
    const coinBadge = this.add.container(360, 26);
    const cbg = this.add.graphics();
    cbg.fillStyle(0x0f172a, 0.5);
    cbg.fillRoundedRect(-36, -16, 72, 32, 16);
    const cIcon = this.add.image(-18, 0, 'atlas', 'coin-gold').setDisplaySize(20, 20);
    const cTxt = this.add.text(-4, 0, '0', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '13px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    coinBadge.add([cbg, cIcon, cTxt]);
    storageService.getCoins().then(c => cTxt.setText(`${c}`));

    // Sound toggle button (top right, x=436, y=26, hitbox >= 48px)
    const isMuted = audioService.isMuted();
    this.soundButton = this.add.image(436, 26, 'atlas', isMuted ? 'btn-sound-off' : 'btn-sound');
    this.soundButton.setDisplaySize(48, 48);
    this.soundButton.setInteractive({ useHandCursor: true });
    this.soundButton.on('pointerdown', () => {
      const nowMuted = !audioService.isMuted();
      audioService.setMuted(nowMuted);
      this.soundButton.setFrame(nowMuted ? 'btn-sound-off' : 'btn-sound');
    });

    // Tier 2: Branding (y=72-98)
    // Centered Title text "👑 Princess Penelope 🍎" at x=240, y=76
    this.add.text(width / 2, 76, '👑 Princess Penelope 🍎', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Centered Subtitle text "Catch the Fruit — Grade 2 Reading" at x=240, y=98
    this.add.text(width / 2, 98, 'Catch the Fruit — Grade 2 Reading', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '13px',
      color: '#ffffff'
    }).setOrigin(0.5);

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

      // Left Fruit / Lock Icon (48x48 lock frame from atlas for locked cards)
      const iconFrame = isUnlocked ? (level.levelNumber === 5 ? 'watermelon' : 'apple') : 'lock';
      const icon = this.add.image(-155, 0, 'atlas', iconFrame);
      icon.setDisplaySize(isUnlocked ? 52 : 48, isUnlocked ? 52 : 48);
      levelCard.add(icon);

      // Level Title & Description (WCAG AAA contrast >= 7:1)
      const titleColor = isUnlocked ? '#0f172a' : '#334155';
      const titleText = this.add.text(-110, -26, level.name, {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '15px',
        color: titleColor,
        fontStyle: 'bold'
      });

      const descColor = isUnlocked ? '#475569' : '#334155';
      const descText = this.add.text(-110, -3, level.description, {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '12px',
        color: descColor,
        wordWrap: { width: 230 }
      });
      levelCard.add([titleText, descText]);

      // Star Badges or Locked Label
      if (isUnlocked) {
        for (let s = 0; s < 3; s++) {
          const starFrame = s < stars ? 'crown-star-full' : 'crown-star-empty';
          const star = this.add.image(130 + s * 22, -20, 'atlas', starFrame);
          star.setDisplaySize(22, 22);
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
          color: '#334155'
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

    // Bottom "Visit My Tree Orchard" button (hitbox >= 48px, WCAG AAA contrast >= 7:1)
    const orchardBottomBtn = this.add.container(width / 2, 750);
    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(0x065f46, 1); // Emerald 800 for WCAG AAA contrast (>= 7:1)
    bottomBg.lineStyle(2, 0x047857, 1);
    bottomBg.fillRoundedRect(-165, -24, 330, 48, 24);
    bottomBg.strokeRoundedRect(-165, -24, 330, 48, 24);
    const bottomText = this.add.text(0, 0, '👑 Penelope\'s Enchanted Orchard 🌳', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    orchardBottomBtn.add([bottomBg, bottomText]);
    orchardBottomBtn.setSize(330, 48);
    orchardBottomBtn.setInteractive({ useHandCursor: true });
    orchardBottomBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start('OrchardScene', { returnTo: 'MenuScene' });
    });
  }
}
