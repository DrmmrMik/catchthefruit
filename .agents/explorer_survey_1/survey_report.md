# Comprehensive Survey & Technical Architecture Report: "Catch the Fruit"

**Date:** 2026-09-03  
**Explorer:** Survey Explorer 1 (`explorer_survey_1`)  
**Parent Agent:** `orchestrator_1` (Conversation ID: `92b3a02b-34bd-4ca2-87de-d5628068b2a5`)  
**Archetype:** `2d-game-arcade`  
**Workspace:** `/home/gallabot/Documents/antigravity/joyful-hertz`  

---

## Executive Summary

"Catch the Fruit" is a mobile-first, educational 2D arcade Progressive Web App (PWA) tailored for a 2nd grade student in Pittsburgh Public Schools (PPS) aligning with PA Core Standards ELA domains:
1. **Phonics (Topic A):** Vowel teams and r-controlled vowels (minimum 40 words, explicit /ē/ vs /ĕ/ distinction for "ea").
2. **Morphology (Topic B):** Common prefixes and suffixes across 30+ base words with visual morphological segmentation (`re + play → replay`).
3. **Vocabulary (Topic C):** 40+ synonym and antonym word pairs contextualized with grade-level sentences.

This technical survey details the existing workspace state, Build Standards Advisor (`bsa`) compliance rules, host environment capabilities, recommended Vite + TypeScript build configuration, Phaser 4 architecture, Zod data validation schemas, testing harness via Vitest, and strict Android 16 / Samsung S24 Ultra PWA validation gates (`validate_pwa.py`).

---

## 1. Existing Workspace Audit

### 1.1 Directory Contents
Inspection of `/home/gallabot/Documents/antigravity/joyful-hertz` reveals:
- **`ORIGINAL_REQUEST.md`** (5,416 bytes): Formal client specification, pedagogical domains, arcade mechanics, audio pipeline, PWA criteria, and acceptance criteria.
- **`SPEC.md`** (14,775 bytes): In-depth educational brief, PA Core standards breakdown, scaffolded difficulty rules, word lists, visual and sound design, and deliverables.
- **`STACK.md`** (488 bytes): Architectural Stack Decision Record locking archetype to `2d-game-arcade`, requiring `phaser` and `zod`, forbidding anti-patterns, with zero waivers.
- **`AGENTS.md` & `CLAUDE.md`** (443 bytes each): Build Stack Advisor pointer files enforcing adherence to `./STACK.md`.
- **`.git/`**: Git repository initialized on branch `master` at commit `611ce2df633ff57198dd1951837d69e1d949aa84` ("Initial commit"). Currently has untracked documentation and agent directories. No git remote is yet configured.
- **`.agents/`**: Contains subdirectories for orchestration and research agents (`orchestrator_1`, `sentinel`, `spec_miner_survey_1`, `spec_miner_survey_2`, `explorer_survey_1`). Note: Per Teamwork convention, `.agents/` stores ONLY agent metadata, never source code or tests.

### 1.2 Current Development State
The project workspace is in a **pristine pre-scaffolding state**:
- No `package.json`, `node_modules`, `tsconfig.json`, or bundler configuration exists yet.
- No application source code (`src/` or `public/`) has been created.
- Scaffolding must be executed cleanly according to the stack guidelines below.

---

## 2. STACK.md & Build Stack Advisor (BSA) Standards

### 2.1 STACK.md Specification
File path: `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`
```markdown
archetype: 2d-game-arcade
modifiers: []
decided: 2026-09-02
kb_version: 2026-09-02
decided_by: build-brief

## Required (build MUST use these)
- phaser — engine
- zod — data-validation

## Optional
- kaplay — engine [alternative]
- pixi.js — renderer [alternative]
- @pixi/ui — ui-widgets [optional]

## Forbidden (build MUST NOT do these)
- raw-raf-loop
- dom-sprites
- unbatched-image-loads
- hardcoded-curriculum-logic

## Waivers
(none)
```

### 2.2 BSA CLI & Verifier Implementation Analysis
Inspection of `~/.build-standards/bin/bsa` and `~/.build-standards/lib/verifier.py` establishes the exact mechanics used by `bsa verify`:

1. **Package Presence Check (`check_presence`)**:
   - Inspects `package.json` under `dependencies` and `devDependencies` for `phaser` and `zod`.
   - AND/OR searches source files (`.js`, `.ts`, `.jsx`, `.tsx`, `.html`) for import/require statements:
     `import ... from 'phaser'`, `import ... from 'zod'`, etc.
   - **Current status**: Fails with `Required packages: 0/2 present (phaser: MISSING, zod: MISSING)`.
   - **Resolution**: Installing/declaring `phaser` and `zod` in `package.json` and importing them in `src/` will satisfy this check.

