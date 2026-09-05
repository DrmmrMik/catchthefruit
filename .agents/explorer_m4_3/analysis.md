# Milestone 4 Investigation: Scene Lifecycle, UI Synchronization, Audio Wiring, and Testing Coverage

**Agent**: Explorer M4-3 (`teamwork_preview_explorer`)  
**Target Milestone**: Milestone 4 (Phaser 2D Arcade Gameplay Engine)  
**Date**: 2026-09-05  
**Working Directory**: `/home/gallabot/Documents/antigravity/joyful-hertz/.agents/explorer_m4_3`  

---

## 1. Executive Summary

This report delivers an exhaustive investigation into the Phaser 4 scene architecture, UI component synchronization, procedural audio and TTS wiring, progression mechanics, and test coverage across the **Catch the Fruit** codebase (`joyful-hertz`).

### Key Findings at a Glance:
1. **Scene Registration & Layout**: All 6 scenes (`PreloadScene`, `MenuScene`, `GameScene`, `RoundSummaryScene`, `OrchardScene`, `CastleScene`) are properly declared in `src/main.ts` with fixed-timestep physics (`fixedStep: true`, 60 FPS) and portrait resolution (`480x800`).
2. **Audio Wiring Gaps**:
   - `HUD.ts` defines `speakPrompt()`, but its prompt banner click listener (lines 169–179) only triggers `audioService.playClick()` and a tween; it **never calls `this.speakPrompt()`**.
   - Neither `GameScene.ts` nor `LevelIntroModal.ts` invokes `audioService.speakPrompt()` to vocalize target instructions for 2nd grade auditory learners, violating SPEC.md R3/accessibility requirements.
3. **HUD Star Rating Synchronization Missing**: `HUD.ts` renders 3 star badges and exposes `updateStars(starsCount)`, but `GameScene.ts` **never calls `this.hud.updateStars()`**, leaving all 3 stars permanently empty (`star-empty`) during gameplay.
4. **Asynchronous Remediation Race Condition in `GameScene.ts`**: In `catchFruit()`, `this.handleIncorrectCatch(fruit)` is called without `await`. If persistent storage (`StorageService.recordMistake`) takes longer than the 250ms fade tween, `this.isRemediating` is still `false` when the tween completes, causing `spawnNextQuestionWave()` to fire concurrently beneath the emerging `TeachingCard` modal.
5. **Touch Target Size Non-Compliance**: In `RoundSummaryScene.ts`, navigation buttons are sized at `280x46px` (line 187), which falls below the mandatory `48px` minimum touch hitbox requirement (SPEC.md R2).
6. **Navigation & Topic Memory Loss**: `MenuScene.ts` lacks an `init(data?: { topic?: TopicType })` method. When returning from `OrchardScene`, `CastleScene`, or `RoundSummaryScene`, the active topic resets to `'phonics'`.
7. **Test Coverage Deficit**: `tests/scenes.test.ts` contains only 7 basic configuration tests. Scene transitions, parameter passing, back navigation, pause handling, HUD updates, audio triggers, and remediation UI are completely unverified in the scene test suite.

---

## 2. Detailed Scene Architecture & Lifecycle Analysis

### 2.1 PreloadScene (`src/scenes/PreloadScene.ts`)
- **Key**: `'PreloadScene'`
- **Lifecycle**:
  - `preload()`: Sets `#e0f2fe` background, renders loading progress bar (`this.load.on('progress')`), displays title "👑 Princess Penelope 🍎", and loads:
    - Atlas: `assets/atlas.png` + `assets/atlas.json`
    - Images: `assets/background.jpg`, `assets/castle_exterior.jpg`, `assets/castle_interior.jpg`
  - `create()`:
    - Registers idle animation `princess-idle` with frames `princess-idle-1` and `princess-idle-2` at 2 FPS.
    - Renders pulsing prompt text "👉 Tap to Play 👈".
    - Attaches 4 independent user gesture listeners to satisfy browser autoplay policies:
      1. Full-screen transparent hit zone (`this.add.zone(width/2, height/2, width, height)`)
      2. Direct tap on prompt text
      3. Scene-level pointerdown: `this.input.on('pointerdown', startGame)`
      4. Keyboard accessibility: `keydown-SPACE` and `keydown-ENTER`
    - Upon first gesture: triggers non-blocking `audioService.unlock()`, plays click sound (`audioService.playClick()`), and transitions: `this.scene.start('MenuScene')`.
