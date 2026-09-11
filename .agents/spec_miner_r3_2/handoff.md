# Specification Mining Report: R2. UI Layout & Visual Defect Remediation

**Agent**: `spec_miner_r3_2` (Teamwork Preview Spec Miner)  
**Date**: 2026-09-06T01:55:00Z  
**Target Milestone**: R2. UI Layout & Visual Defect Remediation  
**Authoritative Sources**:
- `ORIGINAL_REQUEST.md` (specifically update under `## 2026-09-06T01:46:48Z`)
- `DESIGN.md` (Design System: The Pixel Orchard Classroom)
- `PRODUCT.md` (Product Specification & Accessibility Requirements)
- Source files: `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/CastleScene.ts`, `src/scenes/RoundSummaryScene.ts`, `src/scenes/OrchardScene.ts`, `src/ui/*.ts`
- Tests: `tests/ui.test.ts`, `tests/ui_adversarial.test.ts`, `tests/tier5_scenes_adversarial.test.ts`, `scripts/adversarial_ui_verify.py`
- Atlas assets & scripts: `public/assets/atlas.json`, `scripts/pack_ai_atlas.py`, `scripts/test_extract_princess.py`, `~/Documents/pixel-art-pipeline/`

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | UI Layout | Main Menu 2-Tier Header | Replaces the single-row 588px jammed header with a clean 2-tier layout on a 480px canvas: Tier 1 houses navigation buttons and utility badges; Tier 2 centers title and subtitle. | Viewport width (480px), audio mute state, coin balance | Clean separation of Orchard button, Castle button, title text, coin badge, sound button | Overlap collision if all items placed on y=38-40 line | `src/scenes/MenuScene.ts:48-124`, `ORIGINAL_REQUEST.md:142` |
| 2 | Visual UX | Locked Level Card Lock Badge / Shaded Silhouette | Replaces the distorted 52x52 `card-panel` box on locked level cards with a proper lock badge or shaded fruit silhouette. | Level number, topic, `isUnlocked` boolean from `StorageService` | Rendered lock badge (circular pill with lock icon/emoji or shaded silhouette) + title/desc + '🔒 Locked' label | Rendering squashed 96x96 modal panel asset (`card-panel`) with alpha 0.4 | `src/scenes/MenuScene.ts:202-210`, `public/assets/atlas.json:531-554` |
| 3 | Accessibility | Touch Target Hitbox Compliance (>= 48px) | All interactive buttons, tabs, slots, and icons must have width and height >= 48px to prevent touch misses on mobile touchscreens. | Pointer touch events (pointerdown, drag) | Responsive interactive feedback, pointer cursor | Missed taps and frustration if hit area is smaller than 48px | `DESIGN.md:90,179`, `tests/ui_adversarial.test.ts:347-422` |
| 4 | Accessibility | Lexend Typography & WCAG AAA Contrast (>= 7:1) | Text must use dyslexia-friendly Lexend and satisfy WCAG AAA relative luminance contrast (>= 7.0:1 for normal body/subtitles, >= 4.5:1 for >= 24px display). | Hex background and foreground color strings | High-contrast rendered text readable in all lighting | Visual illegibility, eye strain, test suite failure in `adversarial_ui_verify.py` | `DESIGN.md:120-134,180`, `tests/ui_adversarial.test.ts:425-498` |
| 5 | Asset Pipeline | Character Foot Matte & Contact Shadow Removal | Character keyframes (`princess-idle-1`, `princess-idle-2`, `princess-catch`, `princess-think`) must have clean 1-bit alpha borders without ground contact shadow residue. | Raw AI raster JPEG frames, background color, tolerance threshold | Clean 1-bit alpha PNG sprite with shoe soles ending cleanly at ground plane | Floating dirty gray halo/slab under shoes, double-shadow artifact in CastleScene | `scripts/pack_ai_atlas.py:86-133`, `src/scenes/CastleScene.ts:301-304` |
| 6 | UI Layout | CastleScene Interactive Hitbox Standardization | Upgrade all sub-48px interactive buttons in `CastleScene.ts` (`backBtn`, view tabs, marketplace modal close, buy buttons, slot action buttons) to >= 48px. | Pointer clicks on Castle and Marketplace UI | Triggered navigation or modal actions | Mis-taps on small touch targets | `src/scenes/CastleScene.ts:95,146,449,561,628,649,733,818` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Menu Header | Narrow mobile portrait viewport (480px width) | Total element width on a single line is 588px (Orchard: 44px + Castle: 68px + Title: ~320px + Coin: 72px + Sound: 48px + spacing: 36px), causing Title text (x: 80..400) to collide with Castle button (x: 62..130) on the left and Coin badge (x: 334..406) on the right. |
| 2 | Level Selector Cards | Locked level 2, 3, 4, or 5 in MenuScene | `MenuScene.ts:203` renders atlas frame `'card-panel'` (a 96x96 modal border) squeezed down to 52x52 at `alpha = 0.4`, appearing as an ugly distorted outline placeholder box rather than a locked indicator. |
| 3 | Level Selector Cards | Boss level (Level 5) unlocked vs locked | Unlocked level 5 renders `watermelon` sprite; locked level 5 renders squashed `card-panel`. A shaded silhouette must support both standard fruit and watermelon. |
| 4 | Character Shadow | Princess standing in CastleScene | `CastleScene.ts:301-304` draws a procedural grounding ellipse at depth 5 (`this.add.ellipse(x, y + 44, 52, 14, 0x000000, 0.25)`). Because the sprite at depth 6 contains baked-in JPEG contact shadow residue, a double-shadow artifact is produced (dirty gray slab floating above the clean ellipse). |
| 5 | Color Contrast | White text on Sky 600 header (`#ffffff` on `#0284c7`) | Contrast ratio is only 4.10:1. This fails WCAG AAA normal text threshold (>= 7.0:1) and large text threshold (>= 4.5:1). Requires Sky 800 (`#075985`, 7.2:1) or Sky 900 (`#0c4a6e`, 10.4:1). |
| 6 | Color Contrast | Locked label text on card background (`#94a3b8` on `#f1f5f9`) | Contrast ratio is only 2.36:1, severely failing WCAG AA (>= 4.5:1) and AAA (>= 7.0:1). Requires Slate 700 (`#334155`, 7.5:1) or Slate 800 (`#1e293b`). |
| 7 | Touch Target | CastleScene Back button and Marketplace Buy buttons | Back button has height ~19px; Buy button has height 38px; View tabs have height 36px; Place button has height 36px. All are strictly below the 48px touch target rule. |