2. **Forbidden Pattern Detectors (`check_forbidden`)**:
   - `raw-raf-loop`:
     - Target: `**/*.{js,ts}`
     - Regex: `requestAnimationFrame`
     - Absent Regex: `(deltaTime|dt|accumulator|fixedStep|Phaser)`
     - Rationale: Unthrottled `requestAnimationFrame` with per-frame constant pixel increments runs at 2x speed on 120Hz mobile screens (e.g. S24 Ultra).
     - Guard: Game loop must be managed by Phaser's fixed-timestep Arcade Physics engine.
   - `dom-sprites`:
     - Target: `**/*.{js,ts}`
     - Regex: `document\.createElement\(['\"](img|div)['\"]\)[\s\S]*?position\s*=\s*['\"]absolute['\"]`
     - Rationale: Moving DOM elements causes catastrophic layout reflows and battery drain.
     - Guard: All falling fruits and interactive entities must be Phaser Canvas/WebGL GameObjects/Sprites.
   - `unbatched-image-loads`:
     - Target: `**/*.{js,ts}`
     - Regex: `new\s+Image\(\)[\s\S]*?src\s*=\s*['\"][^'\"]*\.(png|jpg)`
     - Rationale: Ad-hoc single image network requests create separate GPU draw calls and latency.
     - Guard: All sprites must be packed into a single texture atlas (`atlas.png` + `atlas.json`) loaded via `this.load.atlas()`.
   - `hardcoded-curriculum-logic`:
     - Target: `**/*.{js,ts}`
     - Regex: `switch\s*\(level\)\s*\{\s*case\s+1:`
     - Rationale: Hardcoding educational words, rules, or questions in code prevents curriculum extensibility.
     - Guard: All word lists, affixes, synonyms, level parameters, and scaffolding rules must be in external JSON files validated by Zod.

3. **Waiver Integrity**:
   - STACK.md has `(none)`. Any waiver added must explicitly name a valid required or forbidden ID and provide a valid reason string. However, our build requires **zero waivers**.

---

## 3. Host Environment & Tooling Evaluation

### 3.1 Host System Diagnostics
- **Operating System:** Linux x86_64 (Kernel 6.8.0)
- **Node.js:** `/usr/bin/node` **v22.23.2** (Node 22 LTS)
- **npm:** `/usr/bin/npm` **v10.9.8**
- **Yarn:** `/snap/bin/yarn` v1.22.5
- **pnpm / bun:** Not installed. **npm** is the recommended package manager.
- **Python 3:** `/usr/bin/python3` **v3.12.3**
- **Python Imaging Library (Pillow):** **PIL 10.2.0** installed and functional.
- **ImageMagick:** `/usr/bin/convert` installed and functional.
- **NPM Local Cache:** Pre-populated with **2.3 GB** of packages in `~/.npm`, ensuring rapid dependency installation.

### 3.2 Registry Package Version Availability
- `phaser`: **4.2.1** (Latest GA release, exports ES module at `./dist/phaser.esm.js` and types at `./types/phaser.d.ts`)
- `zod`: **4.5.4** (or `zod@^3.24.2` syntax compatible)
- `vite`: **8.2.2**
- `vitest`: **4.1.11**
- `idb-keyval`: **6.3.0** (Lightweight 600B IndexedDB client)
- `jsdom`: **29.1.1**

---

## 4. PWA Standards & Android 16 Gate Compliance

Inspection of `/home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py` and `/home/gallabot/Documents/Gemini/PWA-Publisher/PWA_STANDARDS.md` confirms the mandatory pre-publish criteria:

### 4.1 Manifest Specifications (`manifest.json`)
- **Required fields:** `name`, `short_name`, `start_url`, `scope`, `display`, `background_color`, `theme_color`.
- **Display Mode:** `display: "standalone"`, `display_override: ["standalone"]`.
- **Forbidden members:** Strip all desktop-only/experimental keys (`protocol_handlers`, `handle_links`, `edge_side_panel`, `launch_handler`, and `window-controls-overlay` in `display_override`). Inclusion causes Android WebAPK minting to fail back to legacy installs ("built for an older version of Android").
- **`prefer_related_applications`:** Must be `false`.

### 4.2 Icons & Safe-Zone Rules
- **Icon Inventory:**
  - 192px PNG (`purpose: "any"`)
  - 512px PNG (`purpose: "any"`)
  - 192px PNG (`purpose: "maskable"`)
  - 512px PNG (`purpose: "maskable"`)
- **Maskable Full-Bleed Requirement:**
  - `validate_pwa.py` uses PIL to inspect an 8% outer border margin. If any transparent pixels (<10 alpha) exist in the outer ring, it raises a fatal error.
  - Maskable icons must have 100% opaque background bleed to the edge, with artwork kept within the inner 40% safe zone.
  - SVG icons must NEVER be declared with `purpose: "maskable"` (WebAPK minter cannot rasterize SVGs).

