## 2026-09-06T01:57:00Z
Implement Milestone 1: 16-Bit Retro Pixel Art Pipeline & Atlas Packing.
Working directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_r3_m1_1
Project root: /home/gallabot/Documents/antigravity/joyful-hertz
Authoritative user request: /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md (specifically section ## 2026-09-06T01:46:48Z, Requirement R1 and Acceptance Criteria)
Stack spec: /home/gallabot/Documents/antigravity/joyful-hertz/STACK.md

READ FIRST:
- Full specification in /home/gallabot/Documents/antigravity/joyful-hertz/.agents/spec_miner_r3_1/handoff.md
- Engine & test invariants in /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_r3_1/handoff.md
- Toolchain in ~/Documents/pixel-art-pipeline/
- Existing pack script in scripts/pack_ai_atlas.py

SCOPE & EXCLUSIVE WRITE OWNERSHIP:
You exclusively own:
- public/assets/atlas.png
- public/assets/atlas.json
- scripts/pack_ai_atlas.py
- src/scenes/PreloadScene.ts
- ~/Documents/pixel-art-pipeline/palette.json
- Removal of public/assets/background.jpg, public/assets/castle_exterior.jpg, public/assets/castle_interior.jpg

KEY DELIVERABLES:
1. Populate locked 16-color palette in ~/Documents/pixel-art-pipeline/palette.json (and scripts/pack_ai_atlas.py) matching DESIGN.md and spec_miner_r3_1 report.
2. Re-process/generate all sprites through the pixel art pipeline:
   - Character keyframes (princess-idle-1, princess-idle-2, princess-catch, princess-think): use --anim-lock logic (single union envelope, uniform scale, ground-plane locked). Eliminate character foot matte/cutout residue with clean 1-bit alpha borders (hard threshold alpha >= 128, sole clamp).
   - 12 fruits (apple, orange, grape, banana, watermelon, blueberry, strawberry, lemon, kiwi, peach, plum, cherry): strictly 80x80px with centered hitboxes >= 48px.
   - Basket (basket and basket-royal): strictly 128x64px.
   - Tree stages (tree-stage-1 to tree-stage-5): strictly 128x128px with ground plane anchor.
   - UI frames: btn-pause, btn-sound, btn-sound-off, btn-replay, btn-home, star-full, star-empty, crown-star-full, crown-star-empty, check-mark, x-mark, sparkle, petal, firefly, coin-gold, and all 13 castle decoration icons.
   - Retain 'card-panel' frame so tests/atlas.test.ts passes.
   - Add new 16-bit retro 'lock' icon (48x48px) for locked level cards.
   - 16-bit retro arcade backdrops: generate/process retro pixel art backdrops for 'background', 'castle-exterior', 'castle-interior' adhering to 16-color locked palette and pack into atlas.png + atlas.json.
3. Power-of-two texture atlas:
   - Pack everything into public/assets/atlas.png (1024x1024 or 1024x2048) and public/assets/atlas.json using extrusion padding with 0 overlaps.
4. Eliminate unbatched image requests in src/scenes/PreloadScene.ts:
   - Remove `this.load.image('background', ...);`, `this.load.image('castle-exterior', ...);`, `this.load.image('castle-interior', ...);`.
   - In `PreloadScene.create()`, instantiate standalone textures in Phaser's TextureManager for 'background', 'castle-exterior', and 'castle-interior' using the atlas frames (e.g. via canvas/texture cloning so that `this.add.image(..., 'background')` and `setTexture('castle-exterior')` continue to work with 0 HTTP requests).
   - Remove public/assets/background.jpg, public/assets/castle_exterior.jpg, public/assets/castle_interior.jpg.
5. Also, please initialize the state files for orchestrator_3 if they do not exist:
   - Create .agents/orchestrator_3/BRIEFING.md and .agents/orchestrator_3/progress.md with current milestone status.
6. Verify your implementation:
   - Run `npm test tests/atlas.test.ts tests/adversarial.test.ts tests/marketplace.test.ts tests/infrastructure.test.ts`
   - Run `npm run typecheck`
   - Run `~/.build-standards/bin/bsa verify .`
   - Document all verification commands and outputs in your report.
