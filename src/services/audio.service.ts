/**
 * Audio Service - Procedural Web Audio API sound generator & Web Speech API TTS manager
 * 
 * Satisfies:
 * - Procedural sound synthesis for catch, bonus catch, miss, victory/level complete, combo, and tactile UI click.
 * - Zero external sound file downloads, 100% offline capable.
 * - Web Speech API TTS integration with 0.9x rate for 2nd grade comprehension and graceful offline/headless fallback.
 * - Mobile first-touch unlock listener for AudioContext suspension policies (Safari/Chrome).
 * - Master volume controls and mute toggles respecting UserProgress settings.
 * - WCAG AAA live-region screen reader announcements for audio prompts.
 */
import { storageService, StorageService } from './storage.service';

export interface IAudioSynthesizer {
  unlock(): Promise<void>;
  playCatch(isBonus?: boolean): void;
  playMiss(): void;
  playLevelComplete(): void;
  playCombo(count: number): void;
  playClick(): void;
  speakPrompt(text: string): Promise<void>;
  stopSpeaking(): void;
  setVolume(volume: number): void;
  getVolume(): number;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  toggleMute(): boolean;
  setTtsEnabled(enabled: boolean): void;
  isTtsEnabled(): boolean;
  toggleTts(): boolean;
  isUnlocked(): boolean;
  getAudioContext(): AudioContext | null;
}

// Pentatonic scale frequencies for combo escalation (Hz)
const COMBO_PENTATONIC = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  1046.50, // C6
  1174.66, // D6
  1318.51  // E6
];

/**
 * Normalizes phonetic symbols, slashes, and affix notations for natural TTS pronunciation.
 * Replaces dictionary notation (e.g. /ē/, /ĕ/, /ā/, /är/) with their natural phoneme words,
 * so browser speech engines do not utter the word "slash".
 */