---

# Handoff Report: R2. UI Layout & Visual Defect Remediation

## 1. Observation

### 1.1 Header Collision in `src/scenes/MenuScene.ts`
Direct inspection of `src/scenes/MenuScene.ts:48-124`:
- **Canvas Dimensions**: `width = 480`, `height = 800`.
- **Header Background**:
  ```ts
  49: const headerBg = this.add.graphics();
  50: headerBg.fillStyle(0x0284c7, 0.95);
  51: headerBg.fillRect(0, 0, width, 110);
  ```
- **Title Text**:
  ```ts
  54: this.add.text(width / 2, 38, '👑 Princess Penelope 🍎', {
  55:   fontFamily: 'Lexend, sans-serif',
  56:   fontSize: '24px',
  57:   color: '#ffffff',
  58:   fontStyle: 'bold'
  59: }).setOrigin(0.5);
  ```
  `setOrigin(0.5)` places the center at `x = 240, y = 38`. The string length is 23 characters including emojis. In 24px bold Lexend, the measured text width is ~320px. The title bounds extend from `x = (240 - 160) = 80` to `x = (240 + 160) = 400`.
- **Castle & Marketplace Button**:
  ```ts
  92: const castleBtn = this.add.container(96, 40);
  93: const castleBg = this.add.graphics();
  94: castleBg.fillStyle(0xd946ef, 1);
  95: castleBg.fillRoundedRect(-34, -16, 68, 32, 16);
  ...
  103: castleBtn.setSize(68, 32);
  ```
  Positioned at `x = 96, y = 40`. The button bounds extend from `x = (96 - 34) = 62` to `x = (96 + 34) = 130`.
  **Verbatim Collision 1**: Castle button ends at `x = 130`. Title text starts at `x = 80`. Between `x = 80` and `x = 130` at `y = 38-40`, the Title text renders directly on top of the Castle button!
- **Coin Counter Badge**:
  ```ts
  111: const coinBadge = this.add.container(width - 110, 40);
  112: const cbg = this.add.graphics();
  113: cbg.fillStyle(0x0f172a, 0.4);
  114: cbg.fillRoundedRect(-36, -16, 72, 32, 16);
  ```
  `width - 110 = 370`. The badge bounds extend from `x = (370 - 36) = 334` to `x = (370 + 36) = 406`.
  **Verbatim Collision 2**: Title text ends at `x = 400`. Coin badge starts at `x = 334`. Between `x = 334` and `x = 400` at `y = 38-40`, the Title text renders directly on top of the Coin Counter badge!
