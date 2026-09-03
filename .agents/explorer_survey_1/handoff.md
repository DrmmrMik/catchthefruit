# Handoff Report: Survey Explorer 1 (Stack, Build System, BSA & Workspace)

**Agent:** `explorer_survey_1`  
**Recipient:** `orchestrator_1` (Conversation ID: `92b3a02b-34bd-4ca2-87de-d5628068b2a5`)  
**Type:** Hard Handoff (Task complete)  
**Date:** 2026-09-03  

---

## 1. Observation

- **Existing Workspace Files (`/home/gallabot/Documents/antigravity/joyful-hertz`)**:
  - `ORIGINAL_REQUEST.md` (lines 1–68): Defines pedagogical domains, 2D arcade mechanics, audio requirements, PWA offline criteria, and acceptance criteria.
  - `SPEC.md` (lines 1–291): Establishes detailed PA Core ELA requirements for Topic A (Phonics), Topic B (Morphology), and Topic C (Vocabulary), scaffolding rules, texture atlas rules, and tech stack constraints.
  - `STACK.md` (lines 1–25): Specifies archetype `2d-game-arcade`, required packages `phaser` and `zod`, forbidden patterns `raw-raf-loop`, `dom-sprites`, `unbatched-image-loads`, `hardcoded-curriculum-logic`, and waivers `(none)`.
  - `AGENTS.md` & `CLAUDE.md`: Explicitly require reading `./STACK.md` and respecting Required/Forbidden lists.
  - No `package.json`, `tsconfig.json`, `vite.config.ts`, or application source code exists yet in the workspace.

- **Build Standards Advisor Tooling (`~/.build-standards/bin/bsa`)**:
  - Command: `~/.build-standards/bin/bsa show 2d-game-arcade`
    Output confirms: Default engine `phaser` (Phaser 4.2.x), default validation `zod`, forbidden patterns (`raw-raf-loop`, `dom-sprites`, `unbatched-image-loads`, `hardcoded-curriculum-logic`).
  - Command: `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz`
    Output:
    ```
    STACK CHECK — joyful-hertz
    Category: 2D Arcade, Educational & Action Games
    Professional default: phaser, zod
    This build uses: missing phaser, zod instead
    Waivers: none

    VERDICT: ✗ FAIL — the build ignored the agreed stack (required package(s) not used).

    --- details ---
    Required packages: 0/2 present
      - phaser: MISSING
      - zod: MISSING
    Forbidden patterns: 0 hits / 4 checked
      - raw-raf-loop: clean
      - dom-sprites: clean
      - unbatched-image-loads: clean
      - hardcoded-curriculum-logic: clean
    Waiver integrity: 0 valid, 0 malformed
    ```
  - Inspection of `/home/gallabot/.build-standards/lib/verifier.py` (lines 160–210) confirms `check_presence` looks for packages in `package.json` (`dependencies` or `devDependencies`) or in source files via import statements (`import ... from 'phaser'`, `import ... from 'zod'`).

- **Host Tooling & Environment**:
  - `node -v` output: `v22.23.2`
  - `npm -v` output: `10.9.8`
  - `python3 --version` output: `Python 3.12.3`
  - `PIL` check: `PIL version: 10.2.0` (Pillow installed and active)
  - `ImageMagick`: `/usr/bin/convert` present
  - `~/.npm`: Pre-populated with 2.3 GB of cached packages.
  - NPM registry checks: `phaser` is 4.2.1, `zod` is 4.5.4, `vite` is 8.2.2, `vitest` is 4.1.11, `idb-keyval` is 6.3.0.

- **PWA Gate Tooling (`validate_pwa.py`)**:
  - Found at `/home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py`.
  - Line 213: Flags `cache.addAll()` in `sw.js` as a fatal error ("a single 404 aborts install ('Unsafe app blocked'). Cache assets individually with .add().catch().").
  - Line 140–158: Checks maskable icons with PIL for an 8% border transparent pixel margin. If any transparent pixels (<10 alpha) exist, it fails ("maskable icon ... has a TRANSPARENT outer ring - must be full-bleed").
  - Line 161–170: Flags experimental desktop manifest keys (`protocol_handlers`, `handle_links`, `edge_side_panel`, `launch_handler`, and `window-controls-overlay`) as fatal errors causing WebAPK fallback to legacy install.

