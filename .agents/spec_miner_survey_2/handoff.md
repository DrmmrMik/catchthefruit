# Handoff Report: Survey Spec Miner 2 (PWA, Assets, Storage & Offline)

**Agent:** Survey Spec Miner 2  
**Recipient:** Parent Orchestrator (`92b3a02b-34bd-4ca2-87de-d5628068b2a5`)  
**Date:** 2026-09-03  
**Working Directory:** `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_2`  
**Full Artifact:** `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_2/survey_report.md`  

---

### 1. Observation

Direct observations from authoritative project and system sources:

1. **`validate_pwa.py` (located at `/home/gallabot/Documents/Gemini/PWA-Publisher/validate_pwa.py`):**
   - Line 59: `p = os.path.join(d, "manifest.json")` — Requires output manifest to be named exactly `manifest.json`.
   - Lines 89–98: Checks required keys `name`, `short_name`, `start_url`, `scope`, `display`, `background_color`, `theme_color`. Displays equal to `"browser"` or `None` trigger ERROR. Missing `display_override` triggers WARNING (`"manifest lacks display_override"`).
   - Lines 115–122:
     ```python
     if "192" in sz and not is_mask:
         has["any192"] = True
     if "512" in sz and not is_mask:
         has["any512"] = True
     if "192" in sz and is_mask:
         has["mask192"] = True
     if "512" in sz and is_mask:
         has["mask512"] = True
     ```
     If an icon specifies `purpose: "any maskable"`, `is_mask` evaluates to `True`, failing `not is_mask` and preventing `any192` or `any512` from matching.
   - Lines 140–162: Inspects outer 8% border (`margin = max(1, int(w * 0.08))`) of maskable icons using PIL. If any pixel has alpha `< 10`, raises ERROR: `maskable icon {src} has a TRANSPARENT outer ring (...) - must be full-bleed or WebAPK minting falls back to legacy install`.
   - Lines 164–172: Prohibits `protocol_handlers`, `handle_links`, `edge_side_panel`, `launch_handler`, and `"window-controls-overlay"` in `display_override`.
   - Lines 173–174: Raises WARNING if `screenshots` is absent.
   - Lines 177–192: Checks `index.html` for `"http://"` (ERROR on mixed content), `rel="manifest"` (ERROR if missing), `name="viewport"` (ERROR if missing), `viewport-fit=cover` (WARNING if missing), `name="theme-color"` (WARNING if missing), and `serviceWorker.register` (ERROR if missing).
   - Lines 194–213: Runs `node --check sw.js` (ERROR on syntax fail), rejects `cache.addAll(` via regex (ERROR: `sw.js uses cache.addAll() - a single 404 aborts install`), and checks that every quoted string matching asset extensions (`.css|.js|.png|.svg|.webp|.jpg|.ico|.html`) exists on disk (ERROR: `sw.js precaches non-existent local asset`).
   - Lines 215–229: If `--base-url` is passed, performs HTTP GET for each icon and raises ERROR if status != 200.

2. **`ORIGINAL_REQUEST.md`:**
   - Lines 35–39 (R4): "Offline-first PWA built with Vite and Workbox (`vite-plugin-pwa`) featuring individual asset precaching (strictly prohibiting bare `cache.addAll`)."
   - Line 37: "Web App Manifest compliant with modern Android / Samsung Galaxy S24 Ultra standards: 192px and 512px full-bleed maskable PNG icons, standalone display mode, and an in-app installation prompt."
   - Line 38: "Purely local persistence using IndexedDB (Dexie / idb-keyval) storing completed levels, stars, error tracking, and preferences without logins or external network tracking."
   - Lines 60–65: "python3 validate_pwa.py passes with 0 errors and 0 warnings."

3. **`SPEC.md`:**
   - Lines 227–256: Requires Phaser 4 fixed-timestep physics, single PNG texture atlas (`.png` + `.json`), Zod runtime validation, and individual-asset caching.
   - Lines 99–106 & 204–207: 12 distinct fruit characters (apple, orange, grape, banana, watermelon, blueberry, strawberry, lemon, kiwi, peach, plum, cherry), minimum 48px touch targets, Lexend typography, and daylight bright sky gradient.
   - Lines 215–222: Sound effects synthesized via Web Audio API (ascending chime, descending tone, whoosh, complete jingle) and Web Speech API (TTS) voice cues.

4. **`STACK.md`:**
   - Required: `phaser`, `zod`.
   - Forbidden: `raw-raf-loop`, `dom-sprites`, `unbatched-image-loads`, `hardcoded-curriculum-logic`.

---

### 2. Logic Chain