- **Verdict**: Robust, reliable first-gesture audio unlock pattern compliant with Web Audio specifications.

---

### 2.2 MenuScene (`src/scenes/MenuScene.ts`)
- **Key**: `'MenuScene'`
- **State**:
  - `selectedTopic: TopicType = 'phonics'`
  - `levelButtonsContainer: Phaser.GameObjects.Container`
  - `soundButton: Phaser.GameObjects.Image`
- **Header & Navigation**:
  - Sound button at `(width - 40, 40)`: 48x48px touch target. Toggles `audioService.setMuted()`, updates frame between `'btn-sound'` and `'btn-sound-off'`.
  - Orchard button at `(36, 40)`: 44x44px. Calls `audioService.playClick()`, starts `'OrchardScene'` with `{ returnTo: 'MenuScene' }`.
  - Castle button at `(96, 40)`: 68x32px. Calls `audioService.playClick()`, starts `'CastleScene'` with `{ returnTo: 'MenuScene' }`.
  - Coin badge at `(width - 110, 40)`: Displays balance from `storageService.getCoins()`.
- **Topic Selection**:
  - 4 pills: `phonics`, `morphology`, `vocabulary`, `math`.
  - Tab width: `(width - 40) / 4` (~110px), height: `48px`.
  - On tap: sets `this.selectedTopic = topic.key`, plays click sound, and executes `this.scene.restart()`.
- **Level List Rendering (`renderLevelButtons`)**:
  - Queries `curriculumService.getLevelsForTopic(this.selectedTopic)`.
  - Reads `storageService.getProgress()`.
  - Renders 5 cards (400x90px, touch target well over 48px).
  - Unlocked levels show 3 star badges (`crown-star-full` / `crown-star-empty`), a "PLAY ▶" badge, and watermelon/apple icons. On tap: starts `GameScene` with `{ topic: this.selectedTopic, levelNumber: level.levelNumber }`.
  - Locked levels show grayed-out card and "🔒 Locked" label with interaction disabled.
- **Architectural Gaps**:
  - **Missing `init()` handler**: `MenuScene` has no `init(data?: { topic?: TopicType })`. If another scene navigates to `MenuScene` with a topic (e.g. after completing a Morphology level in `RoundSummaryScene`), `selectedTopic` remains defaulted to `'phonics'`.

---

### 2.3 GameScene (`src/scenes/GameScene.ts`)
- **Key**: `'GameScene'`
- **State & Counters**:
  - `topic: TopicType`, `levelNumber: number`
  - `score: number`, `combo: number`, `totalAttempts: number`, `correctAttempts: number`
  - `isPaused: boolean`, `isRemediating: boolean`, `fallDurationMs: number`, `roundCoinsEarned: number`
  - `activeFruits: ActiveFruit[]`, `questions: CurriculumItem[]`, `currentQuestionIndex: number`
- **Initialization & Boot**:
  - `init(data: GameSceneData)`: Reads `data.topic` and `data.levelNumber`. Resets all round counters to 0.
  - `create()`:
    - Sets `this.physics.world.fixedStep = true`.
    - Spawns drifting atmospheric cherry blossom petals and fireflies (`createCozyAtmosphere`).
    - Generates question set: `curriculumService.generateQuestionSet(this.topic, this.levelNumber, 12)`.
    - Retrieves level config; computes fall speed: `this.fallDurationMs = (levelConfig?.fallSpeedDurationMs ?? 2600) * 2`.
    - Instantiates `HUD` at depth 500.
    - Creates Princess Penelope sprite (`princess-idle`) at `(width / 2, height - 72)`.
    - Creates draggable Royal Basket (`atlas/basket`, 96x56px) at `(width / 2, height - 45)` with horizontal clamping `[55, width - 55]`.
    - Spawns `LevelIntroModal` at depth 900 displaying mission title, prompt, and example words. Gameplay waves only begin when user clicks "Let's Play! 🍎" (`onStart: () => this.spawnNextQuestionWave()`).
