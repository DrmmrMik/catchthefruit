# Original User Request

## Initial Request — 2026-09-03T01:15:30Z

Build "Catch the Fruit", an educational 2D arcade Progressive Web App for a 2nd grade student in Pittsburgh Public Schools that teaches phonics (vowel teams and r-controlled vowels), morphology (prefixes and suffixes), and vocabulary (synonyms and antonyms) with scaffolded difficulty and offline capability.

Working directory: /home/gallabot/Documents/antigravity/joyful-hertz
Integrity mode: demo

Reference: SPEC.md and STACK.md in working directory.

## Requirements

### R1. Curriculum and Pedagogical Engine
- Support three Grade 2 ELA topic domains from the PA Core Standards:
  1. Topic A (Phonics): Vowel teams (ai, ay, ea [explicit split between /ē/ and /ĕ/], ee, ie, oa, oe, ui, ue) and r-controlled vowels (ar, er, ir, or, ur), minimum 40 curriculum words.
  2. Topic B (Morphology): Common prefixes (re-, un-, dis-, pre-) and suffixes (-s/-es, -ed, -ing, -er, -est, -ful, -less, -ly) across 30+ base words, featuring visual morphological segmentation on correct catch (e.g. `re + play → replay`).
  3. Topic C (Vocabulary): 40+ synonym and antonym word pairs contextualized in grade-level sentences.
- Store all curriculum data, word lists, and level parameters in external JSON files validated with runtime Zod schemas.
- Implement scaffolded progression (single rule no distractors → discrimination → mixed patterns → boss level) with mastery advancement requiring >85% accuracy over 10+ attempts.
- Include spaced repetition and mistake remediation: after 3 consecutive wrong catches, temporarily reduce fall speed and display a targeted teaching card before resuming.

### R2. 2D Arcade Mechanics and Visual UX
- Mobile-first, single-thumb portrait orientation arcade gameplay powered by Phaser 4 fixed-timestep physics, ensuring identical fall speeds across 60Hz and 120Hz mobile digitizers.
- All interactive falling fruits feature touch target hitboxes of at least 48px diameter with no swipe or drag requirements.
- Large, high-contrast, dyslexia-friendly typography (Lexend) with color-coded phonics/affix patterns.
- High-performance batched rendering using a single packed texture atlas (`.png` + `.json`) for all fruit sprites, UI elements, and particle effects.
- Dynamic reward feedback: particle sparkle chimes on correct catch, gentle explanatory correction on incorrect catch, and an orchard growth tree progress visualization.

### R3. Audio Pipeline
- Immediate tactile sound effects using Web Audio API synthesis (ascending correct chimes, gentle descending miss tones, celebratory round jingles).
- Spoken voice instructions and phoneme pronunciations using the Web Speech API (TTS) so no reading is required for children to understand the round's target objective.
- Responsive mobile audio unlocking triggered on first user touch gesture.

### R4. PWA Installation, Local Storage and Android Compliance
- Offline-first PWA built with Vite and Workbox (`vite-plugin-pwa`) featuring individual asset precaching (strictly prohibiting bare `cache.addAll`).
- Web App Manifest compliant with modern Android / Samsung Galaxy S24 Ultra standards: 192px and 512px full-bleed maskable PNG icons, standalone display mode, and an in-app installation prompt.
- Purely local persistence using IndexedDB (Dexie / idb-keyval) storing completed levels, stars, error tracking, and preferences without logins or external network tracking.

### R5. Deployment and Verification Gate
- Automated build and publication integration targeting GitHub Pages under `DrmmrMik/catch-the-fruit` and synchronized with the central `pwas` portal.
- All code and manifests must strictly pass `validate_pwa.py` with 0 errors and 0 warnings, and pass `bsa verify` against `STACK.md`.

## Acceptance Criteria

### Curriculum & Validation
- [ ] Topic A word list includes all specified vowel teams and r-controlled vowels (>=40 words) with dedicated instruction for the dual sounds of "ea".
- [ ] Topic B word list includes >=30 base words across the required prefixes and suffixes, displaying base + affix segmentation upon successful catch.
- [ ] Topic C word list includes >=40 synonym/antonym pairs with contextual sentence prompts.
- [ ] External curriculum JSON loads through strict Zod schemas with zero validation exceptions.
- [ ] Progression logic locks subsequent levels until mastery threshold (>=85% on 10+ items) is reached.

