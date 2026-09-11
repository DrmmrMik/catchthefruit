# 16-Bit Retro Pixel Art Pipeline & Texture Atlas Packing Specification

**Target Milestone**: R1 — 16-Bit Retro Pixel Art Pipeline & Atlas Packing  
**Project**: Catch the Fruit (`joyful-hertz`)  
**Specification Miner**: `teamwork_preview_spec_miner`  
**Working Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_r3_1`  
**Date**: 2026-09-06  

---

## Executive Summary

This document specifies the end-to-end technical requirements, pipeline steps, tool invocations, asset dimensions, palette locking parameters, and atlas packing architecture to rebuild all visual assets of "Catch the Fruit" into authentic 16-bit retro arcade pixel art. It establishes how to eliminate unbatched image requests (`background.jpg`, `castle_exterior.jpg`, `castle_interior.jpg`), remove character foot cutout residues, resolve main menu header layout collisions, and replace broken placeholder UI elements with authentic retro pixel art sprites.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Art Toolchain | `remove-background.py` Corner Flood-Fill | BFS flood-fills from all 4 canvas corners and outer borders to extract silhouette to alpha=0 while preserving interior matching colors (eyes, teeth, white highlights). | High-res PNG/JPG (e.g. 1024x1024), `--bg-color "#ffffff"`, `--tolerance 30.0` | 4-channel RGBA with 1-bit alpha (0 or 255); transparent pixels zeroed to (0,0,0,0) | Exits 1 if input missing; handles non-matching corners by falling back to full border seeding | `~/Documents/pixel-art-pipeline/remove-background.py:70-149` |
| 2 | Art Toolchain | Spill Decontamination | Despills residual chroma/background color from surviving edge pixels using `min(key, max(other1, other2))` within Euclidean distance tolerance. | RGBA array, key color, tolerance | Despilled RGB array with neutralized edge fringes | No-op if no eligible pixels near key color | `~/Documents/pixel-art-pipeline/remove-background.py:151-205` |
| 3 | Art Toolchain | `quantize.py` Locked Palette Snapping | Snaps every opaque pixel to the nearest Euclidean color in the locked 16-color JSON palette; binarizes alpha at threshold 128. | RGBA image/directory, `palette.json`, `--alpha-threshold 128`, optional `--dither` | RGBA image strictly containing colors from `palette.json` and 1-bit alpha | Throws `ValueError` if palette is empty or missing valid hex codes | `~/Documents/pixel-art-pipeline/quantize.py:29-109` |
| 4 | Art Toolchain | `downsample.py --anim-lock` | Computes a single shared bounding envelope and single uniform scale across all frames in an animation directory; resizes via `NEAREST` neighbor to preserve ground plane and squash/stretch without jitter. | Directory of sequence frames, `--width W --height H`, `--anim-lock`, optional `--ref-frame` | Downsampled frames with locked ground planes and uniform scale | Handles blank frames gracefully by emitting transparent canvases; logs per-frame scale | `~/Documents/pixel-art-pipeline/downsample.py:141-225` |
| 5 | Art Toolchain | `downsample.py --auto-center` | Crops non-transparent subject bounds, uniformly scales to fit target canvas with 10% padding, and centers. STRICTLY for single static stills (fruits, icons, props). FORBIDDEN for animations. | Single static image, `--size <N>`, `--auto-center` | Centered retro pixel art sprite with 10% border padding | Emits blank transparent image if input is empty | `~/Documents/pixel-art-pipeline/downsample.py:93-139` |
| 6 | Art Toolchain | Edge Despeckling (`despeckle_edges`) | Cleans isolated 1-pixel opaque noise on silhouette borders that lack orthogonal 4-connected opaque neighbors. | RGBA Image | Despeckled RGBA Image with clean 1-bit borders | Can be bypassed with `--no-despeckle` | `~/Documents/pixel-art-pipeline/downsample.py:67-90` |
| 7 | Art Toolchain | `atlas-prep.py --slice` | Slices composite concept grids (e.g. 3x3 fruit turnaround sheet) into individual indexed PNG frames. | Composite image, `--rows R --cols C` | Directory of indexed frames (`0.png`, `1.png`, ...) | Exits 1 if input is not an existing image file | `~/Documents/pixel-art-pipeline/atlas-prep.py:154-181` |
| 8 | Art Toolchain | `atlas-prep.py` Sprite Sheet Assembly | Packs individual frames into a grid sprite sheet and generates companion Phaser JSON metadata. | Frame directory, `--cols C --padding P` | Packed PNG sheet + metadata JSON | Throws `ValueError` if directory contains no valid image frames | `~/Documents/pixel-art-pipeline/atlas-prep.py:40-120` |
| 9 | Atlas Architecture | Power-of-Two Atlas (`atlas.png` + `atlas.json`) | Single unified texture sheet packing all game sprites, UI elements, particles, and backdrops with zero unbatched image requests. | Sprite dictionaries / frame list | `public/assets/atlas.png` (1024x1024 or 1024x2048) and `public/assets/atlas.json` (Phaser 3/4 Hash format) | Throws `RuntimeError` if total packed elements exceed atlas dimensions | `scripts/pack_ai_atlas.py:417-495`, `tests/atlas.test.ts:10-85` |
| 10 | Atlas Architecture | Zero Unbatched Image Network Batches | Replaces standalone image loads (`background.jpg`, `castle_exterior.jpg`, `castle_interior.jpg`) by packaging backdrops into `atlas.png` and instantiating textures via Phaser Canvas/Frame aliases in `PreloadScene.ts`. | PreloadScene loader | Single network request for `atlas.png` + `atlas.json`; 0 HTTP requests for standalone image files | Eliminates mobile render draw-call penalties and STACK violation `unbatched-image-loads` | `src/scenes/PreloadScene.ts:55-60`, `STACK.md:25`, `ORIGINAL_REQUEST.md:139` |
| 11 | Character Pipeline | Princess Penelope 4-Keyframe Animation | 96x128 keyframes (`princess-idle-1`, `princess-idle-2`, `princess-catch`, `princess-think`) representing 16-bit retro arcade protagonist with 1-bit alpha. | Source high-res rasters `princess_penelope_character_*.jpg` and `princess_penelope_celebrating_*.jpg` | 4 frames in atlas: `princess-idle-1`, `princess-idle-2`, `princess-catch`, `princess-think` | Ground plane locked via `--anim-lock`; zero foot shadow residue | `src/scenes/PreloadScene.ts:66-77`, `tests/atlas.test.ts:21-27` |
| 12 | Fruit Pipeline | 12 Educational Fruit Sprites | 80x80 retro pixel art fruits (`apple`, `orange`, `grape`, `banana`, `watermelon`, `blueberry`, `strawberry`, `lemon`, `kiwi`, `peach`, `plum`, `cherry`) with centered >= 48px hitboxes. | `magical_fruit_characters_*.jpg` (3x3 grid) + hue shifts | 12 frames in atlas at 80x80 px | Test oracle asserts `w === 80`, `h === 80`, hitbox >= 48px | `tests/atlas.test.ts:29-44`, `tests/adversarial.test.ts:54-70` |
| 13 | Tree Growth Pipeline | 5 Orchard Growth Stages | Progressive 128x128 tree visuals (`tree-stage-1` to `tree-stage-5`) anchored to ground plane for cumulative star unlocks. | `enchanted_royal_tree_*.jpg` | 5 frames in atlas at 128x128 px | Trunk base bottom-anchored to prevent floating or vertical bounce | `tests/atlas.test.ts:53-61` |
| 14 | Basket Pipeline | Catcher Basket Sprites | 128x64 player catching baskets (`basket` and `basket-royal`). | `royal_golden_basket_*.jpg` | 2 frames in atlas at 128x64 px | Enforced exact dimensions: 128x64 px | `tests/atlas.test.ts:46-51` |
| 15 | UI & FX Pipeline | Control Buttons, Badges, Stars & Particles | 64x64 buttons (`btn-pause`, `btn-sound`, `btn-sound-off`, `btn-replay`, `btn-home`), 48x48 stars/markers (`star-full`, `star-empty`, `crown-star-full`, `crown-star-empty`, `check-mark`, `x-mark`, `coin-gold`), and particles (`sparkle`, `petal`, `firefly`). | Procedural vector / raster sprites | 15+ UI/FX frames in atlas | All interactive buttons maintain hitboxes >= 48px | `tests/atlas.test.ts:63-73`, `tests/e2e.test.ts:649-655` |
| 16 | UI Remediation | Locked Level Card Icon (`lock`) | Replaces distorted `card-panel` rectangular outline on locked level selector cards with an authentic 16-bit retro golden padlock badge. | Canvas/Raster 48x48 lock sprite with gold body, iron shackle, keyhole | Atlas frame `'lock'` (48x48 px) | `MenuScene.ts` uses `isUnlocked ? fruit : 'lock'` instead of `'card-panel'` | `ORIGINAL_REQUEST.md:143`, `src/scenes/MenuScene.ts:203` |
| 17 | Marketplace Pipeline | 13 Castle Decorations & Furniture | 96x96 decorative items across outside garden and inside throne room (`decor-fountain`, `decor-topiary`, `decor-banners`, `decor-lantern`, `decor-peacock`, `decor-swing`, `decor-throne`, `decor-couch`, `decor-chaise`, `decor-mirror`, `decor-teatable`, `decor-bookshelf`, `decor-chandelier`). | `castle_decorations_sheet_*.jpg` | 13 frames in atlas at 96x96 px | Validated by Zod catalog and unit tests | `tests/marketplace.test.ts:30-39`, `data/decorations.json:1-122` |
| 18 | Scenery Pipeline | Retro 16-Bit Orchard & Castle Backdrops | Pixel-art orchard backdrop, castle exterior grounds, and castle interior throne room (240x400 native retro resolution, nearest-neighbor 2x scaled to 480x800 viewport). | Source scene concept rasters | 3 atlas frames: `background`, `castle-exterior`, `castle-interior` | Snapped to locked 16-color palette; zero color flicker | `ORIGINAL_REQUEST.md:138`, `src/scenes/CastleScene.ts:65` |
| 19 | UI Layout | Main Menu 2-Tier Header Architecture | Clean separation between top utility buttons (Orchard, Shop, Coins, Mute) and centered game branding (Title, Subtitle) to eliminate collision on 480px portrait viewports. | Viewport width 480px, Lexend typography | Zero text or button overlap; >= 48px touch targets | Prevents title text from colliding with Shop button or Coin badge | `ORIGINAL_REQUEST.md:142`, `src/scenes/MenuScene.ts:48-124` |
| 20 | Palette System | Locked 16-Color Retro Palette | 16-color palette (`palette.json`) strictly enforced across all visual assets, matching semantic topic colors and retro hardware constraints. | Hex color array in `palette.json` | Clamped RGB pixel array with 0 color bleeding or unpalette drift | Fails quantization if color drifts outside palette | `DESIGN.md:4-17`, `STACK.md:31`, `ORIGINAL_REQUEST.md:137` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Background Removal | High-res character raster with soft white contact shadow under feet (`princess_penelope_character_*.jpg`). | Euclidean distance diff to (255,255,255) of shadow is 40-60, exceeding default tolerance (25-30), leaving a dirty gray smudge under the soles. **Solution**: Floodfill with higher tolerance on outer boundary and enforce hard 1-bit alpha thresholding (alpha >= 128) + vertical foot sole bounds clamp to ensure sneaker soles sit cleanly on ground plane with 0 residue. |
| 2 | Downsampling Multi-Frame Sequence | Crouch anticipation frame vs. tall jump stretch frame processed with `--auto-center`. | `--auto-center` rescales each frame to its individual bounding box. The crouch frame is scaled UP and jump frame is scaled DOWN, completely destroying jump arcs and causing severe vertical jitter. **Solution**: Always process multi-frame sequences with `--anim-lock`, which computes the union envelope across all frames and applies a single invariant scale factor and ground plane anchor. |
| 3 | Downsampling Stills | Static fruit sprite (e.g. `apple.png`) processed with `--anim-lock`. | In a single image without animation peers, `--anim-lock` behaves like a single-frame envelope, but does not enforce centering. If the source raster has asymmetrical margins, the fruit is off-center in its 80x80 canvas, shifting its 48px touch target. **Solution**: Use `--auto-center` for all static single props/fruits/icons to guarantee centered 48px+ hitboxes. |
| 4 | Edge Despeckling | Thin 1-pixel detail (e.g. tiara spike or fruit stem tip) without diagonal neighbor checks. | If a legitimate pixel has only diagonal opaque neighbors (0 orthogonal neighbors), `despeckle_edges` zeroes its alpha, eroding thin retro details. **Solution**: Design retro sprites with 2px minimum feature thickness or pass `--no-despeckle` if delicate accessories are present. |
| 5 | Palette Quantization | Uninitialized `palette.json` containing empty string entries (`["", "", ...]`). | `load_palette()` in `quantize.py` throws `ValueError: No valid colors found in 'palette.json'`. **Solution**: Populate `palette.json` with the canonical 16 hex colors defined in Section 1.3 of this report. |
| 6 | Chroma-Key Spill | Surviving foreground pixels near silhouette edge contain mixed background color (e.g. white/green edge halo). | Pure alpha thresholding leaves the RGB values of edge pixels untouched, resulting in a dirty halo when rendered over colored backdrops. **Solution**: Enable `decontaminate_spill()`, which clamps the dominant key channel to `min(key, max(other1, other2))` to neutralize edge fringes into clean neutral tones. |
| 7 | Atlas Sizing & Overflow | Packing all 38+ sprite frames plus three 240x400 backgrounds into a single 1024x1024 texture atlas. | A 1024x1024 sheet contains 1,048,576 px. The sprite frames consume ~392,000 px, and three 240x400 backgrounds consume 288,000 px (total ~680,000 px). Using shelf packing, 1024x1024 has sufficient area, but if shelf fragmentation occurs, height can overflow to 1024x2048. `tests/atlas.test.ts` line 17 requires `meta.size.w === 1024` and `meta.size.h >= 512`. **Solution**: Set atlas width to 1024, and allow height to be 1024 or 2048 (power of two), satisfying test assertions and packing all assets with zero overflow. |
| 8 | Zero Unbatched Loads in Tests | `tests/tier5_scenes_adversarial.test.ts` lines 899 & 905 assert `(castle as any).background.texture === 'castle-exterior'`. | If `CastleScene.ts` is changed to pass `'atlas', 'castle-exterior'`, `MockImage.texture` in test context becomes `'atlas'` rather than `'castle-exterior'`, breaking test assertions. **Solution**: In `PreloadScene.ts`, instantiate standalone textures in Phaser's TextureManager from the atlas frames using `this.textures.createCanvas(...)` or image canvas duplication. This allows `this.add.image(..., 'castle-exterior')` and `setTexture('castle-exterior')` to work in Phaser runtime with 0 network requests, while keeping test mock contexts 100% passing! |
| 9 | Main Menu Header Collision | 480px width mobile viewport with title "👑 Princess Penelope 🍎" centered at x=240, y=38 alongside Orchard (x=36), Shop (x=96), Coin Badge (x=370), and Mute (x=440). | Title text (~260px wide) overlaps Shop button on the left (ends at x=130) and Coin badge on the right (starts at x=334), creating visual clutter and unreadable text. **Solution**: Implement a 2-tier header: Row 1 (y=26) holds utility controls and coin badge; Row 2 (y=66 to 92) holds centered title and subtitle. |
| 10 | Level Card Locked State | Level cards in `MenuScene.ts` use `'card-panel'` frame at 52x52 px with 0.4 alpha when locked. | `'card-panel'` is a rectangular modal dialog background (96x96 with blue border). Scaling it down to 52x52 makes it look like a broken hollow outline box rather than a locked indicator. **Solution**: Pack an authentic 16-bit pixel art `'lock'` frame (48x48) into the atlas and render `isUnlocked ? fruitFrame : 'lock'`. |

---

## 1. Observation

### 1.1 Existing Toolchain in `~/Documents/pixel-art-pipeline/`
Inspection of `~/Documents/pixel-art-pipeline/` revealed:
- `remove-background.py`: Chroma-key flood-fill using BFS from 4 corners (`lines 70-149`), despill decontamination (`lines 151-205`), and binary 1-bit alpha thresholding (`lines 260-282`). Command line arguments: `--bg-color`, `--tolerance`, `--edge-mode hard|blend`, `--no-global-replace`, `--no-decontaminate`.
- `quantize.py`: Vectorized Euclidean distance nearest-neighbor color quantization (`lines 91-110`), `--palette` JSON loader (`lines 38-89`), and `--alpha-threshold 128` (`lines 146-168`).
- `downsample.py`: Nearest-neighbor downsampling (`Image.Resampling.NEAREST`), `--anim-lock` for multi-frame sequences (`lines 141-225`), `--auto-center` for stills (`lines 93-139`), and 1-pixel noise despeckling (`lines 67-90`).
- `atlas-prep.py`: Sprite sheet assembly (`lines 40-120`), grid slicer (`lines 154-181`), and art source directory exporter (`lines 122-152`).
- `palette.json`: Currently contains 16 empty strings (`["", "", ...]`), which causes `quantize.py` to raise a `ValueError` unless properly populated with hex colors.

### 1.2 Current Asset Inventory and Violations in `public/assets/`
Inspection of `public/assets/` revealed 5 files:
1. `atlas.png` (554,691 bytes, 1024x1024 RGBA)
2. `atlas.json` (20,864 bytes, 35 frames)
3. `background.jpg` (290,207 bytes, high-res CGI orchard background)
4. `castle_exterior.jpg` (161,208 bytes, high-res CGI castle exterior)
5. `castle_interior.jpg` (137,095 bytes, high-res CGI throne room)

In `src/scenes/PreloadScene.ts` (lines 56–59):
```typescript
56: this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
57: this.load.image('background', 'assets/background.jpg');
58: this.load.image('castle-exterior', 'assets/castle_exterior.jpg');
59: this.load.image('castle-interior', 'assets/castle_interior.jpg');
```
This violates:
1. `STACK.md` Forbidden rule: `unbatched-image-loads` ("Loading dozens of individual sprite PNG files over the network triggers separate HTTP requests...").
2. `ORIGINAL_REQUEST.md` R1: "Replace high-res CGI/storybook backgrounds with authentic 16-bit retro arcade orchard backdrops... Pack all processed frames into a unified power-of-two texture atlas (`atlas.png` + `atlas.json`) using extrusion padding with zero unbatched image requests."

### 1.3 AI Source Assets in Brain Artifact Directory
Source high-res rasters exist at `/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8`:
- `princess_penelope_character_1788441979685.jpg` (Penelope standing)
- `princess_penelope_celebrating_1788442003907.jpg` (Penelope celebration/catch)
- `magical_fruit_characters_1788442017917.jpg` (3x3 fruit grid)
- `royal_golden_basket_1788442063144.jpg` (Basket)
- `enchanted_royal_tree_1788442048455.jpg` (Tree stages)
- `castle_decorations_sheet_1788453895482.jpg` (Decorations and furniture)
- `magical_orchard_background_1788442033920.jpg` (Orchard scenery)
- `castle_exterior_grounds_1788453868950.jpg` (Castle exterior scenery)
- `throne_room_flat_1788454559926.jpg` (Castle interior scenery)

### 1.4 Test Suite Expectations
Execution of `npm test` verified 20 test files, 499 tests passed (100% pass rate).
Key constraints from `tests/atlas.test.ts` and `tests/adversarial.test.ts`:
- `atlas.json` `meta.size.w` must equal `1024` (`atlas.test.ts:17`).
- `atlas.json` `meta.size.h` must be `>= 512` (`atlas.test.ts:18`).
- Total frames `>= 29` (`atlas.test.ts:24`).
- All 12 fruits present with dimensions `w === 80, h === 80` (`atlas.test.ts:41-42`, `adversarial.test.ts:67-68`).
- `basket` frame dimensions `w === 128, h === 64` (`atlas.test.ts:49`).
- 5 tree stages present with dimensions `w === 128, h === 128` (`atlas.test.ts:58-59`).
- Character frames required: `princess-idle-1`, `princess-idle-2`, `princess-catch`, `princess-think` (`atlas.test.ts:25-26`, `e2e.test.ts:636`).
- UI / FX frames required: `btn-pause`, `btn-sound`, `btn-sound-off`, `btn-replay`, `btn-home`, `star-full`, `star-empty`, `crown-star-full`, `crown-star-empty`, `check-mark`, `x-mark`, `sparkle`, `petal`, `firefly`, `card-panel` (`atlas.test.ts:65-72`, `e2e.test.ts:650`).
- Decoration frames required: 13 items (`decor-fountain`, `decor-topiary`, `decor-banners`, `decor-lantern`, `decor-couch`, `decor-peacock`, `decor-swing`, `decor-throne`, `decor-chaise`, `decor-mirror`, `decor-teatable`, `decor-bookshelf`, `decor-chandelier`, `coin-gold`) (`marketplace.test.ts:30-38`).
- In `tests/tier5_scenes_adversarial.test.ts` lines 899 & 905:
  `expect((castle as any).background.texture).toBe('castle-exterior')` and `'castle-interior'`.

---

## 2. Logic Chain

1. **Palette Snapping & No-Flicker Rule**:
   - `DESIGN.md` mandates the No-Flicker Rule: all in-game sprites strictly snap to the locked palette with 1-bit alpha borders, completely eliminating color bleeding, halo artifacts, and unquantized drift.
   - `palette.json` must be populated with 16 authoritative hex colors derived from `DESIGN.md` (covering sky blue `#0284c7`, emerald `#16a34a`, amber `#d97706`, violet `#7c3aed`, crimson `#f43f5e`, gold `#f59e0b`, navy `#071b2e`, etc.).
   - Running `quantize.py` snaps high-res RGB pixels to these 16 discrete centroids, eliminating soft gradients and pastel halos.

