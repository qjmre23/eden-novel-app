import type { Bubble } from '../context/StoryContext';

export interface NarratorVoice {
  id: string;
  name: string;
  description: string;
  langHint: string;
}

export const NARRATOR_VOICES: NarratorVoice[] = [
  { id: 'en-US-AriaNeural',    name: 'Aria',    description: 'Warm, expressive female narrator',       langHint: 'en-US' },
  { id: 'en-US-GuyNeural',     name: 'Guy',     description: 'Deep, authoritative male narrator',      langHint: 'en-US' },
  { id: 'en-GB-SoniaNeural',   name: 'Sonia',   description: 'British female — crisp and literary',    langHint: 'en-GB' },
  { id: 'en-GB-RyanNeural',    name: 'Ryan',    description: 'British male — dramatic and clear',      langHint: 'en-GB' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha', description: 'Australian female — smooth and natural', langHint: 'en-AU' },
  { id: 'en-IE-EmilyNeural',   name: 'Emily',   description: 'Irish female — gentle and immersive',    langHint: 'en-IE' },
];

const SETTINGS_KEY = 'narrator_settings';

export interface NarratorSettings {
  enabled: boolean;
  voice: string;
  mode: 'narrator_only' | 'all_dialogue';
  autoPlay: boolean;
}

function loadSettings(): NarratorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {}
  return defaultSettings();
}

function defaultSettings(): NarratorSettings {
  return { enabled: false, voice: NARRATOR_VOICES[0].id, mode: 'narrator_only', autoPlay: true };
}

