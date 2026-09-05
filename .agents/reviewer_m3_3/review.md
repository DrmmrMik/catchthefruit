# Review Report: Milestone 3 Deliverables (Audio Synthesis, Remediation Card & Visual UI)

**Reviewer**: Reviewer M3-3 (`teamwork_preview_reviewer`)  
**Date**: 2026-09-05T15:45:00Z  
**Reviewed Artifacts**:
- `src/services/audio.service.ts`
- `src/ui/TeachingCard.ts`
- `src/ui/HUD.ts`
- `src/ui/OrchardView.ts`
- `src/ui/LevelIntroModal.ts`
- `tests/audio.test.ts`
- `tests/ui.test.ts`

---

## 1. Review Summary

**Verdict**: **REQUEST_CHANGES**

### Summary Rationale:
The core implementation code authored for Milestone 3 (`audio.service.ts`, `TeachingCard.ts`, `HUD.ts`, `OrchardView.ts`) is genuine, robust, and demonstrates high craftsmanship:
- Zero `dom-sprites` are present; all visual UI elements are native `Phaser.GameObjects.Container` structures.
- Sound effects are 100% procedurally synthesized via Web Audio API, with zero external audio media files loaded.
- Web Speech API TTS runs at 0.9x rate with extensive, pedagogically sound phonetics normalization (converting vowel teams, affix notations, and math equations into natural spoken language without robotic slash reading) and a 4000ms safety timeout guard.
- Remediation mechanics correctly trigger at 3 consecutive mistakes, display high-contrast Lexend text, and reset mistake counters in local IndexedDB storage upon dismissal.
- Zero integrity violations were detected (no hardcoded test hacks, no facade logic, no bypassed requirements).

However, **REQUEST_CHANGES** is required because:
1. **Stack Verification Gate Failure**: `~/.build-standards/bin/bsa verify` returns `✗ FAIL` against the project's updated `STACK.md` (which now specifies the `pixel-art-character-pipeline` modifier, requiring `pillow`, `numpy`, `pyyaml`, and `free-tex-packer-core`).
2. **Cold-Start Test Timeout**: `npm test` failed on initial cold execution with exit code 1 because `tests/ui_adversarial.test.ts` executes a nested `python3` process that spawns an inner `vitest` instance, exceeding Vitest's 15,000ms timeout under parallel workload.

---

## 2. Findings

### [Major] Finding 1: Cold-Start Test Execution Timeout in `tests/ui_adversarial.test.ts`
- **What**: During cold parallel test execution (`npm test`), `tests/ui_adversarial.test.ts` timed out after 15,000ms, causing `npm test` to exit with code 1:
  ```
  FAIL  tests/ui_adversarial.test.ts > UI Adversarial & Remediation Verification Suite (Challenger M3-2) > Suite 1: Empirical Python Adversarial Oracle Execution > executes python UI adversarial verification oracle with 0 errors and APPROVE verdict
  Error: Test timed out in 15000ms.
  ```
- **Where**: `tests/ui_adversarial.test.ts:327-341`
- **Why**: `tests/ui_adversarial.test.ts` invokes `execSync('python3 scripts/adversarial_ui_verify.py')`. That python script in turn executes `npx vitest run tests/audio.test.ts` in a subprocess. When the parent `npm test` process is already executing 14 test suites and compiling Phaser in parallel, the nested Vitest subprocess takes ~18s, violating the hardcoded 15s Vitest test timeout. On subsequent warm runs with pre-cached compilation, it passes in ~9s.
- **Suggestion**:
  1. Increase the test timeout in `tests/ui_adversarial.test.ts:341` from `15000` to `30000` (or `45000`).
  2. Alternatively, remove the redundant nested `vitest` invocation from `scripts/adversarial_ui_verify.py`, since the Vitest runner itself is already executing `tests/audio.test.ts`.

---

### [Major] Finding 2: Stack Decision Record Invalidation (`bsa verify` FAIL)
- **What**: `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` outputs `VERDICT: ✗ FAIL — the build ignored the agreed stack (required package(s) not used)`.
- **Where**: `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`
- **Why**: At `2026-09-05T15:36:22Z`, `STACK.md` was updated to incorporate modifier `pixel-art-character-pipeline`, adding `pillow`, `numpy`, `pyyaml`, and `free-tex-packer-core` to the Required packages list. `bsa verify` reported:
  ```
  Required packages: 3/6 present
    - phaser: FOUND (via package.json, source import)
    - zod: FOUND (via package.json, source import)
    - pillow: MISSING
    - numpy: FOUND (via source import)
    - pyyaml: MISSING
    - free-tex-packer-core: MISSING
  ```
- **Suggestion**: The project must either install/import the missing pipeline tooling packages (`pillow`, `pyyaml`, `free-tex-packer-core`) or declare reasoned entries under `STACK.md`'s `## Waivers` section to satisfy `bsa verify`.

---

### [Minor] Finding 3: Color Contrast Tuning for Full WCAG AAA Compliance
- **What**: An empirical contrast audit performed by the adversarial oracle revealed that 6 UI text elements meet WCAG AA standards (contrast >= 4.5:1 for normal text or >= 3.0:1 for large text), but do not reach strict WCAG AAA (contrast >= 7.0:1 for normal text or >= 4.5:1 for large text):
  1. `TeachingCard` resume button: `#ffffff` text on `#16a34a` (Emerald 600) = 3.30:1 (Meets WCAG AA for large UI controls, below AAA 4.5:1).
  2. `TeachingCard` header band: `#ffffff` text on `#0284c7` (Sky 600) = 4.10:1 (Meets WCAG AA for large text, below AAA 4.5:1).
  3. `TeachingCard` segmentation text: `#92400e` on `#fef3c7` (Amber 100) = 6.37:1 (Meets WCAG AA 4.5:1, below AAA 7.0:1).
  4. `HUD` prompt subtext: `#0369a1` on `#ffffff` = 5.93:1 (Meets WCAG AA 4.5:1, below AAA 7.0:1).
  5. `HUD` combo indicator: `#b45309` on `#ffffff` = 5.02:1 (Meets WCAG AA 4.5:1, below AAA 7.0:1).
  6. `OrchardView` unlocked card title: `#0369a1` on `#ffffff` = 5.93:1 (Meets WCAG AA 4.5:1, below AAA 7.0:1).