1. **Manifest Specification:** From `validate_pwa.py:89-174`, `SPEC.md:250`, and `ORIGINAL_REQUEST.md:37`:
   - `manifest.json` must be emitted directly at `<build_dir>/manifest.json`.
   - Mandatory keys: `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `display_override: ["standalone"]`, `background_color`, `theme_color`, `prefer_related_applications: false`.
   - To achieve 0 warnings, `screenshots` array must be populated with at least one narrow (portrait) mobile screenshot.
   - Icons must have separate entries for `"purpose": "any"` and `"purpose": "maskable"` at both 192x192 and 512x512 because `validate_pwa.py:115` excludes maskable icons from matching any192/any512.
   - Maskable icons must be PNG and have 100% opaque background pixels across their outer 8% border to satisfy the PIL alpha test (`validate_pwa.py:157`).
   - No experimental desktop members (`protocol_handlers`, `window-controls-overlay`, etc.) can be present.

2. **App Shell (`index.html`) Specification:** From `validate_pwa.py:177-192`:
   - Must link manifest with `rel="manifest"`.
   - Viewport meta must contain `viewport-fit=cover` to eliminate the validator warning.
   - Must contain `<meta name="theme-color">` to eliminate the theme-color warning.
   - Must explicitly register the service worker using `serviceWorker.register('./sw.js')`.
   - Must not contain `"http://"` anywhere in markup or comments.

3. **Service Worker (`sw.js`) Specification:** From `validate_pwa.py:194-213`:
   - Must reside at `<build_dir>/sw.js` and be valid JavaScript verified by `node --check`.
   - Must NEVER call `cache.addAll()`. Instead, each asset must be precached individually using `cache.add(url).catch(...)` within `Promise.allSettled`.
   - Must NEVER contain quoted asset strings (e.g. `'./offline.html'`) that do not physically exist in `<build_dir>`, as `validate_pwa.py`'s regex will detect and fail them.
   - Must provide offline navigation fallback for `mode === 'navigate'` by serving cached `index.html`.

4. **Asset Pipeline:** From `SPEC.md:243-246` and `STACK.md:19-20`:
   - All 12 fruit types, UI buttons (pause, mute, restart), star ratings, particle sparkles, and orchard growth tree stages must be packed into a single texture atlas (`atlas.png` + `atlas.json`).
   - No individual DOM sprites or unbatched `<img>` loads are permitted.
   - Touch hitboxes for fruit must be at least 48px in diameter.
   - Audio must be synthesized via Web Audio API, unlocked on initial touch, supplemented by Web Speech API TTS for spoken phoneme/affix instruction, requiring zero external audio assets.
   - Typography must use locally bundled Lexend font files.

5. **Storage & Persistence:** From `SPEC.md:85-87` and `ORIGINAL_REQUEST.md:38`:
   - Persistence must use IndexedDB (`idb-keyval` / `Dexie`).
   - Schema tracks: unlocked levels, completed levels, star ratings (1–3), per-pattern error rates, per-word error counts, and user settings.
   - Integrates with pedagogical rules: unlocks require >85% accuracy on 10+ items; 3 consecutive errors trigger speed dampening and remediation card.

---

### 3. Caveats

1. **Location of `validate_pwa.py`:** The original dispatch referenced `/home/gallabot/Documents/antigravity/joyful-hertz/validate_pwa.py`, but the script currently resides at `/home/gallabot/Documents/Gemini/PWA-Publisher/validate_pwa.py`. The builder agent must copy or symlink it into the project root or invoke it from `PWA-Publisher`.
2. **Live URL Verification:** The `--base-url` argument in `validate_pwa.py` cannot be tested locally prior to deployment; local validation must run without `--base-url`, and post-deployment validation must test the live GitHub Pages URL.
3. **Speech Synthesis Voices:** Offline availability of specific English TTS voices depends on the host Android device's preinstalled TTS engine; the game engine must handle cases where TTS is unavailable by displaying high-contrast visual teaching cards.

---

### 4. Conclusion

The specification survey for PWA architecture, service worker caching, asset pipelines, local persistence, and validation criteria is complete and documented in full detail in `survey_report.md`. All 30 discrete validation checks from `validate_pwa.py`, including subtle edge cases (e.g. separate `"any"` vs `"maskable"` declarations, 8% outer border alpha threshold, forbidden desktop keys, and precache path regex scanning), have been mapped to actionable build requirements.

---

### 5. Verification Method

1. **Inspect Report:**
   Read `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_2/survey_report.md` to review the exhaustive 10-section specification and mining tables.
2. **Run Validation Script:**
   Once assets are built into a `dist/` directory, verify compliance with:
   `python3 /home/gallabot/Documents/Gemini/PWA-Publisher/validate_pwa.py dist`
   Ensure output ends with:
   ```
   --------------------------------------------------
   RESULT: PASS - safe to publish.
   ```
   with 0 errors and 0 warnings.
3. **Verify Stack Rules:**
   `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz`
