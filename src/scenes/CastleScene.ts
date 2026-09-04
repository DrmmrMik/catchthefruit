import Phaser from 'phaser';
import { storageService } from '../services/storage.service';
import { audioService } from '../services/audio.service';
import { decorationService } from '../services/decoration.service';
import { DecorationCategory, DecorationItem, DecorationSlotType } from '../schema/decorations.schema';

interface SlotDefinition {
  id: string;
  name: string;
  category: DecorationCategory;
  slotType: DecorationSlotType;
  x: number;
  y: number;
}

export class CastleScene extends Phaser.Scene {
  private currentView: DecorationCategory = 'outside';
  private background!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private coins: number = 0;
  private inventory: string[] = [];
  private placedDecorations: { outside: Record<string, string>; inside: Record<string, string> } = {
    outside: {},
    inside: {}
  };
  private slotContainers: Phaser.GameObjects.Container[] = [];
  private princess?: Phaser.GameObjects.Sprite;
  private returnTo: string = 'MenuScene';
  private modalContainer?: Phaser.GameObjects.Container;

  private outsideSlots: SlotDefinition[] = [
    { id: 'banners', name: 'Tower Banners', category: 'outside', slotType: 'banners', x: 270, y: 190 },
    { id: 'gate', name: 'Path Lamppost', category: 'outside', slotType: 'gate', x: 440, y: 550 },
    { id: 'centerpiece', name: 'Courtyard Patio', category: 'outside', slotType: 'centerpiece', x: 270, y: 640 },
    { id: 'garden_left', name: 'Rose Garden Left', category: 'outside', slotType: 'garden', x: 95, y: 680 },
    { id: 'garden_right', name: 'Rose Garden Right', category: 'outside', slotType: 'garden', x: 445, y: 680 }
  ];

  private insideSlots: SlotDefinition[] = [
    { id: 'chandelier', name: 'Crystal Chandelier', category: 'inside', slotType: 'wall', x: 270, y: 135 },
    { id: 'wall', name: 'Gallery Mirror', category: 'inside', slotType: 'wall', x: 80, y: 310 },
    { id: 'throne', name: 'Royal Throne', category: 'inside', slotType: 'throne', x: 270, y: 570 },
    { id: 'table', name: 'Tea & Books Table', category: 'inside', slotType: 'table', x: 100, y: 660 },
    { id: 'seating', name: 'Cozy Parlor Seating', category: 'inside', slotType: 'seating', x: 435, y: 660 }
  ];

  constructor() {
    super({ key: 'CastleScene' });
  }

  init(data?: { returnTo?: string; initialView?: DecorationCategory }): void {
    if (data?.returnTo) this.returnTo = data.returnTo;
    if (data?.initialView) this.currentView = data.initialView;
  }

  async create(): Promise<void> {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Load user storage data
    await this.refreshStorageData();

    // 1. Background Image (scaled to fill 540x960 canvas)
    this.background = this.add.image(width / 2, height / 2, this.currentView === 'outside' ? 'castle-exterior' : 'castle-interior')
      .setDisplaySize(width, height)
      .setDepth(0);

    // 2. Top Navigation Bar (Header)
    this.createHeader(width);

    // 3. Render Placement Slots for current view
    this.renderSlots();

    // 4. Princess Penelope in Scene
    this.createPrincess(width, height);

    // 5. Bottom Action Bar: "Open Marketplace" Button
    this.createBottomBar(width, height);
  }

  private async refreshStorageData(): Promise<void> {
    const progress = await storageService.getProgress();
    this.coins = progress.coins ?? 0;
    this.inventory = progress.inventory ?? [];
    this.placedDecorations = progress.placedDecorations ?? { outside: {}, inside: {} };
  }

  private createHeader(width: number): void {
    const headerBg = this.add.graphics().setDepth(10);
    headerBg.fillStyle(0x0f172a, 0.45);
    headerBg.fillRect(0, 0, width, 60);

    // Back Button
    const backBtn = this.add.text(18, 16, '◀ Back', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(11).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      audioService.playClick();
      this.scene.start(this.returnTo);
    });