2. **Foot Matte & Cutout Residue Elimination**:
   - In `scripts/pack_ai_atlas.py`, background removal used `feather_radius=1.2` (Gaussian blur) and `LANCZOS` downsampling. Because the AI raster character stood on a white floor with a soft contact drop shadow (RGB ~200, diff=55 > threshold=25), the shadow survived as an unextracted semi-transparent gray smudge under Penelope's shoes.
   - Using `remove-background.py` with 1-bit hard thresholding (`--edge-mode hard`), despill decontamination (`decontaminate_spill`), and nearest-neighbor downsampling (`downsample.py`) binarizes alpha strictly at threshold 128 (`clean_alpha_edges`). Clamping the bottom bounding box of the sneakers to eliminate the floor shadow ensures the red sneaker soles sit cleanly on the ground plane with zero dirty fringe.

3. **Motion Consistency & Scale Locking (`--anim-lock`)**:
   - `STACK.md` explicitly forbids `autocenter-on-animation-sequence`.
   - In `scripts/pack_ai_atlas.py`, `princess-idle-1` and `princess-catch` were cropped to their independent bounding boxes and scaled individually, causing scale and position jitter.
   - In the retro pipeline, `princess-idle-1`, `princess-idle-2`, `princess-catch`, and `princess-think` must be passed to `downsample.py` with `--anim-lock`, which computes a single shared union bounding box and shared scale factor, preserving the ground plane and character volume across frames.
   - Single static items (`apple`, `banana`, UI icons) must use `--auto-center` to ensure their 48px+ hitboxes are centered.

