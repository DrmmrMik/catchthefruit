# Milestone 3 Audio Synthesis & Speech Quality and Adversarial Review

## Review Summary

**Verdict**: **APPROVE**  
**Reviewer**: Reviewer M3-1 (reviewer & adversarial critic)  
**Milestone**: M3 — Web Audio Synthesis & Speech Review  
**Target Files**:
- `src/services/audio.service.ts`
- `src/ui/TeachingCard.ts`
- `src/ui/HUD.ts`
- `src/ui/OrchardView.ts`
- `tests/audio.test.ts`
- `tests/ui.test.ts`
- `index.html`

---

## 1. Adversarial Integrity Audit

| Check | Expected | Actual | Result |
|---|---|---|---|
| Hardcoded test results / cheats | None | No test-specific branches or hardcoded outputs detected in source code. | **CLEAN** |
| Dummy / facade implementations | Real logic for audio & TTS | Full Web Audio oscillator/gain graph synthesis and Web Speech API integration. | **CLEAN** |
| Bypassed tasks / unbatched downloads | Procedural synthesis, zero audio asset downloads | 100% procedural synthesis using Web Audio API; zero external audio files. | **CLEAN** |
| Fabricated verification logs | Reproducible commands | All 5 verification commands independently executed and confirmed. | **CLEAN** |
| Self-certifying claims | Independent verification | 165 automated tests across 10 test suites independently verified. | **CLEAN** |

**Integrity Finding**: No integrity violations detected. Implementation contains authentic, robust procedural audio synthesis, TTS handling, and Phaser container UI components.

---

## 2. Technical Quality Review

### 2.1 Web Audio Procedural Synthesis (`src/services/audio.service.ts`)
- **Catch Chime (`playCatch(isBonus?: boolean)`)**:
  - Normal catch: 2-note ascending perfect fourth chime (E5 at 659.25Hz -> A5 at 880.00Hz) with 80ms stagger. Bright, tactile, and immediately rewarding.
  - Bonus catch: 4-note ascending major arpeggio (C5 at 523.25Hz -> E5 at 659.25Hz -> G5 at 783.99Hz -> C6 at 1046.50Hz) paired with 1.5x fifth-harmonic shimmer (sine) per note.
- **Miss Tone (`playMiss()`)**:
  - Frequency glide descending from 260.00Hz (~C4) to 175.00Hz (~F3) over 260ms using an exponential frequency ramp.
  - Envelope attacks gently to 0.20 peak over 30ms and decays to 0.0001 over 230ms.
  - Strictly adheres to pedagogical sound design: gentle, warm, non-jarring, and never alarming or punishing for a 7-year-old Grade 2 child.
- **Victory Fanfare (`playLevelComplete()`)**:
  - 5-note triumphant fanfare progression: G4 (392Hz) -> C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz) -> C6 (1046.50Hz) with octave overtone harmonics (`freq * 2`), concluding on a sustained high C6 chord.
- **Combo Escalation (`playCombo(count: number)`)**:
  - Frequencies mapped to the C major pentatonic scale (C5, D5, E5, G5, A5, C6, D6, E6).
  - Octave sparkle chime layered at +20ms.
  - Clamped safely to index boundaries, preventing out-of-bounds access.
- **Tactile UI Click (`playClick()`)**:
  - 40ms high-to-mid sine sweep (880Hz down to 320Hz) with rapid exponential gain decay, providing crisp haptic-like button feedback.
- **Web Audio Spec Safety**:
  - Exponential ramps strictly avoid target 0 (which causes Web Audio `RangeError`), using non-zero floors `0.0001`.
  - All nodes are cleanly started and stopped with exact timestamps (`startTime + duration`).

### 2.2 First-Touch Mobile Audio Unlock (`unlock()`)
- In `AudioService.constructor`, `attachFirstTouchListeners()` registers one-time passive event listeners on `window` for `pointerdown`, `touchstart`, and `keydown`.
- `unlock()` resumes suspended `AudioContext` and updates `this.unlocked = true` when `ctx.state === 'running'`.
- Fully conforms to Safari and Chrome mobile autoplay policies.
- Handles environments where `customContext` is injected (Vitest headless testing) or where `window` is undefined.

### 2.3 Web Speech API TTS Integration (`speakPrompt()`)
- **Speech Rate**: Explicitly set to `0.9` (`utterance.rate = 0.9`), matching PA Grade 2 pedagogical standards for developing young readers.
- **Pitch & Voice**: Pitch set to `1.0`; dynamically selects natural English voices from `window.speechSynthesis.getVoices()` when available.
- **Stall & Deadlock Defense**:
  - Pre-cancels active speech before starting (`window.speechSynthesis.cancel()`).
  - Implements a 4000ms safety timeout guard (`setTimeout(() => resolve(), 4000)`) to guard against known Chromium speech synthesis engine hangs.
  - Cleans up timers on both `utterance.onend` and `utterance.onerror`.
- **Offline / Unsupported Graceful Fallback**:
  - Safe guards against `typeof window === 'undefined'` or missing `speechSynthesis`.
  - Resolves immediately without throwing errors in unsupported environments.

