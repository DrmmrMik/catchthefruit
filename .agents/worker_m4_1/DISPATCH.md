## 2026-09-05T15:45:47Z
<USER_REQUEST>
You are Worker M4-1 (teamwork_preview_worker).
Your working directory is: /home/gallabot/Documents/antigravity/joyful-hertz/.agents/worker_m4_1
Your parent is the Project Orchestrator (Conversation ID: 9591c55b-9b3f-4dd3-b935-d2ded5431e5a).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Input Documents (READ FIRST):
1. /home/gallabot/Documents/antigravity/joyful-hertz/.agents/ORIGINAL_REQUEST.md
2. /home/gallabot/Documents/antigravity/joyful-hertz/STACK.md
3. /home/gallabot/Documents/antigravity/joyful-hertz/.agents/orchestrator_1/PROJECT.md
4. /home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md
5. /home/gallabot/Documents/antigravity/joyful-hertz/.agents/reviewer_m3_3/review.md
6. /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_1/handoff.md
7. /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_2/handoff.md
8. /home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_3/handoff.md

## Scope & Concrete Tasks:

### Task 1: Resolve BSA Stack Dependencies & Cold-Start Timeout
1. Satisfy `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz`:
   - `STACK.md` requires `phaser`, `zod`, `pillow`, `numpy`, `pyyaml`, `free-tex-packer-core`.
   - Add `"free-tex-packer-core": "^0.3.4"` to `package.json` devDependencies.
   - Create `requirements.txt` at project root with:
     ```
     pillow>=10.0.0
     numpy>=1.24.0
     pyyaml>=6.0
     ```
   - Verify `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes with 6/6 required packages present.
2. In `tests/ui_adversarial.test.ts:341`, increase the test timeout to `30000` (or `45000`) so cold parallel test runs do not time out. Also in `scripts/adversarial_ui_verify.py`, streamline or remove the redundant nested Vitest run since Vitest already executes `tests/audio.test.ts`.

### Task 2: Implement Milestone 4 Core Gameplay & Pedagogical Engine
1. In `src/scenes/GameScene.ts`:
   - **Fall Speed Scaling**: In `init()` (around lines 89-93), remove the `* 2` multiplier on fall duration. Ensure fall duration scales correctly from 2800ms (level 1) down to 1800ms (boss levels), as specified in SPEC.md.
   - **Touch Target HitArea Centering**: In `spawnFruit()`, when setting container hitArea, do NOT use default `setInteractive()` which offsets bounds to `(0, 0, w, h)`. Use:
     ```typescript
     container.setInteractive(new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight), Phaser.Geom.Rectangle.Contains);
     ```
     Ensure all fruit interactive areas are strictly >= 48px (e.g. 56x56px or 64x64px).
   - **Wave Spawn Timer Race Condition**: Maintain a reference `private waveSpawnTimer?: Phaser.Time.TimerEvent`. In `triggerRemediation()`, cancel and clear `this.waveSpawnTimer`. Assign all delayed wave spawn calls to `this.waveSpawnTimer`.
   - **Morphological Visual Segmentation**: In `triggerRemediation()`, retrieve the raw curriculum item (`curriculumService.getItemById(fruit.question.id)`) and pass `segmentation: rawItem && 'visualSegmentation' in rawItem ? rawItem.visualSegmentation : undefined` to `TeachingCard`. In `handleCorrectCatch()`, if `this.topic === 'morphology'`, display the visual segmentation toast (`✨ ${rawItem.visualSegmentation}`).
   - **Remediation TTS Auto-Vocalization**: Pass `autoSpeak: audioService.isTtsEnabled()` to `TeachingCard` so auditory learners hear the teaching card prompt.
   - **Mastery Alignment**: In `finishLevel()`, import `isMasteryAchieved` from `../services/storage.service` and compute `isMastered = isMasteryAchieved(accuracy, this.totalAttempts) || result.unlockedNextLevel`.
   - **HUD Star Synchronization**: In `create()`, read stars from storage and call `this.hud.updateStars(...)`.
   - **Basket Controls**: Add bottom canvas tap/drag listener and keyboard arrow/A-D listeners to position the catcher basket.
   - **Pause Overlay**: In `togglePause()`, ensure the pause backdrop is interactive and cleanly destroyed on toggle.
2. In `src/ui/HUD.ts`:
   - In `this.bannerContainer.on('pointerdown')`, call `this.audio.playClick()` and `this.speakPrompt()`.
3. In `src/scenes/RoundSummaryScene.ts`:
   - Ensure all interactive buttons have heights >= 48px (e.g. 52px).
4. In `src/scenes/MenuScene.ts`:
   - Add `init(data?: { topic?: TopicType })` to remember the selected topic on back navigation.

### Task 3: Comprehensive Gameplay Unit Tests
- Create `tests/gameplay.test.ts` covering:
  - Fixed-timestep physics configuration and delta scaling.
  - Fall duration scaling (2.8s - 1.8s) across levels.
  - Fruit container interactive hitArea geometry (>= 48px, centered).
  - Basket tap-to-move and keyboard movement.
  - Visual morphological segmentation on correct catch.
  - 3-mistake consecutive remediation trigger, `waveSpawnTimer` cancellation, and `storageService.resetConsecutiveMistakes()`.
  - Mastery gate alignment (>85% on 10+ attempts).
  - HUD star updates and banner speech re-prompts.
  - RoundSummaryScene button touch dimensions (>= 48px).

### Task 4: Full Verification
Run all verification commands:
1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz`
5. `python3 /home/gallabot/.hermes/skills/pwa-publish-gate/scripts/validate_pwa.py dist`

## Output Requirements:
1. Update `progress.md` with timestamps.
2. Write `handoff.md` in your working directory with sections: Observation, Logic Chain, Caveats, Conclusion (summary of files modified and verification results), Verification Method.
3. Send a message to parent with your verdict and a summary.
</USER_REQUEST>