4. **Zero Unbatched Image Network Requests**:
   - `STACK.md` forbids `unbatched-image-loads`.
   - Having `background.jpg`, `castle_exterior.jpg`, and `castle_interior.jpg` in `public/assets/` loaded via `this.load.image(...)` creates 3 unbatched HTTP requests.
   - By downsampling the retro backdrops to 240x400 (which scales cleanly 2x to 480x800) and packing `background`, `castle-exterior`, and `castle-interior` into `atlas.png` + `atlas.json`:
     - Over the network, ONLY `atlas.png` and `atlas.json` are fetched (0 standalone image fetches).
     - In `PreloadScene.create()`, standalone textures `'background'`, `'castle-exterior'`, and `'castle-interior'` are registered into Phaser's TextureManager from the atlas frames using `this.textures.createCanvas(...)`.
     - This ensures `CastleScene.ts`, `MenuScene.ts`, and `GameScene.ts` continue to function without modifying existing texture keys, and all 499 automated tests (including `tier5_scenes_adversarial.test.ts`) continue to pass with 100% integrity.

5. **UI Layout Collision & Placeholder Remediation**:
   - In `MenuScene.ts`, the title `'👑 Princess Penelope 🍎'` at x=240, y=38 collides with the Shop button (x=96) and Coin badge (x=370). Moving the utility buttons to y=26 and the title/subtitle to y=66–92 provides 200px of clean horizontal space for the title, resolving the collision.
   - In `MenuScene.ts:203`, locked cards currently display `'card-panel'` at 52x52 with 0.4 alpha. Replacing this with a dedicated 48x48 16-bit retro `'lock'` icon in the atlas provides clear visual communication for locked stages.

