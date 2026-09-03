import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioService, normalizePhoneticsForSpeech } from '../src/services/audio.service';
import { StorageService } from '../src/services/storage.service';

// Mock Web Audio API classes for headless testing
class MockAudioParam {
  public value: number;
  public setValueAtTime = vi.fn((val: number) => { this.value = val; });
  public linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  public exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });

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
  public start = vi.fn();
  public stop = vi.fn();
}

class MockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = 'suspended';
  public destination = {};
  public createdOscillators: MockOscillatorNode[] = [];
  public createdGains: MockGainNode[] = [];

  public createGain = vi.fn(() => {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain as unknown as GainNode;
  });

  public createOscillator = vi.fn(() => {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc as unknown as OscillatorNode;
  });

  public resume = vi.fn(async () => {
    this.state = 'running';
  });

  public close = vi.fn(async () => {
    this.state = 'closed';
  });
}

describe('AudioService - Procedural Audio & Web Speech API (Milestone 3)', () => {
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
  });

  describe('AudioContext Initialization & Unlocking', () => {
    it('initializes with custom AudioContext and sets master gain', () => {
      expect(audio.getAudioContext()).toBe(mockContext);
      expect(mockContext.createGain).toHaveBeenCalled();
      expect(audio.isUnlocked()).toBe(false);
    });

    it('unlock() resumes suspended AudioContext and marks unlocked', async () => {
      expect(mockContext.state).toBe('suspended');
      await audio.unlock();
      expect(mockContext.resume).toHaveBeenCalled();
      expect(mockContext.state).toBe('running');
      expect(audio.isUnlocked()).toBe(true);
    });

    it('handles unlock safely when context is already running', async () => {
      mockContext.state = 'running';
      await audio.unlock();
      expect(audio.isUnlocked()).toBe(true);
    });

    it('handles unlock safely when AudioContext is null', async () => {
      const nullAudio = new AudioService(null, mockStorage);
      expect(nullAudio.getAudioContext()).toBeNull();
      await expect(nullAudio.unlock()).resolves.toBeUndefined();
      expect(nullAudio.isUnlocked()).toBe(false);
    });
  });

  describe('Procedural Web Audio SFX Synthesis', () => {
    it('playCatch() normal generates 2-note ascending chime (E5 -> A5)', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      audio.playCatch(false);

      const newOscs = mockContext.createdOscillators.slice(initialOscCount);
      expect(newOscs.length).toBe(2);

      const osc0 = newOscs[0]!;
      const osc1 = newOscs[1]!;

      // First note: E5 (659.25Hz, sine)
      expect(osc0.type).toBe('sine');
      expect(osc0.frequency.setValueAtTime).toHaveBeenCalledWith(659.25, 0);
      expect(osc0.start).toHaveBeenCalled();
      expect(osc0.stop).toHaveBeenCalled();

      // Second note: A5 (880Hz, triangle)
      expect(osc1.type).toBe('triangle');
      expect(osc1.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0.08);
      expect(osc1.start).toHaveBeenCalled();
    });

    it('playCatch() bonus generates 4-note ascending arpeggio with harmonics', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      audio.playCatch(true);

      const newOscs = mockContext.createdOscillators.slice(initialOscCount);
      // 4 notes * 2 oscillators each (triangle fundamental + sine harmonic) = 8 oscillators
      expect(newOscs.length).toBe(8);

      // Verify fundamental frequencies C5, E5, G5, C6
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, i) => {
        const fundamental = newOscs[i * 2]!;
        const harmonic = newOscs[i * 2 + 1]!;
        expect(fundamental.type).toBe('triangle');
        expect(fundamental.frequency.setValueAtTime).toHaveBeenCalledWith(f, expect.any(Number));
        expect(harmonic.type).toBe('sine');
        expect(harmonic.frequency.setValueAtTime).toHaveBeenCalledWith(f * 1.5, expect.any(Number));
      });
    });

    it('playMiss() generates gentle low descending tone (260Hz -> 175Hz)', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      audio.playMiss();

      const newOscs = mockContext.createdOscillators.slice(initialOscCount);
      expect(newOscs.length).toBe(1);

      const osc = newOscs[0]!;
      expect(osc.type).toBe('sine');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(260, 0);
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(175, expect.closeTo(0.26, 2));
    });

    it('playLevelComplete() generates multi-note victory fanfare', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      audio.playLevelComplete();

      const newOscs = mockContext.createdOscillators.slice(initialOscCount);
      // 5 notes * 2 (fundamental + octave harmonic) = 10 oscillators
      expect(newOscs.length).toBe(10);

      const firstOsc = newOscs[0]!;
      const lastOsc = newOscs[8]!;
      // Verify first note is G4 (392Hz) and final note is C6 (1046.5Hz)
      expect(firstOsc.frequency.setValueAtTime).toHaveBeenCalledWith(392, 0);
      expect(lastOsc.frequency.setValueAtTime).toHaveBeenCalledWith(1046.5, expect.any(Number));
    });

    it('playCombo() scales frequencies across pentatonic scale steps', () => {
      // Test combo 1 (C5 = 523.25)
      let initialOscCount = mockContext.createdOscillators.length;
      audio.playCombo(1);
      let oscs = mockContext.createdOscillators.slice(initialOscCount);
      expect(oscs[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, expect.any(Number));

      // Test combo 4 (G5 = 783.99)
      initialOscCount = mockContext.createdOscillators.length;
      audio.playCombo(4);
      oscs = mockContext.createdOscillators.slice(initialOscCount);
      expect(oscs[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(783.99, expect.any(Number));

      // Test combo 8+ (clamped to max scale step E6 = 1318.51)
      initialOscCount = mockContext.createdOscillators.length;
      audio.playCombo(12);
      oscs = mockContext.createdOscillators.slice(initialOscCount);
      expect(oscs[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(1318.51, expect.any(Number));
    });

    it('playClick() generates short tactile UI click burst', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      audio.playClick();

      const newOscs = mockContext.createdOscillators.slice(initialOscCount);
      expect(newOscs.length).toBe(1);
      const osc = newOscs[0]!;
      expect(osc.type).toBe('sine');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(320, expect.closeTo(0.04, 2));
    });

    it('does not generate sound when muted', () => {
      audio.setMuted(true);
      expect(audio.isMuted()).toBe(true);

      const initialOscCount = mockContext.createdOscillators.length;
      audio.playCatch();
      audio.playMiss();
      audio.playLevelComplete();
      audio.playCombo(3);
      audio.playClick();

      expect(mockContext.createdOscillators.length).toBe(initialOscCount);
    });

    it('toggles mute state with toggleMute()', () => {
      expect(audio.isMuted()).toBe(false);
      expect(audio.toggleMute()).toBe(true);
      expect(audio.isMuted()).toBe(true);
      expect(audio.toggleMute()).toBe(false);
      expect(audio.isMuted()).toBe(false);
    });

    it('updates volume clamped between 0 and 1', () => {
      audio.setVolume(0.5);
      expect(audio.getVolume()).toBe(0.5);

      audio.setVolume(1.5);
      expect(audio.getVolume()).toBe(1.0);

      audio.setVolume(-0.2);
      expect(audio.getVolume()).toBe(0.0);
    });
  });

  describe('Web Speech API TTS Manager', () => {
    let speakMock: ReturnType<typeof vi.fn>;
    let cancelMock: ReturnType<typeof vi.fn>;
    let originalSpeechSynthesis: SpeechSynthesis | undefined;
    let originalUtterance: typeof SpeechSynthesisUtterance | undefined;

    beforeEach(() => {
      speakMock = vi.fn((utterance: SpeechSynthesisUtterance) => {
        // Trigger onend asynchronously to simulate speech finishing
        setTimeout(() => {
          if (utterance.onend) {
            utterance.onend(new Event('end') as SpeechSynthesisEvent);
          }
        }, 10);
      });
      cancelMock = vi.fn();

      originalSpeechSynthesis = window.speechSynthesis;
      originalUtterance = window.SpeechSynthesisUtterance;

      // Mock SpeechSynthesisUtterance
      class MockSpeechSynthesisUtterance {
        public text: string;
        public rate: number = 1;
        public pitch: number = 1;
        public voice: SpeechSynthesisVoice | null = null;
        public onend: ((evt: SpeechSynthesisEvent) => void) | null = null;
        public onerror: ((evt: SpeechSynthesisErrorEvent) => void) | null = null;

        constructor(text: string) {
          this.text = text;
        }
      }

      window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;
      const mockSynth = {
        speak: speakMock,
        cancel: cancelMock,
        getVoices: () => [
          { name: 'Google US English', lang: 'en-US', default: true, localService: true, voiceURI: 'en-US' } as SpeechSynthesisVoice
        ],
        speaking: false,
        paused: false,
        pending: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };
      Object.defineProperty(window, 'speechSynthesis', {
        value: mockSynth,
        configurable: true,
        writable: true
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: originalSpeechSynthesis,
        configurable: true,
        writable: true
      });
      window.SpeechSynthesisUtterance = originalUtterance as typeof SpeechSynthesisUtterance;
    });

    it('speakPrompt() uses 0.9x speech rate for 2nd grade comprehension', async () => {
      const prompt = "Catch words with 'ea' that say /ē/!";
      await audio.speakPrompt(prompt);

      expect(cancelMock).toHaveBeenCalled();
      expect(speakMock).toHaveBeenCalled();

      const callArgs = speakMock.mock.calls[0];
      expect(callArgs).toBeDefined();
      const utterance = callArgs![0] as SpeechSynthesisUtterance;
      expect(utterance.text).toBe("Catch words with 'ea' that say long E!");
      expect(utterance.rate).toBe(0.9);
      expect(utterance.pitch).toBe(1.0);
      expect(utterance.voice?.lang).toBe('en-US');
    });

    it('updates #sr-announcements live region for screen-reader accessibility', async () => {
      let srEl = document.getElementById('sr-announcements');
      if (!srEl) {
        srEl = document.createElement('div');
        srEl.id = 'sr-announcements';
        document.body.appendChild(srEl);
      }

      await audio.speakPrompt('Target: beach');
      expect(srEl.textContent).toBe('Target: beach');
    });

    it('normalizes phonetic symbols so TTS speaks phonemes without saying "slash"', async () => {
      // Test the normalization utility directly
      expect(normalizePhoneticsForSpeech("Catch words where 'ea' says /ē/ like beach!"))
        .toBe("Catch words where 'ea' says long E like beach!");

      expect(normalizePhoneticsForSpeech("'bread' is a trickster! 'ea' says short /ĕ/ like in bed!"))
        .toBe("'bread' is a trickster! 'ea' says short E like in bed!");

      expect(normalizePhoneticsForSpeech("Catch words with 'ai' and 'ay' that say /ā/!"))
        .toBe("Catch words with 'ai' and 'ay' that say long A!");

      expect(normalizePhoneticsForSpeech("'star' has r-controlled vowel 'ar' saying /är/!"))
        .toBe("'star' has r-controlled vowel 'ar' saying ar!");

      expect(normalizePhoneticsForSpeech("'water' ends with r-controlled 'er' saying /ẽr/!"))
        .toBe("'water' ends with r-controlled 'er' saying er!");

      expect(normalizePhoneticsForSpeech("'storm' has r-controlled vowel 'or' saying /ôr/!"))
        .toBe("'storm' has r-controlled vowel 'or' saying or!");

      expect(normalizePhoneticsForSpeech("Action Suffixes (-s / -es, -ed, -ing)"))
        .toBe("Action Suffixes (-s or -es, -ed, -ing)");

      // Test integration with speakPrompt
      await audio.speakPrompt("Catch words where 'ea' says /ē/!");
      const lastCall = speakMock.mock.calls[speakMock.mock.calls.length - 1];
      const utterance = lastCall![0] as SpeechSynthesisUtterance;
      expect(utterance.text).not.toContain('slash');
      expect(utterance.text).not.toContain('/');
      expect(utterance.text).toContain('long E');
    });

    it('skips speech when ttsEnabled is false', async () => {
      audio.setTtsEnabled(false);
      expect(audio.isTtsEnabled()).toBe(false);

      await audio.speakPrompt('Test prompt');
      expect(speakMock).not.toHaveBeenCalled();
    });

    it('skips speech when muted is true', async () => {
      audio.setMuted(true);
      await audio.speakPrompt('Test prompt');
      expect(speakMock).not.toHaveBeenCalled();
    });

    it('toggleTts() toggles TTS enabled state', () => {
      expect(audio.isTtsEnabled()).toBe(true);
      expect(audio.toggleTts()).toBe(false);
      expect(audio.isTtsEnabled()).toBe(false);
      expect(audio.toggleTts()).toBe(true);
      expect(audio.isTtsEnabled()).toBe(true);
    });

    it('stopSpeaking() cancels speech synthesis', () => {
      audio.stopSpeaking();
      expect(cancelMock).toHaveBeenCalled();
    });

    it('handles offline / missing speechSynthesis gracefully without throwing', async () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        configurable: true,
        writable: true
      });

      await expect(audio.speakPrompt('Offline prompt')).resolves.toBeUndefined();
    });
  });

  describe('StorageService Integration & Sync', () => {
    it('syncWithStorage() loads user audio settings', async () => {
      await mockStorage.updateSettings({ sfxVolume: 0.35, ttsEnabled: false });

      await audio.syncWithStorage();
      expect(audio.getVolume()).toBe(0.35);
      expect(audio.isTtsEnabled()).toBe(false);
    });

    it('setVolume() persists volume to storage', async () => {
      audio.setVolume(0.65);
      const progress = await mockStorage.getProgress();
      expect(progress.settings.sfxVolume).toBe(0.65);
    });

    it('setTtsEnabled() persists TTS toggle to storage', async () => {
      audio.setTtsEnabled(false);
      const progress = await mockStorage.getProgress();
      expect(progress.settings.ttsEnabled).toBe(false);
    });
  });
});