- **Core Loop & Delta Mechanics (`update`)**:
  - Guards against pause/remediation: `if (this.isPaused || this.isRemediating) return;`
  - Uses delta time: `const deltaSeconds = delta / 1000; fruit.container.y += fruit.speed * deltaSeconds;`. Guarantees uniform fall speed on 60Hz and 120Hz digitizers.
  - Basket collision: `Phaser.Geom.Intersects.RectangleToRectangle(fruitBounds, basketBounds)` -> `this.catchFruit(fruit)`.
  - Grass miss check: `fruit.container.y > height - 60` -> `this.handleMissedFruit(fruit)`.
  - Screen cleanup: `fruit.container.y > height + 50` -> destroys offscreen fruit; when wave clears (`activeFruits.length === 0`), spawns next wave after 400ms delay.
- **Scoring & Audio Triggers**:
  - Correct catch:
    - Points: `100 * min(combo, 5)`.
    - Audio: `audioService.playCatch(this.combo >= 3)`; `audioService.playCombo(this.combo)` if combo > 1.
    - Coins: `+10 base + combo bonus` via `storageService.addCoins()`.
    - Error reset: `storageService.recordCorrect(...)`.
    - Penelope celebration: victory hop + gold sparkle burst (`triggerPrincessCelebration`).
  - Incorrect catch:
    - Combo reset to 0.
    - Audio: `audioService.playMiss()`.
    - Penalty: -25 points (clamped at 0).
    - Camera shake: `this.cameras.main.shake(200, 0.008)`.
    - Animated Red X mark (`atlas/x-mark`).
    - Penelope thought frame: `'princess-think'` for 700ms.
    - Error logging: `await storageService.recordMistake(...)`.
    - Remediation check: if `mistakeResult.shouldTriggerRemediation`, calls `this.triggerRemediation(fruit)`.
- **Level Completion (`finishLevel`)**:
  - Calculates accuracy: `(this.correctAttempts / this.totalAttempts) * 100`.
  - Persists result: `await storageService.saveLevelResult(...)`.
  - Computes bonus coins: +50 base, +100 if mastered, +50 if 3 stars.
  - Audio: `audioService.playLevelComplete()`.
  - Transitions to `RoundSummaryScene` with stats payload.

---

### 2.4 RoundSummaryScene (`src/scenes/RoundSummaryScene.ts`)
- **Key**: `'RoundSummaryScene'`
- **Data Contract (`RoundSummaryData`)**:
  - `topic: TopicType`, `levelNumber: number`, `score: number`, `accuracy: number`, `stars: number`, `isMastered: boolean`, `coinsEarned?: number`
- **Visual Display**:
  - Background `#f0fdf4` with rounded celebration panel (380x580px).
  - Title: "🎉 LEVEL MASTERED! 🎉" (emerald `#059669`) if accuracy >= 85%, else "🍎 ROUND COMPLETE! 🍎" (sky `#0369a1`).
  - Staggered zoom animation for 3 crown star badges (`crown-star-full` / `crown-star-empty`).
  - Princess Penelope sprite celebrating with jumping hop tween if mastered.
  - 3-column stats box: Score, Accuracy %, Coins Earned (+X 🪙).
  - Pedagogical feedback message.
- **Action Buttons**:
  1. Next Level Button: Visible strictly when `isMastered && nextLevelExists`. Starts `GameScene` with `levelNumber + 1`.
  2. Play Again Button: Starts `GameScene` with same `levelNumber`.
  3. Visit Castle & Shop Button: Starts `CastleScene` with `{ returnTo: 'MenuScene' }`.
  4. Visit Orchard Button: Starts `OrchardScene` with `{ returnTo: 'MenuScene' }`.
  5. Back to Main Menu Button: Starts `MenuScene`.
- **Defects Detected**:
  - Button height in `createButton()` is **46px** (`btn.setSize(280, 46); bg.fillRoundedRect(-140, -22, 280, 46, 14)`). Must be updated to `>= 48px` (e.g. 48px or 52px).

---