---

## 2. Logic Chain

1. **Workspace Readiness**:
   - Direct observation confirms the workspace is currently pristine with initial documentation and specification records, but zero application code or dependencies.
   - Therefore, scaffolding is the immediate next step.

2. **BSA Compliance Plan**:
   - `bsa verify` currently fails solely because `phaser` and `zod` are missing from `package.json` and source files.
   - When `package.json` is generated with `"dependencies": { "phaser": "^4.2.1", "zod": "^3.24.2", "idb-keyval": "^6.2.1" }` and source files import them, `check_presence` will resolve `FOUND (via package.json, source import)`.
   - By ensuring physics fall speed uses Phaser Arcade Physics (avoiding unthrottled `requestAnimationFrame` without deltaTime), rendering entities via Phaser sprites (avoiding absolute-positioned DOM elements), packing sprites into a single atlas (avoiding `new Image()` unbatched loads), and storing curriculum in external JSON (avoiding `switch(level) { case 1:`), all 4 forbidden pattern detectors will remain clean (`0 hits / 4 checked`).
   - Thus, `bsa verify` will transition to `VERDICT: ✓ PASS`.

3. **PWA Compliance Plan**:
   - `validate_pwa.py` strictly mandates:
     1. Manifest with standalone display, no desktop-only keys.
     2. 192px and 512px icons for both `any` and `maskable` purposes.
     3. Maskable PNG icons must be 100% full-bleed (zero transparent edge pixels).
     4. Service worker must individually cache assets using `.add().catch()`, avoiding `cache.addAll()`.
     5. Service worker registration in `index.html`.
   - By generating icons using a Python Pillow script with an opaque background canvas, and constructing a custom `sw.js` with individual asset caching, `validate_pwa.py` will pass with 0 errors and 0 warnings.

4. **Testing Architecture**:
   - Fast, deterministic testing can be achieved using `vitest` with `jsdom` (observed working in Ginny Crunchers with 1.4s run time).
   - Educational curriculum parsing, Zod validation, level progression (>85% mastery over 10+ items), error tracking (3 consecutive errors remediation), and state persistence can be 100% unit-tested in Node/JSDOM without requiring a full GPU canvas.

---

## 3. Caveats

- **Context7 Remote MCP**: The Context7 MCP server returned an invalid API key on this machine. All package information was directly verified using the local NPM registry CLI (`npm view`, `npm info`) and the host's existing package installations.
- **Phaser in Headless Node**: Full Phaser canvas rendering and WebGL shaders cannot run headlessly in pure Node without mock canvas/webgl contexts. However, core gameplay logic, curriculum data, progression algorithms, and state management can and should be decoupled from the rendering layer and tested via Vitest.

---

## 4. Conclusion

The stack and build system requirements are fully surveyed and mapped:
1. **Engine & Validation:** Phaser 4.2.1 + Zod.
2. **Build Tooling:** Vite 8.x + TypeScript + Vitest.
3. **Storage:** `idb-keyval` for IndexedDB local-only persistence.
4. **Audio:** Procedural Web Audio API synthesizer for tactile SFX + Web Speech API (TTS) for voice cues.
5. **PWA Standards:** Android 16 / S24 Ultra compliant manifest and full-bleed maskable icons, individual-asset caching service worker.
6. **Full Report:** Delivered to `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1/survey_report.md`.

The project is primed for Orchestrator to decompose into implementation and testing milestones.

---

## 5. Verification Method

To verify these findings:
1. **Check BSA show:**
   ```bash
   ~/.build-standards/bin/bsa show 2d-game-arcade
   ```
2. **Check BSA verify currently fails for missing dependencies:**
   ```bash
   ~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz
   ```
3. **Check Node & NPM versions:**
   ```bash
   node -v && npm -v
   ```
4. **Check validate_pwa.py location and execution:**
   ```bash
   python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py /home/gallabot/Documents/Gemini/PWA-Publisher/cosmobot
   ```
5. **Inspect Full Survey Report:**
   ```bash
   cat /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_survey_1/survey_report.md
   ```
