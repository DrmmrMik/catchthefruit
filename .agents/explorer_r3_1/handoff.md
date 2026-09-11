# Handoff Report: R3 Engine & Educational Integrity Investigation

## 1. Observation

Direct empirical observations from codebase inspection, tool executions, and static analysis:

### 1.1 Test Suite & Build Verification Baseline
1. **Vitest Test Suite Run**:
   - Command: `npm test` (`vitest run`)
   - Output:
     ```
     Test Files  20 passed (20)
          Tests  499 passed (499)
       Duration  17.36s (transform 37.63s, setup 1.45s, import 79.69s, tests 15.98s, environment 25.14s)
     ```
2. **TypeScript Typecheck**:
   - Command: `npm run typecheck` (`tsc --noEmit`)
   - Output: Exited with code 0 (zero errors).
3. **Build Stack Advisor Verification**:
   - Command: `~/.build-standards/bin/bsa verify .`
   - Output:
     ```
     STACK CHECK — joyful-hertz
     Category: 2D Arcade, Educational & Action Games
     Professional default: phaser, zod, pillow, numpy, pyyaml, free-tex-packer-core
     This build uses: the agreed stack
     Waivers: none
     VERDICT: ✓ PASS — this build used the agreed stack for its category.
     Required packages: 6/6 present
       - phaser: FOUND (via package.json, source import)
       - zod: FOUND (via package.json, source import)
       - pillow: FOUND (via requirements.txt)
       - numpy: FOUND (via requirements.txt, source import)
       - pyyaml: FOUND (via requirements.txt)
       - free-tex-packer-core: FOUND (via package.json)
     Forbidden patterns: 0 hits / 9 checked
     ```
4. **Vite Production Build**:
   - Command: `npm run build` (`tsc --noEmit && vite build`)
   - Output: Built in 1.74s, emitted chunks to `dist/` with 0 errors.

---

### 1.2 Mapping of All 20 Test Files (499 Tests Total)

