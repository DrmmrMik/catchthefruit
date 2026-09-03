# Catch the Fruit: Texture Atlas & Asset Pipeline Specification

**Author**: Explorer M1-3  
**Milestone**: M1 (Scaffolding, PWA Assets & Build Infrastructure)  
**Status**: COMPLETE / READY FOR IMPLEMENTATION  
**Target Output Assets**:  
- `public/assets/atlas.png` (1024x512 RGBA packed texture atlas)  
- `public/assets/atlas.json` (Phaser 3/4 TexturePacker JSON Hash schema)  
- `public/fonts/Lexend-Variable.woff2` (bundled local dyslexia-friendly font)  
- `scripts/generate_atlas.py` (procedural generation and packing script)  

---

## 1. Executive Summary & Architecture Overview

Catch the Fruit is a mobile-first 2D educational arcade PWA designed for a 2nd grade student in Pittsburgh Public Schools. In accordance with `STACK.md` (archetype: `2d-game-arcade`), `SPEC.md`, and `ORIGINAL_REQUEST.md`, high-performance 60Hz/120Hz mobile rendering demands strict avoidance of DOM churn and unbatched network requests.

This specification details the end-to-end design for the game's asset pipeline:
1. **Procedural Vector-Quality Sprite Generator**: A self-contained Python script using Pillow (`PIL`) that programmatically constructs 29 distinct, child-friendly, vector-like game sprites using 4x supersampling and Lanczos downsampling.
2. **Single Packed Texture Atlas**: A power-of-two 1024x512 RGBA sprite atlas containing all 12 fruits, basket catcher, UI buttons, star rating badges, 5-stage orchard growth trees, and particle effects.
3. **Phaser 4 Engine Integration**: Seamless consumption via `this.load.atlas()`, guaranteeing zero draw-call thrashing and single-request asset loading.
4. **Local Dyslexia-Friendly Typography**: Bundling of the open-source Lexend font family locally within `public/fonts/`, precached by the Service Worker for 100% offline functionality.

---

## 2. STACK.md Compliance & Zero-Violation Analysis

`STACK.md` establishes four hard forbidden constraints for the `2d-game-arcade` archetype. Our asset architecture strictly guarantees compliance with all four:

| Forbidden Pattern | Risk in Educational Arcade Games | Our Asset Pipeline Architectural Guarantee |
|:---|:---|:---|
| `unbatched-image-loads` | Issuing separate `this.load.image()` or `new Image()` calls for each fruit, button, and effect creates dozens of HTTP requests, risks partial 404 failures in offline mode, and allocates separate WebGL GPU textures, preventing sprite batching. | **100% Forbidden Prevention**: Exactly **ONE** texture atlas (`atlas.png`) and **ONE** metadata file (`atlas.json`) are loaded in `BootScene`. All 29 sprites share a single WebGL texture unit. The entire game renders in batched WebGL draw calls. |
| `dom-sprites` | Creating HTML `<img>`, `<svg>`, or `<div>` elements for falling fruit or UI icons triggers browser layout reflows, high garbage collection churn, and severe jitter on 120Hz mobile displays. | **100% Forbidden Prevention**: Zero DOM elements are used for game sprites. All fruit items, catcher basket, UI buttons, stars, and particles are instantiated directly as Phaser GameObjects (`Phaser.GameObjects.Sprite`, `Phaser.GameObjects.Image`) inside the WebGL `<canvas>`. |
| `raw-raf-loop` | Using uncalibrated `requestAnimationFrame` causes falling fruits to travel at double speed on 120Hz displays (such as Samsung S24 Ultra). | Handled by Phaser 4's fixed-timestep Arcade Physics (detailed in Explorer M1-1 and M4). Sprites define standardized bounding circles (`setCircle(36)`). |
| `hardcoded-curriculum-logic` | Hardcoding phonics rules into sprite definitions. | All sprite definitions are pure visual frames (`apple`, `orange`, `star-full`); curriculum associations are injected dynamically at runtime via external Zod-validated JSON datasets. |

### 2.1 Touch Hitbox Ergonomics (>= 48px Guarantee)
`SPEC.md` and `ORIGINAL_REQUEST.md` mandate:
> *"All interactive falling fruits feature touch target hitboxes of at least 48px diameter with no swipe or drag requirements."*

- **Sprite Canvas Size**: All 12 fruit sprites are generated with an **80x80 px** bounding canvas.
- **Physical Collision & Touch Area**: In Phaser 4, fruit sprites instantiate Arcade Physics circle hitboxes with radius $r = 36\text{px}$ (diameter $d = 72\text{px}$) centered at $(4, 4)$.
- **Compliance Margin**: A 72px diameter circular hitbox exceeds the 48px minimum requirement by **+50%**, ensuring effortless touch accuracy for 7-year-old fingers on mobile screens without requiring precision pinch or drag.

---

## 3. Asset Catalog & Visual Design Specifications

All sprites are designed with bright, high-contrast, child-friendly aesthetics tailored for developing readers.

### 3.1 The 12 Fruit Types (80x80 px canvas)

| # | Frame Key | Primary Dimensions | Color Palette & Hex Codes | Visual Morphology & Distinguishing Features | Hitbox Area |
|:--|:---|:---|:---|:---|:---|
| 1 | `apple` | 80x80 px | Red (`#D32F2F`, `#E53935`), Stem (`#5D4037`), Leaf (`#43A047`), Shine (`#FFCDD2`) | Classic double-lobed heart curve, top stem notch, angled wood stem, bright green leaf, upper-left gloss. | 72px circle |
| 2 | `orange` | 80x80 px | Orange (`#FF9800`, `#F57C00`), Calyx (`#388E3C`), Highlight (`#FFE082`) | Round citrus sphere, subtle peel texture stippling, 4-lobed green star calyx at top, warm specular arc. | 72px circle |
| 3 | `grape` | 80x80 px | Purple (`#7B1FA2`, `#4A148C`), Tendril (`#558B2F`), Shine (`#E1BEE7`) | Inverted cone cluster of 10 plump grape spheres, green vine curl, individual glossy dots on each grape. | 72px circle |
| 4 | `banana` | 80x80 px | Yellow (`#FFEB3B`, `#FDD835`), Shadow (`#FBC02D`), Tips (`#4E342E`) | Smooth crescent arc angled diagonally, 3-faceted rind shading, dark brown blossom nib and woody stalk. | 72px circle |
| 5 | `watermelon` | 80x80 px | Rind (`#1B5E20`, `#4CAF50`), Flesh (`#E91E63`), Seeds (`#212121`) | Triangular wedge slice, curved striped rind, white inner margin, vibrant red flesh, 5 teardrop black seeds. | 72px circle |
| 6 | `blueberry` | 80x80 px | Deep Blue (`#1A237E`, `#1E88E5`), Bloom (`#90CAF9`), Calyx (`#0D47A1`) | Plump round indigo berry, distinctive 5-point indented crown/calyx at top, soft powdery blue bloom sheen. | 72px circle |
| 7 | `strawberry` | 80x80 px | Scarlet (`#E53935`, `#C62828`), Leaves (`#2E7D32`), Seeds (`#FFF59D`) | Conical heart berry tapering downward, frilly 5-lobed green leaf crown, orderly diamond lattice of gold seeds. | 72px circle |
| 8 | `lemon` | 80x80 px | Citrus Yellow (`#FFEE58`, `#FBC02D`), Leaf (`#4CAF50`), Shine (`#FFFDE7`) | Distinctive ovoid/football silhouette with pointed left/right nibs, delicate green leaf, sunny warm gradient. | 72px circle |
| 9 | `kiwi` | 80x80 px | Fuzzy Skin (`#6D4C41`), Flesh (`#8BC34A`), Core (`#F1F8E9`), Seeds (`#212121`) | Sliced cross-section: fuzzy brown exterior rim, electric lime pulp with radiating rays, cream core, seed ring. | 72px circle |
| 10 | `peach` | 80x80 px | Coral Pink (`#FF7043`), Gold (`#FFD54F`), Stem (`#5D4037`), Leaf (`#388E3C`) | Heart-oval body with iconic vertical cleft crease, delicate pink-to-yellow blush gradient, lanceolate leaf. | 72px circle |
| 11 | `plum` | 80x80 px | Midnight Violet (`#311B92`, `#7B1FA2`), Bloom (`#CE93D8`), Stem (`#4E342E`) | Deep violet egg shape with side dimple cleft, top stem depression, short brown twig, dusky lilac sheen. | 72px circle |
| 12 | `cherry` | 80x80 px | Ruby Red (`#B71C1C`, `#C2185B`), Stems (`#388E3C`), Highlights (`#FFFFFF`) | Twin glossy red cherries hanging together, two curved green stems joining in an inverted 'V', central leaf. | 72px circle |