---

## 3. Caveats

1. **Atlas Dimension Constraints**:
   - `tests/atlas.test.ts` line 17 strictly enforces `expect(parsed.meta.size.w).toBe(1024)`. The atlas width CANNOT be 2048 without updating the test. Width MUST be exactly 1024. Height can be 1024 or 2048 (as line 18 enforces `toBeGreaterThanOrEqual(512)`).
2. **Fruit Frame Dimensions**:
   - `tests/atlas.test.ts` lines 41–42 and `tests/adversarial.test.ts` lines 67–68 strictly assert `w === 80` and `h === 80` for all 12 fruit frames. Even though minimum touch target is 48px, the canvas frame dimensions in `atlas.json` must be exactly 80x80 px.
3. **Basket Frame Dimensions**:
   - `tests/atlas.test.ts` line 49 strictly asserts `w: 128, h: 64` for `basket`.
4. **Tree Stage Dimensions**:
   - `tests/atlas.test.ts` lines 58–59 strictly assert `w: 128, h: 128` for all 5 tree stages.
5. **Decoration Frame Keys**:
   - `tests/marketplace.test.ts` line 37 asserts all 13 decoration items in `data/decorations.json` match atlas frame keys verbatim (`decor-fountain`, `decor-topiary`, etc.).

---