### Arcade Gameplay & Accessibility
- [ ] Game runs on Phaser 4 with fixed delta-time physics avoiding double-speed on 120Hz displays.
- [ ] All interactive fruit sprites have touch areas >= 48px.
- [ ] All sprite assets render via a single packed texture atlas.
- [ ] 3 consecutive mistakes trigger a speed dampener and remedial rule review card.

### PWA Standards & Android Compliance
- [ ] `python3 validate_pwa.py` passes with 0 errors and 0 warnings.
- [ ] `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes.
- [ ] App is fully functional offline with service worker caching all assets.
- [ ] Web App Manifest has full-bleed 192px and 512px maskable PNG icons with no experimental/desktop-only keys.
- [ ] User progress (stars, level unlocks, per-pattern error counts) persists reliably across browser refreshes and restarts.

### Deployment & Live Access
- [ ] Built assets successfully deployed and live base URL returns HTTP 200 upon live probe.

## 2026-09-05T15:36:22Z

Rebuild "Catch the Fruit" from scratch as an educational 2D arcade Progressive Web App using the latest build standards (2d-game-arcade with pixel-art-character-pipeline), running all visual assets through the 16-bit retro pixel art pipeline and packing them into a unified texture atlas.

Working directory: /home/gallabot/Documents/antigravity/joyful-hertz
Integrity mode: development

## Requirements

### R1. 16-Bit Pixel Art Asset Toolchain & Atlas Packing
- Author or reprocess all visual assets (player character animations, falling fruits, catcher basket, orchard growth stages, and UI icons) using the existing toolchain in `~/Documents/pixel-art-pipeline/`.
- Execute the full pipeline stages: background removal (`remove-background.py`), 16-color locked palette quantization (`quantize.py` with `palette.json`), and nearest-neighbor downsampling (`downsample.py`).
- Strictly apply `--anim-lock` for all multi-frame animation cycles (anticipation, action, follow-through, recovery, hold) to preserve bounding box and ground planes without jitter, and reserve `--auto-center` exclusively for single static items.
- Pack all processed frames into a single power-of-two texture atlas (`atlas.png` + `atlas.json`) with extrusion padding.

### R2. Phaser 2D Arcade Engine & Mechanics
- Build the core game loop in Phaser with fixed-timestep physics ensuring identical fall mechanics across 60Hz and 120Hz displays.
- All interactive falling fruits must provide touch target hitboxes of at least 48px diameter with no swipe requirements.
- Strictly adhere to STACK rules: forbidden raw RAF loops, forbidden DOM sprites, and forbidden unbatched image loads (everything renders through the packed atlas).
- Provide dynamic visual feedback: particle chimes on correct catch, gentle remedial pause on mistake, and an orchard growth visualization.

### R3. ELA Curriculum & Pedagogical Engine
- Support Grade 2 PA Core Standards across three domains:
  1. Topic A (Phonics): Vowel teams (ai, ay, ea split /ē/ vs /ĕ/, ee, ie, oa, oe, ui, ue) and r-controlled vowels (ar, er, ir, or, ur), minimum 40 words.
  2. Topic B (Morphology): Common prefixes (re-, un-, dis-, pre-) and suffixes (-s/-es, -ed, -ing, -er, -est, -ful, -less, -ly) across 30+ base words with visual base + affix segmentation on correct catch.
  3. Topic C (Vocabulary): 40+ synonym/antonym pairs in contextual sentences.
- Store all curriculum data in external JSON files validated with runtime Zod schemas.
- Implement scaffolded progression with mastery gates (>=85% over 10+ attempts) and remediation (3 consecutive mistakes triggers reduced speed and rule review card).

### R4. Audio Synthesis & Offline PWA Standards
- Implement synthesized audio via Web Audio API (ascending catch chimes, gentle miss tones) with mobile touch gesture audio unlocking.
- Spoken voice prompts using Web Speech API TTS for auditory instructions.
- Offline-first PWA built with Vite and Workbox with individual asset precaching (no bare `cache.addAll`).
- Web App Manifest compliant with modern mobile standards (192px and 512px maskable icons, standalone display mode).
- Purely local persistence using IndexedDB storing stars, level unlocks, and error tracking without external accounts.

## Acceptance Criteria

### Stack & Asset Pipeline
- [ ] `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes with `2d-game-arcade` and `pixel-art-character-pipeline`.
- [ ] All sprite frames strictly map to the locked 16-color palette with zero color bleeding.
- [ ] Multi-frame animation sequences use `--anim-lock` downsampling with zero per-frame bounding jitter.
- [ ] All game visuals load via a single packed texture atlas with 0 unbatched individual sprite requests.