    // Coin Display Pill (Top Right)
    const coinPill = this.add.container(width - 80, 28).setDepth(11);
    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x000000, 0.5);
    pillBg.lineStyle(1.5, 0xfacc15, 1);
    pillBg.fillRoundedRect(-60, -16, 120, 32, 16);
    pillBg.strokeRoundedRect(-60, -16, 120, 32, 16);

    const coinIcon = this.add.image(-40, 0, 'atlas', 'coin-gold').setDisplaySize(24, 24);
    this.coinText = this.add.text(-22, 0, `${this.coins}`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '15px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    coinPill.add([pillBg, coinIcon, this.coinText]);

    // View Toggle Tabs (Outside vs Inside)
    this.createViewToggle(width);
  }

  private createViewToggle(width: number): void {
    const toggleContainer = this.add.container(width / 2, 85).setDepth(10);

    const outsideBtn = this.createTabButton(-105, 0, '🏰 Grounds', this.currentView === 'outside', () => {
      this.switchView('outside');
    });

    const insideBtn = this.createTabButton(105, 0, '👑 Parlor', this.currentView === 'inside', () => {
      this.switchView('inside');
    });

    toggleContainer.add([outsideBtn, insideBtn]);
  }

  private createTabButton(x: number, y: number, text: string, isActive: boolean, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 190, 36, isActive ? 0x0284c7 : 0x0f172a, isActive ? 0.95 : 0.65)
      .setStrokeStyle(isActive ? 2 : 1, isActive ? 0x38bdf8 : 0x94a3b8)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      audioService.playClick();
      onClick();
    });

    container.add([bg, label]);
    return container;
  }

  private switchView(view: DecorationCategory): void {
    if (this.currentView === view) return;
    this.currentView = view;

    // Update background texture
    this.background.setTexture(view === 'outside' ? 'castle-exterior' : 'castle-interior');

    // Re-render slots
    this.renderSlots();

    // Re-draw toggle buttons
    const width = this.cameras.main.width;
    this.createViewToggle(width);
  }

  private renderSlots(): void {
    // Clear previous slot containers
    for (const container of this.slotContainers) {
      container.destroy();
    }
    this.slotContainers = [];

    const slots = this.currentView === 'outside' ? this.outsideSlots : this.insideSlots;
    const placed = this.placedDecorations[this.currentView] || {};

    for (const slot of slots) {
      const container = this.add.container(slot.x, slot.y).setDepth(5);
      const placedItemId = placed[slot.id];
      const placedItem = placedItemId ? decorationService.getItemById(placedItemId) : undefined;

      if (placedItem) {
        // Grounding drop shadow for 2D floor/patio items
        if (slot.slotType !== 'banners' && slot.slotType !== 'wall') {
          const shadow = this.add.ellipse(0, (slot.slotType === 'centerpiece' || slot.slotType === 'throne' ? 52 : 44) - 4, 76, 14, 0x000000, 0.26);
          container.add(shadow);
        }

        // Render placed decoration sprite
        const sprite = this.add.image(0, 0, 'atlas', placedItem.icon);
        const targetSize = slot.slotType === 'centerpiece' || slot.slotType === 'throne' ? 104 : 88;
        sprite.setDisplaySize(targetSize, targetSize);

        // Gentle floating hover tween
        this.tweens.add({
          targets: sprite,
          y: -4,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        // Small badge label showing item name
        const nameBadge = this.add.text(0, 48, placedItem.name, {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: '#0f172acc',
          padding: { left: 6, right: 6, top: 2, bottom: 2 }
        }).setOrigin(0.5);

        container.add([sprite, nameBadge]);

        // Clicking occupied slot gives option to swap or remove
        container.setInteractive(
          new Phaser.Geom.Rectangle(-targetSize / 2, -targetSize / 2, targetSize, targetSize + 24),
          Phaser.Geom.Rectangle.Contains
        );
        container.input!.cursor = 'pointer';
        container.on('pointerdown', () => {
          audioService.playClick();
          this.openSlotActions(slot, placedItem);
        });
      } else {
        // Render 2D flat placement mat / bracket
        const isWallSlot = slot.slotType === 'banners' || slot.slotType === 'wall';
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 0.55);
        bg.lineStyle(2, 0x38bdf8, 0.9);

        if (isWallSlot) {
          bg.fillRoundedRect(-36, -20, 72, 40, 10);
          bg.strokeRoundedRect(-36, -20, 72, 40, 10);
        } else {
          bg.fillEllipse(0, 4, 80, 38);
          bg.strokeEllipse(0, 4, 80, 38);
        }

        const plusText = this.add.text(0, -4, '+', {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '22px',
          color: '#0284c7',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        const slotLabel = this.add.text(0, 14, 'Place', {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '11px',
          color: '#0369a1',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, plusText, slotLabel]);

        // Pulsing glow tween on empty slot
        this.tweens.add({
          targets: container,
          scale: 1.06,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        container.setInteractive(
          new Phaser.Geom.Rectangle(-45, -25, 90, 50),
          Phaser.Geom.Rectangle.Contains
        );
        container.input!.cursor = 'pointer';
        container.on('pointerdown', () => {
          audioService.playClick();
          this.openInventoryPicker(slot);
        });
      }

      this.slotContainers.push(container);
    }
  }

  private createPrincess(width: number, height: number): void {
    const x = width / 2;
    const y = height - 105;

    // Grounding shadow under Penelope's sneakers
    this.add.ellipse(x, y + 44, 52, 14, 0x000000, 0.25).setDepth(5);

    this.princess = this.add.sprite(x, y, 'atlas', 'princess-idle-1')
      .setDepth(6)
      .setDisplaySize(72, 96);

    if (this.anims.exists('princess-idle')) {
      this.princess.play('princess-idle');
    }

    this.princess.setInteractive({ useHandCursor: true });
    this.princess.on('pointerdown', () => {
      this.celebratePrincess();
    });
  }

  private celebratePrincess(): void {
    if (!this.princess) return;

    audioService.playCatch(true);
    this.princess.stop();
    this.princess.setFrame('princess-catch');

    const startY = this.cameras.main.height - 105;
    this.tweens.add({
      targets: this.princess,
      y: startY - 20,
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.princess && this.anims.exists('princess-idle')) {
          this.princess.play('princess-idle');
        }
      }
    });

    // Sparkle burst
    for (let i = 0; i < 6; i++) {
      const sp = this.add.image(
        this.princess.x + Phaser.Math.Between(-35, 35),
        this.princess.y - 40 + Phaser.Math.Between(-20, 20),
        'atlas',
        'sparkle'
      ).setDepth(20).setScale(0.8);

      this.tweens.add({
        targets: sp,
        y: sp.y - 30,
        alpha: 0,
        duration: 500 + i * 80,
        onComplete: () => sp.destroy()
      });
    }

    const remarks = [
      "Welcome to my castle!",
      "Our castle is looking so cozy!",
      "Princesses get things done!"
    ];
    const speech = remarks[Math.floor(Math.random() * remarks.length)]!;
    audioService.playClick();
    this.showSpeechBubble(this.princess.x, this.princess.y - 70, speech);
  }

  private showSpeechBubble(x: number, y: number, text: string): void {
    const bubble = this.add.container(x, y).setDepth(30);
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xffffff, 0.95);
    bubbleBg.lineStyle(2, 0xd946ef, 1.0);
    bubbleBg.fillRoundedRect(-120, -22, 240, 44, 16);
    bubbleBg.strokeRoundedRect(-120, -22, 240, 44, 16);
    bubble.add(bubbleBg);

    const bubbleText = this.add.text(0, 0, text, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '13px',
      color: '#4a044e',
      align: 'center'
    }).setOrigin(0.5);
    bubble.add(bubbleText);

    this.tweens.add({
      targets: bubble,
      y: y - 20,
      alpha: { from: 1, to: 0 },
      delay: 2000,
      duration: 500,
      onComplete: () => bubble.destroy()
    });
  }

  private createBottomBar(width: number, height: number): void {
    const marketBtn = this.add.container(width / 2, height - 36).setDepth(15);

    const bg = this.add.graphics();
    bg.fillStyle(0xd946ef, 1);
    bg.lineStyle(2, 0xfdf4ff, 0.9);
    bg.fillRoundedRect(-140, -22, 280, 44, 22);
    bg.strokeRoundedRect(-140, -22, 280, 44, 22);

    const icon = this.add.text(-105, 0, '🛍️', { fontSize: '20px' }).setOrigin(0.5);
    const label = this.add.text(10, 0, 'ROYAL MARKETPLACE', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    marketBtn.add([bg, icon, label]);
    marketBtn.setSize(280, 44);
    marketBtn.setInteractive({ useHandCursor: true });
    marketBtn.on('pointerdown', () => {
      audioService.playClick();
      this.openMarketplaceModal();
    });
  }

  // ==========================================================================
  // MODALS: INVENTORY PICKER & MARKETPLACE
  // ==========================================================================

  private openInventoryPicker(slot: SlotDefinition): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Filter owned items that match this slot's category
    const availableItems = decorationService.getItemsByCategory(slot.category)
      .filter(item => this.inventory.includes(item.id));

    this.closeModal();

    this.modalContainer = this.add.container(0, 0).setDepth(30);

    // Dim backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x0f172a, 0.7);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.modalContainer.add(backdrop);

    // Card Window
    const modalW = 440;
    const modalH = 460;
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xffffff, 1);
    cardBg.lineStyle(3, 0x0284c7, 1);
    cardBg.fillRoundedRect((width - modalW) / 2, (height - modalH) / 2, modalW, modalH, 20);
    cardBg.strokeRoundedRect((width - modalW) / 2, (height - modalH) / 2, modalW, modalH, 20);
    this.modalContainer.add(cardBg);

    // Title
    const title = this.add.text(width / 2, (height - modalH) / 2 + 35, `Place on ${slot.name}`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '18px',
      color: '#0f172a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.modalContainer.add(title);

    // Close button (X)
    const closeBtn = this.add.text((width + modalW) / 2 - 25, (height - modalH) / 2 + 25, '✕', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '20px',
      color: '#64748b',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeModal());
    this.modalContainer.add(closeBtn);

    if (availableItems.length === 0) {
      const emptyText = this.add.text(width / 2, height / 2 - 20, "You haven't bought any decorations\nfor this area yet!", {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '15px',
        color: '#64748b',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5);

      const shopBtn = this.add.container(width / 2, height / 2 + 50);
      const sbg = this.add.graphics();
      sbg.fillStyle(0xd946ef, 1);
      sbg.fillRoundedRect(-110, -20, 220, 40, 20);
      const slbl = this.add.text(0, 0, '🛍️ Visit Marketplace', {
        fontFamily: 'Lexend, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      shopBtn.add([sbg, slbl]);
      shopBtn.setSize(220, 40);
      shopBtn.setInteractive({ useHandCursor: true });
      shopBtn.on('pointerdown', () => {
        audioService.playClick();
        this.closeModal();
        this.openMarketplaceModal();
      });

      this.modalContainer.add([emptyText, shopBtn]);
    } else {
      // List owned items
      let itemY = (height - modalH) / 2 + 80;
      for (const item of availableItems) {
        const itemRow = this.add.container(width / 2, itemY);

        const rbg = this.add.graphics();
        rbg.fillStyle(0xf1f5f9, 1);
        rbg.lineStyle(1, 0xcbd5e1, 1);
        rbg.fillRoundedRect(-190, -28, 380, 56, 12);
        rbg.strokeRoundedRect(-190, -28, 380, 56, 12);

        const icon = this.add.image(-155, 0, 'atlas', item.icon).setDisplaySize(44, 44);
        const name = this.add.text(-120, -10, item.name, {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '14px',
          color: '#0f172a',
          fontStyle: 'bold'
        });

        const placeBtn = this.add.container(130, 0);
        const pbg = this.add.graphics();
        pbg.fillStyle(0x10b981, 1);
        pbg.fillRoundedRect(-45, -16, 90, 32, 16);
        const plbl = this.add.text(0, 0, 'Place', {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '13px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        placeBtn.add([pbg, plbl]);
        placeBtn.setSize(90, 32);
        placeBtn.setInteractive({ useHandCursor: true });
        placeBtn.on('pointerdown', async () => {
          audioService.playCatch(true);
          await storageService.placeDecoration(slot.category, slot.id, item.id);
          await this.refreshStorageData();
          this.closeModal();
          this.renderSlots();
          this.celebratePrincess();
        });

        itemRow.add([rbg, icon, name, placeBtn]);
        this.modalContainer.add(itemRow);
        itemY += 66;
      }
    }
  }

  private openSlotActions(slot: SlotDefinition, placedItem: DecorationItem): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.closeModal();
    this.modalContainer = this.add.container(0, 0).setDepth(30);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x0f172a, 0.7);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.modalContainer.add(backdrop);

    const modalW = 380;
    const modalH = 320;
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xffffff, 1);
    cardBg.lineStyle(3, 0x0284c7, 1);
    cardBg.fillRoundedRect((width - modalW) / 2, (height - modalH) / 2, modalW, modalH, 20);
    cardBg.strokeRoundedRect((width - modalW) / 2, (height - modalH) / 2, modalW, modalH, 20);
    this.modalContainer.add(cardBg);

    const icon = this.add.image(width / 2, (height - modalH) / 2 + 70, 'atlas', placedItem.icon).setDisplaySize(72, 72);
    const title = this.add.text(width / 2, (height - modalH) / 2 + 125, placedItem.name, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '17px',
      color: '#0f172a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Swap Button
    const swapBtn = this.add.container(width / 2, (height - modalH) / 2 + 180);
    const sbg = this.add.graphics();
    sbg.fillStyle(0x0284c7, 1);
    sbg.fillRoundedRect(-110, -20, 220, 40, 20);
    const slbl = this.add.text(0, 0, '🔄 Swap Item', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    swapBtn.add([sbg, slbl]);
    swapBtn.setSize(220, 40);
    swapBtn.setInteractive({ useHandCursor: true });
    swapBtn.on('pointerdown', () => {
      audioService.playClick();
      this.openInventoryPicker(slot);
    });

    // Remove Button
    const removeBtn = this.add.container(width / 2, (height - modalH) / 2 + 235);
    const rbg = this.add.graphics();
    rbg.fillStyle(0xef4444, 1);
    rbg.fillRoundedRect(-110, -20, 220, 40, 20);
    const rlbl = this.add.text(0, 0, '🗑️ Put in Storage', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    removeBtn.add([rbg, rlbl]);
    removeBtn.setSize(220, 40);
    removeBtn.setInteractive({ useHandCursor: true });
    removeBtn.on('pointerdown', async () => {
      audioService.playClick();
      await storageService.removeDecoration(slot.category, slot.id);
      await this.refreshStorageData();
      this.closeModal();
      this.renderSlots();
    });

    // Close button (X)
    const closeBtn = this.add.text((width + modalW) / 2 - 25, (height - modalH) / 2 + 25, '✕', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '20px',
      color: '#64748b',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeModal());

    this.modalContainer.add([icon, title, swapBtn, removeBtn, closeBtn]);
  }

  private openMarketplaceModal(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.closeModal();
    this.modalContainer = this.add.container(0, 0).setDepth(30);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x0f172a, 0.75);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.modalContainer.add(backdrop);

    const modalW = 480;
    const modalH = 680;
    const modalY = (height - modalH) / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xffffff, 1);
    cardBg.lineStyle(3, 0xd946ef, 1);
    cardBg.fillRoundedRect((width - modalW) / 2, modalY, modalW, modalH, 24);
    cardBg.strokeRoundedRect((width - modalW) / 2, modalY, modalW, modalH, 24);
    this.modalContainer.add(cardBg);

    // Header
    const title = this.add.text(width / 2, modalY + 36, '🛍️ ROYAL MARKETPLACE 🛍️', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '20px',
      color: '#c026d3',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, modalY + 62, `Balance: ${this.coins} Princess Coins 🪙`, {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      color: '#d97706',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close button (X)
    const closeBtn = this.add.text((width + modalW) / 2 - 28, modalY + 32, '✕', {
      fontFamily: 'Lexend, sans-serif',
      fontSize: '22px',
      color: '#64748b',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeModal());

    this.modalContainer.add([title, subtitle, closeBtn]);

    // Marketplace Category Tabs
    let activeMarketCategory: DecorationCategory = this.currentView;
    const renderCatalog = (cat: DecorationCategory) => {
      activeMarketCategory = cat;
      const items = decorationService.getItemsByCategory(cat);

      // Remove existing item rows
      if ((this.modalContainer as any).__itemsGroup) {
        (this.modalContainer as any).__itemsGroup.destroy();
      }

      const itemsGroup = this.add.container(0, 0);
      (this.modalContainer as any).__itemsGroup = itemsGroup;

      let rowY = modalY + 145;
      for (const item of items) {
        const isOwned = this.inventory.includes(item.id);
        const canAfford = this.coins >= item.price;

        const row = this.add.container(width / 2, rowY);
        const rbg = this.add.graphics();
        rbg.fillStyle(isOwned ? 0xf0fdf4 : 0xf8fafc, 1);
        rbg.lineStyle(1.5, isOwned ? 0x86efac : 0xe2e8f0, 1);
        rbg.fillRoundedRect(-215, -34, 430, 68, 14);
        rbg.strokeRoundedRect(-215, -34, 430, 68, 14);

        const icon = this.add.image(-175, 0, 'atlas', item.icon).setDisplaySize(54, 54);

        const name = this.add.text(-135, -20, item.name, {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '13px',
          color: '#0f172a',
          fontStyle: 'bold'
        });

        const desc = this.add.text(-135, 0, item.description, {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '10px',
          color: '#64748b',
          wordWrap: { width: 220 }
        });

        // Price / Status Button
        const buyBtn = this.add.container(160, 0);
        const bbg = this.add.graphics();
        let btnText = '';

        if (isOwned) {
          bbg.fillStyle(0x10b981, 1);
          btnText = 'OWNED ✓';
        } else if (canAfford) {
          bbg.fillStyle(0xd946ef, 1);
          btnText = `${item.price} 🪙`;
          buyBtn.setInteractive({ useHandCursor: true });
          buyBtn.on('pointerdown', async () => {
            const success = await storageService.purchaseItem(item.id, item.price);
            if (success) {
              audioService.playCatch(true);
              await this.refreshStorageData();
              this.coinText.setText(`${this.coins}`);
              subtitle.setText(`Balance: ${this.coins} Princess Coins 🪙`);
              renderCatalog(activeMarketCategory);
              this.renderSlots();
            }
          });
        } else {
          bbg.fillStyle(0x94a3b8, 1);
          btnText = `${item.price} 🪙`;
        }

        bbg.fillRoundedRect(-45, -16, 90, 32, 16);
        const blbl = this.add.text(0, 0, btnText, {
          fontFamily: 'Lexend, sans-serif',
          fontSize: '12px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        buyBtn.add([bbg, blbl]);
        buyBtn.setSize(90, 32);

        row.add([rbg, icon, name, desc, buyBtn]);
        itemsGroup.add(row);
        rowY += 76;
      }

      this.modalContainer?.add(itemsGroup);
    };

    // Category Tabs in Marketplace
    const tabOutside = this.createTabButton(width / 2 - 100, modalY + 100, '🌸 Outside Decor', activeMarketCategory === 'outside', () => {
      renderCatalog('outside');
    });

    const tabInside = this.createTabButton(width / 2 + 100, modalY + 100, '🛋️ Inside Furniture', activeMarketCategory === 'inside', () => {
      renderCatalog('inside');
    });

    this.modalContainer.add([tabOutside, tabInside]);
    renderCatalog(activeMarketCategory);
  }

  private closeModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy();
      this.modalContainer = undefined;
    }
  }
}