## 4. Conclusion & Technical Specifications

### 4.1 Locked 16-Color Palette Specification (`palette.json`)

The following 16 hex colors must be written to `palette.json` in `~/Documents/pixel-art-pipeline/palette.json` and utilized for quantization:

```json
[
  "#071b2e",
  "#0f172a",
  "#0369a1",
  "#0284c7",
  "#38bdf8",
  "#15803d",
  "#16a34a",
  "#84cc16",
  "#d97706",
  "#f59e0b",
  "#facc15",
  "#f43f5e",
  "#fb7185",
  "#7c3aed",
  "#94a3b8",
  "#ffffff"
]
```

**Color Roles**:
1. `#071b2e`: Night Navy Backdrop / Outline ink / Darkest shadow
2. `#0f172a`: Slate Text Dark / Deep clothing creases
3. `#0369a1`: Deep Ocean Border / Dungarees base shadow
4. `#0284c7`: Arcade Sky Blue / Primary UI / Phonics badge
5. `#38bdf8`: Sunny Canvas Sky / Blueberry highlight / Denim cuffs
6. `#15803d`: Success Emerald Dark / Tree foliage shadow / Watermelon rind
7. `#16a34a`: Success Emerald / Leaf midtone / Play action green
8. `#84cc16`: Retro Kiwi Lime / Bright leaf highlight / Foliage apex
9. `#d97706`: Morphology Amber / Wicker basket / Wood trunk / Orange shadow
10. `#f59e0b`: Warm Gold / Stars / Coin / Banana midtone / Penelope crown
11. `#facc15`: Sunlight Yellow / Lemon / Sparkle / Star highlight
12. `#f43f5e`: Fruit Crimson / Apple / Strawberry / Penelope sneakers
13. `#fb7185`: Peach Pink / Cheek blush / Watermelon sweet flesh
14. `#7c3aed`: Vocabulary Violet / Grape / Plum / Shop button
15. `#94a3b8`: Slate Stroke Muted / Neutral border / Lock metal
16. `#ffffff`: Modal Pure White / Eye sparkles / Sneaker toe caps / Hotspots

