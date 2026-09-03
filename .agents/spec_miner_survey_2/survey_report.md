# Catch the Fruit — Specification Survey Report 2: PWA, Assets, Storage & Offline

**Author:** Survey Spec Miner 2  
**Date:** 2026-09-03  
**Working Directory:** `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_survey_2`  
**Reference Files:**  
- `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`  
- `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`  
- `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`  
- `/home/gallabot/Documents/Gemini/PWA-Publisher/validate_pwa.py`  

---

## 1. Executive Summary

This report establishes the complete, authoritative specification for the **Progressive Web App (PWA) architecture**, **Web App Manifest**, **Service Worker & Offline Caching**, **Asset Pipelines (sprites, audio, fonts, icons)**, **Local Storage & Persistence**, and the **`validate_pwa.py` Verification Gate** for "Catch the Fruit", an educational 2D arcade game built for 2nd grade students in Pittsburgh Public Schools.

The game is strictly an **offline-first, zero-external-network, mobile-portrait 2D arcade PWA** running on Phaser 4 with fixed-timestep physics. It must strictly pass `validate_pwa.py` with **0 errors and 0 warnings** and pass `bsa verify` against `STACK.md`.

---

## 2. Authoritative Specification Sources

| Source | Location / Identifier | Role & Authority |
|---|---|---|
| User Request | `ORIGINAL_REQUEST.md` | Top-level acceptance criteria (R1–R5), target device (Samsung S24 Ultra / Android 16), GitHub Pages deploy target. |
| Game Spec Brief | `SPEC.md` | Core gameplay loop, pedagogical requirements, Phaser 4 + Zod architecture, UI/UX, audio design, storage schema. |
| Stack Decision | `STACK.md` | Enforces `phaser` and `zod`; strictly forbids `raw-raf-loop`, `dom-sprites`, `unbatched-image-loads`, `hardcoded-curriculum-logic`. |
| PWA Validator Gate | `/home/gallabot/Documents/Gemini/PWA-Publisher/validate_pwa.py` | Mandatory pre-publish verification script enforcing Android 16 / Chrome WebAPK minting and service worker safety rules. |

---

## 3. PWA Architecture & Web App Manifest Specification

### 3.1 Manifest Location & Format
- **File Name & Path:** Must be emitted as `manifest.json` in the root of the build output directory (e.g., `dist/manifest.json`). `validate_pwa.py` line 59 specifically looks for `os.path.join(d, "manifest.json")`. Naming it `manifest.webmanifest` will trigger `manifest.json missing`.
- **JSON Validity:** Must be strictly valid JSON without trailing commas or comments.

### 3.2 Required Manifest Keys (`validate_pwa.py` lines 89–98)
The following keys are checked and must exist with truthy values:
1. `name`: Full app title, e.g., `"Catch the Fruit - 2nd Grade ELA"`.
2. `short_name`: Short title for launcher and app drawer, e.g., `"CatchFruit"`.
3. `start_url`: Target entry URL. Must be relative or match scope, e.g., `"./"` or `"./index.html"`.
4. `scope`: Application navigation scope, e.g., `"./"`.
5. `display`: Must be `"standalone"` or `"fullscreen"`. Cannot be `"browser"` or missing.
6. `background_color`: Splash screen background color, e.g., `"#EBF4FF"` (must match the daylight sky gradient / theme).
7. `theme_color`: Status bar and navigation bar color, e.g., `"#3B82F6"`.
8. `display_override`: Must be an array, specifically `["standalone"]`.
   - *Warning Trigger:* If omitted, `validate_pwa.py` issues a warning (`manifest lacks display_override`).
   - *Error Trigger:* If it contains `"window-controls-overlay"`, `validate_pwa.py` raises an error because desktop window controls break WebAPK minting on Android.
9. `prefer_related_applications`: Must be `false` (or omitted; if `true`, triggers error).

### 3.3 Recommended Manifest Keys to Avoid Warnings
- `screenshots`: Must be present as a non-empty array (`validate_pwa.py` line 173 warns `manifest has no screenshots (recommended for install prompt)`).
  - Must include at least 1–2 screenshots representing mobile gameplay (e.g., `sizes: "1080x2400"`, `type: "image/png"`, `form_factor: "narrow"`).
- `description`: Recommended for store/install metadata.
- `orientation`: `"portrait"` (recommended for single-thumb portrait gameplay).
- `categories`: `["education", "games"]`.

### 3.4 Forbidden Manifest Members (`validate_pwa.py` lines 164–172)
The presence of any of the following experimental or desktop-only members causes WebAPK minting fallback to legacy APK install ("built for an older version of Android") and triggers an immediate ERROR in `validate_pwa.py`:
- `protocol_handlers`
- `handle_links`
- `edge_side_panel`
- `launch_handler`
- `window-controls-overlay` (inside `display_override`)