| # | Test File Path | Focus Domain | Key Test Assertions & Invariants |
|---|---|---|---|
| 1 | `tests/atlas.test.ts` (86 lines) | Texture Atlas Verification | `meta.size.w === 1024`, `meta.size.h >= 512`; >= 29 frames; `princess-idle-1`, `princess-catch`; 12 fruits (`apple`, `orange`, `grape`, `banana`, `watermelon`, `blueberry`, `strawberry`, `lemon`, `kiwi`, `peach`, `plum`, `cherry`) **strictly 80x80px** (`w: 80, h: 80`); `basket` is **128x64px**; `card-panel` is defined; 5 tree stages `tree-stage-1`..`5` are **128x128px**; UI frames `btn-pause`, `btn-sound`, `btn-sound-off`, `btn-replay`, `btn-home`, `star-full`, `star-empty`, `check-mark`, `x-mark`, `sparkle`. |
| 2 | `tests/adversarial.test.ts` (87 lines) | Challenger M1-2 Oracle | Runs `python3 scripts/adversarial_verify.py` expecting `VERDICT: APPROVE`; checks 0 overlaps between any frame pair in `atlas.json`; checks fruit hitboxes >= 48px and w=80, h=80; checks `dist/sw.js` has no `cache.addAll(` and all precached assets exist in `dist/`. |
| 3 | `tests/adversarial_m4.test.ts` (399 lines) | Challenger M4-1 Physics & Hitbox Oracle | Fixed-timestep Arcade Physics (`fixedStep: true`, `fps: 60`, `gravity.y: 0`); delta displacement invariance across 60Hz, 120Hz, 144Hz, 240Hz; fall durations 2800ms down to 1800ms; fruit container hitArea centered `[-w/2, -h/2, w, h]` with `w >= 48`, `h >= 48`; basket clamp `[55, 425]`; touch Y filter `y > 660` (`800 - 140`); executes `.agents/challenger_m4_1/verify_m4.mjs`. |
| 4 | `tests/audio.test.ts` (460 lines) | Web Audio & Speech Unit | AudioContext starts `suspended`, unlocks on first touch; procedural SFX frequencies (`playCatch`: E5 659.25Hz -> A5 880Hz; bonus arpeggio C5, E5, G5, C6; `playMiss`: 260Hz -> 175Hz exponential; `playCombo`: pentatonic scale; `playClick`: 880Hz -> 320Hz); zero node allocation when muted; TTS rate `0.9`, pitch `1.0`; screen reader live region `#sr-announcements`; `normalizePhoneticsForSpeech` converts `/ē/` to `long E`, `re + play → replay` to `R E plus play makes replay`, math equations to `What is X plus Y?`. |
| 5 | `tests/audio_adversarial.test.ts` (615 lines) | Challenger M3-1 Audio Stress | Runs `python3 scripts/adversarial_audio_verify.py` expecting `APPROVE`; AudioContext autoplay rejection handling; 50 rapid calls in 100ms with bounded lifespans; exponential ramps strictly > 0 (never ramp to 0 to avoid `RangeError`); volume clamping in `[0, 1]`; TTS 4000ms safety timeout guard against hanging engines; DOM presence/absence of `#sr-announcements`. |
| 6 | `tests/curriculum.test.ts` (384 lines) | Zod Schemas & Curriculum Unit | `PhonicsTopicSchema`, `MorphologyTopicSchema`, `VocabularyTopicSchema`, `MathTopicSchema`, `MasterCurriculumSchema`; Topic A >= 40 words (has >= 50), 9 vowel teams, 5 r-controlled vowels, explicit `/ē/` vs `/ĕ/` split with `beach` and `bread`, fruitType in `FruitTypeSchema`; Topic B 12 affixes, >= 30 base words, visual segmentation regex `^.+ \+ .+ → .+$`; Topic C >= 40 pairs, balanced synonyms/antonyms; Math within 20; `CurriculumService` question generator. |
| 7 | `tests/curriculum_adversarial.test.ts` (578 lines) | Challenger M2-1 Curriculum Stress | Runs `python3 scripts/adversarial_curriculum_verify.py` expecting `APPROVE`; validates `data/*.json` and `public/data/*.json` byte-identical sync; rejects malformed inputs; verifies distractor uniqueness (never equals target); verifies global ID uniqueness across 200 items and 20 levels; remediation triggers at exactly 3 consecutive mistakes; mastery requires strictly `> 0.85` AND `attempts >= 10`. |
| 8 | `tests/e2e.test.ts` (1365 lines) | Comprehensive Feature & Boundary (F01–F09) | Tier 1 (Features F01–F09) and Tier 2 (Boundaries F01–F09): Scaffolding, PWA manifest, full-bleed icons, texture atlas, curriculum data, storage/mastery, audio synthesis, accessibility/Lexend, Phaser engine, service worker. |
| 9 | `tests/gameplay.test.ts` (425 lines) | Core Arcade Gameplay | Fixed-timestep physics; fall duration scaling 2800ms to 1800ms; fruit container hitArea centered `[-w/2, -h/2, w, h]` with `w >= 48`, `h >= 48`; basket tap-to-move and keyboard delta; visual morphological toast `✨ ${item.visualSegmentation}`; 3 consecutive mistakes triggers +800ms speed dampener up to 8000ms max; mastery requires `> 0.85` AND `>= 10` attempts; touch target buttons >= 48px; `MenuScene` topic memory. |
| 10 | `tests/gameplay_adversarial.test.ts` (609 lines) | Challenger M4-2 Loop & State Machine Oracle | Consecutive mistakes streak (1, 2 = no trigger; 3 = trigger); dampens fall speed duration by +800ms up to 8000ms; cancels `waveSpawnTimer` during remediation; resets streak to 0 on correct catch or card dismissal; mastery gate exact boundaries (85.0% on 10 locked, 85.0001% unlocked; 100% on 9 locked, 100% on 10 unlocked); star precision boundaries (100% -> 3, 90-99.9% -> 2, 85-89.9% -> 1, <85% -> 0); visual morphological segmentation wiring. |
| 11 | `tests/infrastructure.test.ts` (36 lines) | Milestone 1 Infrastructure | Phaser version defined; Zod validates `GameConfigSchema` (480x800, `game-container`); fixedStep: true, fps: 60; portrait FIT scale with CENTER_BOTH. |
| 12 | `tests/marketplace.test.ts` (143 lines) | Decorations & Currency | `DecorationCatalogSchema`; outside (>=6 items) and inside (>=7 items); **all decoration icons and `coin-gold` MUST exist as frames in `atlas.json`**; currency engine (`getCoins`, `addCoins`, `spendCoins`); purchase idempotency; castle decoration slot placement. |
| 13 | `tests/progression.test.ts` (489 lines) | Challenger M2-2 Persistence Oracle | Level unlocking boundaries (85.0% locked, 85.0001% unlocked, 100% on 9 attempts locked, 10+ attempts required); star ratings exact boundaries; consecutive mistakes tracking; monotonic star, score, and level preservation; orchard growth stage capped at 10; schema migration defaults for legacy payloads. |
| 14 | `tests/pwa.test.ts` (113 lines) | PWA Compliance & App Shell | `manifest.json`: WebAPK metadata, standalone display, portrait orientation, theme/background colors, separate `any` and `maskable` icon entries for 192 and 512, all icon/screenshot paths exist, zero experimental desktop keys; `sw.js`: no `cache.addAll(`, precached assets exist in `public/` or root; `index.html`: zero `http://`, viewport-fit=cover, Lexend font bundled in `public/fonts/Lexend-Variable.woff2` (>10KB). |
| 15 | `tests/scenes.test.ts` (93 lines) | Phaser Scenes Architecture | 6 scenes registered: `PreloadScene`, `MenuScene`, `GameScene`, `RoundSummaryScene`, `OrchardScene`, `CastleScene`; Arcade Physics `fixedStep: true`, `fps: 60`; 480x800 portrait FIT scale; instantiation of `CatchTheFruitGame`; parameter initialization. |
| 16 | `tests/storage.test.ts` (226 lines) | Persistence Engine & Storage | Star rating rules; mastery threshold (>85% AND >=10 attempts); initial state (Level 1 unlocked for phonics, morphology, vocabulary, math; Level 2 locked); consecutive mistake tracking and remediation trigger; error stats accumulation; user settings (`sfxVolume: 0.8`, `musicVolume: 0.5`, `ttsEnabled: true`, `highContrast: false`); `UserProgressSchema` validation. |
| 17 | `tests/tier5_scenes_adversarial.test.ts` (1239 lines) | Challenger Tier 5 Scene Subsystems | Rapid pause/unpause toggles (50x) without overlay leaking; fruit falling freezes while paused; tap-to-catch rejected while paused; remediation lockout integrity during pause; multi-tap catch lockouts; basket clamping `[55, 425]`; simultaneous conflicting keypress arbitration; `TeachingCard` 50 concurrent dismiss calls; `CastleScene` room switching (`outside` vs `inside`), background textures `'castle-exterior'` and `'castle-interior'`, boundary slot coordinates, coin economy; `RoundSummaryScene` navigation; comprehensive >= 48px touch targets audit across all UI components. |
| 18 | `tests/tier5_services_adversarial.test.ts` (1419 lines) | Challenger Tier 5 Services & Schemas | Web Audio state transitions (suspended, running, closed, null); rapid concurrent SFX calls; exponential ramp safety; extreme combo counts; volume clamping; muted node suppression; speech cancel/timeout/error resilience; screen reader live region; phonetic normalization; `CurriculumService` boundaries, cyclical question set wrapping, topic prompt branches, Zod schema attack vectors; `StorageService` IndexedDB error injection fallback, schema migrations; `DecorationService` catalog validation. |
| 19 | `tests/ui.test.ts` (651 lines) | UI Components Unit | `TeachingCard`: `shouldTrigger(3) === true`, renders target word/rule, visual segmentation, TTS autoSpeak, resume button dimensions (240x54px, height=54), dismiss resets mistakes; `HUD`: default values, pause/sound buttons (64x64px), prompt/score/combo/stars update, mute toggle, speakPrompt; `OrchardView`: `calculateTreeStage` (0->1, 1-2->2, 3-4->3, 5-6->4, 7+->5), `getTreeFrame` (`tree-stage-1`..`5`), 5 level cards, topic switching, storage refresh; `LevelIntroModal`: title/prompt/sample words, start button dimensions (240x56px), dismiss idempotency. |
| 20 | `tests/ui_adversarial.test.ts` (759 lines) | Challenger M3-2 UI & Remediation Oracle | Runs `python3 scripts/adversarial_ui_verify.py` expecting `APPROVE`; touch targets audit: `TeachingCard` resume (240x54px), listen (150x48px), `HUD` buttons (64x64px), `OrchardView` cards (430x72px); WCAG AAA contrast ratio calculations (body text >= 7:1, large text >= 4.5:1); 25 concurrent dismiss invocations; `OrchardView` stage clamping with 100,000 float fuzz points; renders with 0 levels and all 20 levels unlocked. |