### 4.2 Complete Frame Packing Manifest

The unified power-of-two texture atlas (`atlas.png` + `atlas.json`) must pack exactly 42 frames:

| Category | Frame Key | Width (px) | Height (px) | Resampling / Tool Rule | Source / Reference |
|---|---|---|---|---|---|
| Character | `princess-idle-1` | 96 | 128 | `remove-bg` -> `quantize` -> `downsample --anim-lock` | Penelope standing raster |
| Character | `princess-idle-2` | 96 | 128 | `remove-bg` -> `quantize` -> `downsample --anim-lock` | Penelope standing raster (inhale) |
| Character | `princess-catch` | 96 | 128 | `remove-bg` -> `quantize` -> `downsample --anim-lock` | Penelope celebration raster |
| Character | `princess-think` | 96 | 128 | `remove-bg` -> `quantize` -> `downsample --anim-lock` | Upper torso tilt |
| Tree Stages | `tree-stage-1` | 128 | 128 | Bottom-anchored `quantize` -> `downsample` | Sapling |
| Tree Stages | `tree-stage-2` | 128 | 128 | Bottom-anchored `quantize` -> `downsample` | Young tree |
| Tree Stages | `tree-stage-3` | 128 | 128 | Bottom-anchored `quantize` -> `downsample` | Budding tree |
| Tree Stages | `tree-stage-4` | 128 | 128 | Bottom-anchored `quantize` -> `downsample` | Fruit tree |
| Tree Stages | `tree-stage-5` | 128 | 128 | Bottom-anchored `quantize` -> `downsample` | Royal orchard tree |
| Fruit | `apple` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Red delicious apple |
| Fruit | `orange` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Round citrus orange |
| Fruit | `grape` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Purple cluster |
| Fruit | `banana` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Curved yellow bunch |
| Fruit | `watermelon` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Green/red melon wedge |
| Fruit | `blueberry` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Blue cluster |
| Fruit | `strawberry` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Crimson berry |
| Fruit | `lemon` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Sunlight citrus |
| Fruit | `kiwi` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Fuzzy green slice |
| Fruit | `peach` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Soft pink stonefruit |
| Fruit | `plum` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Deep violet stonefruit |
| Fruit | `cherry` | 80 | 80 | `downsample --auto-center` (hitbox >= 48px) | Twin stemmed cherries |
| Catcher | `basket` | 128 | 64 | `downsample --auto-center` (w=128, h=64) | Wicker golden basket |
| Catcher | `basket-royal` | 128 | 64 | `downsample --auto-center` (w=128, h=64) | Crown jeweled basket |
| UI Control | `btn-pause` | 64 | 64 | 16-color crisp pixel art | Blue circle with twin bars |
| UI Control | `btn-sound` | 64 | 64 | 16-color crisp pixel art | Blue circle with speaker cone |
| UI Control | `btn-sound-off` | 64 | 64 | 16-color crisp pixel art | Slate circle with strikeout |
| UI Control | `btn-replay` | 64 | 64 | 16-color crisp pixel art | Emerald circle with circular arrow |
| UI Control | `btn-home` | 64 | 64 | 16-color crisp pixel art | Violet circle with castle roof |
| UI Badge | `star-full` | 48 | 48 | 16-color crisp pixel art | Gold 5-point star |
| UI Badge | `star-empty` | 48 | 48 | 16-color crisp pixel art | Slate outline 5-point star |
| UI Badge | `crown-star-full`| 48 | 48 | 16-color crisp pixel art | Royal crown star badge |
| UI Badge | `crown-star-empty`| 48 | 48 | 16-color crisp pixel art| Slate crown star badge |
| UI Badge | `check-mark` | 48 | 48 | 16-color crisp pixel art | Green check circle |
| UI Badge | `x-mark` | 48 | 48 | 16-color crisp pixel art | Red X circle |
| UI Badge | `coin-gold` | 48 | 48 | 16-color crisp pixel art | Gold star coin |
| UI Badge | `lock` | 48 | 48 | 16-color crisp pixel art | Golden padlock with iron shackle |
| UI Panel | `card-panel` | 96 | 96 | 16-color crisp pixel art | White panel with 3px blue border |
| FX Particle | `sparkle` | 32 | 32 | 16-color crisp pixel art | 4-point gold glint |
| FX Particle | `petal` | 32 | 32 | 16-color crisp pixel art | Pink blossom petal |
| FX Particle | `firefly` | 24 | 24 | 16-color crisp pixel art | Yellow glowing night bug |
| Marketplace | `decor-fountain` | 96 | 96 | `quantize` -> `downsample --auto-center` | Crystal tiered fountain |
| Marketplace | `decor-topiary` | 96 | 96 | `quantize` -> `downsample --auto-center` | Spiral rose topiary |
| Marketplace | `decor-banners` | 96 | 96 | `quantize` -> `downsample --auto-center` | Silk royal banners |
| Marketplace | `decor-lantern` | 96 | 96 | `quantize` -> `downsample --auto-center` | Wrought iron streetlamp |
| Marketplace | `decor-couch` | 96 | 96 | `quantize` -> `downsample --auto-center` | Plush daybed couch |
| Marketplace | `decor-peacock` | 96 | 96 | `quantize` -> `downsample --auto-center` | Gold peacock statue |
| Marketplace | `decor-swing` | 96 | 96 | `quantize` -> `downsample --auto-center` | Floral canopy swing |
| Marketplace | `decor-throne` | 96 | 96 | `quantize` -> `downsample --auto-center` | Velvet crown throne |
| Marketplace | `decor-chaise` | 96 | 96 | `quantize` -> `downsample --auto-center` | Gilded scrolled chaise |
| Marketplace | `decor-mirror` | 96 | 96 | `quantize` -> `downsample --auto-center` | Oval filigree mirror |
| Marketplace | `decor-teatable` | 96 | 96 | `quantize` -> `downsample --auto-center` | Teatime porcelain table |
| Marketplace | `decor-bookshelf`| 96 | 96 | `quantize` -> `downsample --auto-center` | Fairytale bookcase |
| Marketplace | `decor-chandelier`| 96 | 96 | `quantize` -> `downsample --auto-center` | Crystal brass chandelier |
| Backdrop | `background` | 240 | 400 | 16-color palette nearest-neighbor | Retro arcade orchard hills & sky |
| Backdrop | `castle-exterior`| 240 | 400 | 16-color palette nearest-neighbor | Retro castle exterior grounds |
| Backdrop | `castle-interior`| 240 | 400 | 16-color palette nearest-neighbor | Retro throne room hall |