### 3.5 Manifest Icon Specification & Android WebAPK Minting Rules
`validate_pwa.py` lines 102–163 enforce strict requirements on the `icons` array:

1. **Four Required Icon Profiles:**
   - At least one icon with `"192"` in `sizes` and `purpose: "any"` (`has["any192"]`).
   - At least one icon with `"512"` in `sizes` and `purpose: "any"` (`has["any512"]`).
   - At least one icon with `"192"` in `sizes` and `purpose: "maskable"` (`has["mask192"]`).
   - At least one icon with `"512"` in `sizes` and `purpose: "maskable"` (`has["mask512"]`).

2. **Critical Separation Requirement:**
   - In `validate_pwa.py`:
     ```python
     is_mask = "maskable" in pur
     if "192" in sz and not is_mask:
         has["any192"] = True
     if "512" in sz and not is_mask:
         has["any512"] = True
     if "192" in sz and is_mask:
         has["mask192"] = True
     if "512" in sz and is_mask:
         has["mask512"] = True
     ```
   - *CRITICAL GOTCHA:* If an icon defines `purpose: "any maskable"`, `is_mask` evaluates to `True`, which prevents `has["any192"]` and `has["any512"]` from being set! Thus, the manifest **must declare separate entries** for `"purpose": "any"` and `"purpose": "maskable"`.

3. **Maskable Icon Full-Bleed Rule (Outer 8% Margin):**
   - Maskable PNGs must be **100% full-bleed** (solid, opaque outer ring).
   - `validate_pwa.py` checks an 8% outer border (`margin = max(1, int(w * 0.08))`).
   - Any pixel in this outer ring with alpha channel `< 10` raises an immediate ERROR:
     `maskable icon {src} has a TRANSPARENT outer ring (...) - must be full-bleed or WebAPK minting falls back to legacy install`.
   - Artwork/logo must reside inside the central 80% safe zone (circle of diameter 0.8 * size), with background color filling the canvas 100% edge-to-edge.

4. **Raster vs SVG Constraint:**
   - SVG icons must **never** declare `purpose: "maskable"`. The Google/Samsung WebAPK minting server cannot rasterize SVGs into adaptive icons and falls back to legacy installation. If an SVG icon declares maskable, `validate_pwa.py` errors.
   - Maskable icons must strictly be PNG.

5. **Physical Disk Existence:**
   - Every `src` in `icons` must resolve to an existing file on disk relative to the build directory (`os.path.join(d, src.lstrip("./"))`).

### 3.6 Example Canonical `manifest.json` Structure
```json
{
  "name": "Catch the Fruit - 2nd Grade ELA",
  "short_name": "CatchFruit",
  "description": "Educational 2D arcade phonics and vocabulary game for 2nd grade students.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "display_override": ["standalone"],
  "orientation": "portrait",
  "background_color": "#EBF4FF",
  "theme_color": "#3B82F6",
  "prefer_related_applications": false,
  "categories": ["education", "games"],
  "icons": [
    {
      "src": "icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/maskable-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icons/maskable-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "screenshots/gameplay-portrait.png",
      "sizes": "1080x2400",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

---

## 4. HTML App Shell Specification (`index.html`)

`validate_pwa.py` inspects `index.html` with explicit substring checks:

1. **Manifest Link:** Must contain `rel="manifest"` (e.g. `<link rel="manifest" href="./manifest.json">`).
2. **Viewport Meta Tag:**
   - Must contain `name="viewport"`.
   - Must contain `viewport-fit=cover` (e.g., `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`).
   - If `viewport-fit=cover` is missing, a WARNING is raised.
3. **Theme Color Meta Tag:**
   - Must contain `name="theme-color"` (e.g. `<meta name="theme-color" content="#3B82F6">`).
   - If missing, a WARNING is raised.
4. **Service Worker Registration:**
   - Must contain the literal string `serviceWorker.register` in `index.html` (e.g. inline script or script block registering `./sw.js`).
   - If missing, an ERROR is raised (`index.html does not register a service worker`).
5. **No Mixed Content:**
   - Must NOT contain `"http://"` anywhere in `index.html`. Even in comments or CDN references, `"http://"` causes an ERROR.
6. **Single-Thumb Portrait Game Container:**
   - Canvas container configured with `touch-action: none;` and CSS ensuring letterboxed/contain portrait orientation matching Galaxy S24 Ultra aspect ratio.
7. **In-App Install Prompt UI:**
   - Must listen to `window.addEventListener('beforeinstallprompt', ...)` and show an in-app "Install Game" button when available, gracefully hiding if already running standalone or unsupported.

---

## 5. Service Worker & Offline Caching Architecture

### 5.1 Service Worker File & Syntax
- **Location:** Must be located at `sw.js` in the root of the build output (`os.path.join(d, "sw.js")`).
- **Syntax Validation:** `validate_pwa.py` executes `node --check <build_dir>/sw.js`. Any syntax or parsing error fails verification.

### 5.2 Strict Prohibition of `cache.addAll()`
- `validate_pwa.py` executes `re.search(r"cache\.addAll\(", sw)`.
- If found, verification fails with ERROR:
  `sw.js uses cache.addAll() - a single 404 aborts install ('Unsafe app blocked'). Cache assets individually with .add().catch().`
- **Mandatory Implementation:** Assets during the install event must be cached individually using a pattern such as:
  ```javascript
  const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/index.js',
    './assets/index.css',
    './assets/atlas.png',
    './assets/atlas.json',
    './data/phonics.json',
    './data/morphology.json',
    './data/vocabulary.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/maskable-icon-192x192.png',
    './icons/maskable-icon-512x512.png'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to precache ${url}:`, err);
            })
          )
        );
      }).then(() => self.skipWaiting())
    );
  });
  ```