export function normalizePhoneticsForSpeech(text: string): string {
  if (!text) return '';

  let speech = text;

  // 1. Long vowels preceded by 'long' or standalone
  // e.g. "long /ē/" -> "long E", "/ē/" -> "long E"
  speech = speech.replace(/\blong\s+\/([āaA])\//gi, 'long A');
  speech = speech.replace(/\blong\s+\/([ēeE])\//gi, 'long E');
  speech = speech.replace(/\blong\s+\/([īiI])\//gi, 'long I');
  speech = speech.replace(/\blong\s+\/([ōoO])\//gi, 'long O');
  speech = speech.replace(/\blong\s+\/([ūuU])\//gi, 'long U');

  // 2. Short vowels preceded by 'short' or standalone
  // e.g. "short /ĕ/" -> "short E", "/ĕ/" -> "short E"
  speech = speech.replace(/\bshort\s+\/([ăaA])\//gi, 'short A');
  speech = speech.replace(/\bshort\s+\/([ĕeE])\//gi, 'short E');
  speech = speech.replace(/\bshort\s+\/([ĭiI])\//gi, 'short I');
  speech = speech.replace(/\bshort\s+\/([ŏoO])\//gi, 'short O');
  speech = speech.replace(/\bshort\s+\/([ŭuU])\//gi, 'short U');

  // 3. Standalone phonetic vowel symbols with macrons (ā, ē, ī, ō, ū)
  speech = speech.replace(/\/([āA])\//g, 'long A');
  speech = speech.replace(/\/([ēE])\//g, 'long E');
  speech = speech.replace(/\/([īI])\//g, 'long I');
  speech = speech.replace(/\/([ōO])\//g, 'long O');
  speech = speech.replace(/\/([ūU])\//g, 'long U');

  // 4. Standalone phonetic vowel symbols with breves (ă, ĕ, ĭ, ŏ, ŭ)
  speech = speech.replace(/\/([ă])\//g, 'short A');
  speech = speech.replace(/\/([ĕ])\//g, 'short E');
  speech = speech.replace(/\/([ĭ])\//g, 'short I');
  speech = speech.replace(/\/([ŏ])\//g, 'short O');
  speech = speech.replace(/\/([ŭ])\//g, 'short U');

  // 5. R-controlled vowels
  speech = speech.replace(/\/är\/|\/ar\//gi, 'ar');
  speech = speech.replace(/\/ôr\/|\/or\//gi, 'or');
  speech = speech.replace(/\/ẽr\/|\/er\/|\/ir\/|\/ur\//gi, 'er');

  // 6. Double-o sounds (/oo/, /ōō/, /o͝o/)
  speech = speech.replace(/\/(oo|ōō|o͝o)\//gi, 'oo');

  // 7. Affix slashes (e.g. -s / -es, -s/-es)
  speech = speech.replace(/-\s*s\s*\/\s*-\s*es/gi, '-s or -es');
  speech = speech.replace(/(\w+)\s*\/\s*(\w+)/g, '$1 or $2');

  // 8. Any other enclosed phoneme pattern like /ch/, /sh/, /th/ -> ch, sh, th
  speech = speech.replace(/\/([^\/\s]+)\//g, '$1');

  // 9. Any stray standalone forward slash
  speech = speech.replace(/\s*\/\s*/g, ' or ');
  speech = speech.replace(/\//g, ' ');

  return speech.trim();
}

export class AudioService implements IAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.8;
  private muted: boolean = false;
  private ttsEnabled: boolean = true;
  private unlocked: boolean = false;
  private storage: StorageService;
  private unlockListenersAttached: boolean = false;

  constructor(customContext?: AudioContext | null, storage: StorageService = storageService) {
    this.storage = storage;

    // Initialize AudioContext if available
    if (customContext !== undefined) {
      this.ctx = customContext;
    } else if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }

    if (this.ctx) {
      this.setupMasterGain();
    }

    // Attach first-touch unlock listeners in browser environment
    if (typeof window !== 'undefined') {
      this.attachFirstTouchListeners();
    }

    // Sync settings from storage asynchronously
    this.syncWithStorage().catch(() => {});
  }

  /**
   * Initializes the master gain node routing audio to destination
   */
  private setupMasterGain(): void {
    if (!this.ctx) return;
    try {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.masterGain = null;
    }
  }

  /**
   * Synchronizes volume and TTS toggles from persistent storage
   */
  public async syncWithStorage(): Promise<void> {
    try {
      const progress = await this.storage.getProgress();
      if (progress?.settings) {
        this.volume = progress.settings.sfxVolume;
        this.ttsEnabled = progress.settings.ttsEnabled;
        this.updateGain();
      }
    } catch {
      // Retain default values if storage is unreachable
    }
  }

  /**
   * Attaches one-time event listeners on user interaction to unlock AudioContext
   */
  private attachFirstTouchListeners(): void {
    if (this.unlockListenersAttached || typeof window === 'undefined') return;
    this.unlockListenersAttached = true;

    const unlockHandler = () => {
      this.unlock().catch(() => {});
    };

    ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlockHandler, { once: true, passive: true });
    });
  }

  /**
   * Unlocks AudioContext (required by Safari & Chrome auto-play policy)
   */
  public async unlock(): Promise<void> {
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      try {
        await Promise.race([
          this.ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, 150))
        ]);
      } catch {
        // Handle environments where resume is rejected
      }
    }

    this.unlocked = this.ctx.state === 'running';
  }

  public isUnlocked(): boolean {
    return this.unlocked || (this.ctx ? this.ctx.state === 'running' : false);
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  private updateGain(): void {
    if (!this.masterGain || !this.ctx) return;
    try {
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
    } catch {
      // Ignore audio parameter errors in closed contexts
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateGain();
    this.storage.updateSettings({ sfxVolume: this.volume }).catch(() => {});
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateGain();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setTtsEnabled(enabled: boolean): void {
    this.ttsEnabled = enabled;
    this.storage.updateSettings({ ttsEnabled: enabled }).catch(() => {});
  }

  public isTtsEnabled(): boolean {
    return this.ttsEnabled;
  }

  public toggleTts(): boolean {
    this.setTtsEnabled(!this.ttsEnabled);
    return this.ttsEnabled;
  }

  // ==========================================================================
  // Procedural Sound Generator (Web Audio API)
  // ==========================================================================

  /**
   * Helper to create and connect an oscillator with envelope
   */
  private createTone(
    frequency: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain: number = 0.25
  ): { osc: OscillatorNode; gain: GainNode } | null {
    if (!this.ctx || !this.masterGain || this.muted) return null;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);

      // Gentle attack and exponential decay envelope
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.02, duration * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);

      return { osc, gain };
    } catch {
      return null;
    }
  }

  /**
   * Melodic ascending chime on correct fruit catch
   * Normal: 2-note ascending chime (E5 -> A5)
   * Bonus: 4-note ascending major arpeggio (C5 -> E5 -> G5 -> C6)
   */
  public playCatch(isBonus: boolean = false): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    if (isBonus) {
      // 4-note ascending arpeggio with rich harmonics
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        this.createTone(freq, 'triangle', now + i * 0.06, 0.22, 0.28);
        this.createTone(freq * 1.5, 'sine', now + i * 0.06, 0.16, 0.12);
      });
    } else {
      // 2-note ascending chime (E5 -> A5)
      this.createTone(659.25, 'sine', now, 0.18, 0.25);
      this.createTone(880.00, 'triangle', now + 0.08, 0.24, 0.28);
    }
  }

  /**
   * Soft low descending tone on miss (never harsh or punishing for 7yo)
   * Sine/triangle tone gliding from 260Hz to 180Hz over 250ms
   */
  public playMiss(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.26;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(175, now + duration);

      // Gentle soft envelope
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.20, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Safe fallback
    }
  }

  /**
   * Upbeat harmonic victory jingle upon level completion
   * 5-note triumphant fanfare with dual octave harmonics
   */
  public playLevelComplete(): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const fanfare = [
      { freq: 392.00, delay: 0.00, dur: 0.14 }, // G4
      { freq: 523.25, delay: 0.12, dur: 0.14 }, // C5
      { freq: 659.25, delay: 0.24, dur: 0.14 }, // E5
      { freq: 783.99, delay: 0.36, dur: 0.18 }, // G5
      { freq: 1046.50, delay: 0.52, dur: 0.45 } // C6 (sustained finale)
    ];

    fanfare.forEach(item => {
      this.createTone(item.freq, 'triangle', now + item.delay, item.dur, 0.30);
      this.createTone(item.freq * 2, 'sine', now + item.delay, item.dur * 0.75, 0.12);
    });
  }

  /**
   * Frequency-scaled cheerful chime based on combo streak
   */
  public playCombo(comboCount: number): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const idx = Math.min(Math.max(comboCount - 1, 0), COMBO_PENTATONIC.length - 1);
    const freq = COMBO_PENTATONIC[idx] ?? 523.25;

    // Primary bright chime + octave sparkle
    this.createTone(freq, 'triangle', now, 0.18, 0.28);
    this.createTone(freq * 2, 'sine', now + 0.02, 0.14, 0.15);
  }

  /**
   * Short tactile UI button click
   */
  public playClick(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + duration);

      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Safe fallback
    }
  }

  // ==========================================================================
  // WEB SPEECH API (TTS) ENGINE
  // ==========================================================================

  /**
   * Speaks prompt text via Web Speech API
   * - Normalizes phonetic dictionary symbols (e.g. /ē/, /ĕ/, /ā/) to natural phoneme sounds
   * - Rate: 0.9x for Grade 2 comprehension
   * - Pitch: 1.0 (friendly tone)
   * - Announces to WCAG AAA #sr-announcements live-region
   * - Graceful offline / headless fallback with timeout guard
   */
  public speakPrompt(text: string): Promise<void> {
    const spokenText = normalizePhoneticsForSpeech(text);

    // Accessibility announcement for screen readers
    if (typeof document !== 'undefined') {
      const srElement = document.getElementById('sr-announcements');
      if (srElement) {
        srElement.textContent = spokenText;
      }
    }

    if (!this.ttsEnabled || this.muted) {
      return Promise.resolve();
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        // Select English voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const englishVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
        }

        // Safety timeout guard to prevent promise from hanging in buggy browsers
        const timer = setTimeout(() => {
          resolve();
        }, 4000);

        utterance.onend = () => {
          clearTimeout(timer);
          resolve();
        };

        utterance.onerror = () => {
          clearTimeout(timer);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Immediately stops any active TTS speech
   */
  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore errors
      }
    }
  }
}

// Export game-wide singleton
export const audioService = new AudioService();