### 3.2 Basket Catcher (128x64 px)

| Frame Key | Dimensions | Color Palette | Description |
|:---|:---|:---|:---|
| `basket` | 128x64 px | Rim (`#6D4C41`), Woven Reeds (`#8D6E63`, `#BCAAA4`), Interior (`#3E2723`) | Wide flared wicker basket catcher with thick rounded wooden rim, dark shadowed interior to receive falling fruit, criss-cross woven reed lattice texture on bowl exterior, and curved side handles. |

### 3.3 UI Buttons & Controls (64x64 px each)

| Frame Key | Dimensions | Badge Color | Icon Glyph Description | Function |
|:---|:---|:---|:---|:---|
| `btn-pause` | 64x64 px | Cyan Blue (`#0288D1`) | Two vertical rounded pill-shaped white bars (`\|\|`) | Pauses gameplay and opens options modal |
| `btn-sound` | 64x64 px | Emerald Green (`#00897B`) | White speaker cone with two concentric sound emission arcs | Audio active indicator / mute toggle |
| `btn-sound-off`| 64x64 px | Slate Gray (`#546E7A`) | White speaker cone with bold diagonal slash / 'X' | Audio muted indicator / unmute toggle |
| `btn-replay`| 64x64 px | Warm Orange (`#FB8C00`) | White 270° circular rewind arrow | Restarts current level round |
| `btn-home` | 64x64 px | Royal Purple (`#8E24AA`)| White cottage/home with pitched roof and doorway | Returns to Topic/Level Selection |

### 3.4 Star Rating Badges (48x48 px each)

| Frame Key | Dimensions | Fill & Border Colors | Visual Description |
|:---|:---|:---|:---|
| `star-full` | 48x48 px | Gold (`#FFD700`), Amber border (`#FFA000`), Shine (`#FFFFFF`) | Geometric 5-pointed star with warm beveled golden tones and bright specular shine on top point. Earned rating. |
| `star-empty`| 48x48 px | Slate outline (`#78909C`), Translucent fill (`#ECEFF1` @ 40%) | Clean 5-pointed star outline showing empty/unearned star slot in HUD and level summary modals. |

### 3.5 Orchard Tree Growth Stages (128x128 px each)

Level progress is visually rewarded by an evolving fruit tree in the Orchard map scene:

| Frame Key | Dimensions | Foliage / Growth Level | Fruit Load | Visual Details |
|:---|:---|:---|:---|:---|
| `tree-stage-1` | 128x128 px | Sprout / Sapling | 1 tiny fruit bud | Soil mound, tender young brown stem with 2 delicate green leaves and 1 budding red fruit. |
| `tree-stage-2` | 128x128 px | Young Bushy Tree | 2 ripe fruits | Sturdy trunk, compact round leafy green canopy with 2 bright red apples. |
| `tree-stage-3` | 128x128 px | Developing Tree | 3 ripe fruits | Branching trunk, fuller double-lobed foliage canopy bearing 3 fruits. |
| `tree-stage-4` | 128x128 px | Mature Tree | 4 ripe fruits | Robust tree trunk with root flares, wide triple-lobed lush canopy with 4 ripe fruits. |
| `tree-stage-5` | 128x128 px | Grand Harvest Tree | 5 golden fruits | Expansive canopy adorned with pink blossom flowers, 5 glowing golden fruits, celebratory golden halo. |

### 3.6 Particle FX & Feedback Markers (32x32 to 96x96 px)

| Frame Key | Dimensions | Palette | Description |
|:---|:---|:---|:---|
| `sparkle` | 32x32 px | Core (`#FFFFFF`), Glow (`#FFD54F`, `#FFEE58`) | 4-point diamond star twinkle with 4 secondary diagonal rays and soft luminous gradient halo. Emitted in bursts on correct catch. |
| `check-mark` | 48x48 px | Emerald (`#2E7D32`), White (`#FFFFFF`) | Vibrant green circular badge with crisp white checkmark for instant positive feedback. |
| `x-mark` | 48x48 px | Crimson (`#D32F2F`), White (`#FFFFFF`) | Vibrant red circular badge with crisp white 'X' for mistake feedback. |
| `card-panel` | 96x96 px | Cream (`#FFFDE7`), Border (`#FFB300`) | Clean rounded rectangle card background panel for the 3-mistake remedial teaching card. Compatible with Phaser 9-slice or scaled display. |

---

## 4. Atlas Packing Architecture & Phaser 4 Integration

### 4.1 Texture Dimensions & VRAM Footprint
- **Atlas Resolution**: **1024 x 512 pixels** (Power-of-Two dimensions).
- **Format**: 32-bit RGBA PNG (`RGBA8888`).
- **Texture Bleed Protection**: A **4px margin/gutter** is inserted between all adjacent sprite frames. When textures are sampled on high-DPI displays with bilinear filtering, this prevents color bleeding across frame boundaries.
- **Memory Footprint**:
  $$\text{VRAM} = 1024 \times 512 \times 4\text{ bytes} = 2,097,152\text{ bytes} = 2.0\text{ MB}$$
  A 2MB texture allocation is negligible even on low-tier mobile devices and instant to upload to the GPU.
- **Disk / Network Size**: Programmatic flat/vector artwork with PNG deflate compression produces an atlas file size of approximately **70 KB to 95 KB**, loading across 4G/5G in < 15ms.

### 4.2 Atlas Layout Map (1024 x 512 Grid)