### 5.3 Static Asset Precache Audit Rule (`validate_pwa.py` lines 205–213)
- `validate_pwa.py` scans `sw.js` using regular expressions:
  `re.findall(r"['\"]([^'\"]+\.(?:css|js|png|svg|webp|jpg|ico|html))['\"]", sw)`
- For every non-HTTP string found matching one of those extensions, it checks if `os.path.join(d, rel)` exists on disk.
- **CRITICAL REQUIREMENT:** If `sw.js` quotes any asset filename (even in comments, unused arrays, or dead code) that does not exist in the output directory, it triggers an ERROR:
  `sw.js precaches non-existent local asset: {ref} (-> {local})`.
- Therefore, the precache list in `sw.js` must be generated accurately to match actual build artifacts (with actual hashed filenames if Vite hashes them, or static paths).

### 5.4 Runtime Caching Strategy
- **App Shell & Core Code:** Cache-First, falling back to network, or Stale-While-Revalidate with immediate local service.
- **Curriculum JSON Data:** Cache-First / Cache-Falling-Back-to-Network.
- **Synthesized Audio:** Generated on-the-fly via Web Audio API, so no external audio network requests are made.
- **Web Speech API:** Uses browser native speech synthesis engine (`window.speechSynthesis`), which operates offline on modern Android devices without network roundtrips.
- **Offline Navigation Fallback:** The service worker `fetch` handler must intercept navigation requests (`request.mode === 'navigate'`) and serve `./index.html` from cache when offline.

---

## 6. Asset Requirements Specification

### 6.1 2D Arcade Graphics: Packed Texture Atlas
`SPEC.md` and `STACK.md` strictly require batched rendering via a single packed texture atlas:
- **Atlas Format:** A single `atlas.png` + `atlas.json` (JSON Hash or JSON Array format supported natively by Phaser 4).
- **STACK.md Violation Prevention:**
  - *Forbidden:* `dom-sprites` (no HTML `<div>` or `<img>` elements for falling fruit).
  - *Forbidden:* `unbatched-image-loads` (no `new Image()` or separate `this.load.image()` calls per fruit).
- **Sprite Frames Required in Texture Atlas:**
  1. **Fruits (12 Distinct Types):**
     - Apple, orange, grape, banana, watermelon, blueberry, strawberry, lemon, kiwi, peach, plum, cherry.
     - Each fruit must have high-contrast, recognizable silhouettes and vibrant colors.
     - Hitbox diameter >= 48px for finger touch.
  2. **Catcher / Basket / Tray (Optional / Thematic):**
     - Visual catcher or basket at the bottom of the screen (or touch targets on fruit).
  3. **UI Elements:**
     - Pause button icon (top-left).
     - Sound/Mute toggle button icon.
     - Replay / Restart button icon.
     - Star icons (full star, empty star) for level scoring.
     - Remedial card background / frame.
     - Explanation bubble / ribbon.
  4. **Progress Tree / Orchard Visualization:**
     - Fruit tree growth stages (sprout, sapling, young tree, blooming tree, mature fruit-bearing tree).
     - Orchard grid / map indicators.
  5. **Particle FX:**
     - Sparkle / star sparkle chime particles for correct catch burst.
     - Soft dust / puff particle for miss.