---

### 1.3 Exact Frame Inventory in `atlas.json` (52 Frames Total)

From querying `public/assets/atlas.json`:
1. **Characters (4 frames)**: `princess-idle-1`, `princess-idle-2`, `princess-catch`, `princess-think`
2. **12 Curriculum Fruits (12 frames)**: `apple`, `orange`, `grape`, `banana`, `watermelon`, `blueberry`, `strawberry`, `lemon`, `kiwi`, `peach`, `plum`, `cherry`
   - *CRITICAL ASSERTION in `tests/atlas.test.ts:41-42` and `tests/adversarial.test.ts:67-68`*: Every fruit frame MUST have dimensions `w === 80` and `h === 80`!
3. **Catcher Baskets & Panels (3 frames)**:
   - `basket`: *CRITICAL ASSERTION in `tests/atlas.test.ts:49`*: frame must have `w === 128` and `h === 64`!
   - `basket-royal`: `128x64`
   - `card-panel`: *CRITICAL ASSERTION in `tests/atlas.test.ts:50`*: frame `'card-panel'` MUST exist in atlas!
4. **Orchard Tree Stages (5 frames)**:
   - `tree-stage-1` through `tree-stage-5`: *CRITICAL ASSERTION in `tests/atlas.test.ts:58-59`*: all MUST have `w === 128` and `h === 128`!
