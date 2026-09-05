# Test Infrastructure Specification: Catch the Fruit E2E Suite

## 1. Test Philosophy & Principles

The Catch the Fruit end-to-end (E2E) testing framework provides an authentic, rigorous, and automated verification track for the entire educational arcade Progressive Web App.

### 1.1 Opaque-Box & Requirement-Driven Testing
- **Opaque-Box Principle**: Tests evaluate the application purely via its observable public interfaces, DOM outputs, canvas rendering parameters, storage states, network service worker policies, and event contracts. No test inspects private closure variables or bypasses runtime logic.
- **Authoritative Requirement Derivation**: Every test case traces directly to an explicit requirement in `ORIGINAL_REQUEST.md`, `SPEC.md`, or `STACK.md`. Expected values are derived from Pennsylvania Core Standards (CC.1.1.2.D, CC.1.2.2.F), Pittsburgh Public Schools Grade 2 benchmarks, S24 Ultra Android PWA guidelines, WCAG AAA accessibility rules, and Phaser 4 fixed-timestep physics.
- **Zero Mock Logic Evasion**: Tests do not install dummy mocks that return hardcoded passing values. The real Zod validation schemas, real JSON curriculum datasets, real storage calculation mathematics, real speech normalization regular expressions, and real physics formulas are exercised.

### 1.2 Progressive Testability & Isolation
- **Self-Contained State**: Each test establishes its own clean baseline (e.g. freshly initialized in-memory storage, isolated mock AudioContext, new scene instances) and performs full resource disposal upon completion.
- **Order Independence**: Tests can be executed individually or in any sequence without test state pollution.
- **Progressive Milestone Coverage**: The suite validates foundational scaffolding (M1), data & persistence (M2), audio & remediation (M3), arcade gameplay (M4), and service worker publish gates (M5) seamlessly.

---

## 2. Feature Inventory (F01 – F09)

| Feature ID | Feature Name | Description | Authoritative Source | Verification Vectors |
|------------|--------------|-------------|----------------------|----------------------|
| **F01** | Project Scaffolding & Build System | Vite 8 + TypeScript 5.8+ + Vitest 4+ + Phaser 4.2+ + Zod 3.24+ setup satisfying STACK archetype `2d-game-arcade` with zero forbidden patterns. | `STACK.md`, `PROJECT.md` M1 | Package versions, build scripts, no raw RAF loops, no unbatched image loaders, valid tsconfig. |
| **F02** | PWA Web App Manifest | Android 16 / Samsung Galaxy S24 Ultra compliant Web App Manifest with `standalone`, valid start URL, portrait orientation, full icons array, narrow screenshot, and zero experimental keys. | `SPEC.md` §R4, `PROJECT.md` F02 | Manifest JSON fields, display_override standalone, no protocol_handlers or window controls overlay. |
| **F03** | Full-Bleed Icons & Packed Texture Atlas | 192px and 512px any & maskable PNG icons with 8% opaque safe zone; unified power-of-two texture atlas (`atlas.png` + `atlas.json`) with all 12 fruits, UI, and character frames. | `STACK.md`, `SPEC.md` §R1, `PROJECT.md` F03 | Icon dimensions, maskable purpose, atlas frame count (>=29 frames), 12 distinct fruit frames, no missing frame references. |
| **F04** | Curriculum Data & Zod Schemas | External JSON datasets for Phonics, Morphology, Vocabulary, and Math; runtime Zod schemas; explicit ea /ē/ vs /ĕ/ split, 12 affixes, 40+ synonym/antonym pairs, Grade 2 addition/subtraction. | `ORIGINAL_REQUEST.md` R1, `SPEC.md` Topics A-C | Zero schema parsing errors, 58+ phonics words, 50+ morphology words with segmentation, 44+ vocabulary pairs, 40 math equations. |
| **F05** | IndexedDB Persistence Engine | Local-only persistence using `idb-keyval` wrapper; level unlock states; star ratings (0-3); mastery gate (>85% accuracy on >=10 attempts); error tracking for patterns and words. | `SPEC.md` §3, `PROJECT.md` F05 | Unlocked levels, calculateStars oracle, isMasteryAchieved oracle, consecutive mistakes tracking, zero external network requests. |
| **F06** | Web Audio & Web Speech Synthesizer | Procedural Web Audio API sound synthesis (catch, miss, combo, victory, click) + Web Speech API TTS with 0.9x rate, phonetics speech normalization for 2nd graders, and first-touch unlock listener. | `SPEC.md` §Sound Design, `PROJECT.md` F06 | Gain routing, oscillator frequency progressions, TTS prompt normalization without slash reading, mute and volume synchronization. |
| **F07** | Accessibility, Lexend & Remediation UI | Lexend typography, high-contrast toggle, >=48px touch targets, 3 consecutive mistakes speed dampener + teaching card review modal, and Orchard tree growth visualizer. | `ORIGINAL_REQUEST.md` R2, `SPEC.md` §5 | Touch target dimensions >= 48px, 3 consecutive mistake trigger, teaching card generation, orchard growth stages (0-10). |
| **F08** | Phaser 2D Arcade Gameplay Engine | Fixed-timestep Arcade Physics (60fps), 480x800 portrait scaling, scenes (Preload, Menu, Game, RoundSummary, Orchard, Castle), tap-to-catch and basket catch mechanics, fall durations. | `STACK.md`, `SPEC.md` Engine, `PROJECT.md` F08 | Game configuration, scene registration, fixedStep enabled, delta-time deterministic fall simulation, collision detection. |
| **F09** | Service Worker & PWA Publish Gate | `sw.js` with individual asset caching via `.add().catch()`, strictly avoiding `cache.addAll()`, offline navigation fallback to `./index.html`, passing PWA publish validation. | `ORIGINAL_REQUEST.md` R4, `SPEC.md` PWA | Precache asset list, individual caching loop, stale-while-revalidate fetch handler, navigation cache fallback, cache cleanup. |