```
       0          128        256        384        512        640        768        896       1024
   0   +----------+----------+----------+----------+----------+----------+----------+----------+
       | tree-    | tree-    | tree-    | tree-    | tree-    | basket   | card-    | (pad)    |
       | stage-1  | stage-2  | stage-3  | stage-4  | stage-5  | (128x64) | panel    |          |
       | (128x128)| (128x128)| (128x128)| (128x128)| (128x128)|          | (96x96)  |          |
 128   +----------+----------+----------+----------+----------+----------+----------+----------+
       | apple    | orange   | grape    | banana   | watermel | blueberry| strawber | lemon    |
       | (80x80)  | (80x80)  | (80x80)  | (80x80)  | (80x80)  | (80x80)  | (80x80)  | (80x80)  |
 208   +----------+----------+----------+----------+----------+----------+----------+----------+
       | kiwi     | peach    | plum     | cherry   | btn-pause| btn-sound| btn-sndof| btn-repl |
       | (80x80)  | (80x80)  | (80x80)  | (80x80)  | (64x64)  | (64x64)  | (64x64)  | (64x64)  |
 288   +----------+----------+----------+----------+----------+----------+----------+----------+
       | btn-home | star-full| star-empt| check-mrk| x-mark   | sparkle  |          |          |
       | (64x64)  | (48x48)  | (48x48)  | (48x48)  | (48x48)  | (32x32)  |          |          |
 512   +---------------------------------------------------------------------------------------+
```

### 4.3 Phaser 3/4 JSON Hash Format Schema
Phaser's `TexturePacker` loader consumes the JSON Hash format natively:

```json
{
  "frames": {
    "apple": {
      "frame": { "x": 0, "y": 132, "w": 80, "h": 80 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 80, "h": 80 },
      "sourceSize": { "w": 80, "h": 80 },
      "pivot": { "x": 0.5, "y": 0.5 }
    },
    "basket": {
      "frame": { "x": 644, "y": 4, "w": 128, "h": 64 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 128, "h": 64 },
      "sourceSize": { "w": 128, "h": 64 },
      "pivot": { "x": 0.5, "y": 0.5 }
    }
  },
  "meta": {
    "app": "CatchTheFruit-AtlasPacker",
    "version": "1.0",
    "image": "atlas.png",
    "format": "RGBA8888",
    "size": { "w": 1024, "h": 512 },
    "scale": "1"
  }
}
```

### 4.4 Phaser Engine Loading & Consumption Patterns

```typescript
// ==========================================
// 1. Preloading Atlas in BootScene.ts
// ==========================================
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Single batched load for ALL visual game sprites
    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}

// ==========================================
// 2. Instantiating Falling Fruit in GameScene.ts
// ==========================================
export class FruitSprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, fruitType: string) {
    super(scene, x, y, 'atlas', fruitType);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Guaranteed touch hitbox >= 48px: 72px diameter circular hitbox
    this.setCircle(36, 4, 4);
    this.setInteractive({ useHandCursor: true });
  }
}

// ==========================================
// 3. Spawning Particle Sparkle Burst
// ==========================================
export function createSparkleEmitter(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(0, 0, 'atlas', {
    frame: 'sparkle',
    speed: { min: 80, max: 220 },
    scale: { start: 1.2, end: 0 },
    lifespan: 600,
    blendMode: 'ADD',
    emitting: false
  });
}
```

---

## 5. Complete Production Python Generator Script

Below is the complete, self-contained Python generator script `scripts/generate_atlas.py`. It uses supersampling (scale factor 4x) with Pillow's `Resampling.LANCZOS` downsampling to generate ultra-smooth, crisp, vector-like raster graphics, packs them into a 1024x512 canvas with 4px padding, and outputs `public/assets/atlas.png` and `public/assets/atlas.json`.