### 2.5 OrchardScene & OrchardView (`src/scenes/OrchardScene.ts` & `src/ui/OrchardView.ts`)
- **Key**: `'OrchardScene'`
- **Architecture**: Lightweight scene shell embedding `OrchardView`.
- **Tree Growth Visualization**:
  - 5 growth stages mapped from `progress.orchardGrowthStage`:
    - `0` -> Stage 1 (1 fruit)
    - `1-2` -> Stage 2 (2 fruits)
    - `3-4` -> Stage 3 (3 fruits)
    - `5-6` -> Stage 4 (4 fruits)
    - `7+` -> Stage 5 (5 fruits)
  - Frames: `tree-stage-1` through `tree-stage-5` in `atlas.png`.
- **Progression Synchronization**:
  - Initial load calls `refreshFromStorage()`, fetching `progress = await storageService.getProgress()`.
  - Displays unlocked levels with 1–3 star ratings (`star-full` / `star-empty`).
  - Clicking an unlocked card invokes `onSelectLevel(topic, levelNumber)`, which starts `GameScene`.
  - Clicking Home button (64x64px, `atlas/btn-home`) invokes `onHome()`, returning to `MenuScene`.

---

### 2.6 CastleScene (`src/scenes/CastleScene.ts`)
- **Key**: `'CastleScene'`
- **State & Data**:
  - `coins: number`, `inventory: string[]`, `placedDecorations: { outside: Record<string, string>; inside: Record<string, string> }`
  - Two viewpoints: `outside` (`castle-exterior`) and `inside` (`castle-interior`).
- **Placement Slots**:
  - Outside: Banners, Path Lamppost, Courtyard Patio, Rose Gardens (Left/Right).
  - Inside: Crystal Chandelier, Gallery Mirror, Royal Throne, Tea & Books Table, Parlor Seating.
  - Interactive placement mats allow placing owned decorations or swapping/removing them.
- **Royal Marketplace**:
  - Accessible via bottom action button ("🛍️ ROYAL MARKETPLACE", 280x44px).
  - Modal overlay lists items from `data/decorations.json` categorized into Outside Decor and Inside Furniture.
  - Allows purchasing with Princess Coins via `storageService.purchaseItem()`.
  - Audio: Plays `audioService.playCatch(true)` on purchase and decoration placement.
  - Back button in header: Navigates back to `this.returnTo` (default `'MenuScene'`).

---

## 3. Scene Transitions & Parameter Passing Matrix

| Source Scene | Trigger / Action | Destination Scene | Payload Parameters | Audio Triggered |
|---|---|---|---|---|
| **PreloadScene** | User tap/space/enter | `MenuScene` | none | `audioService.unlock()`, `playClick()` |
| **MenuScene** | Click Level Card | `GameScene` | `{ topic: TopicType, levelNumber: number }` | `audioService.playClick()` |
| **MenuScene** | Click Orchard Icon | `OrchardScene` | `{ returnTo: 'MenuScene' }` | `audioService.playClick()` |
| **MenuScene** | Click Castle Shop Icon | `CastleScene` | `{ returnTo: 'MenuScene' }` | `audioService.playClick()` |
| **GameScene** | Round Finished (`finishLevel`) | `RoundSummaryScene` | `{ topic, levelNumber, score, accuracy, stars, isMastered, coinsEarned }` | `audioService.playLevelComplete()` |
| **GameScene** | Pause Overlay -> Quit Button | `MenuScene` | none | `audioService.playClick()` |
| **RoundSummaryScene** | Click "Next Level ▶" | `GameScene` | `{ topic, levelNumber: levelNumber + 1 }` | `audioService.playClick()` |
| **RoundSummaryScene** | Click "Play Again 🔄" | `GameScene` | `{ topic, levelNumber }` | `audioService.playClick()` |
| **RoundSummaryScene** | Click "Visit Orchard 🌳" | `OrchardScene` | `{ returnTo: 'MenuScene' }` | `audioService.playClick()` |
| **RoundSummaryScene** | Click "Visit Castle 🏰" | `CastleScene` | `{ returnTo: 'MenuScene' }` | `audioService.playClick()` |
| **RoundSummaryScene** | Click "◀ Back to Main Menu"| `MenuScene` | none | `audioService.playClick()` |
| **OrchardScene** | Click Level Card | `GameScene` | `{ topic: TopicType, levelNumber: number }` | `audioService.playClick()` |
| **OrchardScene** | Click Home Button | `MenuScene` | none | `audioService.playClick()` |
| **CastleScene** | Click "◀ Back" Header Button | `this.returnTo` (`MenuScene`) | none | `audioService.playClick()` |

