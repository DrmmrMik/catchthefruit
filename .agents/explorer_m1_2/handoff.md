# Handoff Report: Explorer M1-2 (PWA Manifest, Full-Bleed Icons & HTML Shell)

**Agent:** Explorer M1-2  
**Recipient:** Parent Orchestrator (`92b3a02b-34bd-4ca2-87de-d5628068b2a5`)  
**Date:** 2026-09-03  
**Working Directory:** `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2`  
**Detailed Report:** `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/report.md`  

---

### 1. Observation

Direct observations from authoritative codebase and system validation files:

1. **`validate_pwa.py` (`/home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py`):**
   - Line 59: `p = os.path.join(d, "manifest.json")` — Manifest file must exist in target directory `d`.
   - Lines 89–98: Enforces required keys `name`, `short_name`, `start_url`, `scope`, `display`, `background_color`, `theme_color`. Rejects `display: "browser"` or `None`.
   - Lines 95–96: `if "display_override" not in m: warn("manifest lacks display_override (recommended for modern Android)")`.
   - Lines 97–98: `if m.get("prefer_related_applications") is True: err("manifest prefer_related_applications must be false")`.
   - Lines 107–122: Evaluates icon purpose:
     ```python
     is_mask = "maskable" in pur
     if "192" in sz and not is_mask: has["any192"] = True
     if "512" in sz and not is_mask: has["any512"] = True
     if "192" in sz and is_mask: has["mask192"] = True
     if "512" in sz and is_mask: has["mask512"] = True
     ```
     Verifies that setting `"purpose": "any maskable"` sets `is_mask = True`, failing `not is_mask` and causing `has["any192"]` and `has["any512"]` to fail with ERROR.
   - Lines 140–162: Inspects outer 8% margin of maskable PNGs using PIL:
     ```python
     margin = max(1, int(w * 0.08))
     ring = [px[x, y][3] for x in range(w) for y in range(h)
             if x < margin or x >= w - margin or y < margin or y >= h - margin]
     transparent = [a for a in ring if a < 10]
     if transparent:
         err(f"maskable icon {src} has a TRANSPARENT outer ring...")
     ```
     Any alpha `< 10` in this outer ring triggers ERROR.
   - Lines 165–172: Strictly rejects `protocol_handlers`, `handle_links`, `edge_side_panel`, `launch_handler`, and `window-controls-overlay` in `display_override`.
   - Lines 173–174: `if not m.get("screenshots"): warn("manifest has no screenshots (recommended for install prompt)")`.
   - Lines 180–192: HTML checks:
     - `if "http://" in html: err("index.html contains insecure http:// reference (mixed content)")`
     - `if 'rel="manifest"' not in html: err("index.html missing <link rel=manifest>")`
     - `if 'name="viewport"' not in html: err("index.html missing viewport meta")`
     - `elif "viewport-fit=cover" not in html: warn("viewport meta lacks viewport-fit=cover")`
     - `if 'name="theme-color"' not in html: warn("index.html missing theme-color meta")`
     - `if "serviceWorker.register" not in html: err("index.html does not register a service worker")`
   - Lines 194–213: Service Worker checks:
     - Runs `node --check sw.js`.
     - `if re.search(r"cache\.addAll\(", sw): err(...)` — Note: Scans raw text with regex without stripping comments; matching `cache.addAll(` anywhere (even in comments) triggers fatal ERROR.
     - `asset_refs = set(re.findall(r"['\"]([^'\"]+\.(?:css|js|png|svg|webp|jpg|ico|html))['\"]", sw))` — Scans all quoted asset paths and requires every un-prefixed file to physically exist on disk in `d`.

2. **`ORIGINAL_REQUEST.md` (Lines 35–43 & 60–65):**
   - Requires Web App Manifest compliant with modern Android / Samsung Galaxy S24 Ultra standards: 192px and 512px full-bleed maskable PNG icons, standalone display mode, offline-first PWA with individual asset precaching (strictly prohibiting bare `cache.addAll`).
   - Acceptance criteria explicitly mandates passing `validate_pwa.py` with 0 errors and 0 warnings.

3. **`SPEC.md` (Lines 204–207 & 248–256):**
   - Cheerful, child-friendly 2D arcade art with distinct fruit characters (apple, orange, grape, banana, etc.), daylight sky gradient, and Lexend typography.
   - Requires service worker individual-asset caching and full-bleed maskable icons.

---

### 2. Logic Chain

1. **Manifest Architecture (`proposed_manifest.json`):**
   - From `validate_pwa.py:89-174`:
     - Mandatory keys `name`, `short_name`, `start_url`, `scope`, `display`, `background_color`, `theme_color` are all defined.
     - `display: "standalone"` is set to avoid browser fallback.
     - `display_override: ["standalone"]` is set to satisfy modern Android without triggering the missing `display_override` warning or the forbidden `window-controls-overlay` error.
     - `prefer_related_applications: false` is set to avoid the related application error.
     - Separate icon entries for `"purpose": "any"` and `"purpose": "maskable"` are created at 192x192 and 512x512 so that `has["any192"]`, `has["any512"]`, `has["mask192"]`, and `has["mask512"]` all evaluate to `True`.
     - `screenshots` array is populated with `screenshots/mobile-1.png` to eliminate the screenshot warning.
     - All experimental desktop keys are completely excluded.