### 4.3 Service Worker (`sw.js`) & Caching
- Registered in `index.html` via `navigator.serviceWorker.register('./sw.js')`.
- Must pass `node --check sw.js`.
- **STRICT PROHIBITION:** `cache.addAll([...])` is forbidden because a single 404 aborts installation ("Unsafe app blocked").
- **Required Implementation:** Cache each asset individually using:
  ```js
  Promise.allSettled(ASSETS.map(url => cache.add(url).catch(err => console.warn('Failed to cache', url, err))))
  ```
- Every asset path listed in the SW precache table must actually exist in `dist/`.

---

## 5. Recommended Architecture & Scaffolding Plan

### 5.1 Project Layout
```
joyful-hertz/
├── .agents/                      # Teamwork metadata only
├── public/
│   ├── favicon.svg
│   ├── icons/
│   │   ├── icon-192.png          # any
│   │   ├── icon-512.png          # any
│   │   ├── icon-192-maskable.png # maskable (full bleed)
│   │   └── icon-512-maskable.png # maskable (full bleed)
│   ├── data/
│   │   ├── phonics.json          # Topic A: vowel teams & r-controlled vowels
│   │   ├── morphology.json       # Topic B: prefixes & suffixes
│   │   └── vocabulary.json       # Topic C: synonyms & antonyms
│   ├── assets/
│   │   ├── atlas.png             # Single packed texture atlas
│   │   └── atlas.json            # Texture atlas frames
│   ├── manifest.json             # Android 16 compliant manifest
│   └── sw.js                     # Individual-caching service worker
├── src/
│   ├── assets/                   # Atlas generator scripts / raw SVGs
│   ├── audio/
│   │   ├── SoundSynth.ts         # Web Audio API procedural sound synthesizer
│   │   └── SpeechManager.ts      # Web Speech API (TTS) voice prompting
│   ├── curriculum/
│   │   ├── schemas.ts            # Zod validation schemas
│   │   ├── loader.ts             # Curriculum fetch & validation engine
│   │   └── types.ts              # Inferred TypeScript types
│   ├── game/
│   │   ├── GameConfig.ts         # Phaser 4 Game configuration (fixed timestep)
│   │   ├── scenes/
│   │   │   ├── BootScene.ts      # Load atlas & curriculum data
│   │   │   ├── MenuScene.ts      # Topic & level select
│   │   │   ├── GameScene.ts      # Falling fruit arcade loop & input
│   │   │   └── RewardScene.ts    # Orchard tree growth & star awards
│   │   └── objects/
│   │       ├── FruitSprite.ts    # 48px+ touch target fruit
│   │       └── Basket.ts         # Visual basket catcher
│   ├── pedagogy/
│   │   ├── ProgressionEngine.ts  # >85% mastery over 10+ items progression
│   │   ├── SpacedRepetition.ts   # Per-pattern error tracking & 20% review pooling
│   │   └── Remediation.ts        # 3-consecutive-error speed dampener & card
│   ├── storage/
│   │   └── StorageManager.ts     # idb-keyval local progress persistence
│   ├── index.html
│   ├── main.ts                   # App entrypoint & SW registration
│   └── style.css                 # Responsive portrait container & Lexend typography
├── scripts/
│   ├── generate_assets.py        # Python Pillow atlas & full-bleed icon generator
│   └── verify_pwa.py             # Pre-publish wrapper running validate_pwa.py
├── tests/
│   ├── curriculum.test.ts        # Zod validation and word list test suites
│   ├── progression.test.ts       # Mastery and remediation logic tests
│   ├── storage.test.ts           # IndexedDB storage state tests
│   └── audio.test.ts             # Audio synthesis and mock event tests
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### 5.2 `package.json` Dependencies
```json
{
  "name": "catch-the-fruit",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "verify:bsa": "~/.build-standards/bin/bsa verify .",
    "verify:pwa": "python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist"
  },
  "dependencies": {
    "idb-keyval": "^6.2.1",
    "phaser": "^4.2.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.9",
    "jsdom": "^29.1.1",
    "typescript": "^5.8.2",
    "vite": "^8.2.2",
    "vitest": "^4.1.11"
  }
}
```
*(Note: Using `zod@^3.24.2` ensures stable, well-understood TypeScript schema inference with full runtime Zod parsing).*

### 5.3 Vite & TypeScript Configuration
- `vite.config.ts`:
  ```ts
  import { defineConfig } from 'vite';

  export default defineConfig({
    base: './', // Ensures relative asset resolution for GitHub Pages
    build: {
      target: 'esnext',
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser']
          }
        }
      }
    }
  });
  ```
- `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "strict": true,
      "skipLibCheck": true,
      "noEmit": true,
      "allowImportingTsExtensions": false,
      "resolveJsonModule": true
    },
    "include": ["src", "tests"]
  }
  ```

### 5.4 Vitest Configuration
- `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      environment: 'jsdom',
      globals: true
    }
  });
  ```

---

## 6. Detailed Pedagogical & Gameplay Engine Architecture

### 6.1 Curriculum Domains & Zod Validation
All curriculum data resides in `public/data/*.json` and must be validated through runtime Zod schemas on load:
- **`PhonicsSchema`:**
  - Validates `vowelTeams` (`ai`, `ay`, `ea`, `ee`, `ie`, `oa`, `oe`, `ui`, `ue`) with distinct target phonetic values (`/ē/` vs `/ĕ/`).
  - Validates `rControlled` (`ar`, `er`, `ir`, `or`, `ur`).
  - Ensures at least 40 words with sample distractors.
- **`MorphologySchema`:**
  - Validates prefixes (`re-`, `un-`, `dis-`, `pre-`) and suffixes (`-s/-es`, `-ed`, `-ing`, `-er`, `-est`, `-ful`, `-less`, `-ly`).
  - Validates base words and provides structured segmentation metadata (e.g. `base: "play", affix: "re-", full: "replay", meaning: "again"`).
- **`VocabularySchema`:**
  - Validates 40+ synonym and antonym pairs, including grade-level context sentences (e.g. `"The pumpkin was SO big!"`).

### 6.2 Phaser 4 Fixed-Timestep Configuration
To satisfy the prohibition of `raw-raf-loop` and ensure identical fall speeds on 60Hz and 120Hz displays:
```ts
import Phaser from 'phaser';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Handled via constant velocity or fixed fall speed
      fps: 60,
      fixedStep: true
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  scene: [BootScene, MenuScene, GameScene, RewardScene]
};
```

### 6.3 Touch Controls & Hitboxes
- Touch hitboxes: Minimum **48px** circular/rectangular touch area around falling fruits.
- Interaction: Single-tap detection on fruit (`fruit.on('pointerdown', ...)`). No swipe or dragging required, catering to single-thumb mobile use.

### 6.4 Audio Engine: Web Audio Synthesizer + Web Speech TTS
- Avoid relying on external audio files that could 404 or fail mobile autoplay.
- Synthesize all tactile sound effects programmatically via Web Audio API `OscillatorNode`:
  - **Correct chime:** Arpeggiated C-E-G sine wave with envelope decay.
  - **Miss tone:** Gentle descending tone (F to D sine wave).
  - **Victory jingle:** Fast fanfare sequence.
- Voice cues and phonetic pronunciations: Use the browser's native `window.speechSynthesis` (Web Speech API) with responsive unlock on the first user interaction.

### 6.5 Spaced Repetition & Error Remediation
- **Mistake Remediation:**
  - Track consecutive incorrect touches.
  - When counter reaches 3: pause physics, apply a speed dampener factor (e.g. 0.7x), and display a modal teaching card explaining the rule (e.g. explaining the dual sounds of "ea").
- **Mastery Gate:**
  - Track player performance per level.
  - Advancing to the next level requires `>85%` accuracy over at least 10 attempts.
- **Spaced Repetition:**
  - Track error counts per pattern in IndexedDB.
  - Inject previously struggled patterns into subsequent levels with a 20% frequency.

---

## 7. Verification Checklist & Gate Criteria

| Gate Check | Command / Verification Method | Target Status |
|---|---|---|
| **BSA Stack Verification** | `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` | **PASS** (Required: phaser, zod; 0 forbidden hits, 0 waivers) |
| **PWA Compliance Gate** | `python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist/` | **0 Errors, 0 Warnings** |
| **Unit & Integration Tests** | `npm test` (`vitest run`) | **100% Pass** across all curriculum, progression, and storage suites |
| **Type Check & Build** | `npm run build` (`tsc && vite build`) | Zero TypeScript compiler errors, clean bundle output |
| **Mobile & Offline Check** | Service Worker precaching without `cache.addAll`, full-bleed maskable icons, standalone launch | Clean offline execution, no network errors |

---

## 8. Conclusion and Next Steps

The workspace is ready for milestone decomposition and execution. The required stack choices (`phaser`, `zod`, `vite`, `vitest`, `idb-keyval`) align with all architectural requirements in `STACK.md` and `ORIGINAL_REQUEST.md`.

**Recommended Next Step:**
Hand off to Orchestrator to begin Milestone 1 (Project Scaffolding, BSA Compliance, and Curriculum Package Definition).