- **Where**: `src/ui/TeachingCard.ts`, `src/ui/HUD.ts`, `src/ui/OrchardView.ts`
- **Suggestion**: Slightly deepen the tint of these accent colors (e.g. use Emerald 700 `#15803d` or Emerald 800 `#166534` for button, Sky 800 `#075985` for header band, Sky 900 `#0c4a6e` for subtexts) to surpass 7.0:1 across all text elements.

---

### [Minor] Finding 4: OrchardView Topic Selector Tab Touch Target Height (44px)
- **What**: The topic tabs in `OrchardView` (Phonics, Affixes, Words, Math) are sized 99x44px (`tabHeight = 44`).
- **Where**: `src/ui/OrchardView.ts:175`
- **Why**: 44px satisfies Apple Human Interface Guidelines (44pt), but is slightly below the Android Material Design and W3C recommendation of 48px. Primary gameplay targets (level cards: 430x72px, buttons: 64x64px, resume button: 240x54px) all satisfy >= 48px.
- **Suggestion**: Increase `tabHeight` from 44px to 48px in `OrchardView.ts`.

---

## 3. Verified Claims

| Claim | Verification Method | Result |
|---|---|---|
| Procedural audio synthesis without external media files | Inspected `audio.service.ts`; checked repo for audio media (`.mp3`, `.wav`, etc.); ran `tests/audio.test.ts` | **PASS** (23/23 tests pass; 0 audio files on disk) |
| Mobile first-touch audio unlocking | Inspected `attachFirstTouchListeners()` (`pointerdown`, `touchstart`, `keydown`); tested `unlock()` race | **PASS** |
| Web Speech API TTS rate 0.9x & safety timeout | Inspected `speakPrompt()`; verified `utterance.rate = 0.9`, 4000ms safety timer, `#sr-announcements` | **PASS** |
| Pedagogical speech phonetics normalization | Tested `normalizePhoneticsForSpeech()` with vowel teams, 'ea' sound split, affixes, and math expressions | **PASS** |
| TeachingCard 3-mistake consecutive remediation | Evaluated `TeachingCard.shouldTrigger(mistakes)`; verified Lexend font, segmentation, and modal dismissal | **PASS** |
| Reset mistakes on remediation dismissal | Tested `storage.resetConsecutiveMistakes()` invocation during `dismiss()` | **PASS** |
| Touch target dimensions >= 48px | Tested container bounding boxes: resume (240x54px), pause/sound (64x64px), level cards (430x72px) | **PASS** |
| Zero `dom-sprites` in visual UI | Grep searches for `scene.add.dom` and `document.createElement`; confirmed `Phaser.GameObjects.Container` subclasses | **PASS** (0 DOM sprites) |
| Packed texture atlas frame resolution | Checked `atlas.json` for `btn-pause`, `btn-sound`, `btn-sound-off`, `btn-home`, `star-full`, `star-empty`, `tree-stage-1..5` | **PASS** (All 29 frames present) |
| Typecheck compilation | `npm run typecheck` (`tsc --noEmit`) | **PASS** (0 errors) |
| Production build bundle | `npm run build` (`vite build`) | **PASS** (Built in 1.29s) |
| PWA publish readiness | `python3 validate_pwa.py dist` | **PASS** (0 errors, 0 warnings) |

---

## 4. Adversarial Stress-Testing & Integrity Audit

- **Integrity Forensics**:
  - Hardcoded test returns or expected outputs: **NONE**. Mocks capture genuine audio node configurations and inspect parameters.
  - Dummy/facade implementations: **NONE**. The Web Audio graph generates genuine oscillators, ramps, and gain nodes; TTS normalizer has comprehensive regex engines.
  - Shortcuts / unbatched image loads: **NONE**. All graphics use Phaser graphics and atlas frames.
  - Fabricated verification outputs: **NONE**.
- **Rapid Dismissal Concurrency**:
  - `TeachingCard.dismiss()` and `LevelIntroModal.dismiss()` feature synchronous `isDismissed` flags. 100 rapid multi-tap simulations proved strict idempotency (0 double executions).
- **Tree Growth Stage Clamping**:
  - 100,000 float and negative boundary inputs passed through `OrchardView.calculateTreeStage` and `OrchardView.getTreeFrame`; all values strictly clamped to stages 1..5.
- **Audio Error Resilience**:
  - Tested null `AudioContext`, suspended context, offline speech synthesis, and muted states. All methods return cleanly without unhandled exceptions.

---

## 5. Required Actions for Approval

To achieve `APPROVE` on Milestone 3:
1. **Fix `tests/ui_adversarial.test.ts` Timeout**: Set test timeout to 30,000ms or remove redundant nested Vitest invocation from `scripts/adversarial_ui_verify.py` so `npm test` consistently passes on cold runs.
2. **Resolve BSA Stack Requirements**: Add the required packages (`pillow`, `pyyaml`, `free-tex-packer-core`) or record valid entries under `STACK.md`'s `## Waivers` section so `~/.build-standards/bin/bsa verify` returns `✓ PASS`.
