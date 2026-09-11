## 2026-09-06T01:50:51Z
You are a teamwork_preview_explorer specializing in game engine architecture, regression testing, and build standards.
Working directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_r3_1
Project root: /home/gallabot/Documents/antigravity/joyful-hertz
Authoritative user request: /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md (specifically the update under ## 2026-09-06T01:46:48Z)
Stack spec: /home/gallabot/Documents/antigravity/joyful-hertz/STACK.md

YOUR MISSION:
Map all constraints and regression risks for:
R3. Engine & Educational Integrity:
- Preserve all existing Grade 2 ELA curriculum levels, audio synthesis, offline PWA capabilities, and fixed-timestep physics.
- Maintain full test coverage across all existing Vitest suites (20 test files, 499 tests) and ensure bsa verify passes cleanly against STACK.md.

INVESTIGATE:
1. Run/inspect existing test suites (vitest, typecheck, bsa verify) via your tools.
2. Review tests/ to map which tests check atlas frames, UI layout, curriculum data, audio, physics, PWA manifest, and offline service worker.
3. Map dependencies between visual/UI changes and test assertions.
4. Verify STACK.md constraints: required packages (phaser, zod, pillow, numpy, pyyaml, free-tex-packer-core), forbidden patterns (raw-raf-loop, dom-sprites, unbatched-image-loads, etc.).
5. Output a detailed handoff report to /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_r3_1/handoff.md.
Also send a concise completion message back to parent when done.