### 2.4 Accessibility & Screen-Reader Live Region
- `#sr-announcements` live-region in `index.html` configured with `aria-live="polite"` and `aria-atomic="true"`.
- `speakPrompt()` updates `srElement.textContent = text` **before** evaluating `this.ttsEnabled` or `this.muted`. This ensures visually impaired children relying on screen readers receive instructional text even if audio volume is muted or TTS audio is toggled off.

### 2.5 Storage Synchronization & Interface Conformance
- Implements all methods of `IAudioSynthesizer` defined in `PROJECT.md` (`unlock`, `playCatch`, `playMiss`, `playLevelComplete`, `playCombo`, `playClick`, `speakPrompt`) and extends it with volume and mute management.
- Integrates bi-directionally with `StorageService`:
  - Synchronizes volume and TTS toggles on initialization.
  - Updates persistent settings via `storage.updateSettings()` when `setVolume()` or `setTtsEnabled()` are called.

---

## 3. Adversarial Stress-Test Analysis

### Challenge 1: Browser Speech Synthesis Thread Freeze
- **Attack Scenario**: Chromium on mobile and desktop can silently stall `speechSynthesis.speak()` without firing `onend` if the utterance object is prematurely collected or the TTS service encounters an audio device reset.
- **Blast Radius**: If `speakPrompt()` returns an unresolved Promise, awaiting callers (such as scene transitions or tutorials) would freeze permanently.
- **Mitigation Present**: Line 411 of `audio.service.ts` sets a 4000ms fallback timeout that forcibly resolves the Promise if `onend` fails to fire within 4 seconds. Furthermore, `window.speechSynthesis.cancel()` flushes stale queue items before each utterance.
- **Status**: **PASS (Robustly Mitigated)**

### Challenge 2: AudioContext State Transitions and Autoplay Denial
- **Attack Scenario**: User loads game on mobile browser that rejects audio unlock before explicit interaction, or user switches tabs suspending the AudioContext.
- **Blast Radius**: Unhandled promise rejections or audio crashes during sound playback attempts.
- **Mitigation Present**: `unlock()` wraps `ctx.resume()` in a `try/catch` block. `createTone()`, `playMiss()`, and `playClick()` wrap node creation and connection in `try/catch` blocks and safely return `null` on closed/error contexts.
- **Status**: **PASS (Robustly Mitigated)**

### Challenge 3: High-Frequency Audio Spam (120Hz Multi-Touch Rapid Tapping)
- **Attack Scenario**: Player rapidly taps the screen triggering dozens of catch/combo sound calls within a single animation frame.
- **Blast Radius**: Audio node leakage, CPU spike, clipping distortion.
- **Mitigation Present**: Each sound schedules its own oscillator and gain node with explicit `stop(startTime + duration)`. Master gain node scales the master volume to prevent clipping. When oscillators finish, references are discarded and eligible for garbage collection.
- **Status**: **PASS (Robustly Mitigated)**

### Challenge 4: Volume Clamping and Type Boundary Stress
- **Attack Scenario**: Calling `setVolume(-5)` or `setVolume(999)` from UI slider or corrupted storage.
- **Blast Radius**: GainNode parameter distortion or Web Audio API out-of-range exception.
- **Mitigation Present**: Clamped strictly via `this.volume = Math.max(0, Math.min(1, volume));` before writing to `masterGain`. Storage schema also validates `sfxVolume: z.number().min(0).max(1)`.
- **Status**: **PASS (Robustly Mitigated)**

---

## 4. Independent Verification Results

All five verification gates were independently executed by Reviewer M3-1:

| Command | Status | Output / Notes |
|---|---|---|
| `npm run typecheck` | **PASS** | Exit code 0, 0 TypeScript errors |
| `npm test` | **PASS** | Exit code 0, 10 test files, 165/165 tests passed (100%) |
| `npx vitest run tests/audio.test.ts` | **PASS** | Exit code 0, 23/23 audio unit tests passed |
| `npm run build` | **PASS** | Exit code 0, built in 1.12s, production bundles generated |
| `~/.build-standards/bin/bsa verify .` | **PASS** | Exit code 0, 2/2 required packages (phaser, zod), 0/4 forbidden patterns |
| `python3 validate_pwa.py dist` | **PASS** | Exit code 0, "RESULT: PASS - safe to publish" |

---

## 5. Minor Observations (Non-Blocking Recommendations)

1. **AudioNode Disconnect on Ended (Nice to have for M6)**:
   In `createTone()`, adding `osc.onended = () => { try { gain.disconnect(); osc.disconnect(); } catch {} };` can provide an extra layer of explicit resource cleanup on memory-constrained mobile devices during multi-hour continuous play sessions. In modern V8/Blink, stopped unreferenced nodes are automatically garbage collected, so this is not a blocker.
2. **Audio Preload in Phaser Scenes (Milestone 4 alignment)**:
   As Milestone 4 constructs the Phaser scenes (`GameScene`, `MenuScene`), ensure that the first touch on the Phaser canvas calls `audioService.unlock()`, complementing the window-level listeners.

---

## 6. Verdict

**APPROVE**: Milestone 3 audio synthesis, Web Speech TTS, accessibility, and UI components meet all architectural, pedagogical, and stack requirements with zero defects and zero regressions.
