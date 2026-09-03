import { describe, it, expect, beforeEach } from 'vitest';
import { decorationService } from '../src/services/decoration.service';
import { DecorationCatalogSchema } from '../src/schema/decorations.schema';
import { StorageService } from '../src/services/storage.service';
import rawDecorations from '../data/decorations.json';
import rawAtlas from '../public/assets/atlas.json';

describe('Marketplace & Castle Decoration System', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.resetProgress();
  });

  describe('Decoration Catalog Schema & Data Validation', () => {
    it('validates data/decorations.json against DecorationCatalogSchema', () => {
      const parsed = DecorationCatalogSchema.safeParse(rawDecorations);
      expect(parsed.success).toBe(true);
    });

    it('contains both outside and inside items', () => {
      const outside = decorationService.getItemsByCategory('outside');
      const inside = decorationService.getItemsByCategory('inside');

      expect(outside.length).toBeGreaterThanOrEqual(6);
      expect(inside.length).toBeGreaterThanOrEqual(7);
    });

    it('all decoration icons exist in texture atlas.json', () => {
      const catalog = decorationService.getCatalog();
      const atlasFrames = Object.keys(rawAtlas.frames);

      expect(atlasFrames).toContain('coin-gold');

      for (const item of catalog.items) {
        expect(atlasFrames, `Missing atlas frame for item ${item.id}: ${item.icon}`).toContain(item.icon);
      }
    });

    it('retrieves specific items by id', () => {
      const fountain = decorationService.getItemById('crystal_fountain');
      expect(fountain).toBeDefined();
      expect(fountain?.category).toBe('outside');
      expect(fountain?.price).toBe(120);

      const throne = decorationService.getItemById('royal_throne');
      expect(throne).toBeDefined();
      expect(throne?.category).toBe('inside');
      expect(throne?.price).toBe(200);
    });
  });

  describe('StorageService Currency Engine', () => {
    it('initializes coin balance to 0', async () => {
      const coins = await storage.getCoins();
      expect(coins).toBe(0);
    });

    it('adds coins correctly', async () => {
      await storage.addCoins(50);
      expect(await storage.getCoins()).toBe(50);

      await storage.addCoins(100);
      expect(await storage.getCoins()).toBe(150);
    });

    it('spends coins when sufficient balance exists', async () => {
      await storage.addCoins(100);

      const success = await storage.spendCoins(40);
      expect(success).toBe(true);
      expect(await storage.getCoins()).toBe(60);
    });

    it('rejects spending when insufficient balance exists', async () => {
      await storage.addCoins(30);

      const success = await storage.spendCoins(50);
      expect(success).toBe(false);
      expect(await storage.getCoins()).toBe(30);
    });
  });

  describe('Marketplace Purchasing & Inventory', () => {
    it('purchases item and deducts coins', async () => {
      await storage.addCoins(100);

      const success = await storage.purchaseItem('rose_topiary', 60);
      expect(success).toBe(true);
      expect(await storage.getCoins()).toBe(40);

      const inventory = await storage.getInventory();
      expect(inventory).toContain('rose_topiary');
      expect(await storage.isItemOwned('rose_topiary')).toBe(true);
    });

    it('blocks purchase when balance is insufficient', async () => {
      await storage.addCoins(50);

      const success = await storage.purchaseItem('rose_topiary', 60);
      expect(success).toBe(false);
      expect(await storage.getCoins()).toBe(50);
      expect(await storage.isItemOwned('rose_topiary')).toBe(false);
    });

    it('does not double charge for already owned items', async () => {
      await storage.addCoins(200);

      await storage.purchaseItem('rose_topiary', 60);
      expect(await storage.getCoins()).toBe(140);

      const secondAttempt = await storage.purchaseItem('rose_topiary', 60);
      expect(secondAttempt).toBe(true);
      expect(await storage.getCoins()).toBe(140); // Not charged again
    });
  });

  describe('Castle Decoration Placement', () => {
    it('places and removes decorations in outside and inside slots', async () => {
      await storage.addCoins(300);
      await storage.purchaseItem('crystal_fountain', 120);
      await storage.purchaseItem('royal_throne', 200);

      // Place fountain in outside centerpiece
      await storage.placeDecoration('outside', 'centerpiece', 'crystal_fountain');
      let placed = (await storage.getProgress()).placedDecorations;
      expect(placed.outside['centerpiece']).toBe('crystal_fountain');

      // Place throne in inside throne slot
      await storage.placeDecoration('inside', 'throne', 'royal_throne');
      placed = (await storage.getProgress()).placedDecorations;
      expect(placed.inside['throne']).toBe('royal_throne');

      // Remove fountain
      await storage.removeDecoration('outside', 'centerpiece');
      placed = (await storage.getProgress()).placedDecorations;
      expect(placed.outside['centerpiece']).toBeUndefined();
      expect(placed.inside['throne']).toBe('royal_throne');
    });
  });
});