---

## 3. 4-Tier Test Architecture

The E2E test suite in `tests/e2e.test.ts` is organized into four hierarchical testing tiers, progressing from individual feature behaviors to complex multi-step user scenarios:

### Tier 1: Feature Coverage (>=5 Tests Per Feature, Total >= 45 Tests)
Ensures every functional requirement across F01 through F09 has at least 5 primary behavioral tests verifying expected normal operation:
- **F01 (Build & Scaffolding)**:
  1. Package dependencies include required phaser, zod, and idb-keyval.
  2. Scripts define build, preview, test, typecheck, and verify:bsa.
  3. STACK.md confirms archetype 2d-game-arcade with pixel-art-character-pipeline.
  4. Forbidden patterns (raw-raf-loop, dom-sprites, unbatched-image-loads) are absent.
  5. TSConfig targets modern ESNext/ES2022 with strict module resolution.
- **F02 (PWA Manifest)**:
  1. Manifest specifies `display: standalone` and `display_override: ["standalone"]`.
  2. Start URL and scope are relative `./index.html` and `./`.
  3. Orientation is locked to `portrait`.
  4. Theme and background colors match educational child palette.
  5. Manifest contains no deprecated or desktop-only keys.
- **F03 (Icons & Atlas)**:
  1. Manifest contains both 192x192 and 512x512 icons for `any` purpose.
  2. Manifest contains both 192x192 and 512x512 icons for `maskable` purpose.
  3. Atlas JSON defines all 12 required fruit types.
  4. Atlas JSON includes player character frames (idle, catch, think) and UI elements.
  5. All atlas frames specify positive width, height, and source dimensions.
- **F04 (Curriculum & Schemas)**:
  1. Default curriculum loads and passes MasterCurriculumSchema without exceptions.
  2. Phonics curriculum includes all 9 vowel teams and 5 r-controlled vowels (>=40 words).
  3. Phonics contains explicit split between /ē/ (beach) and /ĕ/ (bread).
  4. Morphology dataset contains >=30 base words across prefixes and suffixes with visual segmentation.
  5. Vocabulary dataset contains >=40 synonym/antonym pairs contextualized in sentences.
- **F05 (Persistence Engine)**:
  1. Initializes with Level 1 unlocked for all four topics.
  2. calculateStars correctly assigns 3, 2, 1, and 0 stars based on accuracy brackets.
  3. isMasteryAchieved unlocks next level when accuracy >85% on 10+ attempts.
  4. Record mistake increments total attempts, pattern errors, and consecutive mistakes.
  5. Record correct resets consecutive mistakes streak to 0.
- **F06 (Audio & Speech Synthesis)**:
  1. Synthesizer instantiates and initializes master gain node with configured volume.
  2. Procedural sound functions (playCatch, playMiss, playCombo, playLevelComplete) trigger without audio file requests.
  3. Audio unlock resolves successfully on touch gesture.
  4. Mute toggle correctly mutes and restores master gain.
  5. normalizePhoneticsForSpeech eliminates dictionary slashes and spells out letter patterns.
- **F07 (Accessibility & UI)**:
  1. Lexend font family is configured for typography across scenes.
  2. Fruit interactive containers provide touch target dimensions >= 48px.
  3. High contrast mode setting toggles in storage.
  4. Orchard tree progress visualizer maps completed stages 0 through 10.
  5. TeachingCard generates remediation rules with target word and explanation.
- **F08 (Phaser Arcade Gameplay)**:
  1. Game configuration specifies Arcade Physics with fixedStep: true and 60 FPS.
  2. Virtual canvas is configured to 480x800 with FIT scale mode and CENTER_BOTH.
  3. Scene registration includes all 6 core scenes (Preload, Menu, Game, RoundSummary, Orchard, Castle).
  4. GameScene initializes level parameters and question sets.
  5. Delta-time physics formula yields identical downward travel distance regardless of refresh rate.
- **F09 (Service Worker & Publish Gate)**:
  1. Service Worker defines cache version and precache asset list.
  2. SW install listener utilizes individual `.add().catch()` without `cache.addAll()`.
  3. SW activate event clears stale caches.
  4. SW fetch event handles navigation requests with fallback to `./index.html`.
  5. SW fetch event handles same-origin asset requests with stale-while-revalidate strategy.