### Navigation Gaps Identified:
1. **MenuScene Topic Persistence**: When navigating from `RoundSummaryScene` or `OrchardScene` back to `MenuScene`, passing `{ topic: this.summaryData.topic }` should be supported by adding `init(data?: { topic?: TopicType })` to `MenuScene`.
2. **OrchardScene returnTo Preservation**: `OrchardScene.ts` receives `data.returnTo`, but its `onHome` handler hardcodes `this.scene.start('MenuScene')` instead of `this.scene.start(data.returnTo || 'MenuScene')`.

---

## 4. Audio Wiring & Speech Integration Audit

### 4.1 Web Audio Synthesizer Triggers

| Method | Musical Characteristic | Trigger Locations | Status |
|---|---|---|---|
| `playCatch(isBonus)` | Normal: 2-note ascending chime (E5 -> A5)<br>Bonus: 4-note ascending major arpeggio (C5 -> E5 -> G5 -> C6) | `GameScene.ts:393` (`isBonus = combo >= 3`)<br>`CastleScene.ts:321, 570, 831` | **VERIFIED** |
| `playMiss()` | Low descending sine glide (260Hz -> 175Hz, 260ms) | `GameScene.ts:433` | **VERIFIED** |
| `playCombo(count)` | Pentatonic scale escalation (C5 to E6) | `GameScene.ts:395` (`if combo > 1`) | **VERIFIED** |
| `playLevelComplete()` | 5-note triumphant fanfare with dual octave harmonics | `GameScene.ts:692` | **VERIFIED** |
| `playClick()` | Short 40ms high-to-mid frequency chirp | `PreloadScene:103`, `MenuScene:81,100,158,251,277`<br>`GameScene:191,209`, `RoundSummaryScene:200`<br>`OrchardView:123,198,357`, `CastleScene:103,158,237...`<br>`LevelIntroModal:254`, `TeachingCard:213,271` | **VERIFIED** |

### 4.2 Web Speech API (TTS) Integration & Critical Gaps

- **TTS Engine Implementation (`AudioService.ts:511–567`)**:
  - Uses `SpeechSynthesisUtterance` with `rate = 0.9` (accessible speed for 2nd grade).
  - Uses `normalizePhoneticsForSpeech()` to convert dictionary slashes (`/ē/` -> `"long E"`, `/är/` -> `"ar"`, `re + play → replay` -> `"R E plus play makes replay"`).
  - Syncs text to ARIA live-region `#sr-announcements` for WCAG AAA screen readers.
  - Safe timeout guard (4000ms) to avoid hanging promises.
- **CRITICAL DEFECT #1: `HUD.ts` Banner Click does not call `speakPrompt()`**:
  - In `src/ui/HUD.ts` lines 169–179:
    ```typescript
    this.bannerContainer.setSize(bannerW, bannerH);
    this.bannerContainer.setInteractive({ useHandCursor: true });
    this.bannerContainer.on('pointerdown', () => {
      this.audio.playClick();
      scene.tweens.add({ ... });
      // MISSING: this.speakPrompt();
    });
    ```
  - The docstring for `HUD.ts` specifically states:
    `"- Interactive prompt banner to re-hear spoken instructions via TTS."`
  - Because `this.speakPrompt()` is omitted from the `pointerdown` callback, clicking the prompt banner does not speak the instructions!
- **CRITICAL DEFECT #2: No Spoken Prompt upon Question Wave Spawn**:
  - SPEC.md Section "Core Loop" states:
    `"1. A spoken (or text-overlay) instruction says what to catch this round — e.g. 'Catch words with ee that say the long E sound!'"`
  - In `GameScene.ts:228`:
    `this.hud.updatePrompt(question.prompt, ...);`
    Neither `this.hud.speakPrompt()` nor `audioService.speakPrompt()` is called when a level starts or when questions spawn.

---

## 5. HUD Integration & In-Game UI Synchronization