- **Sound Toggle Button**:
  ```ts
  70: this.soundButton = this.add.image(width - 40, 40, 'atlas', isMuted ? 'btn-sound-off' : 'btn-sound');
  71: this.soundButton.setDisplaySize(48, 48);
  ```
  `width - 40 = 440`. Bounds: `x: 416 to 464`.
- **Orchard Button**:
  ```ts
  80: const orchardBtn = this.add.container(36, 40);
  ...
  84: orchardBtn.setSize(44, 44);
  ```
  `x: 14 to 58`. Note that `44x44` is less than the mandatory 48px hitbox!

### 1.2 Broken `card-panel` Placeholder on Locked Level Cards
Direct inspection of `src/scenes/MenuScene.ts:202-210`:
```ts
202: // Left Fruit / Lock Icon
203: const icon = this.add.image(-155, 0, 'atlas', isUnlocked ? (level.levelNumber === 5 ? 'watermelon' : 'apple') : 'card-panel');
204: icon.setDisplaySize(52, 52);
205: if (!isUnlocked) {
206:   icon.setAlpha(0.4);
207: }
208: levelCard.add(icon);
```
Direct inspection of `public/assets/atlas.json:531-554`:
```json
531: "card-panel": {
532:   "frame": {
533:     "x": 516,
534:     "y": 274,
535:     "w": 96,
536:     "h": 96
537:   },
```
`'card-panel'` is a 96x96 rounded container rectangle designed for dialogue/modal backdrops. When used as a 52x52 sprite at `alpha = 0.4`, it renders as an empty, distorted gray box outline that conveys no locked status.

### 1.3 Interactive Hitbox Audit (< 48px Violations)
- `src/scenes/MenuScene.ts`:
  - Line 84: `orchardBtn.setSize(44, 44)` — **44px < 48px**
  - Line 103: `castleBtn.setSize(68, 32)` — **height 32px < 48px**
- `src/scenes/CastleScene.ts`:
  - Line 100: `backBtn = this.add.text(18, 16, '◀ Back', ...)` — text bounds height ~19px, **< 48px**
  - Line 146: `rectangle(0, 0, 190, 36)` — **height 36px < 48px**
  - Line 411: `marketBtn.setSize(280, 44)` — **height 44px < 48px**
  - Line 449: `createCloseButton: btn.setSize(44, 44)` — **44px < 48px**
  - Line 519: `shopBtn.setSize(220, 44)` — **height 44px < 48px**
  - Line 561: `placeBtn.setSize(96, 36)` — **height 36px < 48px**
  - Line 628: `swapBtn.setSize(230, 44)` — **height 44px < 48px**
  - Line 649: `removeBtn.setSize(230, 44)` — **height 44px < 48px**
  - Line 733: `returnBtn.setSize(240, 44)` — **height 44px < 48px**
  - Line 818: `buyBtn.setSize(btnW, btnH)` with `btnH = 38` — **height 38px < 48px**

