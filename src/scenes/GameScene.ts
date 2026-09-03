import Phaser from 'phaser';
import { TopicType, CurriculumItem, OptionItem } from '../schema/curriculum.schema';
import { curriculumService } from '../services/curriculum.service';
import { storageService } from '../services/storage.service';
import { audioService } from '../services/audio.service';
import { HUD } from '../ui/HUD';
import { TeachingCard } from '../ui/TeachingCard';

export interface GameSceneData {
  topic: TopicType;
  levelNumber: number;
}

interface ActiveFruit {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  option: OptionItem;
  question: CurriculumItem;
  speed: number;
  isCaught: boolean;
  hasMissed: boolean;
}

export class GameScene extends Phaser.Scene {
  private topic: TopicType = 'phonics';
  private levelNumber: number = 1;

  private hud!: HUD;
  private basket!: Phaser.GameObjects.Image;
  private questions: CurriculumItem[] = [];
  private currentQuestionIndex: number = 0;
  private activeFruits: ActiveFruit[] = [];

  private score: number = 0;
  private combo: number = 0;
  private totalAttempts: number = 0;
  private correctAttempts: number = 0;
  private isPaused: boolean = false;
  private isRemediating: boolean = false;
  private fallDurationMs: number = 2600;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.topic = data.topic || 'phonics';
    this.levelNumber = data.levelNumber || 1;
    this.score = 0;
    this.combo = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.currentQuestionIndex = 0;
    this.activeFruits = [];
    this.isPaused = false;
    this.isRemediating = false;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background sky with light ground grass
    this.cameras.main.setBackgroundColor('#e0f2fe');

    const grass = this.add.graphics();
    grass.fillStyle(0x86efac, 1);
    grass.fillRect(0, height - 90, width, 90);
    grass.fillStyle(0x4ade80, 1);
    grass.fillRect(0, height - 90, width, 8);

    // Fixed-timestep Arcade Physics
    this.physics.world.fixedStep = true;

    // Load curriculum question set for this level (12 items)
    this.questions = curriculumService.generateQuestionSet(this.topic, this.levelNumber, 12);
    const levelConfig = curriculumService.getLevel(this.topic, this.levelNumber);
    this.fallDurationMs = levelConfig?.fallSpeedDurationMs ?? 2600;

    const initialQuestion = this.questions[0];

    // Instantiate HUD with target prompt banner
    this.hud = new HUD(this, {
      score: this.score,
      combo: this.combo,
      stars: 0,
      prompt: initialQuestion?.prompt ?? 'Catch the Fruit!',
      subtext: 'Tap the fruit or catch with basket',
      onPause: () => this.togglePause()
    });

    // Spoken prompt via TTS on level start
    if (initialQuestion?.spokenPrompt) {
      audioService.speakPrompt(initialQuestion.spokenPrompt);
    }

