# Dispatch: Worker M3-1 (Audio Synthesis, Remediation Card & Visual UI)

## Identity
- Role: Worker
- Working Directory: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m3_1
- Parent Conversation ID: 92b3a02b-34bd-4ca2-87de-d5628068b2a5

## Mandatory Reading
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md`
3. `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`
4. `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Milestone 3 Objectives
1. **Audio Synthesis & Speech Service (`src/services/audio.service.ts`)**:
   - Web Audio API procedural sound generator:
     - `playCatch(isBonus?: boolean)`: Melodic ascending chime (sine/triangle wave, gentle envelope).
     - `playMiss()`: Soft low descending tone (never harsh or punishing).
     - `playLevelComplete()`: Upbeat harmonic victory jingle.
     - `playCombo(comboCount: number)`: Frequency-scaled cheerful chime.
     - `playClick()`: Short tactile UI click.
   - First-touch unlock listener (`unlock()`): Unlocks `AudioContext` on user touch/click per mobile Safari/Chrome policy.
   - Web Speech API TTS integration (`speakPrompt(text: string)`):
     - Uses `window.speechSynthesis` with speech rate suitable for 2nd grade (0.9x).
     - Offline / unavailable fallback: Gracefully handles missing voices without throwing or hanging.
   - Volume controls and mute toggles that respect `StorageService` user settings.

2. **Remediation UI & Teaching Card (`src/ui/TeachingCard.ts`)**:
   - Triggered when player makes 3 consecutive errors (`shouldTriggerRemediation: true` from `StorageService`).
   - Modal dialog that:
     - Temporarily dampens/pauses gameplay.
     - Displays large, high-readability Lexend text with color-coded phonetic patterns (e.g. highlights vowel team "ea" or prefix "re-").
     - Shows visual segmentation (`re + play → replay`) or phonics rule explanation (e.g. "ea has two sounds! Here it sounds like /ē/ in beach.").
     - Speaks the explanation via TTS.
     - Has a large, finger-friendly button (>= 48px touch target) to resume gameplay.
     - Resets consecutive mistakes on dismissal via `StorageService.resetConsecutiveMistakes()`.

3. **HUD & Orchard Visualization Components**:
   - `src/ui/HUD.ts`:
     - Top prompt banner displaying current target (e.g. "Catch: beach (/ē/ sound)", "Catch: re + play").
     - Score counter, combo counter, 3 star badges (using `atlas.png` star frames).
     - Pause button (64x64px), sound toggle button.
     - Accessible color contrast conforming to WCAG AAA.
   - `src/ui/OrchardView.ts`:
     - Orchard tree visualizer displaying tree growth stages (1-5 fruit on tree from `tree_stage_1` to `tree_stage_5` in `atlas.png`).
     - Level unlock cards with star ratings (1 to 3 stars) retrieved from `StorageService`.

4. **Automated Unit Tests**:
   - `tests/audio.test.ts`:
     - Test Web Audio synthesized node creation, frequency calculations, volume scaling, and mute toggle.
     - Test Web Speech API speech call, rate configuration, and headless fallback.
   - `tests/ui.test.ts`:
     - Test TeachingCard instantiation, consecutive mistake remediation trigger, explanation rendering, and reset callback.
     - Test HUD layout, star rating display, and prompt updating.
     - Test OrchardView tree stage calculation based on unlocked/completed levels.

5. **Build & Quality Gates**:
   - `npm run typecheck` passes with 0 errors.
   - `npm test` passes 100% of tests.
   - `npm run build` succeeds.
   - `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes with `VERDICT: ✓ PASS`.
   - `python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist` passes with 0 errors, 0 warnings.

6. **Handoff**
## 2026-09-03T04:44:39Z
You are Worker M3-1 for "Catch the Fruit" (Milestone 3: Audio Synthesis, Remediation Card & Visual UI).
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m3_1
Your task assignment is in: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m3_1/DISPATCH.md

MANDATORY: You must read /home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md before starting work.
Also read /home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md, SPEC.md, and STACK.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute Milestone 3 deliverables:
1. Implement src/services/audio.service.ts (procedural Web Audio API sound generator for catch, miss, victory, combo, click; Web Speech API TTS manager with mobile first-touch unlock and offline fallback).
2. Implement src/ui/TeachingCard.ts (3-mistake consecutive remediation modal with large Lexend text, visual segmentation / phonics explanation, spoken explanation, and >= 48px resume button).
3. Implement src/ui/HUD.ts and src/ui/OrchardView.ts (tree stages from atlas, star badges, prompt banner, pause/mute controls).
4. Implement tests/audio.test.ts and tests/ui.test.ts.
5. Verify npm run typecheck, npm test, npm run build, bsa verify, and validate_pwa.py dist pass with 0 errors and 0 warnings.
6. Write handoff.md with complete verification logs and send completion message when done.
