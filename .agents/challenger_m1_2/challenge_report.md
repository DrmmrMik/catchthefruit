# Challenge Report: Challenger M1-2 (PWA & Atlas Adversarial Verifier)

## Challenge Summary

- **Target**: Catch the Fruit — Milestone 1 (PWA & Texture Atlas Scaffolding)
- **Role**: Empirical Challenger (Adversarial Critic & Domain Specialist)
- **Overall risk assessment**: LOW
- **Verdict**: **APPROVE**

---

## Challenges & Stress Analyses

### [Low] Challenge 1: Maskable Icon Margin Downsampling Antialiasing

- **Assumption challenged**: That the 192x192 maskable icon has 100% alpha == 255 across all outer margin pixels when generated via downsampling from 1024x1024.
- **Attack scenario**: If downsampling interpolation (e.g. Lanczos) bleeds interior anti-aliased content into the outer 8% safe-zone margin, pixels could drop below the WebAPK transparency threshold (alpha < 10), causing Android / Samsung WebAPK minting to fail and fall back to legacy install ("built for an older version of Android").
- **Empirical test execution**: Inspected every pixel in the outer 8% margin of `public/icons/maskable-192x192.png` (16px depth = 8.33%, 11,264 pixels) and `public/icons/maskable-512x512.png` (41px depth = 8.01%, 77,244 pixels).
- **Observed behavior**:
  - `maskable-512x512.png`: Min alpha in outer margin is **255** across all 77,244 pixels (0 non-255 pixels).
  - `maskable-192x192.png`: Min alpha in outer margin is **252** (98.8% opacity). 97 border pixels have alpha 252-254 due to Lanczos filter kernel reach, but **0** pixels have alpha < 10 (or even < 250).
  - `validate_pwa.py`: Passes with 0 errors and 0 warnings (`transparent = [a for a in ring if a < 10]` is empty).
- **Blast radius**: Negligible. The minimum alpha (252) is far above the rejection threshold (< 10) and visually indistinguishable from 255.
- **Mitigation / Recommendation**: In future icon iterations, if background radial glows are placed closer to the safe zone, apply a post-generation clamp to ensure alpha = 255 on all outer edge pixels.

### [Low] Challenge 2: Texture Atlas Frame Boundary Collisions and Sprite Bleeding

- **Assumption challenged**: That packed sprite rects in `atlas.json` do not overlap or share edge pixels, which would cause graphical artifact bleeding during Phaser sprite batch rendering.
- **Attack scenario**: If bounding boxes overlap or lack gutter margins, sampling adjacent sprite textures in WebGL can cause visual halos or corrupted frames during gameplay.
- **Empirical test execution**: Performed pairwise AABB intersection tests across all 29 frame definitions (406 unique pairs) in `public/assets/atlas.json` against `public/assets/atlas.png`. Checked boundary containment within the 1024x512 texture.
- **Observed behavior**:
  - Boundary containment: 100% of frames lie strictly within `(0, 0, 1024, 512)`.
  - Pairwise overlap: Exactly **0** overlaps detected.
  - Gutter spacing: A minimum gutter of **4px** separates adjacent frames, preventing texture bleed.
  - 12 curriculum fruits present: All 12 specified fruits (`apple`, `orange`, `grape`, `banana`, `watermelon`, `blueberry`, `strawberry`, `lemon`, `kiwi`, `peach`, `plum`, `cherry`) are present at 80x80px dimensions.
  - Hitbox compliance: Every fruit frame is 80x80px, strictly exceeding the required 48px touch target standard (+66.7% clearance).
- **Blast radius**: Zero risk.

### [Low] Challenge 3: Service Worker Precache Invalidation and Offline Resiliency

- **Assumption challenged**: That the service worker `sw.js` does not use brittle `cache.addAll()` and that all precached assets physically exist in the production `dist/` directory.
- **Attack scenario**: If `cache.addAll()` is present, a single 404 response aborts service worker installation, triggering Chrome's "Unsafe app blocked" error. If precache strings point to missing or unbuilt paths, install fails.
- **Empirical test execution**:
  - Analyzed `public/sw.js` and `dist/sw.js` AST and regex for `cache.addAll(`.
  - Extracted all precache URL targets and verified physical existence and non-zero byte size in `dist/`.
- **Observed behavior**:
  - `cache.addAll(`: Not present. `sw.js` uses individual `cache.add(asset).catch(...)` calls wrapped in `Promise.allSettled()`.
  - Precache list: 7 assets (`./index.html`, `./manifest.json`, `./icons/icon-192x192.png`, `./icons/icon-512x512.png`, `./icons/maskable-192x192.png`, `./icons/maskable-512x512.png`, `./screenshots/mobile-1.png`). All 7 physically exist in `dist/` with non-zero size.
  - Offline navigation fallback: Navigation requests fall back to cached `./index.html` on network failure.
  - `validate_pwa.py dist`: Produced `RESULT: PASS - safe to publish.` with 0 errors and 0 warnings.
- **Blast radius**: Zero risk.

---

## Stress Test Results

| Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| `maskable-512x512.png` outer 8% margin pixel alpha | All alpha >= 10, zero transparent px | Min alpha: 255 across 77,244 margin px | **PASS** |
| `maskable-192x192.png` outer 8% margin pixel alpha | All alpha >= 10, zero transparent px | Min alpha: 252, 0 px < 10 across 11,264 margin px | **PASS** |
| Texture atlas dimension bounds (1024x512) | All frames inside (0, 0, 1024, 512) | 29/29 frames inside bounds | **PASS** |
| Texture atlas pairwise bounding box overlap | 0 overlaps across 406 pairs | 0 overlaps, 4px minimum gutter | **PASS** |
| Curriculum fruit inventory (12 fruits) | All 12 fruit keys present | All 12 keys found | **PASS** |
| Fruit touch target dimensions (>= 48px) | w >= 48, h >= 48 | All 12 fruits are 80x80px | **PASS** |
| Service worker `cache.addAll(` prohibition | Zero occurrences | Zero occurrences | **PASS** |
| Service worker precache file existence in `dist/` | 100% of precached files exist | 7/7 files exist and > 0 bytes | **PASS** |
| Manifest icons & screenshot disk existence | All manifest assets exist in `dist/` | 5/5 assets exist and > 0 bytes | **PASS** |
| Publish gate verification (`validate_pwa.py dist`) | 0 errors, 0 warnings | 0 errors, 0 warnings (PASS) | **PASS** |
| Build standards compliance (`bsa verify .`) | VERDICT: PASS | VERDICT: ✓ PASS (0 forbidden patterns) | **PASS** |
| TypeScript typecheck (`npm run typecheck`) | Exit code 0, 0 errors | Exit code 0, 0 errors | **PASS** |
| Vitest automated test suite (`npm test`) | All unit & adversarial tests pass | 4 suites, 23 tests passed (100%) | **PASS** |

---

## Unchallenged Areas

- **Phaser gameplay mechanics & physics delta-time**: Game loop scenes are planned for Milestone 4; current codebase provides validated application bootstrap stub.
- **Curriculum JSON datasets & Zod schemas**: Datasets for phonics, morphology, vocabulary, and math are planned for Milestone 2.
- **IndexedDB persistence engine**: Planned for Milestone 2.
- **Web Audio & Web Speech synthesis**: Planned for Milestone 3.

---

## Final Challenger Verdict

**`APPROVE`** — All Milestone 1 deliverables meet or exceed pedagogical, architectural, and Android 16 PWA publish gate standards.