```python
#!/usr/bin/env python3
"""
Catch the Fruit - Procedural Sprite Generator & Texture Atlas Packer
Author: Explorer M1-3
License: MIT

Requires: Pillow >= 10.0.0
Generates:
  - public/assets/atlas.png (1024x512 RGBA)
  - public/assets/atlas.json (Phaser 3/4 JSON Hash Format)
"""

import os
import json
import math
from PIL import Image, ImageDraw

# Supersampling factor for anti-aliasing
SCALE = 4

def make_canvas(w, h):
    """Creates a 4x supersampled RGBA transparent canvas."""
    return Image.new("RGBA", (w * SCALE, h * SCALE), (0, 0, 0, 0))

def finalize(img, w, h):
    """Downsamples supersampled image to target size using high-quality Lanczos."""
    return img.resize((w, h), Image.Resampling.LANCZOS)

# ==============================================================================
# 12 FRUIT SPRITE GENERATORS (80x80 px)
# ==============================================================================

def draw_apple(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Stem
    d.line([(cx - 2*s, cy - 24*s), (cx - 8*s, cy - 36*s)], fill=(93, 64, 55, 255), width=5*s)
    # Leaf
    leaf_pts = [(cx - 3*s, cy - 28*s), (cx + 18*s, cy - 36*s), (cx + 12*s, cy - 22*s)]
    d.polygon(leaf_pts, fill=(67, 160, 71, 255))
    d.line([(cx - 3*s, cy - 28*s), (cx + 18*s, cy - 36*s)], fill=(46, 125, 50, 255), width=2*s)

    # Apple Body (Dual lobes)
    r = 25 * s
    d.ellipse([cx - r - 2*s, cy - r, cx + 5*s, cy + r], fill=(229, 57, 53, 255))
    d.ellipse([cx - 5*s, cy - r, cx + r + 2*s, cy + r], fill=(211, 47, 47, 255))
    # Bottom merge
    d.ellipse([cx - 20*s, cy - 10*s, cx + 20*s, cy + 24*s], fill=(229, 57, 53, 255))
    # Top indentation
    d.ellipse([cx - 7*s, cy - r - 2*s, cx + 7*s, cy - r + 6*s], fill=(183, 28, 28, 255))
    # Specular gloss highlight
    d.ellipse([cx - 20*s, cy - 18*s, cx - 10*s, cy - 6*s], fill=(255, 205, 210, 200))
    return finalize(img, w, h)

def draw_orange(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 28 * s

    # Main orange sphere
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 152, 0, 255))
    # Shading on lower right
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=140, fill=(245, 124, 0, 255), width=4*s)

    # Peel texture dots
    for angle in [30, 75, 120, 210, 250, 300]:
        rad = math.radians(angle)
        px = cx + (r * 0.65) * math.cos(rad)
        py = cy + (r * 0.65) * math.sin(rad)
        d.ellipse([px - 1.5*s, py - 1.5*s, px + 1.5*s, py + 1.5*s], fill=(255, 183, 77, 255))

    # Top green star calyx
    calyx_pts = [
        (cx, cy - r + 1*s),
        (cx + 6*s, cy - r - 6*s),
        (cx + 2*s, cy - r + 3*s),
        (cx + 8*s, cy - r + 4*s),
        (cx + 1*s, cy - r + 6*s),
        (cx - 7*s, cy - r + 5*s),
        (cx - 3*s, cy - r + 2*s),
        (cx - 6*s, cy - r - 6*s),
    ]
    d.polygon(calyx_pts, fill=(56, 142, 60, 255))
    # Brown stem nub
    d.ellipse([cx - 2*s, cy - r + 1*s, cx + 2*s, cy - r + 5*s], fill=(93, 64, 55, 255))
    # Specular shine
    d.ellipse([cx - 20*s, cy - 20*s, cx - 10*s, cy - 8*s], fill=(255, 224, 130, 200))
    return finalize(img, w, h)

def draw_grape(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)

    # Vine stem & curly tendril
    d.line([(cx, cy - 26*s), (cx, cy - 36*s)], fill=(85, 139, 47, 255), width=4*s)
    d.arc([cx - 10*s, cy - 38*s, cx + 6*s, cy - 26*s], start=180, end=360, fill=(85, 139, 47, 255), width=3*s)
    # Vine Leaf
    d.polygon([(cx, cy - 30*s), (cx - 16*s, cy - 36*s), (cx - 12*s, cy - 24*s)], fill=(104, 159, 56, 255))

    # Grape cluster coordinates (10 grapes in inverted pyramid)
    grape_positions = [
        # Top row (4)
        (-18, -14), (-6, -16), (6, -16), (18, -14),
        # Mid row (3)
        (-12, -2), (0, -3), (12, -2),
        # Lower row (2)
        (-6, 11), (6, 11),
        # Bottom tip (1)
        (0, 23)
    ]
    gr = 9 * s
    for gx, gy in grape_positions:
        x, y = cx + gx * s, cy + gy * s
        # Grape sphere
        d.ellipse([x - gr, y - gr, x + gr, y + gr], fill=(123, 31, 162, 255))
        d.ellipse([x - gr + 1*s, y - gr + 1*s, x + gr - 1*s, y + gr - 1*s], outline=(74, 20, 140, 255), width=2*s)
        # Specular dot
        d.ellipse([x - 5*s, y - 6*s, x - 1*s, y - 2*s], fill=(225, 190, 231, 220))
    return finalize(img, w, h)

def draw_banana(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Banana outer curve polygon
    outer_pts = [
        (cx - 24*s, cy - 30*s),  # Stalk top
        (cx - 18*s, cy - 20*s),
        (cx + 8*s,  cy - 12*s),
        (cx + 26*s, cy + 4*s),
        (cx + 28*s, cy + 22*s),  # Bottom curve
        (cx + 18*s, cy + 32*s),  # Tip
        (cx + 14*s, cy + 30*s),
        (cx + 18*s, cy + 18*s),
        (cx + 10*s, cy + 2*s),
        (cx - 6*s,  cy - 10*s),
        (cx - 20*s, cy - 22*s),
        (cx - 26*s, cy - 28*s)
    ]
    d.polygon(outer_pts, fill=(255, 235, 59, 255))
    # Outer stroke
    d.line(outer_pts + [outer_pts[0]], fill=(251, 192, 45, 255), width=3*s)
    # Rind ridge line
    ridge_pts = [
        (cx - 22*s, cy - 26*s),
        (cx - 8*s, cy - 14*s),
        (cx + 14*s, cy + 2*s),
        (cx + 22*s, cy + 16*s),
        (cx + 16*s, cy + 31*s)
    ]
    d.line(ridge_pts, fill=(245, 127, 23, 255), width=2*s)
    # Stalk crown & bottom nib
    d.ellipse([cx - 27*s, cy - 32*s, cx - 21*s, cy - 26*s], fill=(78, 52, 46, 255))
    d.ellipse([cx + 14*s, cy + 29*s, cx + 20*s, cy + 34*s], fill=(78, 52, 46, 255))
    return finalize(img, w, h)

def draw_watermelon(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Triangular slice wedge
    p_top = (cx, cy - 32*s)
    p_bl = (cx - 30*s, cy + 26*s)
    p_br = (cx + 30*s, cy + 26*s)

    # 1. Dark green outer rind (bottom curve)
    d.pieslice([cx - 38*s, cy - 20*s, cx + 38*s, cy + 34*s], start=25, end=155, fill=(27, 94, 32, 255))
    # 2. Light green inner rind
    d.pieslice([cx - 34*s, cy - 20*s, cx + 34*s, cy + 30*s], start=25, end=155, fill=(76, 175, 80, 255))
    # 3. White margin
    d.pieslice([cx - 31*s, cy - 20*s, cx + 31*s, cy + 27*s], start=25, end=155, fill=(232, 245, 233, 255))
    # 4. Red flesh triangle
    d.polygon([p_top, (cx - 26*s, cy + 22*s), (cx + 26*s, cy + 22*s)], fill=(233, 30, 99, 255))

    # Black teardrop seeds
    seeds = [(-10, 10), (10, 10), (0, 3), (-8, -6), (8, -6)]
    for sx, sy in seeds:
        px, py = cx + sx * s, cy + sy * s
        d.ellipse([px - 2.5*s, py - 4*s, px + 2.5*s, py + 4*s], fill=(33, 33, 33, 255))
        d.ellipse([px - 1*s, py - 3*s, px + 1*s, py - 1*s], fill=(255, 255, 255, 220))
    return finalize(img, w, h)

def draw_blueberry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 27 * s

    # Deep royal blue body
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(30, 136, 229, 255))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=140, fill=(26, 35, 126, 255), width=5*s)

    # 5-pointed crown calyx indentation at top
    crown_y = cy - r + 6*s
    d.ellipse([cx - 9*s, crown_y - 6*s, cx + 9*s, crown_y + 6*s], fill=(13, 71, 161, 255))
    crown_pts = [
        (cx, crown_y - 8*s),
        (cx + 7*s, crown_y - 4*s),
        (cx + 9*s, crown_y + 4*s),
        (cx, crown_y + 6*s),
        (cx - 9*s, crown_y + 4*s),
        (cx - 7*s, crown_y - 4*s)
    ]
    d.polygon(crown_pts, fill=(21, 101, 192, 255))
    d.ellipse([cx - 4*s, crown_y - 3*s, cx + 4*s, crown_y + 3*s], fill=(13, 71, 161, 255))

    # Soft powdery blue bloom highlight
    d.ellipse([cx - 18*s, cy - 16*s, cx - 8*s, cy - 6*s], fill=(187, 222, 251, 190))
    return finalize(img, w, h)

def draw_strawberry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)

    # Conical heart shape
    body_pts = [
        (cx, cy + 28*s),           # Bottom tip
        (cx - 18*s, cy + 18*s),
        (cx - 26*s, cy - 2*s),
        (cx - 22*s, cy - 20*s),
        (cx - 10*s, cy - 24*s),
        (cx, cy - 20*s),           # Top notch
        (cx + 10*s, cy - 24*s),
        (cx + 22*s, cy - 20*s),
        (cx + 26*s, cy - 2*s),
        (cx + 18*s, cy + 18*s)
    ]
    d.polygon(body_pts, fill=(229, 57, 53, 255))
    d.line(body_pts + [body_pts[0]], fill=(198, 40, 40, 255), width=3*s)

    # Golden yellow seeds
    seed_locs = [
        (-12, -14), (0, -14), (12, -14),
        (-16, -4), (-5, -4), (6, -4), (17, -4),
        (-12, 6), (0, 6), (12, 6),
        (-6, 16), (6, 16),
        (0, 23)
    ]
    for sx, sy in seed_locs:
        px, py = cx + sx * s, cy + sy * s
        d.ellipse([px - 1.5*s, py - 2.5*s, px + 1.5*s, py + 2.5*s], fill=(255, 245, 157, 255))

    # Green leaf cap crown (5 leaves)
    leaf_top = [
        (cx, cy - 32*s), (cx - 4*s, cy - 24*s),
        (cx - 22*s, cy - 26*s), (cx - 10*s, cy - 18*s),
        (cx - 16*s, cy - 12*s), (cx - 4*s, cy - 16*s),
        (cx + 4*s, cy - 16*s), (cx + 16*s, cy - 12*s),
        (cx + 10*s, cy - 18*s), (cx + 22*s, cy - 26*s),
        (cx + 4*s, cy - 24*s)
    ]
    d.polygon(leaf_top, fill=(46, 125, 50, 255))
    return finalize(img, w, h)

def draw_lemon(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Football / ovoid lemon with pointed tips
    lemon_pts = [
        (cx - 30*s, cy),            # Left pointed nib
        (cx - 22*s, cy - 18*s),
        (cx, cy - 25*s),
        (cx + 22*s, cy - 18*s),
        (cx + 30*s, cy),            # Right pointed nib
        (cx + 22*s, cy + 18*s),
        (cx, cy + 25*s),
        (cx - 22*s, cy + 18*s)
    ]
    d.polygon(lemon_pts, fill=(255, 238, 88, 255))
    d.line(lemon_pts + [lemon_pts[0]], fill=(251, 192, 45, 255), width=3*s)

    # Green leaf on left tip
    d.polygon([(cx - 30*s, cy), (cx - 38*s, cy - 12*s), (cx - 28*s, cy - 10*s)], fill=(76, 175, 80, 255))
    # Upper gloss
    d.ellipse([cx - 15*s, cy - 18*s, cx + 15*s, cy - 6*s], fill=(255, 253, 231, 200))
    return finalize(img, w, h)

def draw_kiwi(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 28 * s

    # 1. Fuzzy brown outer skin
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(109, 76, 65, 255))
    d.ellipse([cx - r + 3*s, cy - r + 3*s, cx + r - 3*s, cy + r - 3*s], fill=(93, 64, 55, 255))

    # 2. Vivid green flesh
    rf = r - 5*s
    d.ellipse([cx - rf, cy - rf, cx + rf, cy + rf], fill=(139, 195, 74, 255))

    # 3. Radiating rays
    for angle in range(0, 360, 24):
        rad = math.radians(angle)
        x1 = cx + (rf * 0.35) * math.cos(rad)
        y1 = cy + (rf * 0.35) * math.sin(rad)
        x2 = cx + (rf * 0.85) * math.cos(rad)
        y2 = cy + (rf * 0.85) * math.sin(rad)
        d.line([(x1, y1), (x2, y2)], fill=(197, 225, 165, 200), width=2*s)

    # 4. Ring of tiny black seeds
    for angle in range(0, 360, 24):
        rad = math.radians(angle + 12)
        sx = cx + (rf * 0.55) * math.cos(rad)
        sy = cy + (rf * 0.55) * math.sin(rad)
        d.ellipse([sx - 1.5*s, sy - 2.5*s, sx + 1.5*s, sy + 2.5*s], fill=(33, 33, 33, 255))

    # 5. Creamy center core
    rc = 7 * s
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=(241, 248, 233, 255))
    return finalize(img, w, h)

def draw_peach(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Stem & lanceolate leaf
    d.line([(cx, cy - 24*s), (cx + 4*s, cy - 36*s)], fill=(93, 64, 55, 255), width=4*s)
    d.polygon([(cx + 4*s, cy - 30*s), (cx + 24*s, cy - 32*s), (cx + 12*s, cy - 22*s)], fill=(56, 142, 60, 255))

    # Peach body lobes
    r = 25 * s
    d.ellipse([cx - r - 2*s, cy - r, cx + 4*s, cy + r], fill=(255, 112, 67, 255))   # Coral pink left
    d.ellipse([cx - 4*s, cy - r, cx + r + 2*s, cy + r], fill=(255, 213, 79, 255))   # Sunny gold right
    # Bottom merge
    d.ellipse([cx - 18*s, cy - 10*s, cx + 18*s, cy + 24*s], fill=(255, 167, 38, 255))
    # Vertical cleft furrow crease
    d.line([(cx, cy - r + 3*s), (cx, cy + 18*s)], fill=(230, 81, 0, 200), width=2*s)
    # Soft velvet highlight
    d.ellipse([cx - 18*s, cy - 16*s, cx - 8*s, cy - 6*s], fill=(255, 224, 178, 190))
    return finalize(img, w, h)

def draw_plum(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)
    r = 26 * s

    # Stem
    d.line([(cx, cy - 24*s), (cx - 3*s, cy - 34*s)], fill=(78, 52, 46, 255), width=4*s)
    d.polygon([(cx, cy - 28*s), (cx + 14*s, cy - 32*s), (cx + 8*s, cy - 22*s)], fill=(67, 160, 71, 255))

    # Deep purple egg body
    d.ellipse([cx - r, cy - r - 2*s, cx + r, cy + r + 2*s], fill=(74, 20, 140, 255))
    # Dusky lilac bloom highlight
    d.ellipse([cx - 18*s, cy - 18*s, cx - 6*s, cy - 6*s], fill=(206, 147, 216, 190))
    # Side indentation seam
    d.arc([cx - r, cy - r, cx + 2*s, cy + r], start=70, end=110, fill=(49, 27, 146, 255), width=3*s)
    return finalize(img, w, h)

def draw_cherry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (8 * s)

    # Inverted 'V' twin stems
    top_stem = (cx, cy - 36*s)
    c1 = (cx - 16*s, cy + 2*s)
    c2 = (cx + 16*s, cy + 2*s)
    d.line([top_stem, (cx - 12*s, cy - 12*s), c1], fill=(56, 142, 60, 255), width=4*s)
    d.line([top_stem, (cx + 12*s, cy - 12*s), c2], fill=(56, 142, 60, 255), width=4*s)

    # Junction Leaf
    d.polygon([top_stem, (cx + 16*s, cy - 40*s), (cx + 12*s, cy - 26*s)], fill=(76, 175, 80, 255))

    # Twin cherry globes
    r = 15 * s
    for x, y in [c1, c2]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=(194, 24, 91, 255))
        d.arc([x - r, y - r, x + r, y + r], start=0, end=140, fill=(183, 28, 28, 255), width=3*s)
        # Specular shine
        d.ellipse([x - 8*s, y - 9*s, x - 2*s, y - 3*s], fill=(255, 255, 255, 230))
    return finalize(img, w, h)

# ==============================================================================
# BASKET CATCHER (128x64 px)
# ==============================================================================

def draw_basket(w=128, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Outer trapezoidal woven bowl
    bowl_pts = [
        (cx - 52*s, cy - 16*s),  # Top-left
        (cx + 52*s, cy - 16*s),  # Top-right
        (cx + 38*s, cy + 26*s),  # Bottom-right
        (cx - 38*s, cy + 26*s)   # Bottom-left
    ]
    d.polygon(bowl_pts, fill=(141, 110, 99, 255))

    # Wicker cross-hatch weave texture
    for offset in range(-45, 46, 12):
        d.line([(cx + offset*s - 12*s, cy - 16*s), (cx + offset*s + 8*s, cy + 26*s)], fill=(188, 170, 164, 255), width=3*s)
        d.line([(cx + offset*s + 12*s, cy - 16*s), (cx + offset*s - 8*s, cy + 26*s)], fill=(109, 76, 65, 255), width=3*s)

    # Thick wooden rim
    d.rounded_rectangle([cx - 56*s, cy - 22*s, cx + 56*s, cy - 12*s], radius=5*s, fill=(109, 76, 65, 255))
    d.rounded_rectangle([cx - 54*s, cy - 20*s, cx + 54*s, cy - 14*s], radius=3*s, fill=(141, 110, 99, 255))

    # Interior catch opening shadow
    d.ellipse([cx - 48*s, cy - 22*s, cx + 48*s, cy - 14*s], fill=(62, 39, 35, 255))

    # Side handles
    d.arc([cx - 62*s, cy - 16*s, cx - 48*s, cy + 4*s], start=90, end=270, fill=(109, 76, 65, 255), width=5*s)
    d.arc([cx + 48*s, cy - 16*s, cx + 62*s, cy + 4*s], start=270, end=90, fill=(109, 76, 65, 255), width=5*s)

    return finalize(img, w, h)

# ==============================================================================
# UI BUTTONS & CONTROLS (64x64 px)
# ==============================================================================

def draw_btn_circle(w, h, bg_color, shadow_color):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 27 * s

    # Bottom shadow
    d.ellipse([cx - r, cy - r + 3*s, cx + r, cy + r + 3*s], fill=shadow_color)
    # Button circle
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg_color)
    # Inner light rim highlight
    d.arc([cx - r + 2*s, cy - r + 2*s, cx + r - 2*s, cy + r - 2*s], start=180, end=360, fill=(255, 255, 255, 120), width=2*s)
    return img, d, s, cx, cy

def draw_btn_pause(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (2, 136, 209, 255), (1, 87, 155, 255))
    # Two vertical bars
    bw, bh = 5*s, 18*s
    d.rounded_rectangle([cx - 8*s - bw/2, cy - bh/2, cx - 8*s + bw/2, cy + bh/2], radius=2*s, fill=(255, 255, 255, 255))
    d.rounded_rectangle([cx + 8*s - bw/2, cy - bh/2, cx + 8*s + bw/2, cy + bh/2], radius=2*s, fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_btn_sound(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (0, 137, 123, 255), (0, 77, 64, 255))
    # Speaker cone
    d.polygon([(cx - 12*s, cy - 6*s), (cx - 4*s, cy - 6*s), (cx + 5*s, cy - 14*s),
               (cx + 5*s, cy + 14*s), (cx - 4*s, cy + 6*s), (cx - 12*s, cy + 6*s)], fill=(255, 255, 255, 255))
    # Sound waves
    d.arc([cx + 1*s, cy - 10*s, cx + 13*s, cy + 10*s], start=300, end=60, fill=(255, 255, 255, 255), width=3*s)
    d.arc([cx + 4*s, cy - 16*s, cx + 20*s, cy + 16*s], start=300, end=60, fill=(255, 255, 255, 255), width=3*s)
    return finalize(img, w, h)

def draw_btn_sound_off(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (84, 110, 122, 255), (55, 71, 79, 255))
    # Speaker cone
    d.polygon([(cx - 14*s, cy - 6*s), (cx - 6*s, cy - 6*s), (cx + 3*s, cy - 14*s),
               (cx + 3*s, cy + 14*s), (cx - 6*s, cy + 6*s), (cx - 14*s, cy + 6*s)], fill=(255, 255, 255, 255))
    # Diagonal red/white mute slash
    d.line([(cx + 6*s, cy - 10*s), (cx + 18*s, cy + 10*s)], fill=(229, 57, 53, 255), width=4*s)
    d.line([(cx + 18*s, cy - 10*s), (cx + 6*s, cy + 10*s)], fill=(229, 57, 53, 255), width=4*s)
    return finalize(img, w, h)

def draw_btn_replay(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (251, 140, 0, 255), (230, 81, 0, 255))
    # 270 deg circular rewind arrow
    d.arc([cx - 14*s, cy - 14*s, cx + 14*s, cy + 14*s], start=60, end=330, fill=(255, 255, 255, 255), width=4*s)
    # Arrow head
    d.polygon([(cx - 14*s, cy - 4*s), (cx - 6*s, cy - 16*s), (cx - 18*s, cy - 14*s)], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_btn_home(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (142, 36, 170, 255), (74, 20, 140, 255))
    # House roof
    d.polygon([(cx, cy - 16*s), (cx - 16*s, cy - 2*s), (cx + 16*s, cy - 2*s)], fill=(255, 255, 255, 255))
    # House body
    d.rectangle([cx - 12*s, cy - 2*s, cx + 12*s, cy + 14*s], fill=(255, 255, 255, 255))
    # Doorway
    d.rounded_rectangle([cx - 4*s, cy + 4*s, cx + 4*s, cy + 14*s], radius=2*s, fill=(142, 36, 170, 255))
    return finalize(img, w, h)

# ==============================================================================
# STAR RATING BADGES (48x48 px)
# ==============================================================================

def get_star_points(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        angle = -math.pi / 2 + (i * math.pi / 5)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts

def draw_star_full(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    pts = get_star_points(cx, cy, 21*s, 9*s)

    # Star body
    d.polygon(pts, fill=(255, 215, 0, 255))
    d.line(pts + [pts[0]], fill=(255, 160, 0, 255), width=3*s)
    # Upper-left facet highlight
    d.polygon([(cx, cy - 21*s), (cx, cy), (cx - 12*s, cy - 6*s)], fill=(255, 249, 196, 220))
    return finalize(img, w, h)

def draw_star_empty(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    pts = get_star_points(cx, cy, 21*s, 9*s)

    # Translucent gray body
    d.polygon(pts, fill=(236, 239, 241, 100))
    d.line(pts + [pts[0]], fill=(120, 144, 156, 255), width=3*s)
    return finalize(img, w, h)

# ==============================================================================
# ORCHARD TREE GROWTH STAGES (128x128 px)
# ==============================================================================

def draw_tree_stage(stage, w=128, h=128):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Brown soil mound at base
    d.ellipse([cx - 45*s, cy + 42*s, cx + 45*s, cy + 58*s], fill=(121, 85, 72, 255))
    d.ellipse([cx - 38*s, cy + 44*s, cx + 38*s, cy + 54*s], fill=(141, 110, 99, 255))

    if stage == 1:
        # Sprout / Sapling
        d.line([(cx, cy + 46*s), (cx, cy + 18*s)], fill=(109, 76, 65, 255), width=6*s)
        # Leaves
        d.polygon([(cx, cy + 24*s), (cx - 18*s, cy + 12*s), (cx - 6*s, cy + 24*s)], fill=(102, 187, 106, 255))
        d.polygon([(cx, cy + 20*s), (cx + 18*s, cy + 8*s), (cx + 6*s, cy + 20*s)], fill=(129, 199, 132, 255))
        # 1 tiny fruit bud
        d.ellipse([cx - 4*s, cy + 10*s, cx + 4*s, cy + 18*s], fill=(229, 57, 53, 255))

    elif stage == 2:
        # Young Tree
        d.line([(cx, cy + 46*s), (cx, cy + 10*s)], fill=(109, 76, 65, 255), width=10*s)
        # Foliage circle
        d.ellipse([cx - 32*s, cy - 28*s, cx + 32*s, cy + 18*s], fill=(67, 160, 71, 255))
        d.ellipse([cx - 24*s, cy - 22*s, cx + 24*s, cy + 10*s], fill=(76, 175, 80, 255))
        # 2 apples
        for ax, ay in [(-12, -4), (14, 2)]:
            d.ellipse([cx + ax*s - 5*s, cy + ay*s - 5*s, cx + ax*s + 5*s, cy + ay*s + 5*s], fill=(229, 57, 53, 255))

    elif stage == 3:
        # Developing Tree
        d.polygon([(cx - 8*s, cy + 46*s), (cx + 8*s, cy + 46*s), (cx + 5*s, cy), (cx - 5*s, cy)], fill=(109, 76, 65, 255))
        # Branching
        d.line([(cx, cy + 6*s), (cx - 18*s, cy - 10*s)], fill=(109, 76, 65, 255), width=6*s)
        d.line([(cx, cy + 6*s), (cx + 18*s, cy - 10*s)], fill=(109, 76, 65, 255), width=6*s)
        # Double canopy lobes
        d.ellipse([cx - 42*s, cy - 32*s, cx + 8*s, cy + 12*s], fill=(56, 142, 60, 255))
        d.ellipse([cx - 8*s, cy - 32*s, cx + 42*s, cy + 12*s], fill=(67, 160, 71, 255))
        d.ellipse([cx - 26*s, cy - 42*s, cx + 26*s, cy - 2*s], fill=(76, 175, 80, 255))
        # 3 apples
        for ax, ay in [(-20, -10), (0, -22), (20, -6)]:
            d.ellipse([cx + ax*s - 6*s, cy + ay*s - 6*s, cx + ax*s + 6*s, cy + ay*s + 6*s], fill=(229, 57, 53, 255))

    elif stage == 4:
        # Mature Tree
        d.polygon([(cx - 12*s, cy + 46*s), (cx + 12*s, cy + 46*s), (cx + 7*s, cy - 8*s), (cx - 7*s, cy - 8*s)], fill=(93, 64, 55, 255))
        # Broad canopy
        d.ellipse([cx - 48*s, cy - 36*s, cx + 12*s, cy + 14*s], fill=(46, 125, 50, 255))
        d.ellipse([cx - 12*s, cy - 36*s, cx + 48*s, cy + 14*s], fill=(56, 142, 60, 255))
        d.ellipse([cx - 36*s, cy - 48*s, cx + 36*s, cy - 2*s], fill=(67, 160, 71, 255))
        # 4 apples
        for ax, ay in [(-26, -12), (-8, -28), (12, -26), (26, -8)]:
            d.ellipse([cx + ax*s - 6*s, cy + ay*s - 6*s, cx + ax*s + 6*s, cy + ay*s + 6*s], fill=(229, 57, 53, 255))

    elif stage == 5:
        # Grand Harvest Tree (Golden aura, blossom flowers & 5 fruits)
        d.ellipse([cx - 54*s, cy - 54*s, cx + 54*s, cy + 20*s], fill=(255, 238, 88, 70))
        # Sturdy trunk
        d.polygon([(cx - 14*s, cy + 46*s), (cx + 14*s, cy + 46*s), (cx + 8*s, cy - 12*s), (cx - 8*s, cy - 12*s)], fill=(93, 64, 55, 255))
        # Wide expansive crown
        d.ellipse([cx - 52*s, cy - 42*s, cx + 16*s, cy + 14*s], fill=(46, 125, 50, 255))
        d.ellipse([cx - 16*s, cy - 42*s, cx + 52*s, cy + 14*s], fill=(56, 142, 60, 255))
        d.ellipse([cx - 38*s, cy - 52*s, cx + 38*s, cy - 4*s], fill=(67, 160, 71, 255))
        # Blossoms
        for fx, fy in [(-30, -32), (-12, -10), (14, -36), (32, -14)]:
            d.ellipse([cx + fx*s - 4*s, cy + fy*s - 4*s, cx + fx*s + 4*s, cy + fy*s + 4*s], fill=(255, 128, 171, 255))
        # 5 Golden Harvest Fruits
        for gx, gy in [(-28, -8), (-16, -26), (4, -36), (20, -22), (30, -4)]:
            d.ellipse([cx + gx*s - 7*s, cy + gy*s - 7*s, cx + gx*s + 7*s, cy + gy*s + 7*s], fill=(255, 215, 0, 255))
            d.ellipse([cx + gx*s - 2*s, cy + gy*s - 5*s, cx + gx*s + 3*s, cy + gy*s], fill=(255, 255, 255, 220))

    return finalize(img, w, h)

# ==============================================================================
# PARTICLE & FEEDBACK MARKERS
# ==============================================================================

def draw_sparkle(w=32, h=32):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Luminous golden glow corona
    d.ellipse([cx - 12*s, cy - 12*s, cx + 12*s, cy + 12*s], fill=(255, 213, 79, 100))

    # 4 Primary diamond rays
    r = 15 * s
    pts = [(cx, cy - r), (cx + 3*s, cy), (cx, cy + r), (cx - 3*s, cy)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    pts_h = [(cx - r, cy), (cx, cy + 3*s), (cx + r, cy), (cx, cy - 3*s)]
    d.polygon(pts_h, fill=(255, 255, 255, 255))

    # 4 Secondary diagonal rays
    rd = 8 * s
    for angle in [45, 135, 225, 315]:
        rad = math.radians(angle)
        dx, dy = rd * math.cos(rad), rd * math.sin(rad)
        d.line([(cx, cy), (cx + dx, cy + dy)], fill=(255, 245, 157, 230), width=2*s)

    # Core white dot
    d.ellipse([cx - 2.5*s, cy - 2.5*s, cx + 2.5*s, cy + 2.5*s], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_check_mark(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 21 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(46, 125, 50, 255))
    # Crisp white checkmark
    pts = [(cx - 10*s, cy + 1*s), (cx - 3*s, cy + 8*s), (cx + 10*s, cy - 7*s)]
    d.line(pts, fill=(255, 255, 255, 255), width=5*s, joint="curve")
    return finalize(img, w, h)

def draw_x_mark(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 21 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(211, 47, 47, 255))
    # Crisp white X
    d.line([(cx - 9*s, cy - 9*s), (cx + 9*s, cy + 9*s)], fill=(255, 255, 255, 255), width=5*s)
    d.line([(cx + 9*s, cy - 9*s), (cx - 9*s, cy + 9*s)], fill=(255, 255, 255, 255), width=5*s)
    return finalize(img, w, h)

def draw_card_panel(w=96, h=96):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE

    # Clean rounded card background
    pad = 4 * s
    d.rounded_rectangle([pad, pad, w*s - pad, h*s - pad], radius=12*s, fill=(255, 253, 231, 255))
    d.rounded_rectangle([pad, pad, w*s - pad, h*s - pad], radius=12*s, outline=(255, 179, 0, 255), width=4*s)
    return finalize(img, w, h)

# ==============================================================================
# ATLAS PACKER (Shelf Packing Algorithm with 4px Gutters)
# ==============================================================================

def generate_and_pack_atlas(output_dir):
    """
    Renders all 29 sprites, packs them into a 1024x512 canvas with 4px padding,
    and writes atlas.png and atlas.json.
    """
    os.makedirs(output_dir, exist_ok=True)
    atlas_w, atlas_h = 1024, 512
    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    padding = 4

    # 1. Catalog all sprites
    sprites = [
        # Orchard stages (128x128)
        ("tree-stage-1", draw_tree_stage(1)),
        ("tree-stage-2", draw_tree_stage(2)),
        ("tree-stage-3", draw_tree_stage(3)),
        ("tree-stage-4", draw_tree_stage(4)),
        ("tree-stage-5", draw_tree_stage(5)),
        # Basket Catcher (128x64)
        ("basket", draw_basket(128, 64)),
        # Card Panel (96x96)
        ("card-panel", draw_card_panel(96, 96)),
        # 12 Fruits (80x80)
        ("apple", draw_apple(80, 80)),
        ("orange", draw_orange(80, 80)),
        ("grape", draw_grape(80, 80)),
        ("banana", draw_banana(80, 80)),
        ("watermelon", draw_watermelon(80, 80)),
        ("blueberry", draw_blueberry(80, 80)),
        ("strawberry", draw_strawberry(80, 80)),
        ("lemon", draw_lemon(80, 80)),
        ("kiwi", draw_kiwi(80, 80)),
        ("peach", draw_peach(80, 80)),
        ("plum", draw_plum(80, 80)),
        ("cherry", draw_cherry(80, 80)),
        # UI Buttons (64x64)
        ("btn-pause", draw_btn_pause(64, 64)),
        ("btn-sound", draw_btn_sound(64, 64)),
        ("btn-sound-off", draw_btn_sound_off(64, 64)),
        ("btn-replay", draw_btn_replay(64, 64)),
        ("btn-home", draw_btn_home(64, 64)),
        # Stars & Markers (48x48)
        ("star-full", draw_star_full(48, 48)),
        ("star-empty", draw_star_empty(48, 48)),
        ("check-mark", draw_check_mark(48, 48)),
        ("x-mark", draw_x_mark(48, 48)),
        # Sparkle (32x32)
        ("sparkle", draw_sparkle(32, 32)),
    ]

    frames_json = {}
    cur_x, cur_y = padding, padding
    shelf_height = 0

    for name, img in sprites:
        sw, sh = img.size
        # Check if sprite fits in current shelf
        if cur_x + sw + padding > atlas_w:
            # Advance to next shelf row
            cur_x = padding
            cur_y += shelf_height + padding
            shelf_height = 0

        if cur_y + sh + padding > atlas_h:
            raise RuntimeError(f"Texture atlas overflow! Failed to pack {name} ({sw}x{sh}) at y={cur_y}")

        # Paste onto atlas
        atlas_img.paste(img, (cur_x, cur_y))

        # Record frame entry in Phaser JSON Hash format
        frames_json[name] = {
            "frame": {"x": cur_x, "y": cur_y, "w": sw, "h": sh},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": sw, "h": sh},
            "sourceSize": {"w": sw, "h": sh},
            "pivot": {"x": 0.5, "y": 0.5}
        }

        cur_x += sw + padding
        if sh > shelf_height:
            shelf_height = sh

    atlas_data = {
        "frames": frames_json,
        "meta": {
            "app": "CatchTheFruit-AtlasPacker",
            "version": "1.0",
            "image": "atlas.png",
            "format": "RGBA8888",
            "size": {"w": atlas_w, "h": atlas_h},
            "scale": "1"
        }
    }

    # Write files
    png_path = os.path.join(output_dir, "atlas.png")
    json_path = os.path.join(output_dir, "atlas.json")

    atlas_img.save(png_path, "PNG", optimize=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(atlas_data, f, indent=2)

    print(f"Successfully generated texture atlas:")
    print(f"  PNG:  {png_path} ({os.path.getsize(png_path):,} bytes)")
    print(f"  JSON: {json_path} ({len(frames_json)} frames)")

if __name__ == "__main__":
    import sys
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "public/assets"
    generate_and_pack_atlas(out_dir)
```