### Gameplay & Curriculum
- [ ] Phaser game loop maintains fixed delta-time physics at 60Hz and 120Hz.
- [ ] All falling fruit hitboxes are >= 48px diameter.
- [ ] All external curriculum JSON passes strict runtime Zod validation with 0 errors.
- [ ] Level progression correctly enforces the >=85% mastery requirement.
- [ ] 3 consecutive incorrect catches trigger the speed dampener and remediation card.

### PWA & Offline Verification
- [ ] App functions fully offline with all assets and curriculum data precached.
- [ ] Local persistence persists player progress and stars across page reloads.
- [ ] Automated test suite (`npm test`) and adversarial verification scripts pass with 0 failures.

## 2026-09-06T01:46:48Z

Rebuild and standardize all visual assets in "Catch the Fruit" into authentic 16-bit retro pixel art using the established pixel art pipeline (`~/Documents/pixel-art-pipeline/`), resolve UI layout defects (header overlap, placeholder icons), and ensure complete visual harmony with the project's design system and stack specifications.

Working directory: /home/gallabot/Documents/antigravity/joyful-hertz
Integrity mode: development

Reference: `STACK.md`, `DESIGN.md`, and `PRODUCT.md` in working directory. Toolchain at `~/Documents/pixel-art-pipeline/`.

## Requirements

### R1. 16-Bit Retro Pixel Art Pipeline & Atlas Packing
- Author and reprocess all in-game visual assets (falling fruits, catcher basket, orchard growth stages, player character keyframes, and UI icons) through `~/Documents/pixel-art-pipeline/` using 16-color locked palette quantization (`palette.json`), nearest-neighbor downsampling (`downsample.py`), and `--anim-lock` for multi-frame animation sequences to eliminate jitter.
- Replace high-res CGI/storybook backgrounds with authentic 16-bit retro arcade orchard backdrops complying with the locked palette and no-flicker rules.
- Pack all processed frames into a unified power-of-two texture atlas (`atlas.png` + `atlas.json`) using extrusion padding with zero unbatched image requests.

### R2. UI Layout & Visual Defect Remediation
- Fix the header collision in the main menu so the title text, coin counter, and buttons have clean separation without overlap on standard portrait mobile viewports (480px width).
- Replace the broken `card-panel` rectangular placeholder on locked level selector cards with a proper lock icon or shaded silhouette.
- Eliminate character foot matte/cutout residue and ensure clean 1-bit alpha borders across all sprites.
- Ensure all interactive hitboxes remain >= 48px and typography adheres to Lexend with WCAG AAA contrast ratios (>= 7:1).

### R3. Engine & Educational Integrity
- Preserve all existing Grade 2 ELA curriculum levels, audio synthesis, offline PWA capabilities, and fixed-timestep physics.
- Maintain full test coverage across all existing Vitest suites and ensure `bsa verify` passes cleanly against `STACK.md`.

## Acceptance Criteria

### Visual & Asset Standards
- [ ] Every sprite in `atlas.png` strictly adheres to 16-color locked palette quantization with 1-bit alpha borders, nearest-neighbor clarity, and zero antialiased gradients.
- [ ] Multi-frame character and tree animations maintain ground-plane locking without position jitter across frames.
- [ ] High-resolution CGI painterly backgrounds are replaced with retro pixel art backgrounds matching the 16-color palette.
- [ ] `atlas.png` and `atlas.json` pack all game elements with zero unbatched individual image requests.

### UI & Layout Compliance
- [ ] Main menu top header displays cleanly with zero text or badge overlap across 480px portrait mobile viewports.
- [ ] Locked level selector cards show clean lock badges or shaded silhouettes rather than distorted outline boxes.
- [ ] All interactive buttons and falling fruits maintain hitboxes >= 48px.

### Test & Regression Integrity
- [ ] `npm run test` passes with 100% test pass rate across all test files.
- [ ] `npm run build` succeeds cleanly with zero TypeScript errors.
- [ ] `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes with 0 errors.