5. **UI Control Buttons (5 frames)**: `btn-pause`, `btn-sound`, `btn-sound-off`, `btn-replay`, `btn-home`
6. **Stars, Badges & Markers (6 frames)**: `star-full`, `star-empty`, `crown-star-full`, `crown-star-empty`, `check-mark`, `x-mark`
7. **Atmospheric FX (3 frames)**: `sparkle`, `petal`, `firefly`
8. **Currency & Castle Decorations (14 frames)**:
   - `coin-gold`: *CRITICAL ASSERTION in `tests/marketplace.test.ts:34`*
   - 13 catalog decoration icons: `decor-fountain`, `decor-topiary`, `decor-banners`, `decor-lantern`, `decor-peacock`, `decor-swing`, `decor-throne`, `decor-couch`, `decor-chaise`, `decor-mirror`, `decor-teatable`, `decor-bookshelf`, `decor-chandelier` (*CRITICAL ASSERTION in `tests/marketplace.test.ts:37`*: every item in `data/decorations.json` has `item.icon` asserted to exist in `atlas.json`!).

---

### 1.4 Python Verification Oracles & AST Invariant Checks

Several test suites execute Python oracles directly via child process (`execSync`):
1. **`scripts/adversarial_verify.py`** (called by `tests/adversarial.test.ts`):
   - Inspects `public/icons/maskable-192x192.png`, `public/icons/maskable-512x512.png`, `dist/icons/maskable-192x192.png`, `dist/icons/maskable-512x512.png`.
   - Asserts: 100% full-bleed opacity in the outer 8% margin (zero pixels with alpha < 10).
   - Asserts: 0 bounding box overlaps among all frames in `atlas.json`.
   - Asserts: Service worker precache in `dist/sw.js` contains no `cache.addAll(` and all precached asset paths physically exist on disk in `dist/`.
2. **`scripts/adversarial_curriculum_verify.py`** (called by `tests/curriculum_adversarial.test.ts`):
   - Asserts: **`data/<topic>.json` and `public/data/<topic>.json` are 100% byte-identical** across all 4 topics (`phonics`, `morphology`, `vocabulary`, `math`).
   - Asserts: Global item ID uniqueness (200 items across 4 topics).
   - Asserts: Global level ID uniqueness (20 levels across 4 topics).
   - Asserts: Distractor uniqueness and zero target collisions.
