# Project: Catch the Fruit (2D Educational Arcade PWA)

## Architecture
- **Engine**: Phaser 4.2.1 (Phaser Arcade Physics with fixed timestep, portrait orientation, 480x800 base virtual canvas with responsive scaling).
- **Validation**: Zod 3.24+ for runtime validation of all external JSON curriculum datasets before game initialization.
- **Storage**: IndexedDB (`idb-keyval`) for purely local persistence of unlocked levels, 1-3 star ratings, per-pattern error counts, and audio/accessibility settings.
- **Audio & Speech**: Procedural Web Audio API synthesizer for tactile sound effects (chimes, descending tones, whooshes, fanfare) + Web Speech API (TTS) for spoken phonemes/words and instructional guidance with high-contrast visual fallback. First-touch audio unlocking.
- **Asset Pipeline**: Single packed texture atlas (`atlas.png` + `atlas.json`) containing all 12 fruit characters, UI buttons, star icons, particle effects, and orchard growth tree stages. Full-bleed 192px and 512px maskable and any PNG icons (Pillow script generated with 100% opaque outer ring).
- **Typography & A11y**: Locally bundled Lexend font family, WCAG AAA color contrast, touch hitboxes >= 48px, ARIA live region hints for screen readers.
- **PWA & Offline**: Custom Service Worker (`sw.js`) with individual `.add().catch()` asset caching (strictly no `cache.addAll()`), offline navigation fallback, Android 16 / S24 Ultra compliant manifest (`standalone`, `display_override: ["standalone"]`, screenshots, zero experimental desktop keys). Fully passing `validate_pwa.py` with 0 errors and 0 warnings.
- **Stack Standards**: 100% compliance with STACK.md archetype `2d-game-arcade` and `~/.build-standards/bin/bsa verify .`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Project Scaffolding & Build System | Vite 8 + TypeScript + Vitest + Phaser 4 + Zod + idb-keyval setup passing `bsa verify` | M1 | STACK.md, explorer_survey_1 |
| F02 | PWA Web App Manifest | WebAPK-compliant manifest with standalone mode, screenshots, theme colors, no desktop keys | M1 | validate_pwa.py, spec_miner_survey_2 |
| F03 | Full-Bleed Icons & Packed Texture Atlas | 192/512 any & maskable icons (full-bleed opaque 8% margin), single packed atlas for all 12 fruits & UI | M1 | STACK.md, validate_pwa.py, spec_miner_survey_2 |
| F04 | Curriculum Data & Zod Schemas | External JSON datasets for Phonics (vowel teams, r-controlled, ea split), Morphology (12 affixes, segmentation), Vocabulary (synonyms/antonyms), and Math (addition/subtraction within 20) with strict Zod validation | M2 | ORIGINAL_REQUEST.md, SPEC.md, spec_miner_survey_1 |
| F05 | IndexedDB Persistence Engine | `idb-keyval` wrapper tracking level unlocks, 3-star ratings, per-pattern error stats, settings, zero remote sync | M2 | ORIGINAL_REQUEST.md, SPEC.md, spec_miner_survey_1, 2 |
| F06 | Web Audio & Web Speech Synthesizer | Procedural Web Audio SFX (catch, miss, fanfare, combo) + Web Speech TTS manager with first-touch unlock & visual fallback | M3 | ORIGINAL_REQUEST.md, SPEC.md, spec_miner_survey_1, 2 |
| F07 | Accessibility, Lexend & Remediation UI | Lexend typography, high-contrast themes, 48px hitboxes, 3-mistake speed dampener + teaching card modal, Orchard tree growth visualizer | M3 | ORIGINAL_REQUEST.md, SPEC.md, spec_miner_survey_1 |
| F08 | Phaser 2D Arcade Gameplay Engine | Game scenes (Preload, Menu, Game, Orchard, Pause, GameOver), fixed-timestep physics, fruit spawning & fall curves (2.8s-1.8s), tap-to-catch mechanics + basket catcher | M4 | ORIGINAL_REQUEST.md, SPEC.md, spec_miner_survey_1, STACK.md |
| F09 | Service Worker & PWA Publish Gate | `sw.js` with individual asset caching (no `cache.addAll()`), offline navigation fallback, passing `validate_pwa.py` with 0 errors & 0 warnings | M5 | ORIGINAL_REQUEST.md, validate_pwa.py, spec_miner_survey_2 |
| F10 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test suite: Tier 1 Feature Coverage, Tier 2 Boundary/Corner Cases, Tier 3 Cross-Feature, Tier 4 Real-World Workloads | E2E Track | Project Pattern Dual Track |
| F11 | Final E2E Pass & Adversarial Hardening (Tier 5) | 100% pass of E2E test suite, followed by white-box adversarial stress testing & coverage hardening | M6 (Final) | Project Pattern Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Scaffolding & PWA Assets | F01, F02, F03 (Vite, TS, dependencies, manifest, icons, atlas, bsa compliance) | none | DONE |
| M2 | Curriculum & Persistence Engine | F04, F05 (Zod schemas, JSON datasets for Phonics, Morphology, Vocabulary, Math, IndexedDB) | M1 | DONE |
| M3 | Audio, Remediation & Visual UI | F06, F07 (Web Audio synthesizer, Web Speech TTS, Lexend typography, remediation card, Orchard map) | M1, M2 | PLANNED |
| M4 | Phaser 2D Arcade Gameplay | F08 (Phaser scenes, fixed-timestep physics, fruit spawning, tap-to-catch, level progression) | M2, M3 | PLANNED |
| M5 | Service Worker & PWA Validation Gate | F09 (sw.js individual caching, offline navigation, validate_pwa.py 0 errors/0 warnings) | M4 | PLANNED |
| M6 | Final Verification & Adversarial Hardening | F11 (Phase 1: 100% E2E test pass; Phase 2: Tier 5 adversarial hardening) | M5, E2E Track | PLANNED |