### Tier 2: Boundary & Corner Cases (>=5 Tests Per Feature, Total >= 45 Tests)
Stresses the system at extreme limits, boundary values, empty inputs, malformed types, and edge conditions:
- **F01**: Empty scripts, missing required dependencies, invalid tsconfig targets, non-existent directories.
- **F02**: Missing icon sizes, invalid display values, empty start_url, non-HTTPS/relative protocol boundaries.
- **F03**: Texture atlas zero-sized frames, invalid JSON coordinates, missing fruit types, out-of-bounds UVs.
- **F04**: Empty curriculum arrays, missing distractor words (must be >=2), invalid fruit enums, malformed regex in segmentation.
- **F05**: Boundary accuracy 85.0% vs 85.0001% vs 85.1%, 9 attempts vs 10 attempts, 100% accuracy on 9 attempts (blocked), negative scores, 0 attempts division by zero.
- **F06**: Empty speech text, string with only slashes and punctuation, volume clamping (<0 and >1), combo counter at 0 vs 1 vs 100, audio context in suspended vs closed state.
- **F07**: Extremely long word labels exceeding container width, negative coordinates, 1st and 2nd mistake (no remediation) vs exactly 3rd mistake (trigger), rapid consecutive resets.
- **F08**: Fall duration boundaries (maximum clamp 8000ms, minimum 1800ms), 0 delta-time update, massive frame drop (delta = 1000ms), offscreen boundary crossing (y > height).
- **F09**: Offline fetch with 404 resource, non-GET HTTP requests (POST bypass), empty cache matching, cross-origin fetch passthrough, corrupted cache keys.

### Tier 3: Cross-Feature Combinations (Pairwise Integration Matrix)
Exercises intersecting sub-systems running together in realistic combinations:
- **Pair 1: Curriculum (F04) + Storage (F05)**: Question generation updates error statistics, tracking per-pattern error frequencies for spaced repetition.
- **Pair 2: Storage (F05) + Audio (F06)**: AudioService settings (volume, TTS toggle) persist to and synchronize dynamically from StorageService.
- **Pair 3: Remediation (F07) + Physics (F08)**: Triggering 3 consecutive mistakes dampens fall speed (increases fall duration) and halts physics update loop during TeachingCard modal.
- **Pair 4: Service Worker (F09) + Manifest (F02)**: Precached asset paths in `sw.js` align with icons and manifest files declared in `manifest.json`.
- **Pair 5: Gameplay (F08) + Audio (F06)**: Consecutive catches increment combo counter, dynamically escalating pentatonic pitch synthesis.
- **Pair 6: Curriculum (F04) + Speech (F06)**: Morphological segmentation and phonics prompts pass through phonetic speech normalization.
- **Pair 7: Storage (F05) + UI Orchard (F07)**: Level mastery results increment orchard growth stage, visually rendering additional fruit on the tree.
- **Pair 8: Gameplay (F08) + Storage (F05)**: Basket touch drag clamping (55px to width-55px) with coin awards and high score updates.

### Tier 4: Real-World Application Scenarios (Full Player Journeys)
Multi-step, stateful user journeys replicating full student learning sessions:
- **Scenario 1: Complete Phonics /ea/ Split Journey**:
  Start Level 1 -> Play dual sounds of "ea" -> Make 3 consecutive errors on trickster /ĕ/ word "bread" -> Trigger remediation card -> Review rule -> Resume game -> Catch remaining items with >85% accuracy over 10+ attempts -> Complete round -> Earn 2/3 stars -> Unlock Level 2 -> Verify persistent state in IndexedDB.
- **Scenario 2: Morphology Visual Segmentation Journey**:
  Select Topic B (Morphology) -> Play prefix "re-" and suffix "-ing" -> Catch correct fruit -> Verify visual segmentation banner ("re + play → replay") -> Build 4x combo -> Receive bonus coins -> Save progress.
- **Scenario 3: Vocabulary & A11y Session**:
  Activate high-contrast mode -> Play Topic C (Vocabulary) synonym prompts -> Verify Lexend readability and touch targets >= 48px -> Verify TTS speech normalization reads "What is a word that means the same as big" -> Complete round.
- **Scenario 4: Grade 2 Math Operations & Royal Castle Decoration**:
  Play Math addition/subtraction within 20 -> Calculate answers -> Earn round coins -> Visit Castle marketplace -> Purchase decorative items -> Place decorations in outdoor garden -> Persist inventory.
- **Scenario 5: Offline PWA Resilience & State Resumption**:
  Simulate full offline conditions -> Load cached assets -> Resume existing game progress from local cache -> Execute full gameplay wave without network requests -> Retain updated scores and stars.

---

## 4. Verification & Forensic Integrity

- **Runner**: Vitest 4.1+
- **Test File**: `tests/e2e.test.ts`
- **Execution Command**: `npx vitest run tests/e2e.test.ts`
- **Integrity Guarantee**: All tests assert real invariants; no fake timers or vacuous boolean checks; failure will legitimately trigger if curriculum data is invalid, mastery logic is wrong, or manifest properties violate PWA standards.