### 6.2 Typography Assets
- **Primary Font:** **Lexend** (specifically designed to reduce visual stress and improve reading speed for developing and dyslexic readers).
- **Font Delivery:** Must be bundled as local font files (`.woff2`) and precached in the service worker, avoiding external Google Fonts network calls to guarantee 100% offline functionality and zero mixed-content warnings.
- **Color Coding:** Phonics patterns (e.g. vowel teams in orange, r-controlled in purple, prefixes in blue, suffixes in green) rendered with high contrast against the fruit body or label background.

### 6.3 Audio Pipeline (Synthesis & Speech)
`SPEC.md` and `ORIGINAL_REQUEST.md` outline child-friendly, non-punitive audio design:
1. **Web Audio API Sound Synthesis:**
   - All tactile sound effects synthesized procedurally via `AudioContext` and `OscillatorNode` / `GainNode`:
     - *Catch Correct:* Ascending arpeggio chime (e.g., C5 -> E5 -> G5 -> C6 triangle wave with smooth release).
     - *Catch Wrong:* Gentle descending tone (e.g., G4 -> E4 soft lowpass filtered sine wave; gentle, not harsh or buzzing).
     - *Missed Fruit:* Soft subtle whoosh (filtered white noise envelope).
     - *Level Complete:* Celebratory round jingle (upbeat major triad flourish).
   - *Advantage:* Zero audio file size overhead, zero 404 risks, immediate response, perfectly offline.
2. **Audio Unlocking:**
   - Must include an audio unlock handler on the first user interaction (`pointerdown` or `touchstart`) to resume suspended `AudioContext` per mobile browser autoplay policies.
3. **Spoken Instructions via Web Speech API (TTS):**
   - No reading required to understand the objective.
   - Spoken prompt at the start of each round: e.g. `"Catch words with 'ea' that say the long E sound!"`
   - Spoken feedback on incorrect catch: e.g. `"'bread' has 'ea' but it says /ĕ/, not /ē/ — nope!"`
   - Spoken morphologic explanation: e.g. `"Awesome! You caught 'replay' — 're-' means again!"`
   - Implemented via `window.speechSynthesis` with pitch/rate adjusted for 2nd grade comprehension.

### 6.4 PWA Icon Assets
To pass `validate_pwa.py` with 0 errors and 0 warnings:
1. `icons/icon-192x192.png`: 192x192 PNG, purpose `any`.
2. `icons/icon-512x512.png`: 512x512 PNG, purpose `any`.
3. `icons/maskable-icon-192x192.png`: 192x192 PNG, purpose `maskable`, full-bleed opaque outer 8% margin.
4. `icons/maskable-icon-512x512.png`: 512x512 PNG, purpose `maskable`, full-bleed opaque outer 8% margin.
5. `screenshots/gameplay-portrait.png`: 1080x2400 (or equivalent portrait aspect ratio) screenshot for manifest preview.

---

## 7. Local Storage & State Persistence Specification

### 7.1 Architecture: IndexedDB Local-Only
- **Library:** `idb-keyval` or `Dexie` (as permitted by SPEC.md: "IndexedDB via idb-keyval or localForage").
- **Zero Backend / Zero Analytics:** No accounts, no logins, no remote telemetry, no external cookies.

### 7.2 Data Schema to Persist
The persistence layer must store:

```typescript
interface GameProgressState {
  // Unlocked & completed levels per topic
  unlockedLevels: Record<string, number>; // e.g. { topicA: 3, topicB: 1, topicC: 1 }
  completedLevels: string[];             // e.g. ['topicA_lvl1', 'topicA_lvl2']

  // Level star ratings (1, 2, or 3 stars)
  levelStars: Record<string, number>;    // e.g. { 'topicA_lvl1': 3, 'topicA_lvl2': 2 }
  levelHighScores: Record<string, number>;

  // Spaced repetition & error analytics
  patternErrorRates: Record<string, {
    attempts: number;
    errors: number;
    lastPracticed: number;
  }>;
  troubledWords: Record<string, number>; // Words missed/wrong-caught >= 2 times

  // Orchard visualization state
  orchardGrowthStage: number;            // Total fruits grown on the tree

  // User preferences
  settings: {
    audioMuted: boolean;
    speechRate: number;
    dyslexiaFont: boolean;
    highContrast: boolean;
  };
}
```

### 7.3 Mastery & Progression Rules
- **Advancement Threshold:** Level completion requires **>85% accuracy across at least 10 attempts**.
- **Star Allocation:**
  - 3 Stars: 100% accuracy (perfect round).
  - 2 Stars: >= 80% accuracy.
  - 1 Star: Level completed (>85% required to unlock next).
- **Spaced Repetition Integration:** Patterns with error rate > 30% are injected into the 20% "surprise review" slots in subsequent levels.
- **Frustration Dampener:** 3 consecutive wrong catches immediately triggers a temporary fall speed reduction (e.g. 50% slower) and displays a remedial teaching card before resuming.

