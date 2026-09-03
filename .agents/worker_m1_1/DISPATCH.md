# Dispatch: Worker M1-1 (Scaffolding, PWA Assets, Texture Atlas & BSA Compliance)

## Identity
- Role: Worker
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m1_1
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Mandatory Reading
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md`
3. Explorer Reports:
   - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_1/report.md`
   - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/report.md`
   - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_3/report.md`
   - Also check helper scripts:
     - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/generate_pwa_assets.py`
     - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/proposed_manifest.json`
     - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/proposed_index.html`
     - `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/proposed_sw.js`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Milestone 1 Objectives & Execution Plan
1. **Scaffold Build Configuration**:
   - Create `/home/gallabot/Documents/antigravity/joyful-hertz/package.json` with required dependencies (`phaser`, `zod`, `idb-keyval`) and devDependencies (`vite`, `vitest`, `typescript`, `@vitest/coverage-v8`, `jsdom`).
   - Create `/home/gallabot/Documents/antigravity/joyful-hertz/tsconfig.json` and `/home/gallabot/Documents/antigravity/joyful-hertz/vite.config.ts`.
   - Create `/home/gallabot/Documents/antigravity/joyful-hertz/src/vite-env.d.ts`.
   - Run `npm install` and verify zero vulnerabilities/errors.

2. **Source Code Entrypoint**:
   - Create `/home/gallabot/Documents/antigravity/joyful-hertz/src/main.ts` importing `phaser` and `zod`, initializing basic Phaser Game configuration (fixed-timestep Arcade physics, 480x800 resolution, mobile portrait scale).

3. **Verify BSA Compliance**:
   - Execute `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz`.
   - Confirm it reports `VERDICT: ✓ PASS` (required packages present, forbidden patterns clean).

4. **PWA Manifest, Icons & App Shell**:
   - Create and run the Python Pillow icon generator to produce:
     - `public/icons/icon-192x192.png` (purpose: any)
     - `public/icons/icon-512x512.png` (purpose: any)
     - `public/icons/maskable-192x192.png` (purpose: maskable, 100% full-bleed opaque outer margin)
     - `public/icons/maskable-512x512.png` (purpose: maskable, 100% full-bleed opaque outer margin)
     - `public/screenshots/mobile-1.png` (narrow portrait screenshot)
   - Deploy `public/manifest.json` with standalone mode, screenshots, and separate icon purposes.
   - Deploy `index.html` with viewport-fit=cover, theme-color, manifest link, SW registration, and zero "http://" strings.
   - Deploy `public/sw.js` with individual `.add().catch()` caching (strictly no `cache.addAll()`).

5. **Texture Atlas & Fonts**:
   - Implement and execute the procedural sprite generation and atlas packing script (from Explorer M1-3) to produce:
     - `public/assets/atlas.png`
     - `public/assets/atlas.json`
     - Covering 29 sprites (12 fruit types, basket, UI buttons, stars, orchard stages, sparkles).
   - Ensure local Lexend font is provided in `public/fonts/` (or font-face CSS defined).

6. **Build & Validation Gate**:
   - Run `npm run build` to generate `dist/`.
   - Run `python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist`.
   - Verify it achieves `RESULT: PASS - safe to publish` with 0 errors and 0 warnings.
   - Run `npm test` on infrastructure unit test.

7. **Handoff**:
   - Write `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m1_1/handoff.md` with complete command outputs, verification logs, and summary of created files.
   - Send completion message to parent orchestrator.

## 2026-09-02T21:30:41Z
You are Worker M1-1 for "Catch the Fruit" (Milestone 1: Scaffolding, PWA Assets, Texture Atlas & BSA Compliance).
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m1_1
Your task assignment is in: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m1_1/DISPATCH.md

MANDATORY: You must read /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md before starting work.
Also read /home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md and the three explorer reports in /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_1/report.md, /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_2/report.md, and /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m1_3/report.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the full Milestone 1 plan:
1. Scaffold package.json, tsconfig.json, vite.config.ts, src/vite-env.d.ts.
2. Run npm install.
3. Create src/main.ts importing phaser and zod.
4. Verify bsa verify passes with VERDICT: PASS.
5. Generate full-bleed icons, manifest.json, index.html, sw.js.
6. Generate 29-sprite texture atlas (public/assets/atlas.png + atlas.json) and Lexend font assets.
7. Run npm run build and python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist (must pass with 0 errors, 0 warnings).
8. Run npm test.
9. Write complete handoff.md with commands and test output, and send message to parent when done.