2. **Full-Bleed Python Pillow Generator (`generate_pwa_assets.py`):**
   - From `validate_pwa.py:154-161`:
     - The outer 8% margin is tested for alpha `< 10`.
     - `create_gradient_canvas` fills the entire canvas with `RGBA(r, g, b, 255)`.
     - Downsampling with `Image.Resampling.LANCZOS` preserves full alpha opacity.
     - This mathematically guarantees that zero pixels have alpha `< 10` across the entire image.
   - All visual elements (dual-lobed red apple, wooden stem, green leaf, cheerful face, honey-amber wicker basket, and sparkle stars) are bounded within the 80% safe circle ($r \le 204.8\text{px}$ on 512x512), preventing clipping when Android applies circular or squircle adaptive icon masks.
   - `generate_mobile_screenshot` produces a 480x800 PNG representing authentic Topic A Phonics gameplay with falling fruits ("beach", "bread", "teach"), basket catcher, HUD, and score chimes.

3. **HTML App Shell (`proposed_index.html`):**
   - From `validate_pwa.py:180-192`:
     - Contains exact substring `'rel="manifest"'` linking `./manifest.json`.
     - Contains exact substring `'name="viewport"'` with `"viewport-fit=cover"`.
     - Contains exact substring `'name="theme-color"'` with content `"#0284c7"`.
     - Contains exact substring `"serviceWorker.register"` registering `./sw.js`.
     - Exactly zero occurrences of `"http://"`.
     - Mobile styles include `touch-action: manipulation`, `-webkit-user-select: none`, and `position: fixed` to eliminate mobile bounce and tap delays.

4. **Service Worker (`proposed_sw.js`):**
   - From `validate_pwa.py:194-213`:
     - Does not contain `cache.addAll(` anywhere (including comments).
     - Precaches each asset individually using `cache.add(asset).catch(...)` within `Promise.allSettled`.
     - Quoted precache array only references the 7 verified files (`./index.html`, `./manifest.json`, `./icons/icon-192x192.png`, `./icons/icon-512x512.png`, `./icons/maskable-192x192.png`, `./icons/maskable-512x512.png`, `./screenshots/mobile-1.png`), ensuring every regex-matched asset exists on disk.
     - Implements offline navigation fallback for `request.mode === 'navigate'` to `./index.html`.

---

### 3. Caveats

1. **Validation Target Directory:** `validate_pwa.py` expects `<pwa_build_dir>` as its first argument (i.e. `dist/`). When building with Vite, assets in `public/` are copied to `dist/`, and `index.html` is emitted to `dist/index.html`. Running `validate_pwa.py dist` validates the compiled output.
2. **Comment Regex in `validate_pwa.py`:** Because `validate_pwa.py:202` runs `re.search(r"cache\.addAll\(", sw)` without stripping comments, comments in `sw.js` must NEVER contain the literal string `cache.addAll(`.
3. **Dynamic Asset Bundles:** Vite emits hashed bundle names (e.g. `assets/main-[hash].js`) during production build. These dynamic files must NOT be hardcoded in the static precache array of `sw.js` to avoid 404 errors when hashes change; instead, runtime caching or Vite PWA workbox injection should handle hashed chunks while the static precache list handles core shell assets.
4. **Live URL Verification:** The `--base-url` argument in `validate_pwa.py` tests live HTTP 200 responses on deployed URLs and cannot be run until GitHub Pages deployment in Milestone 5/6.

---

### 4. Conclusion

The specification, code implementation, and validation criteria for Milestone 1's PWA Manifest, Full-Bleed Icons, Screenshots, and HTML Shell are fully completed, verified, and preserved in the working directory:
- `report.md`: Exhaustive design analysis and rationale.
- `generate_pwa_assets.py`: Standalone Python Pillow script generating full-bleed maskable and any icons and screenshot.
- `proposed_manifest.json`: WebAPK-compliant manifest.
- `proposed_index.html`: Complete mobile app shell.
- `proposed_sw.js`: Resilient service worker passing `validate_pwa.py`.

The Worker agent can implement these artifacts directly to achieve 0 errors and 0 warnings against `validate_pwa.py`.

---

### 5. Verification Method

To independently verify the deliverables:

1. **Verify Asset Generation:**
   ```bash
   python3 scripts/generate_pwa_assets.py public
   ```
   Inspect generated files:
   - `public/icons/icon-192x192.png`
   - `public/icons/icon-512x512.png`
   - `public/icons/maskable-192x192.png`
   - `public/icons/maskable-512x512.png`
   - `public/screenshots/mobile-1.png`

2. **Verify Full-Bleed Maskable Margin (Python One-Liner):**
   ```bash
   python3 -c '
   from PIL import Image
   for path in ["public/icons/maskable-192x192.png", "public/icons/maskable-512x512.png"]:
       im = Image.open(path).convert("RGBA")
       w, h = im.size
       margin = max(1, int(w * 0.08))
       px = im.load()
       ring = [px[x, y][3] for x in range(w) for y in range(h) if x < margin or x >= w - margin or y < margin or y >= h - margin]
       trans = [a for a in ring if a < 10]
       assert len(trans) == 0, f"{path} has {len(trans)} transparent pixels in 8% margin!"
       print(f"VERIFIED: {path} has 0 transparent edge pixels.")
   '
   ```

3. **Verify Build & Run `validate_pwa.py` Gate:**
   ```bash
   npm run build
   python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist
   ```
   **Pass Condition:** Exit status code `0`, output showing `0 error(s)` and `0 warning(s)`:
   ```
   --------------------------------------------------
   RESULT: PASS - safe to publish.
   ```