---

## 8. `validate_pwa.py` Verification Gate: Complete Trace of Rules

The following table details every single check performed by `validate_pwa.py`, its severity, cause, and exact mitigation:

| # | Check Location | Condition / Regex | Severity | Error / Warning Message | Required Mitigation |
|---|---|---|---|---|---|
| 1 | Invocation | `len(sys.argv) < 2` or `not os.path.isdir(d)` | Exit 2 | `Usage: validate_pwa.py <pwa_build_dir>` | Pass valid build output directory path. |
| 2 | Manifest | `not os.path.exists("manifest.json")` | ERROR | `manifest.json missing` | Output file must be named `manifest.json` in build root. |
| 3 | Manifest | `json.load()` fails | ERROR | `manifest.json not valid JSON: {e}` | Ensure valid JSON syntax without trailing commas. |
| 4 | HTML | `not os.path.exists("index.html")` | ERROR | `index.html missing` | Ensure `index.html` is generated in build root. |
| 5 | Service Worker | `not os.path.exists("sw.js")` | ERROR | `sw.js missing` | Output service worker must be named `sw.js` in build root. |
| 6 | Manifest Keys | Missing `name`, `short_name`, `start_url`, `scope`, `display`, `background_color`, `theme_color` | ERROR | `manifest missing required key: {key}` | Include all 7 mandatory keys in `manifest.json`. |
| 7 | Manifest Display | `display in ("browser", None)` | ERROR | `manifest display must be standalone/fullscreen, got: {m.get('display')}` | Set `"display": "standalone"`. |
| 8 | Manifest Display Override | `"display_override" not in m` | WARNING | `manifest lacks display_override (recommended for modern Android)` | Set `"display_override": ["standalone"]`. |
| 9 | Manifest Display Override | `"window-controls-overlay" in display_override` | ERROR | `display_override contains 'window-controls-overlay' - strip it for Android` | Omit `"window-controls-overlay"`. |
| 10 | Manifest Apps | `prefer_related_applications is True` | ERROR | `manifest prefer_related_applications must be false` | Set `"prefer_related_applications": false`. |
| 11 | Manifest Icons | `not m.get("icons")` | ERROR | `manifest has no icons` | Define `icons` array in `manifest.json`. |
| 12 | Icon Sizes (Any 192) | No icon with `"192"` in `sizes` and `not is_mask` | ERROR | `no 192px 'any' icon` | Add 192px icon with `"purpose": "any"`. |
| 13 | Icon Sizes (Any 512) | No icon with `"512"` in `sizes` and `not is_mask` | ERROR | `no 512px 'any' icon` | Add 512px icon with `"purpose": "any"`. |
| 14 | Icon Sizes (Mask 192) | No icon with `"192"` in `sizes` and `is_mask` | ERROR | `NO 192px MASKABLE icon -> WebAPK minting falls back to legacy install` | Add separate 192px icon entry with `"purpose": "maskable"`. |
| 15 | Icon Sizes (Mask 512) | No icon with `"512"` in `sizes` and `is_mask` | ERROR | `NO 512px MASKABLE icon -> WebAPK minting falls back to legacy install` | Add separate 512px icon entry with `"purpose": "maskable"`. |
| 16 | Icon Type (SVG Mask) | SVG icon declared with `purpose: "maskable"` | ERROR | `SVG icon {src} declared purpose '{pur}' — SVG must be purpose:'any' only` | Maskable icons must be PNG only. |
| 17 | Icon Disk Existence | `os.path.exists(local)` fails for any icon `src` | ERROR | `manifest icon src does not exist on disk: {src}` | Build output must contain all icon files at referenced paths. |
| 18 | Maskable Full-Bleed | Outer 8% ring has pixels with alpha < 10 | ERROR | `maskable icon {src} has a TRANSPARENT outer ring (...) - must be full-bleed` | Render maskable PNGs with 100% opaque solid background edges. |
| 19 | Forbidden Members | `protocol_handlers`, `handle_links`, `edge_side_panel`, `launch_handler` | ERROR | `manifest contains '{risky}' - strip it` | Exclude all experimental desktop members from manifest. |
| 20 | Screenshots | `not m.get("screenshots")` | WARNING | `manifest has no screenshots (recommended for install prompt)` | Include `screenshots` array with at least 1 portrait screenshot. |
| 21 | HTML Security | `"http://"` in `index.html` | ERROR | `index.html contains insecure http:// reference (mixed content)` | Ensure all URLs are relative or `https://`. |
| 22 | HTML Manifest | `'rel="manifest"' not in html` | ERROR | `index.html missing <link rel=manifest>` | Add `<link rel="manifest" href="./manifest.json">`. |
| 23 | HTML Viewport | `'name="viewport"' not in html` | ERROR | `index.html missing viewport meta` | Add `<meta name="viewport" content="...">`. |
| 24 | HTML Viewport Fit | `"viewport-fit=cover" not in html` | WARNING | `viewport meta lacks viewport-fit=cover` | Include `viewport-fit=cover` inside viewport meta content. |
| 25 | HTML Theme Color | `'name="theme-color"' not in html` | WARNING | `index.html missing theme-color meta` | Add `<meta name="theme-color" content="#3B82F6">`. |
| 26 | HTML SW Registration | `"serviceWorker.register" not in html` | ERROR | `index.html does not register a service worker` | Include service worker registration snippet in `index.html`. |
| 27 | SW Syntax | `node --check sw.js` returncode != 0 | ERROR | `sw.js fails syntax check: {stderr}` | Ensure `sw.js` is valid, runnable JavaScript without syntax errors. |
| 28 | SW Caching API | `re.search(r"cache\.addAll\(", sw)` matches | ERROR | `sw.js uses cache.addAll() - a single 404 aborts install` | Cache items individually using `.add().catch()` inside `Promise.allSettled`. |
| 29 | SW Precache Audit | String matching asset regex not found on disk | ERROR | `sw.js precaches non-existent local asset: {ref} (-> {local})` | Every quoted `.js`, `.css`, `.png`, etc. path in `sw.js` must exist on disk. |
| 30 | Live Base URL Probe | Icon HTTP status != 200 during `--base-url` | ERROR | `live icon not 200: {url} ({r.status})` | Ensure deployment preserves icon paths and returns HTTP 200. |