### 5.1 Elements in `HUD.ts`
1. **Pause Button**: `(42, 40)`, 64x64px (`atlas/btn-pause`, touch target >= 48px). Invokes `config.onPause()` -> `GameScene.togglePause()`.
2. **Sound Button**: `(114, 40)`, 64x64px (`atlas/btn-sound` / `btn-sound-off`). Invokes `this.toggleSound()`.
3. **Star Badges**: 3 badges at `(195, 235, 275, 40)`. Renders `star-full` or `star-empty`.
4. **Score Text**: `(455, 28)`, right-aligned, Lexend 24px bold.
5. **Combo Streak Indicator**: `(455, 52)`, right-aligned. Shows `"<N>x COMBO! 🔥"` when `combo >= 2`.
6. **Prompt Banner**: `(240, 114)`, 450x64px card with white background, Sky 600 border. Displays prompt and subtext.

### 5.2 Critical Defect: Stars in HUD are Never Updated During Gameplay
- In `src/scenes/GameScene.ts:96–103`:
  ```typescript
  this.hud = new HUD(this, {
    score: this.score,
    combo: this.combo,
    stars: 0, // <--- initialized to 0
    prompt: initialQuestion?.prompt ?? 'Catch the Fruit!',
    subtext: 'Tap the fruit or catch with basket',
    onPause: () => this.togglePause()
  });
  ```
- Grepping the codebase reveals that `this.hud.updateStars()` is **never called anywhere in `GameScene.ts`**.
- As a result, even if the player catches 10 consecutive fruits with 100% accuracy, the HUD stars remain permanently empty (`star-empty`) throughout the entire game!
- **Remedy**:
  In `handleCorrectCatch()` and `handleIncorrectCatch()`, compute:
  ```typescript
  const accuracy = (this.correctAttempts / this.totalAttempts) * 100;
  const currentStars = calculateStars(accuracy);
  this.hud.updateStars(currentStars);
  ```

### 5.3 Pause Modal Flaws in `GameScene.ts`
- In `GameScene.togglePause()` lines 164–215:
  1. **Non-interactive Backdrop**:
     ```typescript
     const bg = this.add.rectangle(0, 0, width, height, 0x0f172a, 0.7);
     ```
     `bg.setInteractive()` is NOT called. Because Phaser does not block input on non-interactive display objects, clicks on the dim backdrop outside the card pass through to underlying objects.
  2. **One-Way Toggle**:
     `togglePause()` flips `this.isPaused = !this.isPaused;`. But if `this.isPaused` becomes `false` (e.g. if invoked by keyboard shortcut or programmatic event), there is no `else` block to destroy `pauseOverlay`.
  3. **Remedy**:
     Call `bg.setInteractive();` and retain `private pauseOverlay?: Phaser.GameObjects.Container` so that `togglePause()` can cleanly toggle open and closed.

---

## 6. Remediation Loop & Progression Synchronization

### 6.1 Remediation Loop (`TeachingCard`)
- **Trigger**: In `handleIncorrectCatch()`, `await storageService.recordMistake(...)` returns `mistakeResult`. If `mistakeResult.shouldTriggerRemediation` (i.e. `consecutiveMistakes >= 3`), `this.triggerRemediation(fruit)` is called.
- **Speed Dampening**: Increases `this.fallDurationMs = Math.min(8000, this.fallDurationMs + 800)`.
- **TeachingCard Presentation**:
  - Displays target word, pattern, and pedagogical explanation.
  - Includes "🔊 Hear Rule" button (TTS) and "I Got It! Let's Play" button (240x54px >= 48px).
  - On dismissal: resets `storageService.resetConsecutiveMistakes()`, and calls `this.spawnNextQuestionWave()`.

### 6.2 Critical Defect: Asynchronous Race Condition in `catchFruit`
- Look at `src/scenes/GameScene.ts` lines 341–385:
  ```typescript
  private catchFruit(fruit: ActiveFruit): void {
    if (fruit.isCaught) return;
    fruit.isCaught = true;
    this.totalAttempts++;

    if (fruit.option.isCorrect) {
      this.handleCorrectCatch(fruit);
    } else {
      this.handleIncorrectCatch(fruit); // <--- ASYNC FUNCTION NOT AWAITED!
    }
    ...
    // 250ms Tween to destroy caught fruit:
    this.tweens.add({
      targets: fruit.container,
      duration: 250,
      onComplete: () => {
        fruit.container.destroy();
        this.activeFruits = [];
        if (!this.isRemediating && !this.isPaused) { // <--- RACE CONDITION HERE!
          this.time.delayedCall(500, () => {
            this.spawnNextQuestionWave();
          });
        }
      }
    });
  }
  ```
