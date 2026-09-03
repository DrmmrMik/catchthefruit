import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { AudioService } from '../src/services/audio.service';
import { StorageService } from '../src/services/storage.service';

// Precision Mocks for Web Audio API
class MockAudioParam {
  public value: number;
  public setValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.history.push({ type: 'setValueAtTime', val, time });
  });
  public linearRampToValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.history.push({ type: 'linearRampToValueAtTime', val, time });
  });
  public exponentialRampToValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.history.push({ type: 'exponentialRampToValueAtTime', val, time });
  });
  public history: Array<{ type: string; val: number; time: number }> = [];

  constructor(initial: number = 1) {
    this.value = initial;
  }
}

class MockGainNode {
  public gain = new MockAudioParam(1);
  public connect = vi.fn();
  public disconnect = vi.fn();
}

class MockOscillatorNode {
  public type: OscillatorType = 'sine';
  public frequency = new MockAudioParam(440);
  public connect = vi.fn();
  public disconnect = vi.fn();
  public start = vi.fn((time?: number) => {
    this.startTime = time ?? 0;
  });
  public stop = vi.fn((time?: number) => {
    this.stopTime = time ?? 0;
  });
  public startTime: number = -1;
  public stopTime: number = -1;
}

class MockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = 'suspended';
  public destination = {};
  public createdOscillators: MockOscillatorNode[] = [];
  public createdGains: MockGainNode[] = [];

  public createGain = vi.fn(() => {
    if (this.state === 'closed') {
      throw new DOMException('Cannot createGain on closed AudioContext', 'InvalidStateError');
    }
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain as unknown as GainNode;
  });

  public createOscillator = vi.fn(() => {
    if (this.state === 'closed') {
      throw new DOMException('Cannot createOscillator on closed AudioContext', 'InvalidStateError');
    }
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc as unknown as OscillatorNode;
  });

  public resume = vi.fn(async () => {
    if (this.state === 'closed') {
      throw new DOMException('Cannot resume closed AudioContext', 'InvalidStateError');
    }
    this.state = 'running';
  });

  public close = vi.fn(async () => {
    this.state = 'closed';
  });
}