---

## 9. Specification Mining Tables

### 9.1 Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Manifest | Standalone Display Configuration | Sets app to standalone mobile app display | `display: "standalone"`, `display_override: ["standalone"]` | Window chrome hidden; Android system UI styled | If missing `display_override`, validator warns; if `display: browser`, validator errors | `validate_pwa.py:89-96`, `SPEC.md:250` |
| 2 | Manifest | Maskable Icon Dual Resolutions | Dual 192x192 and 512x512 adaptive icons | `icons` array with `purpose: "maskable"`, `sizes: "192x192"` & `"512x512"` | WebAPK adaptive icon generation | Missing either triggers validator ERROR & legacy install fallback | `validate_pwa.py:127-132`, `ORIGINAL_REQUEST.md:37` |
| 3 | Manifest | Maskable Full-Bleed 8% Margin | Opaque background fill on outer 8% margin of icon | RGBA PNG pixels with alpha >= 10 in outer ring | Clean adaptive icon rendering without border clipping | Any alpha < 10 triggers validator ERROR | `validate_pwa.py:140-162` |
| 4 | Manifest | Strict Purpose Separation | Manifest icons must declare `"any"` and `"maskable"` in separate objects | Manifest JSON icon entries | Proper matching in `has["any..."]` and `has["mask..."]` | Combined `"any maskable"` fails `not is_mask` check, causing validator ERROR | `validate_pwa.py:115-122` |
| 5 | Manifest | Strip Desktop/Experimental Members | Manifest omits desktop keys | Clean manifest without `protocol_handlers`, `handle_links`, `edge_side_panel`, `launch_handler` | Clean WebAPK compilation | If present, triggers validator ERROR | `validate_pwa.py:164-168` |
| 6 | Manifest | Manifest Screenshots Specification | Provides visual preview for install UI | `screenshots` array with narrow aspect ratio PNGs | Rich PWA install dialog | If omitted, triggers validator WARNING | `validate_pwa.py:173-174` |
| 7 | HTML Shell | Cover Viewport Meta | Viewport meta with `viewport-fit=cover` | `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` | Full screen utilization across notch/pinhole cameras | Missing `viewport-fit=cover` triggers validator WARNING | `validate_pwa.py:186-187` |
| 8 | HTML Shell | Theme Color Meta | Meta tag matching manifest `theme_color` | `<meta name="theme-color" content="#3B82F6">` | Colored Android status bar | Missing tag triggers validator WARNING | `validate_pwa.py:188-189` |
| 9 | HTML Shell | Service Worker Direct Registration | Registration script call in `index.html` | `<script>navigator.serviceWorker.register('./sw.js')</script>` | Service worker lifecycle initialization | Missing `serviceWorker.register` string triggers validator ERROR | `validate_pwa.py:190-191` |
| 10 | HTML Shell | HTTPS / Mixed Content Guard | Disallow any unencrypted HTTP asset calls | All URLs relative or HTTPS | Clean security context | Any `"http://"` string triggers validator ERROR | `validate_pwa.py:180-181` |
| 11 | Service Worker | Fault-Tolerant Asset Precaching | Individual `.add().catch()` precache loop | Array of asset URL strings | All assets cached without single 404 aborting installation | Using `cache.addAll()` triggers validator ERROR | `validate_pwa.py:202-204`, `ORIGINAL_REQUEST.md:36` |
| 12 | Service Worker | Precache Path Disk Integrity | Validates that all quoted asset strings in `sw.js` exist on disk | Quoted strings ending in `.js`, `.css`, `.png`, etc. | Verified static file precache list | Any referenced file missing on disk triggers validator ERROR | `validate_pwa.py:205-213` |
| 13 | Service Worker | Syntax Validation via Node | Ensures `sw.js` is valid JavaScript | `node --check sw.js` | Zero syntax errors | Invalid syntax triggers validator ERROR | `validate_pwa.py:198-201` |
| 14 | Service Worker | Offline Navigation Interception | Serves cached `index.html` on offline navigate | `fetch` event with `mode === 'navigate'` | Uninterrupted offline launch | NetworkError fallback if unhandled | `SPEC.md:268-271` |
| 15 | Graphics | Single Packed Texture Atlas | Batched rendering of all sprites via Phaser | `atlas.png` + `atlas.json` | High performance 60/120fps batched WebGL draw calls | `unbatched-image-loads` or `dom-sprites` forbidden by STACK.md | `STACK.md:19-20`, `SPEC.md:243-246` |
| 16 | Graphics | 48px Minimum Touch Target | Minimum tap hitbox for falling fruit | Pointer down event on fruit bounding box >= 48px | Reliable single-thumb tap catch without missed clicks | Frustration and false misses for 7yo user | `ORIGINAL_REQUEST.md:25`, `SPEC.md:99-100` |
| 17 | Audio | Web Audio API Sound Synthesis | Procedural synthesizer for chimes and jingles | AudioContext oscillator and gain nodes | Immediate, zero-download sound effects | Autoplay block if not unlocked on first touch | `ORIGINAL_REQUEST.md:31-33`, `SPEC.md:215-222` |
| 18 | Audio | Web Speech API TTS Engine | Text-to-speech voice instructions and phonemes | `window.speechSynthesis.speak(utterance)` | Auditory instructions; zero reading required | Fallback to visual cards if TTS unavailable | `ORIGINAL_REQUEST.md:32`, `SPEC.md:97-98` |
| 19 | Audio | Mobile Audio Unlock on Touch | Resumes suspended AudioContext | First `touchstart` or `pointerdown` listener | Fully active audio pipeline | Muted game audio on mobile browsers | `ORIGINAL_REQUEST.md:33` |
| 20 | Storage | IndexedDB Local State Persistence | Saves progress, scores, stars, error rates | Key-value store via `idb-keyval` / `Dexie` | Persistence across browser restarts without network | Storage quota exception if excessive | `ORIGINAL_REQUEST.md:38`, `SPEC.md:85-87` |
| 21 | Game Engine | Fixed-Timestep Physics | Physics delta clamped across display refresh rates | Phaser 4 Arcade Physics fixed timestep | Identical fall speed on 60Hz and 120Hz displays | `raw-raf-loop` runs 2x speed on S24 Ultra (forbidden) | `STACK.md:18`, `ORIGINAL_REQUEST.md:24` |
| 22 | Pedagogy | 3-Mistake Frustration Dampener | Triggers remediation after 3 consecutive wrong catches | Error counter reaching 3 | Game slow-down (50%) and teaching card overlay | Frustration spiral if unhandled | `ORIGINAL_REQUEST.md:21`, `SPEC.md:75-76` |
| 23 | Pedagogy | Morphological Segmentation Overlay | Visual breakdown of affix and base word | Catching correct prefix/suffix fruit | Displays `re + play → replay` | Failure to teach PA Core CC.1.1.2.D | `ORIGINAL_REQUEST.md:17`, `SPEC.md:153-156` |
| 24 | Deployment | GitHub Pages Deploy & Live Icon Probe | Verifies live icon URLs resolve over HTTP | `python3 validate_pwa.py <dir> --base-url <url>` | HTTP 200 confirmed for all icons | HTTP 404/non-200 triggers validator ERROR | `validate_pwa.py:215-229`, `ORIGINAL_REQUEST.md:41-43` |

