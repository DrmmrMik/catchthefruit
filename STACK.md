# STACK.md — Stack Decision Record
archetype: 2d-game-arcade
modifiers: []
decided: 2026-09-02
kb_version: 2026-09-02
decided_by: build-brief

## Required (build MUST use these)
- phaser — engine
- zod — data-validation

## Optional
- kaplay — engine [alternative]
- pixi.js — renderer [alternative]
- @pixi/ui — ui-widgets [optional]

## Forbidden (build MUST NOT do these)
- raw-raf-loop
- dom-sprites
- unbatched-image-loads
- hardcoded-curriculum-logic

## Waivers
(none)