- **The Bug**:
  `handleIncorrectCatch` is `async` because it executes:
  `const mistakeResult = await storageService.recordMistake(...)`
  `this.isRemediating` is ONLY set to `true` inside `triggerRemediation()`, which is called *after* `recordMistake` finishes.
  If IndexedDB storage takes > 250ms, the fruit's tween `onComplete` fires while `this.isRemediating` is still `false`!
  Consequently, `spawnNextQuestionWave()` is scheduled. Then `recordMistake` finishes and opens `TeachingCard`. Now fruit falls behind or through the modal!
- **Remedy**:
  Either:
  1. Check `storageService.getConsecutiveMistakes() >= 2` synchronously before the async storage call, and set `this.isRemediating = true` immediately, OR
  2. Do not schedule `spawnNextQuestionWave()` in the tween's `onComplete` for incorrect catches; instead, trigger the next wave from within `handleIncorrectCatch()` after storage resolves (if not remediating).

---

## 7. Test Coverage Gap Analysis & Comprehensive Test Recipes

### 7.1 Existing Tests in `tests/scenes.test.ts`
The current `tests/scenes.test.ts` has only 7 tests:
1. `registers all required gameplay scenes in gameConfig`
2. `configures fixed-timestep Arcade Physics to prevent 120Hz desynchronization`
3. `configures mobile-first portrait aspect ratio 480x800 with autoCenter`
4. `instantiates CatchTheFruitGame subclass of Phaser.Game`
5. `verifies scene keys and constructor instantiation` (only checks 5 scenes, forgets `CastleScene`)
6. `verifies GameScene initializes with topic and level number parameters`
7. `verifies RoundSummaryScene initializes with performance stats`

### 7.2 Missing Test Suites Required for Milestone 4

To achieve 100% test coverage for Milestone 4, the following suites must be implemented in `tests/scenes.test.ts`:

#### Suite 1: Full Scene Key Registration & Game Architecture
- Verify all 6 scenes including `CastleScene` (`expect(castle.sys.settings.key).toBe('CastleScene')`).
- Verify Phaser `gameConfig.physics.arcade.fixedStep === true` and `fps === 60`.

#### Suite 2: PreloadScene Audio Unlock & Transition
- Verify `PreloadScene` registers multi-channel listeners for touch and keyboard (`SPACE`/`ENTER`).
- Verify gesture invocation triggers `audioService.unlock()`, `audioService.playClick()`, and `scene.start('MenuScene')`.
- Verify idempotency: subsequent gestures do not double-start `'MenuScene'`.

#### Suite 3: MenuScene Lifecycle & Topic Selection
- Verify topic tab switching re-renders levels for `phonics`, `morphology`, `vocabulary`, and `math`.
- Verify unlocked vs locked level card rendering based on `storageService.isLevelUnlocked()`.
- Verify clicking unlocked card navigates to `GameScene` with correct `{ topic, levelNumber }`.
- Verify clicking locked card does NOT start `GameScene`.
- Verify navigation to `OrchardScene` and `CastleScene` passes `{ returnTo: 'MenuScene' }`.
- Verify sound toggle button toggles `audioService.setMuted()`.

#### Suite 4: GameScene Core Loop & HUD Synchronization
- Verify `init()` resets all counters (`score = 0`, `combo = 0`, `totalAttempts = 0`, `correctAttempts = 0`).
- Verify `create()` sets `physics.world.fixedStep = true` and launches `LevelIntroModal`.
- Verify correct fruit catch:
  - Increments score (`+100 * combo`)
  - Increments combo counter
  - Calls `audioService.playCatch()` and `audioService.playCombo()`
  - Updates HUD score and combo text
  - Updates HUD star badges
- Verify incorrect fruit catch:
  - Resets combo to 0
  - Applies point deduction (-25, min 0)
  - Calls `audioService.playMiss()`
  - Updates HUD score, combo, and stars
