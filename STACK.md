# STACK.md — Stack Decision Record
archetype: 2d-game-arcade
modifiers: [pixel-art-character-pipeline]
decided: 2026-09-05
kb_version: 2026-09-02
decided_by: task_router

## Required (build MUST use these)
- phaser — engine
- zod — data-validation
- pillow — raster-processing
- numpy — array-processing
- pyyaml — spec-parsing
- free-tex-packer-core — atlas-packer

## Optional
- kaplay — engine [alternative]
- pixi.js — renderer [alternative]
- @pixi/ui — ui-widgets [optional]
- sharp — indexed-png-export [optional]

## Forbidden (build MUST NOT do these)
- raw-raf-loop
- dom-sprites
- unbatched-image-loads
- hardcoded-curriculum-logic
- naive-frame-interpolation
- unconstrained-per-frame-generation
- autocenter-on-animation-sequence
- upscale-ai-raster
- unpalette-color-drift

## Reference Tooling / Content (use these, do not re-implement)
- ~/Documents/pixel-art-pipeline/ — art-asset-toolchain: Existing, working toolchain — do NOT re-implement. Author the asset spec at specs/<game>/<asset>.yaml (copy specs/_example.yaml), compile it with `python3 generate_prompt.py specs/<game>/<asset>.yaml` to get a paste-ready Claude Desktop prompt, then run the raster through remove-background.py -> quantize.py -> downsample.py --anim-lock -> atlas-prep.py. See its README.md.

## Waivers
- unconstrained-per-frame-generation: 2026-09-06: Documentation citation in .agents/explorer_r3_1/handoff.md documenting the detector regex; no production or script code violates this rule.