## Verified Milestone Deliverables
- **Milestone 1**: Scaffolding, PWA assets, full-bleed maskable icons, 29-sprite atlas, BSA PASS, validate_pwa PASS (0 errors, 0 warnings).
- **Milestone 2**:
  - `src/schema/curriculum.schema.ts` & `src/schema/progress.schema.ts`: 18 Zod schemas covering all curriculum items, level configurations, and user progress.
  - `data/phonics.json`: 58 words across 9 vowel teams and 5 r-controlled vowels with explicit /ē/ vs /ĕ/ "ea" split.
  - `data/morphology.json`: 50 items across 12 affixes and 49 base words with visual segmentation `"re + play → replay"`.
  - `data/vocabulary.json`: 44 items (22 synonyms, 22 antonyms) in contextual sentences.
  - `data/math.json`: 40 items covering PPS Grade 2 addition/subtraction within 20, mental math, and skip counting.
  - `src/services/curriculum.service.ts`: Startup Zod validation, question generation, and distractor allocation.
  - `src/services/storage.service.ts`: Local IndexedDB persistence via `idb-keyval`, >85% mastery unlock over 10+ attempts, star calculation, and 3-mistake remediation tracking.
  - Automated tests: 8 test files, 123/123 tests passing (100% pass rate).

## Parallel Track: E2E Testing
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Creation | F10 (Test runner, Tiers 1-4 tests, TEST_INFRA.md, TEST_READY.md) | M1 | IN_PROGRESS |

## Interface Contracts

### CurriculumEngine ↔ GameScene
```typescript
interface CurriculumItem {
  id: string;
  topic: 'phonics' | 'morphology' | 'vocabulary' | 'math';
  subTopic: string;
  prompt: string;
  targetAnswer: string;
  targetFruitType: FruitType;
  options: {
    text: string;
    fruitType: FruitType;
    isCorrect: boolean;
    explanation?: string;
  }[];
}

interface LevelConfig {
  id: number;
  topic: 'phonics' | 'morphology' | 'vocabulary' | 'math';
  levelNumber: number;
  name: string;
  description: string;
  fallSpeedDurationMs: number; // 2800ms -> 1800ms
  itemsRequired: number; // 10 items
  masteryAccuracyThreshold: number; // 0.85
  scaffoldStage: 'single_rule' | 'discrimination' | 'mixed_patterns' | 'boss_level';
}
```

### PersistenceManager ↔ GameEngine
```typescript
interface UserProgress {
  unlockedLevels: Record<string, boolean>;
  stars: Record<string, number>;
  highScores: Record<string, number>;
  errorStats: {
    patternErrors: Record<string, number>;
    wordErrors: Record<string, number>;
    totalAttempts: number;
    totalCorrect: number;
    consecutiveMistakes: number;
  };
  settings: {
    sfxVolume: number;
    ttsEnabled: boolean;
    highContrast: boolean;
  };
}
```

### AudioSynthesizer ↔ GameEngine
```typescript
interface IAudioSynthesizer {
  unlock(): Promise<void>;
  playCatch(isBonus?: boolean): void;
  playMiss(): void;
  playLevelComplete(): void;
  playCombo(count: number): void;
  playClick(): void;
  speakPrompt(text: string): Promise<void>;
}
```