- Verify pause modal:
  - Tapping HUD pause button opens `pauseOverlay` and sets `isPaused = true`.
  - While paused, delta updates are frozen (`update()` returns immediately).
  - Clicking Resume destroys overlay and unpauses.
  - Clicking Main Menu starts `'MenuScene'`.
- Verify round completion (`finishLevel`):
  - Accuracy calculation: `(correctAttempts / totalAttempts) * 100`.
  - Persists result via `storageService.saveLevelResult()`.
  - Calls `audioService.playLevelComplete()`.
  - Navigates to `RoundSummaryScene` with complete stats payload.

#### Suite 5: Remediation Loop & Async Race Guard
- Verify 3 consecutive mistakes triggers `TeachingCard` modal.
- Verify fall speed dampening (`fallDurationMs` increases).
- Verify dismissal of `TeachingCard` resets consecutive mistakes in storage and resumes wave spawning.
- Verify race condition guard: new wave does NOT spawn while remediation modal is pending or visible.

#### Suite 6: RoundSummaryScene Navigation & Star Display
- Verify title and celebration styling match mastery status (`isMastered === true` -> "LEVEL MASTERED", emerald; `false` -> "ROUND COMPLETE", sky).
- Verify crown star badges render based on `summaryData.stars` (0 to 3).
- Verify "Next Level ▶" button:
  - Rendered if `isMastered === true` and next level exists in curriculum.
  - Omitted if `isMastered === false` or if level 5 (boss level) was cleared.
  - Clicking starts `GameScene` with `levelNumber + 1`.
- Verify "Play Again 🔄" starts `GameScene` with current `levelNumber`.
- Verify "Visit Orchard 🌳" starts `OrchardScene`.
- Verify "Visit Castle 🏰" starts `CastleScene`.
- Verify all buttons satisfy touch target height `>= 48px`.

#### Suite 7: OrchardScene & Tree Progression
- Verify `OrchardScene` loads `OrchardView` and calls `refreshFromStorage()`.
- Verify tree growth stage is derived from `progress.orchardGrowthStage` (stages 1 to 5).
- Verify clicking unlocked card navigates to `GameScene`.
- Verify clicking Home button navigates to `'MenuScene'`.

#### Suite 8: CastleScene Navigation & Marketplace
- Verify switching between Outside Grounds and Inside Parlor updates background texture and slots.
- Verify coin balance display reflects `storageService.getCoins()`.
- Verify Marketplace modal renders items and handles purchasing.
- Verify Back button returns to `returnTo`.

---

## 8. Summary of Action Items for Worker M4-1

1. **Fix `HUD.ts` Banner Click**:
   In `src/ui/HUD.ts`, inside `this.bannerContainer.on('pointerdown')`, add `this.speakPrompt();`.
2. **Synchronize Stars in `GameScene.ts`**:
   In `src/scenes/GameScene.ts`, inside `handleCorrectCatch()` and `handleIncorrectCatch()`, compute the current star rating using `calculateStars((this.correctAttempts / this.totalAttempts) * 100)` and call `this.hud.updateStars(stars)`.
3. **Fix Asynchronous Remediation Race Condition**:
   In `src/scenes/GameScene.ts`, prevent `spawnNextQuestionWave()` from being scheduled in the fruit destruction tween if the catch was incorrect and remediation is pending or active.
4. **Fix Touch Target Height in `RoundSummaryScene.ts`**:
   In `src/scenes/RoundSummaryScene.ts:187`, change `bg.fillRoundedRect(-140, -24, 280, 48, 14)` and `btn.setSize(280, 48)` (from 46px to 48px).
5. **Harden Pause Modal in `GameScene.ts`**:
   Add `.setInteractive()` to `bg` in `togglePause()`, and handle destruction of `pauseOverlay` if unpaused.
6. **Support Topic Persistence in `MenuScene.ts`**:
   Add `init(data?: { topic?: TopicType })` to set `this.selectedTopic = data.topic` when navigating back.
7. **Expand `tests/scenes.test.ts`**:
   Implement the 8 comprehensive test suites detailed in Section 7.2 using mock Phaser scene helpers.