3. **`scripts/adversarial_ui_verify.py`** (called by `tests/ui_adversarial.test.ts`):
   - Inspects `src/ui/TeachingCard.ts` for exact strings: `"setSize(240, 54)"`, `"width: 240, height: 54"`, `"fillRoundedRect(-120, -27, 240, 54, 16)"`, `"setSize(150, 48)"`, `"if (this.isDismissed) return;"`, `"this.isDismissed = true;"`, `"resetConsecutiveMistakes()"`, `"Lexend"`.
   - Inspects `src/ui/HUD.ts` for exact strings: `"setDisplaySize(64, 64)"`, `"btn-pause"`, `"btn-sound"`, `"Lexend"`.
   - Inspects `src/ui/OrchardView.ts` for exact strings: `"cardWidth = 430"`, `"cardHeight = 72"`, `"Lexend"`.
   - Empirically calculates WCAG AAA contrast ratios using relative luminance equations: normal text >= 7.0:1, large text >= 4.5:1.
4. **`scripts/adversarial_audio_verify.py`** (called by `tests/audio_adversarial.test.ts`):
   - Inspects `src/services/audio.service.ts` for exact strings: `"utterance.rate = 0.9"`, `"utterance.pitch = 1.0"` (or `1`), `"document.getElementById('sr-announcements')"`, `"4000"`, `"setTimeout"`, `"pointerdown"`, `"touchstart"`, `"keydown"`, `"Math.max(0, Math.min(1, volume))"`.
   - Fuzzes volume clamping with 10,000 random inputs.
5. **`scripts/adversarial_storage_verify.py`**:
   - Inspects `src/services/storage.service.ts` for exact strings: `"norm > 0.85"`, `"attemptsCount >= 10"`, `"norm >= 1.0"`, `"norm >= 0.90"` (or `0.9`), `"norm >= 0.85"`, `"consecutiveMistakes >= 3"`, `"stats.consecutiveMistakes = 0"`, `"if (stars > currentStars)"`.

---

### 1.5 Build Standards & STACK.md Rules

From `~/.build-standards/archetypes/2d-game-arcade.md` and `~/.build-standards/modifiers/pixel-art-character-pipeline.md`:
1. **Required Packages**:
   - `phaser`: in `package.json` and source import
   - `zod`: in `package.json` and source import
   - `pillow`: in `requirements.txt`
   - `numpy`: in `requirements.txt` and source import (`pack_ai_atlas.py`)
   - `pyyaml`: in `requirements.txt`
   - `free-tex-packer-core`: in `package.json`
2. **Forbidden Patterns & Specific Regex Signatures**:
   - `raw-raf-loop`: regex `requestAnimationFrame` without `(deltaTime|dt|accumulator|fixedStep|Phaser)`
   - `dom-sprites`: regex `document\.createElement\(['\"](img|div)['\"]\)[\s\S]*?position\s*=\s*['\"]absolute['\"]`
   - `unbatched-image-loads`: regex `new\s+Image\(\)[\s\S]*?src\s*=\s*['\"][^'\"]*\.(png|jpg)`
   - `hardcoded-curriculum-logic`: regex `switch\s*\(level\)\s*\{\s*case\s+1:`
   - `naive-frame-interpolation`: regex `(Image\.BICUBIC|Image\.BILINEAR|cv2\.INTER_LINEAR|cv2\.INTER_CUBIC|imageSmoothingEnabled\s*=\s*true)` (⚠️ **CRITICAL**: Do NOT use `Image.BICUBIC` or `Image.BILINEAR` in any Python asset script!).
   - `unconstrained-per-frame-generation`: regex `generate_frame_unconstrained`
   - `autocenter-on-animation-sequence`: regex `downsample\.py.*--auto-center.*(hop|idle|run|walk|jump|anim)`
   - `upscale-ai-raster`: regex `upscale.*pixel.*bicubic`
   - `unpalette-color-drift`: regex `save_frame_without_palette`

---

## 2. Logic Chain