describe('Adversarial Web Audio & Speech Stress Suite (Challenger M3-1)', () => {
  const rootDir = process.cwd();
  let mockContext: MockAudioContext;
  let mockStorage: StorageService;
  let audio: AudioService;

  beforeEach(async () => {
    mockContext = new MockAudioContext();
    mockStorage = new StorageService();
    await mockStorage.resetProgress();
    audio = new AudioService(mockContext as unknown as AudioContext, mockStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Suite 1: Python Adversarial Audio Oracle Execution
  // ==========================================================================
  describe('Suite 1: Empirical Python Adversarial Oracle Execution', () => {
    it('executes python adversarial audio oracle with 0 errors and APPROVE verdict', () => {
      const scriptPath = path.join(rootDir, 'scripts/adversarial_audio_verify.py');
      expect(fs.existsSync(scriptPath), 'Audio oracle script must exist').toBe(true);

      const output = execSync(`python3 ${scriptPath}`, {
        encoding: 'utf-8',
        cwd: rootDir,
      });

      expect(output).toContain('VERDICT: APPROVE');
      expect(output).not.toContain('[ERROR]');
      expect(output).toContain('10,000 random volume inputs strictly preserved');
      expect(output).toContain('All rapid fire sound effects have finite, bounded lifespans');
    });
  });

  // ==========================================================================
  // Suite 2: AudioContext Lifecycle & Suspension / Autoplay Rejection Stress
  // ==========================================================================
  describe('Suite 2: AudioContext Lifecycle & Suspension / Autoplay Rejection Stress', () => {
    it('initializes in suspended state and reports isUnlocked() false', () => {
      expect(mockContext.state).toBe('suspended');
      expect(audio.isUnlocked()).toBe(false);
      expect(audio.getAudioContext()).toBe(mockContext);
    });

    it('safely handles autoplay rejection when resume() rejects with NotAllowedError', async () => {
      mockContext.resume = vi.fn().mockRejectedValue(new DOMException('The play request was interrupted', 'NotAllowedError'));
      expect(mockContext.state).toBe('suspended');

      // unlock() must catch the rejection and not bubble an unhandled error
      await expect(audio.unlock()).resolves.toBeUndefined();
      expect(mockContext.resume).toHaveBeenCalled();
      expect(audio.isUnlocked()).toBe(false);

      // Sound playback should still not crash or throw
      expect(() => audio.playCatch()).not.toThrow();
      expect(() => audio.playMiss()).not.toThrow();
    });

    it('handles AudioContext in closed state without throwing or crashing', () => {
      mockContext.state = 'closed';
      expect(audio.isUnlocked()).toBe(false);

      // Calling sound methods when closed throws InvalidStateError inside Web Audio API,
      // AudioService must catch it and return safely
      expect(() => audio.playCatch(false)).not.toThrow();
      expect(() => audio.playCatch(true)).not.toThrow();
      expect(() => audio.playMiss()).not.toThrow();
      expect(() => audio.playLevelComplete()).not.toThrow();
      expect(() => audio.playCombo(5)).not.toThrow();
      expect(() => audio.playClick()).not.toThrow();
    });

    it('gracefully handles null AudioContext across all API methods', async () => {
      const nullAudio = new AudioService(null, mockStorage);
      expect(nullAudio.getAudioContext()).toBeNull();
      expect(nullAudio.isUnlocked()).toBe(false);

      await expect(nullAudio.unlock()).resolves.toBeUndefined();
      expect(() => nullAudio.playCatch()).not.toThrow();
      expect(() => nullAudio.playMiss()).not.toThrow();
      expect(() => nullAudio.playLevelComplete()).not.toThrow();
      expect(() => nullAudio.playCombo(3)).not.toThrow();
      expect(() => nullAudio.playClick()).not.toThrow();
      expect(() => nullAudio.setVolume(0.5)).not.toThrow();
      expect(() => nullAudio.setMuted(true)).not.toThrow();
    });

    it('handles throwing AudioContext constructor during initialization', () => {
      const originalAudioContext = window.AudioContext;
      try {
        (window as any).AudioContext = vi.fn(() => {
          throw new DOMException('The AudioContext was not allowed to start', 'NotAllowedError');
        });

        const safeAudio = new AudioService(undefined, mockStorage);
        expect(safeAudio.getAudioContext()).toBeNull();
        expect(safeAudio.isUnlocked()).toBe(false);
      } finally {
        window.AudioContext = originalAudioContext;
      }
    });

    it('verifies first-touch unlock listeners are attached with once and passive options', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      new AudioService(undefined, mockStorage);

      const registeredEvents = addEventSpy.mock.calls.map(c => c[0]);
      expect(registeredEvents).toContain('pointerdown');
      expect(registeredEvents).toContain('touchstart');
      expect(registeredEvents).toContain('keydown');

      // Verify once: true, passive: true
      const pointerCall = addEventSpy.mock.calls.find(c => c[0] === 'pointerdown');
      expect(pointerCall?.[2]).toEqual({ once: true, passive: true });
    });
  });

  // ==========================================================================
  // Suite 3: Rapid-Fire Playback & Resource Boundedness Stress (50+ triggers in 100ms)
  // ==========================================================================
  describe('Suite 3: Rapid-Fire Playback & Resource Boundedness Stress', () => {
    it('handles 50 rapid normal catches in 100ms without node leaks or crashes', () => {
      const startOscs = mockContext.createdOscillators.length;
      const startGains = mockContext.createdGains.length;

      // Simulate 50 catches rapidly advancing currentTime
      for (let i = 0; i < 50; i++) {
        mockContext.currentTime = i * 0.002; // 100ms total
        audio.playCatch(false);
      }

      const createdOscs = mockContext.createdOscillators.slice(startOscs);
      const createdGains = mockContext.createdGains.slice(startGains);

      // 50 calls * 2 oscs = 100 oscillators
      expect(createdOscs.length).toBe(100);
      expect(createdGains.length).toBe(100);

      // Verify every oscillator has valid start and stop scheduled with stopTime > startTime
      for (const osc of createdOscs) {
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
        expect(osc.stopTime).toBeGreaterThan(osc.startTime);
        expect(osc.stopTime - osc.startTime).toBeLessThanOrEqual(0.25);
      }
    });

    it('handles 50 rapid bonus catches in 100ms (400 oscillators) cleanly', () => {
      const startOscs = mockContext.createdOscillators.length;

      for (let i = 0; i < 50; i++) {
        mockContext.currentTime = i * 0.002;
        audio.playCatch(true);
      }

      const createdOscs = mockContext.createdOscillators.slice(startOscs);
      // 50 calls * 8 oscs = 400 oscillators
      expect(createdOscs.length).toBe(400);

      for (const osc of createdOscs) {
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
        expect(osc.stopTime).toBeGreaterThan(osc.startTime);
      }
    });

    it('handles 50 rapid combo calls with escalating streaks', () => {
      const startOscs = mockContext.createdOscillators.length;

      for (let streak = 1; streak <= 50; streak++) {
        mockContext.currentTime += 0.002;
        audio.playCombo(streak);
      }

      const createdOscs = mockContext.createdOscillators.slice(startOscs);
      expect(createdOscs.length).toBe(100); // 50 * 2 oscs

      // Combo 50 should clamp to max pentatonic frequency E6 (1318.51)
      const lastOsc = createdOscs[createdOscs.length - 2]!;
      expect(lastOsc.frequency.setValueAtTime).toHaveBeenCalledWith(1318.51, expect.any(Number));
    });

    it('handles 50 rapid misses in 100ms with smooth exponential glide', () => {
      const startOscs = mockContext.createdOscillators.length;

      for (let i = 0; i < 50; i++) {
        mockContext.currentTime = i * 0.002;
        audio.playMiss();
      }

      const createdOscs = mockContext.createdOscillators.slice(startOscs);
      expect(createdOscs.length).toBe(50);

      for (const osc of createdOscs) {
        expect(osc.type).toBe('sine');
        expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(260, expect.any(Number));
        expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(175, expect.any(Number));
      }
    });

    it('handles 50 rapid level complete fanfares in 100ms (500 oscillators)', () => {
      const startOscs = mockContext.createdOscillators.length;

      for (let i = 0; i < 50; i++) {
        mockContext.currentTime = i * 0.002;
        audio.playLevelComplete();
      }

      const createdOscs = mockContext.createdOscillators.slice(startOscs);
      expect(createdOscs.length).toBe(500); // 50 * 10 oscs
    });

    it('survives extreme barrage of 1,000 mixed rapid calls in a tight synchronous loop', () => {
      const t0 = performance.now();

      for (let i = 0; i < 200; i++) {
        audio.playCatch(false);
        audio.playCatch(true);
        audio.playMiss();
        audio.playCombo(i % 10);
        audio.playClick();
      }

      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(1000); // Must execute in < 1000ms without blocking thread
    });

    it('verifies exponential ramps never target 0 to prevent Web Audio RangeError', () => {
      audio.playCatch(false);
      audio.playCatch(true);
      audio.playMiss();
      audio.playLevelComplete();
      audio.playCombo(4);
      audio.playClick();

      // Check all gain nodes
      for (const gainNode of mockContext.createdGains) {
        for (const call of gainNode.gain.history) {
          if (call.type === 'exponentialRampToValueAtTime') {
            expect(call.val).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  // ==========================================================================
  // Suite 4: Volume Bounds, Muting Invariants & Storage Sync
  // ==========================================================================
  describe('Suite 4: Volume Bounds, Muting Invariants & Storage Sync', () => {
    it('strictly suppresses all node allocation when muted', () => {
      audio.setMuted(true);
      expect(audio.isMuted()).toBe(true);

      const startOscs = mockContext.createdOscillators.length;
      const startGains = mockContext.createdGains.length;

      for (let i = 0; i < 50; i++) {
        audio.playCatch(false);
        audio.playCatch(true);
        audio.playMiss();
        audio.playLevelComplete();
        audio.playCombo(i);
        audio.playClick();
      }

      // Exactly zero new oscillators or gain nodes should be created
      expect(mockContext.createdOscillators.length).toBe(startOscs);
      expect(mockContext.createdGains.length).toBe(startGains);
    });

    it('toggles mute cleanly and restores master gain target volume', () => {
      audio.setVolume(0.75);
      expect(audio.isMuted()).toBe(false);

      // Toggle to muted
      expect(audio.toggleMute()).toBe(true);
      expect(audio.isMuted()).toBe(true);

      // Toggle back to unmuted
      expect(audio.toggleMute()).toBe(false);
      expect(audio.isMuted()).toBe(false);
      expect(audio.getVolume()).toBe(0.75);
    });

    it('clamps volume strictly at zero and one bounds and handles extreme values', () => {
      // Zero bound
      audio.setVolume(0);
      expect(audio.getVolume()).toBe(0);

      // Negative values clamped to 0
      audio.setVolume(-0.001);
      expect(audio.getVolume()).toBe(0);
      audio.setVolume(-100);
      expect(audio.getVolume()).toBe(0);
      audio.setVolume(-Infinity);
      expect(audio.getVolume()).toBe(0);

      // One bound
      audio.setVolume(1);
      expect(audio.getVolume()).toBe(1);

      // Excessive values clamped to 1
      audio.setVolume(1.001);
      expect(audio.getVolume()).toBe(1);
      audio.setVolume(50);
      expect(audio.getVolume()).toBe(1);
      audio.setVolume(Infinity);
      expect(audio.getVolume()).toBe(1);

      // Precision float values
      audio.setVolume(0.123456);
      expect(audio.getVolume()).toBeCloseTo(0.123456, 5);
    });

    it('safely handles NaN without crashing the audio service', () => {
      expect(() => audio.setVolume(NaN)).not.toThrow();
      expect(() => audio.playCatch()).not.toThrow();
    });

    it('persists volume changes to storage and synchronizes back', async () => {
      audio.setVolume(0.42);
      const progress = await mockStorage.getProgress();
      expect(progress.settings.sfxVolume).toBe(0.42);

      // Modify storage directly to 0.68
      await mockStorage.updateSettings({ sfxVolume: 0.68 });
      await audio.syncWithStorage();
      expect(audio.getVolume()).toBe(0.68);
    });
  });

  // ==========================================================================
  // Suite 5: Web Speech API Timeout, Error & Crash Resilience
  // ==========================================================================
  describe('Suite 5: Web Speech API Timeout, Error & Crash Resilience', () => {
    let mockSynth: any;
    let originalSpeechSynthesis: any;
    let originalUtterance: any;

    beforeEach(() => {
      originalSpeechSynthesis = window.speechSynthesis;
      originalUtterance = window.SpeechSynthesisUtterance;

      mockSynth = {
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn(() => [
          { name: 'Google English', lang: 'en-US', default: true } as SpeechSynthesisVoice
        ]),
        speaking: false,
        paused: false,
        pending: false
      };

      class MockUtterance {
        public text: string;
        public rate: number = 1;
        public pitch: number = 1;
        public voice: SpeechSynthesisVoice | null = null;
        public onend: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }

      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynth,
        configurable: true,
        writable: true
      });
      (window as any).SpeechSynthesisUtterance = MockUtterance;
    });

    afterEach(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: originalSpeechSynthesis,
        configurable: true,
        writable: true
      });
      window.SpeechSynthesisUtterance = originalUtterance;
    });

    it('resolves safely when window.speechSynthesis is undefined', async () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
        writable: true
      });

      await expect(audio.speakPrompt('Test when undefined')).resolves.toBeUndefined();
    });

    it('resolves safely when window.speechSynthesis is null', async () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: null,
        configurable: true,
        writable: true
      });

      await expect(audio.speakPrompt('Test when null')).resolves.toBeUndefined();
    });

    it('resolves safely when SpeechSynthesisUtterance is undefined', async () => {
      delete (window as any).SpeechSynthesisUtterance;

      await expect(audio.speakPrompt('Test when utterance undefined')).resolves.toBeUndefined();
    });

    it('resolves safely when speechSynthesis.speak() throws synchronously', async () => {
      mockSynth.speak = vi.fn(() => {
        throw new DOMException('Speech synthesis failed to start', 'NotAllowedError');
      });

      await expect(audio.speakPrompt('Throwing speak')).resolves.toBeUndefined();
      expect(mockSynth.speak).toHaveBeenCalled();
    });

    it('resolves safely when speechSynthesis.cancel() throws synchronously', async () => {
      mockSynth.cancel = vi.fn(() => {
        throw new Error('Cancel failed');
      });

      await expect(audio.speakPrompt('Throwing cancel')).resolves.toBeUndefined();
    });

    it('resolves safely when getVoices() throws or returns empty list', async () => {
      mockSynth.getVoices = vi.fn(() => {
        throw new Error('Voices unavailable');
      });

      await expect(audio.speakPrompt('Throwing getVoices')).resolves.toBeUndefined();

      mockSynth.getVoices = vi.fn(() => []);
      mockSynth.speak = vi.fn((utt: any) => {
        utt.onend?.();
      });

      await expect(audio.speakPrompt('Empty voices')).resolves.toBeUndefined();
    });

    it('resolves cleanly on utterance onerror event without unhandled rejection', async () => {
      mockSynth.speak = vi.fn((utt: any) => {
        setTimeout(() => {
          utt.onerror?.();
        }, 10);
      });

      await expect(audio.speakPrompt('Error utterance')).resolves.toBeUndefined();
    });

    it('resolves safely via 4000ms safety timeout when TTS engine hangs indefinitely', async () => {
      vi.useFakeTimers();

      // Simulate a frozen TTS engine: neither onend nor onerror ever fires
      mockSynth.speak = vi.fn((_utt: any) => {
        // Deliberately do nothing
      });

      let resolved = false;
      const promise = audio.speakPrompt('Hanging speech prompt').then(() => {
        resolved = true;
      });

      // At 3999ms, it should not have resolved yet
      await vi.advanceTimersByTimeAsync(3999);
      expect(resolved).toBe(false);

      // At 4000ms, the safety timeout triggers and resolves the promise!
      await vi.advanceTimersByTimeAsync(1);
      await promise;
      expect(resolved).toBe(true);
    });

    it('cancels preceding utterance on rapid successive speakPrompt calls', async () => {
      mockSynth.speak = vi.fn((utt: any) => {
        utt.onend?.();
      });

      const p1 = audio.speakPrompt('First prompt');
      const p2 = audio.speakPrompt('Second prompt');
      const p3 = audio.speakPrompt('Third prompt');

      await Promise.all([p1, p2, p3]);

      // cancel() should have been called 3 times
      expect(mockSynth.cancel).toHaveBeenCalledTimes(3);
    });

    it('updates #sr-announcements live region when element is present in DOM', async () => {
      let liveRegion = document.getElementById('sr-announcements');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-announcements';
        document.body.appendChild(liveRegion);
      }

      await audio.speakPrompt('Catch vowel team: ai');
      expect(liveRegion.textContent).toBe('Catch vowel team: ai');
    });

    it('does not crash when #sr-announcements is absent from DOM', async () => {
      const liveRegion = document.getElementById('sr-announcements');
      if (liveRegion) {
        liveRegion.remove();
      }

      await expect(audio.speakPrompt('Prompt with no live region')).resolves.toBeUndefined();
    });

    it('strictly skips speech synthesis when muted or ttsEnabled is false', async () => {
      audio.setMuted(true);
      await audio.speakPrompt('Muted prompt');
      expect(mockSynth.speak).not.toHaveBeenCalled();

      audio.setMuted(false);
      audio.setTtsEnabled(false);
      await audio.speakPrompt('TTS disabled prompt');
      expect(mockSynth.speak).not.toHaveBeenCalled();
    });
  });
});