function persistSettings(s: NarratorSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

function cleanText(text: string): string {
  return text
    .replace(/\/[a-zA-Z_]+(?::[^\/\n]*)?\//g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\*.*?\*/g, '')
    .trim();
}

function shouldSpeak(text: string): boolean {
  const cleaned = cleanText(text);
  if (cleaned.length < 10) return false;
  if (/^[^a-zA-Z0-9]+$/.test(cleaned)) return false;
  return true;
}

// ─── Capacitor / Native detection ────────────────────────────────────────────

function isNativePlatform(): boolean {
  try {
    return (
      typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor?.isNativePlatform?.() === true
    );
  } catch {
    return false;
  }
}

function getTtsApiBase(): string {
  return (
    localStorage.getItem('eden_tts_api_url') ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    '/api'
  );
}

// ─── Web Audio API playback (for native APK — non-blocking, no delay) ────────

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

async function playBase64Mp3(base64: string): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  return new Promise<void>((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    source.start(0);
  });
}

// ─── API TTS (edge-tts via Express — guaranteed Microsoft Neural voices) ─────

async function speakViaApi(text: string, voiceId: string): Promise<void> {
  const base = getTtsApiBase();
  const res = await fetch(`${base}/tts/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 2000), voice: voiceId }),
  });
  if (!res.ok) throw new Error(`TTS API ${res.status}`);
  const { audioBase64 } = (await res.json()) as { audioBase64: string };
  await playBase64Mp3(audioBase64);
}

// ─── Web Speech API (web fallback) ───────────────────────────────────────────

function getSynth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice(voiceId: string): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  const meta = NARRATOR_VOICES.find(v => v.id === voiceId);
  const name = meta?.name.toLowerCase() ?? '';
  const lang = meta?.langHint ?? 'en';

  const exact = voices.find(v => v.name.toLowerCase().includes(name) && v.name.toLowerCase().includes('microsoft'));
  if (exact) return exact;
  const byName = voices.find(v => v.name.toLowerCase().includes(name));
  if (byName) return byName;
  const byLang = voices.find(v => v.lang.startsWith(lang));
  if (byLang) return byLang;
  return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

function speakViaWebSpeech(text: string, voiceId: string): Promise<void> {
  return new Promise((resolve) => {
    const synth = getSynth();
    if (!synth) { resolve(); return; }

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    utter.onend   = () => resolve();
    utter.onerror = () => resolve();

    const setVoiceAndSpeak = () => {
      const voice = pickVoice(voiceId);
      if (voice) utter.voice = voice;
      synth.speak(utter);
    };

    if (synth.getVoices().length > 0) {
      setVoiceAndSpeak();
    } else {
      const onVoices = () => { synth.onvoiceschanged = null; setVoiceAndSpeak(); };
      synth.onvoiceschanged = onVoices;
      setTimeout(() => { if (!synth.speaking) setVoiceAndSpeak(); }, 500);
    }
  });
}

// ─── CompanionNarratorService ─────────────────────────────────────────────────

class CompanionNarratorService {
  private audioQueue: Array<{ bubbleId: string; text: string }> = [];
  private alreadySpoken = new Set<string>();
  private isProcessing = false;
  private stopped = false;
  private _isPlaying = false;
  private listeners: Array<() => void> = [];

  addListener(fn: () => void): void { this.listeners.push(fn); }
  removeListener(fn: () => void): void { this.listeners = this.listeners.filter(l => l !== fn); }
  private notify(): void { this.listeners.forEach(l => l()); }

  isPlaying(): boolean { return this._isPlaying; }
  getSettings(): NarratorSettings { return loadSettings(); }
  saveSettings(s: NarratorSettings): void { persistSettings(s); }

  pause(): void {
    this.stopped = true;
    if (!isNativePlatform()) getSynth()?.pause();
    this._isPlaying = false;
    this.notify();
  }

  resume(): void {
    if (!isNativePlatform()) {
      const synth = getSynth();
      if (synth?.paused) {
        this.stopped = false;
        synth.resume();
        this._isPlaying = true;
        this.notify();
        return;
      }
    }
    if (!this.isProcessing && this.audioQueue.length > 0) {
      this.stopped = false;
      void this.processQueue();
    }
  }

  togglePlayPause(): void {
    if (this._isPlaying) this.pause();
    else this.resume();
  }

  private async speakUtterance(text: string, voiceId: string): Promise<void> {
    this._isPlaying = true;
    this.notify();
    try {
      if (isNativePlatform()) {
        await speakViaApi(text, voiceId);
      } else {
        const synth = getSynth();
        if (synth) {
          await speakViaWebSpeech(text, voiceId);
        } else {
          await speakViaApi(text, voiceId);
        }
      }
    } catch {
    } finally {
      this._isPlaying = false;
      this.notify();
    }
  }

  enqueueBubble(bubble: Bubble): void {
    const settings = loadSettings();
    if (!settings.enabled || !settings.autoPlay) return;
    if (bubble.isTyping || bubble.isStreaming) return;
    if (bubble.isEnvironment || bubble.isChapterTransition || bubble.isUser) return;
    if (settings.mode === 'narrator_only' && !bubble.isNarrator) return;

    const text = bubble.content?.trim() ?? '';
    if (!shouldSpeak(text)) return;
    if (this.alreadySpoken.has(bubble.id)) return;
    this.alreadySpoken.add(bubble.id);

    this.audioQueue.push({ bubbleId: bubble.id, text });
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.stopped = false;

    while (this.audioQueue.length > 0 && !this.stopped) {
      const item = this.audioQueue.shift();
      if (!item) break;

      const settings = loadSettings();
      if (!settings.enabled) break;

      const cleaned = cleanText(item.text);
      if (!shouldSpeak(cleaned)) continue;

      try {
        await this.speakUtterance(cleaned.slice(0, 2000), settings.voice);
      } catch {
        this._isPlaying = false;
        this.notify();
      }
    }

    this.isProcessing = false;
    if (!this.stopped && this.audioQueue.length === 0) {
      this._isPlaying = false;
      this.notify();
    }
  }

  async previewVoice(voice?: string): Promise<void> {
    const settings = loadSettings();
    const v = voice ?? settings.voice;
    if (!isNativePlatform()) getSynth()?.cancel();
    try {
      await this.speakUtterance('Welcome to Eden Novel. Your story begins now.', v);
    } catch {}
  }

  stopAll(): void {
    this.stopped = true;
    this.audioQueue = [];
    if (!isNativePlatform()) getSynth()?.cancel();
    this._isPlaying = false;
    this.isProcessing = false;
    this.notify();
  }

  clearDedupe(): void {
    this.alreadySpoken.clear();
  }
}

export const companionNarratorService = new CompanionNarratorService();