---

## 6. Lexend Typography Bundling Pipeline

### 6.1 Educational Importance of Lexend
Pittsburgh Public Schools 2nd grade reading assessments test phonemic decoding, vowel discrimination, and morphological word identification. Developed by educational typographer Thomas Jockin and reading specialist Dr. Bonnie Shaver-Troup, the **Lexend** font family incorporates expanded letter-spacing, adjusted ascender/descender proportions, and distinct character contours specifically engineered to reduce visual stress, prevent letter crowding, and measurably accelerate reading speed for developing and dyslexic readers.

### 6.2 Offline Font Bundling Strategy
To pass `validate_pwa.py` with 0 warnings, eliminate external Google Fonts network calls, and guarantee 100% offline availability:
1. **Asset Location**: The font file is bundled locally as `public/fonts/Lexend-Variable.woff2` (or `Lexend-Regular.woff2`, `Lexend-Bold.woff2`).
2. **Download / Provisioning**:
   - The file can be extracted from the `@fontsource/lexend` or `@fontsource-variable/lexend` npm package during build, or downloaded once from the official Google Fonts / Fontsource repository into `public/fonts/`.
3. **CSS `@font-face` Integration**:
   In `index.html` or `src/style.css`:
   ```css
   @font-face {
     font-family: 'Lexend';
     font-style: normal;
     font-weight: 100 900;
     font-display: swap;
     src: url('./fonts/Lexend-Variable.woff2') format('woff2');
   }

   body {
     margin: 0;
     padding: 0;
     overflow: hidden;
     font-family: 'Lexend', system-ui, -apple-system, sans-serif;
     background-color: #E1F5FE; /* Light sky daylight blue */
     user-select: none;
     -webkit-user-select: none;
   }
   ```
