## 2026-09-06T02:10:19Z
You are worker_r3_m2_1 implementing Milestone 2: UI Layout & Visual Defect Remediation.

Working directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_r3_m2_1
Project root: /home/gallabot/Documents/antigravity/joyful-hertz
Authoritative user request: /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md (specifically section ## 2026-09-06T01:46:48Z, Requirement R2 and Acceptance Criteria)
Design system: /home/gallabot/Documents/antigravity/joyful-hertz/DESIGN.md
Product spec: /home/gallabot/Documents/antigravity/joyful-hertz/PRODUCT.md

READ FIRST:
- Complete UI layout & defect specification: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_r3_2/handoff.md
- Engine & test invariants: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_r3_1/handoff.md
- Atlas deliverable: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_r3_m1_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE & EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
- src/scenes/MenuScene.ts
- src/scenes/CastleScene.ts
- src/ui/OrchardView.ts (and any associated UI scenes/components)

KEY DELIVERABLES:
1. Fix Main Menu Header Collision (480px portrait mobile viewport) in src/scenes/MenuScene.ts:
   - Implement the clean 2-tier header architecture specified in spec_miner_r3_2/handoff.md:
     - Tier 1 (Utility controls, y=24-28):
       - Orchard button: x=36, y=26, hitbox >= 48px (setSize(48, 48))
       - Castle button: x=108, y=26, hitbox >= 48px (setSize(72, 48) or similar)
       - Coin Counter badge: x=360, y=26
       - Sound toggle button: x=436, y=26, hitbox >= 48px
     - Tier 2 (Branding, y=72-98):
       - Centered Title text "👑 Princess Penelope 🍎" at x=240, y=76
       - Centered Subtitle text "Catch the Fruit — Grade 2 Reading" at x=240, y=98
     - Header background graphic adjusted to accommodate the 2-tier layout cleanly (height=115-120px) with high-contrast backdrop.
     - ZERO collision or overlap between title text and buttons/coin badge on 480px width!

2. Replace Broken Level Card Placeholder in src/scenes/MenuScene.ts:
   - In locked level card rendering (around line 203):
     - Replace the distorted 52x52 'card-panel' outline box (alpha 0.4) with the authentic 16-bit retro 'lock' icon from the atlas (which worker_r3_m1_1 packed at 48x48px into atlas.png / atlas.json) or a clean shaded silhouette with high contrast.
     - Display locked badge cleanly without distorted modal borders.

3. Fix Sub-48px Touch Target Hitboxes across scenes:
   - In src/scenes/MenuScene.ts: ensure Orchard button and Castle button hitboxes are >= 48px.
   - In src/scenes/CastleScene.ts: inspect all interactive buttons (backBtn, outside/inside view tabs, marketplace button, marketplace modal close button, buy buttons, slot placement buttons) and upgrade any sub-48px hitboxes to strictly >= 48px.

4. Enforce Lexend Typography and WCAG AAA Contrast (>= 7:1):
   - Check all text elements against their backgrounds in MenuScene, CastleScene, OrchardView.
   - Menu header text: ensure contrast >= 7:1 against header background (e.g. use Sky 800/900 #075985 / #0c4a6e or dark stroke/drop-shadow).
   - Locked level label text: ensure contrast >= 7:1 against card background (use Slate 700/800 #334155 / #1e293b instead of muted gray #94a3b8).
   - Ensure all typography strictly uses the bundled Lexend font family.

5. Verify Character Rendering:
   - Confirm princess sprites in MenuScene and CastleScene render cleanly with 1-bit alpha borders and zero foot shadow smudges.

6. Comprehensive Verification:
   - Run `npm test tests/ui.test.ts tests/ui_adversarial.test.ts tests/tier5_scenes_adversarial.test.ts`
   - Run full test suite: `npm test` (must pass 100% across all 20 test files, 499+ tests)
   - Run `npm run typecheck`
   - Run `~/.build-standards/bin/bsa verify .`
   - Document all verification commands and outputs.

Write your final report to /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_r3_m2_1/handoff.md and send a message when complete.