### 9.2 Edge Cases

| # | Feature | Input / Condition | Observed Behavior |
|---|---|---|---|
| 1 | Manifest Icons | Icon specifies `"purpose": "any maskable"` in a single entry | `is_mask` is `True`, so `not is_mask` fails. `has["any192"]` and `has["any512"]` remain `False`. `validate_pwa.py` exits with ERROR `no 192px 'any' icon`. Separate objects required. |
| 2 | Maskable Icon | Maskable PNG with transparent rounded corners or subtle anti-aliased drop shadow on edge | Outer 8% border pixels have alpha < 10. `validate_pwa.py` PIL check triggers ERROR `maskable icon {src} has a TRANSPARENT outer ring`. Icon must be 100% full-bleed. |
| 3 | Service Worker Caching | Developer leaves a commented-out asset reference in `sw.js` (e.g. `// './offline.html'`) | `re.findall` in `validate_pwa.py` matches `./offline.html`. Script checks disk, fails to find file, and raises ERROR `sw.js precaches non-existent local asset`. Zero phantom strings allowed in `sw.js`. |
| 4 | Service Worker Caching | Network flake or single 404 occurs during app install | If `cache.addAll()` were used, install promise rejects completely and Chrome shows "Unsafe app blocked". With `.add().catch()`, non-critical failure is caught and install succeeds. |
| 5 | Display Override | Manifest includes `"window-controls-overlay"` for desktop PWA support | `validate_pwa.py` detects member in list and triggers ERROR `display_override contains 'window-controls-overlay' - strip it for Android`. Must only include `["standalone"]`. |
| 6 | HTML Parsing | `index.html` includes an external protocol reference like `http://fonts.googleapis.com` or `http://example.com` in a comment | `if "http://" in html` check does not strip comments and raises ERROR `index.html contains insecure http:// reference (mixed content)`. Must use `https://` or relative paths everywhere. |
| 7 | Offline Storage | User clears browser cookies or runs in incognito mode | IndexedDB might fail or clear on session end. App must wrap IndexedDB operations in try/catch and fall back gracefully to in-memory state so gameplay continues. |
| 8 | Display Refresh Rate | Game played on Samsung Galaxy S24 Ultra with 120Hz dynamic AMOLED screen | Without fixed timestep, `requestAnimationFrame` fires 120 times per second, causing fruit to fall at double speed. Phaser 4 Arcade Physics fixed delta ensures constant fall rate regardless of Hz. |
| 9 | Audio Unlocking | User launches game without touching screen; audio instruction plays immediately | Mobile browser autoplay policy blocks Web Audio context. Audio stays muted until first touch event. App must display visual prompt ("Tap anywhere to begin!") to unlock audio context. |
| 10 | Live Icon URL Probe | GitHub Pages deployed with subdirectory path (e.g. `/catch-the-fruit/`) and manifest icon src starts with leading slash `/icons/icon-192.png` | Live probe fetches `https://drmmrmik.github.io/icons/icon-192.png` instead of `https://drmmrmik.github.io/catch-the-fruit/icons/icon-192.png`, returning 404. Icon `src` must be relative (`icons/icon-192.png`). |