### 4.3 Atlas Packing Architecture

1. **Dimensions**: Width: `1024px`, Height: `1024px` (or `2048px` if shelf spacing dictates). Both are power-of-two.
2. **Extrusion & Padding**: 2px inner padding, 1px extrusion (or 6px shelf clearance) to prevent WebGL mipmap / texture bleed on mobile digitizers.
3. **Format**: RGBA8888 indexed PNG with 1-bit alpha borders. File size strictly `< 900 KB`.
4. **Phaser Registration in `PreloadScene.ts`**:
   ```typescript
   // Preload only the atlas - zero unbatched image requests!
   this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
   ```
   In `PreloadScene.create()`:
   ```typescript
   // Create standalone texture instances for the 3 backdrops from atlas frames
   // so that existing scene code and tests (e.g. CastleScene, tier5_scenes_adversarial)
   // continue to resolve texture keys seamlessly with zero HTTP overhead:
   const atlas = this.textures.get('atlas');
   ['background', 'castle-exterior', 'castle-interior'].forEach(frameName => {
     if (atlas.has(frameName) && !this.textures.exists(frameName)) {
       const frame = atlas.get(frameName);
       const canvasTex = this.textures.createCanvas(frameName, frame.width, frame.height);
       if (canvasTex) {
         canvasTex.drawFrame('atlas', frameName, 0, 0);
         canvasTex.refresh();
       }
     }
   });
   ```