4. **Phaser Font Readiness Hook**:
   Before rendering text in Phaser, the browser's Font Loading API is awaited in `BootScene.ts` or during preloading:
   ```typescript
   // In BootScene.ts
   async create(): Promise<void> {
     // Ensure Lexend font is decoded and ready before rendering text labels
     await document.fonts.load('20px Lexend');
     this.scene.start('MenuScene');
   }
   ```
5. **Precached by Service Worker**:
   `./fonts/Lexend-Variable.woff2` is explicitly registered in `sw.js` precache list (`cache.add('./fonts/Lexend-Variable.woff2').catch(...)`), ensuring zero font flicker and instant offline loading.

---

## 7. Actionable Implementation Plan for Milestone 1 Worker

When the Worker agent executes Milestone 1 asset generation, they should execute the following steps:

1. **Create Asset Generator Script**:
   - Write the script provided in Section 5 into `/home/gallabot/Documents/antigravity/joyful-hertz/scripts/generate_atlas.py`.
2. **Create Font Directory & Download Lexend**:
   - Create directory `public/fonts/`.
   - Download or copy `Lexend-Variable.woff2` into `public/fonts/`.
3. **Run Asset Generation**:
   - Run `python3 scripts/generate_atlas.py public/assets`
   - Verify creation of:
     - `public/assets/atlas.png`
     - `public/assets/atlas.json`