    // Interactive Basket at the bottom (x=width/2, y=height-50, touch draggable)
    this.basket = this.add.image(width / 2, height - 55, 'atlas', 'basket');
    this.basket.setDisplaySize(96, 56);
    this.basket.setInteractive({ draggable: true });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject === this.basket && !this.isPaused && !this.isRemediating) {
        this.basket.x = Phaser.Math.Clamp(dragX, 55, width - 55);
      }
    });

    // Touch pointer drag across screen moves basket directly
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.y > height - 140 && !this.isPaused && !this.isRemediating) {
        this.basket.x = Phaser.Math.Clamp(pointer.x, 55, width - 55);
      }
    });

    // Start spawning question items
    this.spawnNextQuestionWave();
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;

      const pauseOverlay = this.add.container(width / 2, height / 2).setName('pauseOverlay').setDepth(800);
      const bg = this.add.rectangle(0, 0, width, height, 0x0f172a, 0.7);
      const pauseCard = this.add.graphics();
      pauseCard.fillStyle(0xffffff, 1);
      pauseCard.fillRoundedRect(-140, -100, 280, 200, 20);

      const pausedTitle = this.add.text(0, -50, 'GAME PAUSED', {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '20px',
        color: '#0f172a',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const resumeBtn = this.add.container(0, 10);
      const resumeBg = this.add.graphics();
      resumeBg.fillStyle(0x0284c7, 1);
      resumeBg.fillRoundedRect(-90, -22, 180, 44, 12);
      const resumeText = this.add.text(0, 0, 'RESUME ▶', {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      resumeBtn.add([resumeBg, resumeText]);
      resumeBtn.setSize(180, 44);
      resumeBtn.setInteractive({ useHandCursor: true });
      resumeBtn.on('pointerdown', () => {
        audioService.playClick();
        pauseOverlay.destroy();
        this.isPaused = false;
      });

      const quitBtn = this.add.container(0, 65);
      const quitBg = this.add.graphics();
      quitBg.fillStyle(0xe2e8f0, 1);
      quitBg.fillRoundedRect(-90, -20, 180, 40, 10);
      const quitText = this.add.text(0, 0, 'MAIN MENU', {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '13px',
        color: '#475569',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      quitBtn.add([quitBg, quitText]);
      quitBtn.setSize(180, 40);
      quitBtn.setInteractive({ useHandCursor: true });
      quitBtn.on('pointerdown', () => {
        audioService.playClick();
        this.scene.start('MenuScene');
      });

      pauseOverlay.add([bg, pauseCard, pausedTitle, resumeBtn, quitBtn]);
    }
  }

  private spawnNextQuestionWave(): void {
    if (this.currentQuestionIndex >= this.questions.length) {
      // All questions completed! End round
      this.time.delayedCall(1200, () => {
        this.finishLevel();
      });
      return;
    }

    const question = this.questions[this.currentQuestionIndex]!;
    this.hud.updatePrompt(question.prompt, `Item ${this.currentQuestionIndex + 1} of ${this.questions.length}`);

    // Re-speak prompt if question has changed
    if (question.spokenPrompt) {
      audioService.speakPrompt(question.spokenPrompt);
    }

    // Determine options to spawn (Target + 1 or 2 Distractors)
    const optionsToSpawn = [...question.options].sort(() => 0.5 - Math.random());
    const width = this.cameras.main.width;
    const laneCount = Math.min(optionsToSpawn.length, 3);
    const laneWidth = (width - 80) / laneCount;

    optionsToSpawn.slice(0, laneCount).forEach((option, idx) => {
      const spawnX = 50 + idx * laneWidth + laneWidth / 2 + (Math.random() * 20 - 10);
      const spawnY = 120 + Math.random() * 20;

      this.createFruitItem(spawnX, spawnY, option, question);
    });

    this.currentQuestionIndex++;
  }

  private createFruitItem(x: number, y: number, option: OptionItem, question: CurriculumItem): void {
    const container = this.add.container(x, y);

    // Fruit Sprite (64x64px, touch hit target >= 48px)
    const fruitFrame = option.fruitType || 'apple';
    const sprite = this.add.image(0, -12, 'atlas', fruitFrame);
    sprite.setDisplaySize(64, 64);

    // Word Pill Badge
    const pillBg = this.add.graphics();
    pillBg.fillStyle(0xffffff, 0.95);
    pillBg.lineStyle(2, 0x0284c7, 1);
    const textLen = option.text.length;
    const pillW = Math.max(textLen * 11 + 24, 72);
    pillBg.fillRoundedRect(-pillW / 2, 16, pillW, 30, 10);
    pillBg.strokeRoundedRect(-pillW / 2, 16, pillW, 30, 10);

    const label = this.add.text(0, 31, option.text, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#0f172a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([sprite, pillBg, label]);
    container.setSize(Math.max(pillW, 64), 74);

    // Calculate fall speed (pixels per second to cross 600px in fallDurationMs)
    const speed = 600 / (this.fallDurationMs / 1000);

    const activeFruit: ActiveFruit = {
      container,
      sprite,
      label,
      option,
      question,
      speed,
      isCaught: false,
      hasMissed: false
    };

    // Tap-to-Catch Handler (Direct touch accessibility)
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      if (!this.isPaused && !this.isRemediating && !activeFruit.isCaught) {
        this.catchFruit(activeFruit);
      }
    });

    this.activeFruits.push(activeFruit);
  }

  update(_time: number, delta: number): void {
    if (this.isPaused || this.isRemediating) return;

    const deltaSeconds = delta / 1000;
    const height = this.cameras.main.height;

    for (let i = this.activeFruits.length - 1; i >= 0; i--) {
      const fruit = this.activeFruits[i]!;
      if (fruit.isCaught) continue;

      // Move fruit downward with delta time (deterministic across 60Hz and 120Hz displays)
      fruit.container.y += fruit.speed * deltaSeconds;

      // Check Basket Collision (Basket Catcher Mechanic)
      const fruitBounds = fruit.container.getBounds();
      const basketBounds = this.basket.getBounds();

      if (Phaser.Geom.Intersects.RectangleToRectangle(fruitBounds, basketBounds)) {
        this.catchFruit(fruit);
        continue;
      }

      // Check Miss (Fell past bottom grass line)
      if (fruit.container.y > height - 60 && !fruit.hasMissed) {
        fruit.hasMissed = true;
        this.handleMissedFruit(fruit);
      }

      // Cleanup offscreen fruit
      if (fruit.container.y > height + 50) {
        fruit.container.destroy();
        this.activeFruits.splice(i, 1);

        // Check if screen is clear to spawn next wave
        if (this.activeFruits.length === 0) {
          this.time.delayedCall(400, () => {
            this.spawnNextQuestionWave();
          });
        }
      }
    }
  }

  private catchFruit(fruit: ActiveFruit): void {
    fruit.isCaught = true;
    this.totalAttempts++;

    if (fruit.option.isCorrect) {
      this.handleCorrectCatch(fruit);
    } else {
      this.handleIncorrectCatch(fruit);
    }

    // Animate caught fruit disappearance
    this.tweens.add({
      targets: fruit.container,
      scale: 1.3,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        fruit.container.destroy();
        const idx = this.activeFruits.indexOf(fruit);
        if (idx !== -1) {
          this.activeFruits.splice(idx, 1);
        }

        // If no more fruits on screen, spawn next wave
        if (this.activeFruits.length === 0) {
          this.time.delayedCall(500, () => {
            this.spawnNextQuestionWave();
          });
        }
      }
    });
  }

  private async handleCorrectCatch(fruit: ActiveFruit): Promise<void> {
    this.correctAttempts++;
    this.combo++;

    // Audio chime + combo tone
    audioService.playCatch(this.combo >= 3);
    if (this.combo > 1) {
      audioService.playCombo(this.combo);
    }

    // Update score
    const points = 100 * Math.min(this.combo, 5);
    this.score += points;

    // Record correct catch & reset consecutive mistakes
    await storageService.recordCorrect(this.topic, fruit.question.subTopic, fruit.option.text);

    // Sparkle Particle Burst
    this.createSparkleBurst(fruit.container.x, fruit.container.y);

    // Update HUD
    this.hud.updateScore(this.score);
    this.hud.updateCombo(this.combo);

    // Explanatory Positive Feedback Flash Banner
    const explanation = fruit.option.explanation || fruit.question.explanation;
    if (explanation) {
      this.showFeedbackToast(explanation, '#10b981');
    }
  }

  private async handleIncorrectCatch(fruit: ActiveFruit): Promise<void> {
    this.combo = 0;
    this.hud.updateCombo(0);

    // Soft miss audio
    audioService.playMiss();

    // Deduct points (clamped to 0)
    this.score = Math.max(0, this.score - 25);
    this.hud.updateScore(this.score);

    // Shake camera gently
    this.cameras.main.shake(200, 0.008);

    // Red X Mark Animation
    const xMark = this.add.image(fruit.container.x, fruit.container.y, 'atlas', 'x-mark');
    xMark.setDisplaySize(54, 54);
    this.tweens.add({
      targets: xMark,
      scale: 1.4,
      alpha: 0,
      duration: 500,
      onComplete: () => xMark.destroy()
    });

    // Record error in storage
    const patternKey = fruit.question.subTopic || this.topic;
    const mistakeResult = await storageService.recordMistake(this.topic, patternKey, fruit.option.text);

    // Corrective feedback message
    const whyWrong = `"${fruit.option.text}" is not the target pattern!`;
    this.showFeedbackToast(whyWrong, '#ef4444');

    // Check for 3 consecutive mistakes -> Trigger Teaching Card Remediation
    if (mistakeResult.shouldTriggerRemediation) {
      this.triggerRemediation(fruit);
    }
  }

  private handleMissedFruit(fruit: ActiveFruit): void {
    if (fruit.option.isCorrect) {
      this.combo = 0;
      this.hud.updateCombo(0);

      const reminder = `Missed: "${fruit.option.text}" (${fruit.question.subTopic})`;
      this.showFeedbackToast(reminder, '#f59e0b');
    }
  }

  private triggerRemediation(fruit: ActiveFruit): void {
    this.isRemediating = true;

    // Dampen fall speed for next items
    this.fallDurationMs = Math.min(3600, this.fallDurationMs + 400);

    // Display TeachingCard remediation modal
    new TeachingCard(this, {
      word: fruit.question.targetAnswer,
      pattern: fruit.question.subTopic,
      explanation: fruit.question.explanation ?? `Remember: look for the '${fruit.question.subTopic}' pattern!`,
      ruleTitle: `Let's Review: ${fruit.question.subTopic}`,
      topic: this.topic,
      autoSpeak: true,
      onResume: () => {
        this.isRemediating = false;
      }
    });
  }

  private createSparkleBurst(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 70 + Math.random() * 40;
      const sparkle = this.add.image(x, y, 'atlas', 'sparkle');
      sparkle.setDisplaySize(24, 24);

      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private showFeedbackToast(message: string, bgColor: string): void {
    const width = this.cameras.main.width;
    const toast = this.add.container(width / 2, 195).setDepth(600);

    const textLen = message.length;
    const toastW = Math.min(width - 40, Math.max(260, textLen * 9 + 32));

    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color, 0.95);
    bg.fillRoundedRect(-toastW / 2, -18, toastW, 36, 18);

    const label = this.add.text(0, 0, message, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    toast.add([bg, label]);

    this.tweens.add({
      targets: toast,
      y: 180,
      alpha: 0,
      delay: 1000,
      duration: 400,
      onComplete: () => toast.destroy()
    });
  }

  private async finishLevel(): Promise<void> {
    const accuracy = this.totalAttempts > 0 ? (this.correctAttempts / this.totalAttempts) * 100 : 0;

    const result = await storageService.saveLevelResult(
      this.topic,
      this.levelNumber,
      accuracy,
      this.score,
      this.totalAttempts
    );

    const stars = result.stars;
    const isMastered = accuracy >= 85 || result.unlockedNextLevel;

    audioService.playLevelComplete();

    this.scene.start('RoundSummaryScene', {
      topic: this.topic,
      levelNumber: this.levelNumber,
      score: this.score,
      accuracy: Math.round(accuracy),
      stars,
      isMastered
    });
  }
}