5. **Delete Standalone Files**: Remove `public/assets/background.jpg`, `public/assets/castle_exterior.jpg`, and `public/assets/castle_interior.jpg`.

### 4.4 Main Menu Header Layout Specification

To eliminate the header overlap on standard 480px mobile viewports, implement a clean 2-tier structure in `src/scenes/MenuScene.ts`:

- **Header Background**: Height `120px` (or `125px`), fill `0x0284c7`, bottom border stroke `3px` `0x0369a1`.
- **Row 1 (Utility Bar, y = 26)**:
  - Orchard Button: `x = 36, y = 26`, size `44x44`, icon display size `36x36`.
  - Castle Shop Button: `x = 100, y = 26`, rounded rect `68x30`, font `12px Lexend bold`.
  - Center Space (`x = 135` to `330`): Clean negative space (195px margin).
  - Coin Counter Badge: `x = 370, y = 26`, pill `72x30`, coin icon `18x18`, font `13px Lexend bold`.
  - Sound Button: `x = 444, y = 26`, size `44x44`, display size `40x40`.
- **Row 2 (Branding Bar, y = 70 to 95)**:
  - Game Title: Centered at `x = 240, y = 70`, text `'👑 Princess Penelope 🍎'`, font `22px Lexend bold`, color `#ffffff`.
  - Subtitle: Centered at `x = 240, y = 96`, text `'Princesses Wear Pants • Royal Orchard'`, font `12px Lexend`, color `#bae6fd`.
- **Topic Tabs**: Start at `y = 145`, height `40px`.
- **Level Button Container**: Starts at `y = 200`.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Palette Conformance**:
   ```bash
   python3 -c "
   from PIL import Image
   import json, numpy as np
   with open('~/Documents/pixel-art-pipeline/palette.json') as f:
       pal = [tuple(int(c.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) for c in json.load(f)]
   img = Image.open('public/assets/atlas.png').convert('RGBA')
   arr = np.array(img)
   opaque = arr[arr[:, :, 3] >= 128][:, :3]
   unique_colors = [tuple(c) for c in np.unique(opaque, axis=0)]
   invalid = [c for c in unique_colors if c not in pal]
   assert len(invalid) == 0, f'Found {len(invalid)} unquantized colors: {invalid[:5]}'
   print('✓ 100% Palette Conformance: all opaque pixels map strictly to locked 16-color palette.')
   "
   ```

2. **Atlas Integrity & Unit Test Suite**:
   ```bash
   npm test
   ```
   Pass criterion: 20/20 test files passed, 499+ tests passed (100% pass rate).

3. **Zero Unbatched Image Requests Check**:
   ```bash
   # Verify no standalone .jpg or unbatched images exist in public/assets/
   ls -la public/assets/
   # Expected output: only atlas.png and atlas.json
   ```

4. **Build Stack Advisor Compliance**:
   ```bash
   ~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz
   ```
   Pass criterion: Exit code 0, verdict: `✓ PASS`.

5. **Production Build Compilation**:
   ```bash
   npm run build
   ```
   Pass criterion: Clean compilation to `dist/` with 0 TypeScript or Rollup errors.