### 2.1 Preserving Test Suite Green Gate During Asset Refactoring (R1)
1. **Fact**: `tests/atlas.test.ts`, `tests/adversarial.test.ts`, and `tests/marketplace.test.ts` assert the exact presence and dimensions of frames in `public/assets/atlas.json`.
2. **Inference**: When R1 rebuilds `atlas.png` and `atlas.json` through the pixel art pipeline, the generated atlas MUST:
   - Include ALL 52 existing frames (or superset). Omitting any frame (e.g. `coin-gold`, any of the 13 `decor-*` items, `card-panel`, or `tree-stage-1..5`) will instantly fail tests.
   - Maintain the EXACT expected dimensions:
     - 12 fruit frames: strictly `w: 80, h: 80` (tested in `atlas.test.ts:41-42` and `adversarial.test.ts:67-68`).
     - `basket`: strictly `w: 128, h: 64` (tested in `atlas.test.ts:49`).
     - 5 tree stages: strictly `w: 128, h: 128` (tested in `atlas.test.ts:58-59`).
     - Overall atlas: `meta.size.w === 1024`, `meta.size.h >= 512` (tested in `atlas.test.ts:17-18`).
   - Maintain 0 bounding box overlaps between frames (tested by `adversarial_verify.py`).
3. **Inference on Background Assets**:
   - `PreloadScene.ts` loads: `'background'` (`assets/background.jpg`), `'castle-exterior'` (`assets/castle_exterior.jpg`), and `'castle-interior'` (`assets/castle_interior.jpg`).
   - `CastleScene.ts` references textures `'castle-exterior'` and `'castle-interior'` directly.
   - `tests/tier5_scenes_adversarial.test.ts:899,905` asserts:
     `expect((castle as any).background.texture).toBe('castle-exterior');` and `toBe('castle-interior');`.
   - Therefore, retro pixel art backgrounds replacing the CGI storybook backdrops must preserve these exact file paths or texture keys, or update `PreloadScene` and `CastleScene` while preserving the texture key strings.

### 2.2 Preserving Test Suite Green Gate During UI Refactoring (R2)
1. **Fact**: In `MenuScene.ts`, line 203 uses `'card-panel'` as the locked level card placeholder icon:
   `const icon = this.add.image(-155, 0, 'atlas', isUnlocked ? ... : 'card-panel');`
2. **Inference**: When replacing this broken rectangular placeholder with a lock icon or shaded silhouette as requested in R2:
   - The developer CAN change the texture/frame used in `MenuScene.ts` (e.g. to a dedicated `icon-lock` frame or shaded silhouette).
   - BUT the developer MUST NOT delete `'card-panel'` from `atlas.json` because `tests/atlas.test.ts:50` explicitly asserts `expect(content.frames['card-panel']).toBeDefined();`.
3. **Fact**: `scripts/adversarial_ui_verify.py` verifies exact source code AST strings in `src/ui/TeachingCard.ts`, `src/ui/HUD.ts`, and `src/ui/OrchardView.ts`.
4. **Inference**: When adjusting UI layouts:
   - Do NOT alter the dimensions or variable names checked by `adversarial_ui_verify.py`:
     - `TeachingCard.ts`: `setSize(240, 54)`, `fillRoundedRect(-120, -27, 240, 54, 16)`, `setSize(150, 48)`, `if (this.isDismissed) return;`, `this.isDismissed = true;`, `resetConsecutiveMistakes()`.
     - `HUD.ts`: `setDisplaySize(64, 64)` for `btn-pause` and `btn-sound`.
     - `OrchardView.ts`: `cardWidth = 430`, `cardHeight = 72`.
   - MenuScene header collision fix:
     - The header collision in `MenuScene.ts` is caused by placing the title at `x = width / 2` (240) with `fontSize: '24px'`, which overlaps with the Castle Shop button at `x = 96` (width 68) and the Coin badge at `x = width - 110` (370).
     - Fixing this header layout in `MenuScene.ts` (e.g. adjusting Y offsets, stacking, or rearranging badges) is safe because `tests/` does not test the exact X/Y coordinates of the MenuScene title or coin counter; tests only check:
       - `MenuScene` registers in `gameConfig` (`tests/scenes.test.ts`)
       - `MenuScene.init({ topic })` preserves topic (`tests/gameplay.test.ts:409`)
       - MenuScene level cards, tabs, and buttons satisfy >= 48px touch dimensions (`tests/tier5_scenes_adversarial.test.ts:1218`).