---

## 10. Actionable Implementation Guidelines for Builder Agents

To guarantee zero warnings and zero errors from `validate_pwa.py` and `bsa verify`:

1. **Build Output Layout:**
   ```
   dist/
   ├── index.html
   ├── manifest.json
   ├── sw.js
   ├── assets/
   │   ├── index-[hash].js
   │   ├── index-[hash].css
   │   ├── atlas.png
   │   └── atlas.json
   ├── data/
   │   ├── phonics.json
   │   ├── morphology.json
   │   └── vocabulary.json
   ├── icons/
   │   ├── icon-192x192.png
   │   ├── icon-512x512.png
   │   ├── maskable-icon-192x192.png
   │   └── maskable-icon-512x512.png
   └── screenshots/
       └── gameplay-portrait.png
   ```

2. **Vite / Build Configuration:**
   - Base URL configured for GitHub Pages relative hosting: `base: './'`.
   - Post-build script or plugin to generate `manifest.json` (exact filename) and `sw.js` (exact filename) in `dist/`.
   - Ensure `sw.js` asset list is dynamically populated from the build bundle or static assets without referencing non-existent files.
   - Use `cache.add(url).catch(...)` inside `Promise.allSettled`, strictly never `cache.addAll`.

3. **Icon Generation Script:**
   - Generate `icon-192x192.png` and `icon-512x512.png` with transparent or styled background.
   - Generate `maskable-icon-192x192.png` and `maskable-icon-512x512.png` with a solid background color (e.g. `#3B82F6`) extending 100% to all 4 edges, with no transparent pixels in the outer 8% margin.

4. **Validation Command:**
   Run `python3 /home/gallabot/Documents/Gemini/PWA-Publisher/validate_pwa.py dist` prior to any git commit or deployment. Must print:
   ```
   --------------------------------------------------
   RESULT: PASS - safe to publish.
   ```
   with **0 errors and 0 warnings**.