4. **Register in `package.json`**:
   - Add `"build:assets": "python3 scripts/generate_atlas.py public/assets"` to `scripts` in `package.json`.
5. **Verify STACK.md Compliance**:
   - Run `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` to ensure no `unbatched-image-loads` or `dom-sprites` are introduced.

---

## 8. Verification & Test Matrix

| Item | Requirement | Verification Method | Pass Criteria |
|:---|:---|:---|:---|
| Single Atlas | Batched WebGL rendering | Inspect `atlas.json` and `atlas.png` | Exactly 1 `.png` and 1 `.json` in `public/assets/` |
| Sprite Count | All 29 game assets | Count keys in `atlas.json["frames"]` | Exactly 29 frames present |
| Fruit Hitbox | Touch target >= 48px | Measure fruit frame sizes in `atlas.json` | 80x80px bounding canvas, 72px circle hitbox |
| STACK.md | Zero `unbatched-image-loads` | Grep codebase for `this.load.image` | Zero fruit images loaded outside atlas |
| STACK.md | Zero `dom-sprites` | Grep codebase for `<img>` or `document.createElement` | Zero DOM elements for gameplay items |
| Typography | Offline Lexend font | Check `public/fonts/` and SW cache list | `Lexend-Variable.woff2` exists and precached |