### 2.3 Educational Integrity Invariants
1. **Fact**: `scripts/adversarial_curriculum_verify.py` tests that `data/<topic>.json` and `public/data/<topic>.json` are byte-identical.
2. **Inference**: If any curriculum JSON is modified, both copies MUST be updated in lockstep.
3. **Fact**: `tests/curriculum.test.ts`, `tests/curriculum_adversarial.test.ts`, and `tests/gameplay.test.ts` enforce pedagogical rules:
   - Phonics: 9 vowel teams + 5 r-controlled vowels; explicit `/ē/` vs `/ĕ/` split; words `beach` and `bread` must be present.
   - Morphology: >= 30 base words; 12 affixes; `visualSegmentation` must match `^.+ \+ .+ → .+$`.
   - Vocabulary: >= 40 pairs, balanced synonyms/antonyms.
   - Mastery threshold: strictly `> 0.85` accuracy AND `>= 10` attempts (`attemptsCount >= 10 && norm > 0.85`).
   - Remediation: triggers at exactly 3 consecutive mistakes; speed dampener +800ms up to 8000ms max; resets to 0 on correct catch or dismissal.
4. **Inference**: Game loop or scoring changes must not alter these thresholds or operators.

### 2.4 Offline PWA & Build Standards Invariants
1. **Fact**: `public/manifest.json` and `public/sw.js` are checked by `tests/pwa.test.ts`, `tests/adversarial.test.ts`, and `validate_pwa.py`.
2. **Inference**:
   - `sw.js` must NEVER use `cache.addAll(`.
   - Any asset listed in `PRECACHE_ASSETS` in `sw.js` must exist on disk in `dist/` after `npm run build`.
   - `manifest.json` must retain separate `any` and `maskable` icon entries for 192 and 512, and maskable icons must maintain 100% full-bleed opacity in their outer 8% margin.
3. **Fact**: `bsa verify .` requires 6 packages and checks 9 forbidden patterns.
4. **Inference**:
   - `package.json` must retain `phaser`, `zod`, `free-tex-packer-core`.
   - `requirements.txt` must retain `pillow>=10.0.0`, `numpy>=1.24.0`, `pyyaml>=6.0`.
   - Python asset scripts must NOT import or call `Image.BICUBIC` or `Image.BILINEAR` (use `Image.Resampling.NEAREST`).

---

## 3. Caveats

1. **Standalone Script Permission**: Direct CLI execution of `python3 scripts/adversarial_verify.py` in an unsandboxed shell without prior approval prompt timed out. However, `npm test` runs all adversarial oracles cleanly inside the Vitest runner (all 20 files and 499 tests pass).
2. **Font Resolution Warning**: During `npm run build`, Vite prints a benign warning: `./fonts/Lexend-Variable.woff2 referenced in ./fonts/Lexend-Variable.woff2 didn't resolve at build time, it will remain unchanged to be resolved at runtime`. This does not fail the build and matches the existing production setup.
3. **Background Texture Formats**: If R1 converts background imagery from `.jpg` to `.png`, `PreloadScene.ts` must update `this.load.image('background', 'assets/background.png')` etc. while ensuring the texture key names (`background`, `castle-exterior`, `castle-interior`) remain unchanged.

---

## 4. Conclusion

The Catch the Fruit codebase is currently in an impeccably verified state with **20 test files, 499 tests passing (100%)**, **clean TypeScript typecheck**, and **100% BSA compliance** (`bsa verify .` PASS).

To execute the user's R1 (Pixel Art Pipeline & Atlas Packing) and R2 (UI Layout Defect Remediation) missions without regressing R3 (Engine & Educational Integrity), the implementing agents must adhere to the following **Hard Regression Constraints**:

### Checklist for Implementing Agents:

1. **Atlas Packing (R1)**:
   - [ ] Must pack ALL 52 current frames:
     - 4 character frames (`princess-idle-1`, `princess-idle-2`, `princess-catch`, `princess-think`)
     - 12 fruits: `apple`, `orange`, `grape`, `banana`, `watermelon`, `blueberry`, `strawberry`, `lemon`, `kiwi`, `peach`, `plum`, `cherry` — **must be EXACTLY 80x80px**.
     - `basket`: **must be EXACTLY 128x64px**.
     - `basket-royal`: 128x64px.
     - `card-panel`: **must remain in atlas.json** even if MenuScene stops using it.
     - 5 tree stages: `tree-stage-1`..`5` — **must be EXACTLY 128x128px**.
     - 5 UI buttons: `btn-pause`, `btn-sound`, `btn-sound-off`, `btn-replay`, `btn-home`.
     - 6 stars/markers: `star-full`, `star-empty`, `crown-star-full`, `crown-star-empty`, `check-mark`, `x-mark`.
     - 3 particles: `sparkle`, `petal`, `firefly`.
     - 14 economy/decor items: `coin-gold` and all 13 `decor-*` items.
   - [ ] Zero overlapping bounding boxes in `atlas.json`.
   - [ ] Overall atlas dimensions: `meta.size.w === 1024`, `meta.size.h >= 512`.
   - [ ] Asset toolchain scripts must use `Image.Resampling.NEAREST` and avoid `Image.BICUBIC` or `Image.BILINEAR`.

2. **UI & Layout Remediation (R2)**:
   - [ ] Fix `MenuScene` header collision by adjusting title/badge positions on 480px width, while preserving `MenuScene.init({ topic })`.
   - [ ] Replace `card-panel` in locked level cards with a lock icon, without deleting `card-panel` from the atlas.
   - [ ] Preserve exact AST strings in `TeachingCard.ts` (`setSize(240, 54)`, `fillRoundedRect(-120, -27, 240, 54, 16)`, `setSize(150, 48)`, `if (this.isDismissed) return;`, `resetConsecutiveMistakes()`).
   - [ ] Preserve exact AST strings in `HUD.ts` (`setDisplaySize(64, 64)` on pause/sound buttons).
   - [ ] Preserve exact AST strings in `OrchardView.ts` (`cardWidth = 430`, `cardHeight = 72`).
   - [ ] Maintain WCAG AAA contrast ratios: body text >= 7.0:1 (e.g. `#0f172a` on `#ffffff`), large text >= 4.5:1.

3. **Curriculum, Audio & Physics (R3)**:
   - [ ] Keep `data/<topic>.json` and `public/data/<topic>.json` 100% byte-identical.
   - [ ] Preserve mastery gate (`attemptsCount >= 10 && norm > 0.85`).
   - [ ] Preserve 3-mistake consecutive streak and +800ms speed dampener.
   - [ ] Preserve procedural Web Audio API synthesis without external audio files.
   - [ ] Preserve TTS speech rate `0.9` and pitch `1.0`.
   - [ ] Preserve fixed-step physics (`fixedStep: true`, `fps: 60`).
   - [ ] Avoid bare `cache.addAll` in `sw.js`.

---

## 5. Verification Method

To independently verify all engine, educational integrity, regression, and build standards:

1. **Run Full Test Suite**:
   ```bash
   npm test
   ```
   *Pass Condition*: 20 test files passed, 499 tests passed (0 failures).
2. **Run TypeScript Compilation**:
   ```bash
   npm run typecheck
   ```
   *Pass Condition*: Exits with code 0 (zero type errors).
3. **Run Build Stack Advisor Audit**:
   ```bash
   ~/.build-standards/bin/bsa verify .
   ```
   *Pass Condition*: `VERDICT: ✓ PASS — this build used the agreed stack for its category.` (6/6 required packages, 0/9 forbidden patterns).
4. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Pass Condition*: Exits with code 0, emits client bundles to `dist/`.
5. **Inspect Atlas Frames & Invariants**:
   ```bash
   node -e "const a = JSON.parse(require('fs').readFileSync('public/assets/atlas.json')); console.log('Frames:', Object.keys(a.frames).length); assert(a.frames['apple'].frame.w === 80); assert(a.frames['basket'].frame.w === 128); assert(a.frames['card-panel']); assert(a.frames['coin-gold']);"
   ```
   *Pass Condition*: Exits cleanly without assertion error.
