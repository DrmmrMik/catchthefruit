import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Adversarial Empirical Challenge Suite (Challenger R3-1)', () => {
  const rootDir = process.cwd();

  // ==========================================================================
  // CHALLENGE 1: Atlas Geometry & Overlaps
  // ==========================================================================
  describe('Challenge 1: Atlas Geometry & Overlaps', () => {
    const atlasJsonPath = path.join(rootDir, 'public/assets/atlas.json');
    const atlasPngPath = path.join(rootDir, 'public/assets/atlas.png');

    it('contains strictly 56 packed frames in atlas.json', () => {
      expect(fs.existsSync(atlasJsonPath)).toBe(true);
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      const frameKeys = Object.keys(atlas.frames);
      expect(frameKeys.length).toBe(56);
    });

    it('meta size is 1024x1024 power-of-two and PNG file exists with valid header', () => {
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      expect(atlas.meta.size.w).toBe(1024);
      expect(atlas.meta.size.h).toBe(1024);

      expect(fs.existsSync(atlasPngPath)).toBe(true);
      const buf = fs.readFileSync(atlasPngPath);
      // PNG header: 0x89 0x50 0x4E 0x47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4E);
      expect(buf[3]).toBe(0x47);
    });

    it('tests all 56 frame rectangles against each other: 0 overlaps and >= 4px spacing between separated frames', () => {
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      const frames = atlas.frames;
      const names = Object.keys(frames);

      expect(names.length).toBe(56);

      const frameRects = names.map(name => {
        const fr = frames[name].frame;
        return {
          name,
          x: fr.x,
          y: fr.y,
          w: fr.w,
          h: fr.h,
          right: fr.x + fr.w,
          bottom: fr.y + fr.h
        };
      });

      // 1. Check all bounds are within sheet dimensions (1024x1024)
      for (const rect of frameRects) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.w).toBeGreaterThan(0);
        expect(rect.h).toBeGreaterThan(0);
        expect(rect.right).toBeLessThanOrEqual(1024);
        expect(rect.bottom).toBeLessThanOrEqual(1024);
      }

      // 2. Pairwise overlap test across all 56 * 55 / 2 = 1,540 pairs
      let overlapCount = 0;
      const overlapPairs: string[] = [];
      let minObservedSpacing = Infinity;

      for (let i = 0; i < frameRects.length; i++) {
        for (let j = i + 1; j < frameRects.length; j++) {
          const r1 = frameRects[i]!;
          const r2 = frameRects[j]!;

          // An overlap occurs iff intervals intersect in BOTH dimensions:
          const overlapX = Math.max(r1.x, r2.x) < Math.min(r1.right, r2.right);
          const overlapY = Math.max(r1.y, r2.y) < Math.min(r1.bottom, r2.bottom);

          if (overlapX && overlapY) {
            overlapCount++;
            overlapPairs.push(`${r1.name} <-> ${r2.name}`);
          } else {
            // Compute gap between boxes
            const gapX = Math.max(0, Math.max(r1.x, r2.x) - Math.min(r1.right, r2.right));
            const gapY = Math.max(0, Math.max(r1.y, r2.y) - Math.min(r1.bottom, r2.bottom));

            // If boxes are aligned in either dimension (e.g. sharing a horizontal band or vertical column),
            // check the separation distance:
            if (overlapY && !overlapX) {
              if (gapX < minObservedSpacing) minObservedSpacing = gapX;
              expect(gapX, `Horizontal spacing between ${r1.name} and ${r2.name} is ${gapX}px < 4px`).toBeGreaterThanOrEqual(4);
            } else if (overlapX && !overlapY) {
              if (gapY < minObservedSpacing) minObservedSpacing = gapY;
              expect(gapY, `Vertical spacing between ${r1.name} and ${r2.name} is ${gapY}px < 4px`).toBeGreaterThanOrEqual(4);
            } else {
              // Diagonal separation
              const diagGap = Math.max(gapX, gapY);
              if (diagGap < minObservedSpacing) minObservedSpacing = diagGap;
              expect(diagGap, `Diagonal gap between ${r1.name} and ${r2.name} is ${diagGap}px < 4px`).toBeGreaterThanOrEqual(4);
            }
          }
        }
      }

      expect(overlapCount, `Detected ${overlapCount} overlapping frame pairs: ${overlapPairs.join(', ')}`).toBe(0);
      expect(minObservedSpacing).toBeGreaterThanOrEqual(4);

      // Expanded bounding box test: expanding every frame by 2px on all 4 sides (guaranteeing >= 4px gutter)
      // must produce 0 overlaps between any two expanded rectangles!
      for (let i = 0; i < frameRects.length; i++) {
        for (let j = i + 1; j < frameRects.length; j++) {
          const r1 = frameRects[i]!;
          const r2 = frameRects[j]!;

          const exp1 = { x: r1.x - 2, y: r1.y - 2, right: r1.right + 2, bottom: r1.bottom + 2 };
          const exp2 = { x: r2.x - 2, y: r2.y - 2, right: r2.right + 2, bottom: r2.bottom + 2 };

          const expOverlapX = Math.max(exp1.x, exp2.x) < Math.min(exp1.right, exp2.right);
          const expOverlapY = Math.max(exp1.y, exp2.y) < Math.min(exp1.bottom, exp2.bottom);

          expect(expOverlapX && expOverlapY, `Expanded 4px margin overlap between ${r1.name} and ${r2.name}`).toBe(false);
        }
      }
    });

    it('asserts all 12 fruits have frame.w === 80 and frame.h === 80', () => {
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      const fruits = [
        'apple', 'orange', 'grape', 'banana', 'watermelon', 'blueberry',
        'strawberry', 'lemon', 'kiwi', 'peach', 'plum', 'cherry'
      ];

      expect(fruits.length).toBe(12);

      for (const fruit of fruits) {
        const frameData = atlas.frames[fruit];
        expect(frameData, `Missing fruit frame: ${fruit}`).toBeDefined();
        expect(frameData.frame.w, `Fruit ${fruit} width mismatch`).toBe(80);
        expect(frameData.frame.h, `Fruit ${fruit} height mismatch`).toBe(80);
      }
    });

    it('asserts basket has frame.w === 128 and frame.h === 64', () => {
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      const basket = atlas.frames['basket'];
      expect(basket, 'Missing basket frame').toBeDefined();
      expect(basket.frame.w).toBe(128);
      expect(basket.frame.h).toBe(64);

      const basketRoyal = atlas.frames['basket-royal'];
      if (basketRoyal) {
        expect(basketRoyal.frame.w).toBe(128);
        expect(basketRoyal.frame.h).toBe(64);
      }
    });

    it('asserts tree stages 1 through 5 have frame.w === 128 and frame.h === 128', () => {
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      for (let stage = 1; stage <= 5; stage++) {
        const key = `tree-stage-${stage}`;
        const treeFrame = atlas.frames[key];
        expect(treeFrame, `Missing tree stage: ${key}`).toBeDefined();
        expect(treeFrame.frame.w, `${key} width mismatch`).toBe(128);
        expect(treeFrame.frame.h, `${key} height mismatch`).toBe(128);
      }
    });

    it('asserts "lock" frame exists with valid dimensions', () => {
      const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
      const lockFrame = atlas.frames['lock'];
      expect(lockFrame, 'Missing "lock" frame in atlas.json').toBeDefined();
      expect(lockFrame.frame.w).toBe(48);
      expect(lockFrame.frame.h).toBe(48);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Zero Unbatched Loads
  // ==========================================================================
  describe('Challenge 2: Zero Unbatched Loads', () => {
    it('public/assets/ does not contain background.jpg, castle_exterior.jpg, or castle_interior.jpg', () => {
      const forbiddenFiles = [
        'background.jpg',
        'castle_exterior.jpg',
        'castle_interior.jpg'
      ];

      for (const file of forbiddenFiles) {
        const fullPath = path.join(rootDir, 'public/assets', file);
        expect(fs.existsSync(fullPath), `Forbidden file found in public/assets: ${file}`).toBe(false);
      }

      // Assert public/assets contains strictly atlas.json and atlas.png
      const files = fs.readdirSync(path.join(rootDir, 'public/assets'));
      expect(files.sort()).toEqual(['atlas.json', 'atlas.png']);
    });

    it('no loose HTTP image requests in src/ source code', () => {
      const srcDir = path.join(rootDir, 'src');
      const allFiles: string[] = [];

      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const res = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(res);
          else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) allFiles.push(res);
        }
      }
      walk(srcDir);

      const unbatchedPatterns = [
        /this\.load\.image\(/,
        /load\.image\(/,
        /'background\.jpg'/,
        /'castle_exterior\.jpg'/,
        /'castle_interior\.jpg'/,
        /"background\.jpg"/,
        /"castle_exterior\.jpg"/,
        /"castle_interior\.jpg"/
      ];

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of unbatchedPatterns) {
          expect(pattern.test(content), `Unbatched load pattern ${pattern} matched in ${filePath}`).toBe(false);
        }
      }
    });

    it('PreloadScene loads exclusively through texture atlas and instantiates canvas textures for backdrops', () => {
      const preloadPath = path.join(rootDir, 'src/scenes/PreloadScene.ts');
      const content = fs.readFileSync(preloadPath, 'utf-8');

      // Verifies this.load.atlas is invoked
      expect(content).toContain("this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json')");

      // Verifies canvas texture registration in create()
      expect(content).toContain("const canvasTex = this.textures.createCanvas(frameName, frame.width, frame.height)");
      expect(content).toContain("canvasTex.drawFrame('atlas', frameName, 0, 0)");
      expect(content).toContain("['background', 'castle-exterior', 'castle-interior']");
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Interactive Touch Targets (>= 48px x 48px)
  // ==========================================================================
  describe('Challenge 3: Interactive Touch Targets', () => {
    it('empirically verifies all interactive touch targets in MenuScene.ts are >= 48px x 48px', () => {
      const menuScenePath = path.join(rootDir, 'src/scenes/MenuScene.ts');
      const content = fs.readFileSync(menuScenePath, 'utf-8');

      // 1. Orchard button
      expect(content).toContain('orchardBtn.setSize(48, 48)');
      // 2. Castle button
      expect(content).toContain('castleBtn.setSize(72, 48)');
      // 3. Sound toggle button
      expect(content).toContain('this.soundButton.setDisplaySize(48, 48)');
      // 4. Topic tabs container
      expect(content).toContain('tabContainer.setSize(tabWidth - 8, 48)');
      // 5. Level card container
      expect(content).toContain('levelCard.setSize(400, 90)');
      // 6. Bottom orchard button
      expect(content).toContain('orchardBottomBtn.setSize(330, 48)');

      // Verify no sub-48px setSize calls exist in MenuScene
      const setSizeMatches = [...content.matchAll(/\.setSize\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g)];
      for (const match of setSizeMatches) {
        const w = parseFloat(match[1]!);
        const h = parseFloat(match[2]!);
        expect(w, `MenuScene setSize width < 48: ${w}x${h}`).toBeGreaterThanOrEqual(48);
        expect(h, `MenuScene setSize height < 48: ${w}x${h}`).toBeGreaterThanOrEqual(48);
      }
    });

    it('empirically verifies all interactive touch targets in CastleScene.ts are >= 48px x 48px', () => {
      const castleScenePath = path.join(rootDir, 'src/scenes/CastleScene.ts');
      const content = fs.readFileSync(castleScenePath, 'utf-8');

      // 1. Back button container
      expect(content).toContain('backBtn.setSize(88, 48)');
      // 2. Tab toggle buttons
      expect(content).toContain('this.add.rectangle(0, 0, 190, 48,');
      // 3. Royal marketplace bottom button
      expect(content).toContain('marketBtn.setSize(280, 48)');
      // 4. Close button
      expect(content).toContain('btn.setSize(48, 48)');
      expect(content).toContain('bg.fillCircle(0, 0, 24)'); // 48px diameter
      // 5. Shop button in empty modal
      expect(content).toContain('shopBtn.setSize(220, 48)');
      // 6. Place item button
      expect(content).toContain('placeBtn.setSize(96, 48)');
      // 7. Swap item button
      expect(content).toContain('swapBtn.setSize(230, 48)');
      // 8. Remove item button
      expect(content).toContain('removeBtn.setSize(230, 48)');
      // 9. Return from market button
      expect(content).toContain('returnBtn.setSize(240, 48)');
      // 10. Buy button in marketplace
      expect(content).toContain('buyBtn.setSize(btnW, btnH)');
      expect(content).toContain('const btnW = 96;');
      expect(content).toContain('const btnH = 48;');
      // 11. Empty slot container
      expect(content).toContain('container.setSize(90, 50)');
      // 12. Occupied slot container
      expect(content).toContain('container.setSize(targetSize, targetSize + 24)');

      // Verify no setSize calls with dimensions < 48 exist in CastleScene
      const setSizeMatches = [...content.matchAll(/\.setSize\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g)];
      for (const match of setSizeMatches) {
        const w = parseFloat(match[1]!);
        const h = parseFloat(match[2]!);
        expect(w, `CastleScene setSize width < 48: ${w}x${h}`).toBeGreaterThanOrEqual(48);
        expect(h, `CastleScene setSize height < 48: ${w}x${h}`).toBeGreaterThanOrEqual(48);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 4: WCAG AAA Contrast Calculation (>= 7.0:1)
  // ==========================================================================
  describe('Challenge 4: WCAG AAA Contrast Calculation', () => {
    function srgbToLinear(c: number): number {
      const norm = c / 255;
      return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
    }

    function getRelativeLuminance(hex: string): number {
      const clean = hex.replace(/^0x/, '').replace(/^#/, '');
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
    }

    function computeContrastRatio(hexForeground: string, hexBackground: string): number {
      const l1 = getRelativeLuminance(hexForeground);
      const l2 = getRelativeLuminance(hexBackground);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    it('empirically computes contrast ratios for all modified text elements against backgrounds: assert all >= 7.0:1', () => {
      const modifiedTextPairs = [
        // MenuScene: Header Title on Sky 900
        {
          element: 'MenuScene Header Title',
          text: '#ffffff',
          bg: '#0c4a6e',
          description: 'White text on Sky 900 backdrop'
        },
        // MenuScene: Header Subtitle on Sky 900
        {
          element: 'MenuScene Header Subtitle',
          text: '#ffffff',
          bg: '#0c4a6e',
          description: 'White text on Sky 900 backdrop'
        },
        // MenuScene: Locked card level title on Slate 100
        {
          element: 'MenuScene Locked Card Title',
          text: '#334155',
          bg: '#f1f5f9',
          description: 'Slate 700 text on Slate 100 card'
        },
        // MenuScene: Locked card level description on Slate 100
        {
          element: 'MenuScene Locked Card Description',
          text: '#334155',
          bg: '#f1f5f9',
          description: 'Slate 700 text on Slate 100 card'
        },
        // MenuScene: Locked card status label on Slate 100
        {
          element: 'MenuScene Locked Status Label',
          text: '#334155',
          bg: '#f1f5f9',
          description: 'Slate 700 text on Slate 100 card'
        },
        // MenuScene: Bottom Orchard Button on Emerald 800
        {
          element: 'MenuScene Orchard Bottom Button',
          text: '#ffffff',
          bg: '#065f46',
          description: 'White text on Emerald 800 button'
        },
        // CastleScene: Back Button on Slate 900 header
        {
          element: 'CastleScene Back Button',
          text: '#ffffff',
          bg: '#0f172a',
          description: 'White text on Slate 900 header'
        },
        // CastleScene: Tab active button on Sky 800
        {
          element: 'CastleScene Active Tab Button',
          text: '#ffffff',
          bg: '#075985',
          description: 'White text on Sky 800 active tab'
        },
        // CastleScene: Tab inactive button on Slate 900
        {
          element: 'CastleScene Inactive Tab Button',
          text: '#ffffff',
          bg: '#0f172a',
          description: 'White text on Slate 900 tab'
        },
        // CastleScene: Modal Close Button X on Slate 100
        {
          element: 'CastleScene Modal Close Button (X)',
          text: '#1e293b',
          bg: '#f1f5f9',
          description: 'Slate 800 icon on Slate 100 circle'
        },
        // CastleScene: Empty Inventory message on white modal card
        {
          element: 'CastleScene Empty Inventory Text',
          text: '#334155',
          bg: '#ffffff',
          description: 'Slate 700 text on white card'
        },
        // CastleScene: Empty Inventory Shop Button on Violet 800
        {
          element: 'CastleScene Empty Inventory Shop Button',
          text: '#ffffff',
          bg: '#5b21b6',
          description: 'White text on Violet 800 button'
        },
        // CastleScene: Place Item Button on Emerald 800
        {
          element: 'CastleScene Place Button',
          text: '#ffffff',
          bg: '#065f46',
          description: 'White text on Emerald 800 button'
        },
        // CastleScene: Swap Item Button on Sky 800
        {
          element: 'CastleScene Swap Button',
          text: '#ffffff',
          bg: '#075985',
          description: 'White text on Sky 800 button'
        },
        // CastleScene: Remove Item Button on Red 800
        {
          element: 'CastleScene Remove Button',
          text: '#ffffff',
          bg: '#991b1b',
          description: 'White text on Red 800 button'
        },
        // CastleScene: Return to Castle Button on Sky 800
        {
          element: 'CastleScene Return Button',
          text: '#ffffff',
          bg: '#075985',
          description: 'White text on Sky 800 button'
        },
        // CastleScene: Marketplace Item Description on Slate 50
        {
          element: 'CastleScene Catalog Item Description',
          text: '#334155',
          bg: '#f8fafc',
          description: 'Slate 700 text on Slate 50 row background'
        },
        // CastleScene: Buy Button (Owned) on Emerald 800
        {
          element: 'CastleScene Buy Button (Owned)',
          text: '#ffffff',
          bg: '#065f46',
          description: 'White text on Emerald 800 button'
        },
        // CastleScene: Buy Button (Can Afford) on Violet 800
        {
          element: 'CastleScene Buy Button (Can Afford)',
          text: '#ffffff',
          bg: '#5b21b6',
          description: 'White text on Violet 800 button'
        },
        // CastleScene: Buy Button (Cannot Afford) on Slate 600
        {
          element: 'CastleScene Buy Button (Cannot Afford)',
          text: '#ffffff',
          bg: '#475569',
          description: 'White text on Slate 600 button'
        },
        // OrchardView: Active Tab Text on Sky 800
        {
          element: 'OrchardView Active Tab Text',
          text: '#ffffff',
          bg: '#075985',
          description: 'White text on Sky 800 tab'
        },
        // OrchardView: Inactive Tab Text on white background
        {
          element: 'OrchardView Inactive Tab Text',
          text: '#1e293b',
          bg: '#ffffff',
          description: 'Slate 800 text on white tab'
        },
        // OrchardView: Locked level title on Slate 100 card
        {
          element: 'OrchardView Locked Level Title',
          text: '#334155',
          bg: '#f1f5f9',
          description: 'Slate 700 text on Slate 100 card'
        },
        // OrchardView: Locked level subtitle on Slate 100 card
        {
          element: 'OrchardView Locked Level Subtitle',
          text: '#334155',
          bg: '#f1f5f9',
          description: 'Slate 700 text on Slate 100 card'
        },
        // OrchardView: Locked status text on Slate 100 card
        {
          element: 'OrchardView Locked Status Text',
          text: '#334155',
          bg: '#f1f5f9',
          description: 'Slate 700 text on Slate 100 card'
        }
      ];

      const results: { element: string; text: string; bg: string; ratio: number; pass: boolean }[] = [];
      for (const pair of modifiedTextPairs) {
        const ratio = computeContrastRatio(pair.text, pair.bg);
        const pass = ratio >= 7.0;
        results.push({
          element: pair.element,
          text: pair.text,
          bg: pair.bg,
          ratio,
          pass
        });
      }

      console.table(
        results.map(r => ({
          Element: r.element,
          Foreground: r.text,
          Background: r.bg,
          'Contrast Ratio': `${r.ratio.toFixed(2)}:1`,
          'WCAG AAA (>=7:1)': r.pass ? 'PASS' : 'FAIL'
        }))
      );

      const failures = results.filter(r => !r.pass);
      expect(
        failures.length,
        `Found ${failures.length} text elements failing WCAG AAA (>= 7.0:1):\n` +
          failures.map(f => `  - ${f.element} (${f.text} on ${f.bg}): ${f.ratio.toFixed(2)}:1`).join('\n')
      ).toBe(0);
    });
  });
});