### 1.4 WCAG AAA Contrast Failures (Formula: $(L_1 + 0.05)/(L_2 + 0.05)$)
- `src/scenes/MenuScene.ts`:
  - Line 57: Title `#ffffff` on `#0284c7` (Sky 600):
    - $L(\text{\#ffffff}) = 1.0$
    - $L(\text{\#0284c7}) = 0.2063$
    - Contrast ratio = $(1.0 + 0.05) / (0.2063 + 0.05) = \mathbf{4.10:1}$ (Fails normal text $\ge 7.0:1$ and large text $\ge 4.5:1$).
  - Line 65: Subtitle `#bae6fd` on `#0284c7`:
    - Contrast ratio = $\mathbf{3.16:1}$ (Fails AA and AAA).
  - Line 247: Locked text `#94a3b8` on `#f1f5f9`:
    - Contrast ratio = $\mathbf{2.36:1}$ (Fails AA and AAA).
  - Line 276: Bottom button `#ffffff` on `#10b981`:
    - Contrast ratio = $\mathbf{2.52:1}$ (Fails AA and AAA).

### 1.5 Character Foot Matte / Cutout Residue
- In `scripts/pack_ai_atlas.py:86-99` and `scripts/test_extract_princess.py:4-18`:
  ```python
  char_img = Image.open(os.path.join(SRC_DIR, 'princess_penelope_character_1788441979685.jpg'))
  char_trans = extract_sprite_clean(char_img, thresh_dist=25, feather_radius=1.2)
  c_bbox = char_trans.getbbox()
  ```
  The source JPEG file contains ground contact shadows directly beneath the shoes. Because the floodfill Euclidean distance threshold `thresh_dist=25` stopped when reaching pixel distance $> 25$, the dirty shadow slab was classified as foreground. `feather_radius=1.2` then blurred it into an anti-aliased gray halo.
- In `src/scenes/CastleScene.ts:301-304`:
  ```ts
  this.add.ellipse(x, y + 44, 52, 14, 0x000000, 0.25).setDepth(5);
  this.princess = this.add.sprite(x, y, 'atlas', 'princess-idle-1').setDepth(6);
  ```
  `CastleScene` already draws a procedural grounding ellipse at depth 5. Because the sprite itself has baked-in dirty JPEG foot shadow residue, it draws a dirty floating slab right over the ellipse, producing a double-shadow artifact.

---

## 2. Logic Chain

1. **Header Layout Constraint Infeasibility**:
   - The available viewport width is strictly 480px.
   - The 5 header elements placed on horizontal line $y=38\text{--}40$ have widths: Orchard button (44px), Castle button (68px), Title text (~320px), Coin badge (72px), Sound button (48px).
   - The sum of widths plus standard 8px padding is $44 + 8 + 68 + 8 + 320 + 8 + 72 + 8 + 48 = 584\text{px}$, which exceeds the 480px viewport by $104\text{px}$.
   - Consequently, the centered title at $x=80\text{--}400$ mathematically must collide with both the Castle button on the left ($x=62\text{--}130$) and the Coin badge on the right ($x=334\text{--}406$).
   - **Remediation**: The header must be split into a 2-tier layout: Tier 1 (top utility bar at $y=24\text{--}28$) holding the 4 utility/nav widgets across the corners; Tier 2 (title banner at $y=68\text{--}94$) centering the title and subtitle with uninterrupted 480px horizontal clearance.

2. **Placeholder Distortion**:
   - `'card-panel'` in the atlas is designed as a large 96x96 modal border. Squeezing it into 52x52 with 40% opacity at $x=-155$ next to the level title produces a washed-out gray box outline.
   - The authoritative update (R2) mandates: "Replace the broken card-panel rectangular placeholder on locked level selector cards with a proper lock icon or shaded silhouette."
   - **Remediation**: In `MenuScene.ts:203`, replace `'card-panel'` with:
     - Option A: Shaded silhouette of the level's fruit (the topic fruit frame tinted dark slate `0x475569` at alpha 0.45) with a centered lock badge.
     - Option B: A dedicated lock badge container (circular background `0xe2e8f0` with Lexend lock icon `'🔒'` or procedural lock graphics).

3. **Hitbox Compliance ($\ge 48\text{px}$)**:
   - Antigravity standard `DESIGN.md:179` and user requirements `ORIGINAL_REQUEST.md:145` strictly require all interactive hitboxes to be $\ge 48\text{px}$.
   - Several UI components in `MenuScene.ts` and `CastleScene.ts` specify interactive heights of 32px, 36px, 38px, or 44px.
   - **Remediation**: Set `container.setSize(w, h)` where $w \ge 48$ and $h \ge 48$ for all interactive containers across `MenuScene.ts` and `CastleScene.ts`.

4. **WCAG AAA Contrast ($\ge 7:1$)**:
   - `DESIGN.md:180` and `ORIGINAL_REQUEST.md:145` require WCAG AAA contrast ($\ge 7:1$ for body and subtitles, $\ge 4.5:1$ for display headers).
   - `#ffffff` text on `#0284c7` (Sky 600) yields only 4.10:1.
   - `#94a3b8` on `#f1f5f9` yields only 2.36:1.
   - **Remediation**:
     - Header background should use Sky 800 (`#075985`, 7.2:1) or Sky 900 (`#0c4a6e`, 10.4:1), or dark slate `#0f172a`.
     - Subtitle should use high-contrast white `#ffffff` on Sky 800/900.
     - Locked level label should use Slate 700 (`#334155`, 7.5:1 on Slate 100).

5. **Character Foot Matte Elimination**:
   - The dirty foot matte originates from JPEG ground contact shadow segmentation in `pack_ai_atlas.py` combined with Gaussian feathering.
   - In `CastleScene.ts`, Penelope already has a procedural ellipse shadow at depth 5.
   - **Remediation**:
     - Visual asset pipeline processing must use hard binary 1-bit alpha thresholding (0 or 255) with zero Gaussian blur, clipping the JPEG contact shadow so shoe soles cleanly terminate on the ground plane.
     - Ensure `--anim-lock` aligns the ground plane across `princess-idle-1`, `princess-idle-2`, and `princess-catch`.

---

## 3. Caveats

1. **Atlas Repacking vs Code-Level Fix**:
   - If the visual artist subagent repacks `atlas.png` to include a dedicated `'lock-badge'` or 1-bit alpha character frames, `MenuScene.ts` can reference the new frame directly.
   - If the atlas has not yet been repacked with a lock frame, `MenuScene.ts` can immediately remediate the broken placeholder by rendering a shaded fruit silhouette (`icon.setTint(0x475569)`) or a procedural lock badge container using Phaser Graphics and Lexend text `'🔒'`.
2. **Persistence State Invariance**:
   - UI layout changes do not alter `StorageService` or Dexie IndexedDB schemas. All progress, unlocked levels, and star ratings remain 100% backward compatible.
3. **Headless Test Environment**:
   - Phaser runs in headless mode in Vitest (`tests/tier5_scenes_adversarial.test.ts` and `tests/ui.test.ts`). Geometric assertions (e.g. `setSize()`, container child bounds, and string styles) are validated via mock object models and AST parsers.

---

## 4. Conclusion

1. **Root Cause of Header Collision**: 5 UI elements totalling 584px width are placed at horizontal coordinate $y=38\text{--}40$ on a 480px canvas, resulting in severe overlaps between the Title and the Castle button ($x=80\text{--}130$) and Coin badge ($x=334\text{--}400$).
2. **Root Cause of Locked Placeholder**: Line 203 of `MenuScene.ts` renders `'card-panel'` (a 96x96 modal border) squashed to 52x52 at alpha 0.4.
3. **Touch Target Deficiencies**: 12 interactive elements across `MenuScene.ts` and `CastleScene.ts` have touch areas $< 48\text{px}$ (e.g. 32px, 36px, 38px, 44px).
4. **Contrast Deficiencies**: Menu header white-on-sky-600 achieves 4.10:1 (fails AAA), subtitle achieves 3.16:1 (fails), and locked card text achieves 2.36:1 (fails).
5. **Character Foot Matte Defect**: JPEG contact shadow not properly segmented by Euclidean floodfill in `scripts/pack_ai_atlas.py`, creating a dirty gray slab under Penelope's shoes that clashes with the procedural grounding shadow in `CastleScene.ts`.

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the full test suite and adversarial verifiers:
```bash
# 1. Full Vitest suite (must pass 100%)
npm test

# 2. Specific UI and Scene test suites
npx vitest run tests/ui.test.ts
npx vitest run tests/ui_adversarial.test.ts
npx vitest run tests/tier5_scenes_adversarial.test.ts
npx vitest run tests/scenes.test.ts

# 3. TypeScript compilation check (zero errors)
npm run build

# 4. Build Stack Advisor audit
~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz
```

### 5.2 Specific Geometric & Layout Invariants to Assert
1. In `src/scenes/MenuScene.ts`:
   - Title text `y` coordinate $\ge 64\text{px}$ (separated from top utility buttons at $y \approx 26\text{px}$).
   - Left navigation buttons (`orchardBtn`, `castleBtn`) rightmost boundary $\le 160\text{px}$.
   - Right navigation widgets (`coinBadge`, `soundButton`) leftmost boundary $\ge 320\text{px}$.
   - Title text horizontal span has zero intersection with navigation buttons.
   - All interactive containers call `setSize(w, h)` with $w \ge 48$ and $h \ge 48$.
   - Locked card left icon does NOT load `'card-panel'`; instead loads fruit silhouette or dedicated lock badge.
2. In `src/scenes/CastleScene.ts`:
   - `backBtn` interactive hit area height $\ge 48\text{px}$.
   - View toggle buttons (`outsideBtn`, `insideBtn`) height $\ge 48\text{px}$.
   - `marketBtn`, modal `closeBtn`, `shopBtn`, `placeBtn`, `swapBtn`, `removeBtn`, `returnBtn`, `buyBtn` all have width and height $\ge 48\text{px}$.
3. In `tests/tier5_scenes_adversarial.test.ts`:
   - Add explicit assertions verifying that MenuScene `orchardBtn` and `castleBtn` hitboxes are $\ge 48\text{px}$, that header elements do not overlap on a 480px width canvas, and that locked level cards do not use `card-panel`.
