// novaSonicService.ts — Frontend client for Nova TTS (optional, Amazon Polly)

const NOVA_TTS_ENDPOINT = "/nova/tts";

function isTtsEnabled(): boolean {
  try {
    const raw = localStorage.getItem('eden_settings');
    if (raw) return JSON.parse(raw)?.novaTtsEnabled === true;
  } catch {}
  return false;
}

class NovaSonicService {
  private audioContext: AudioContext | null = null;
  private isSpeaking = false;
  private isPaused = false;
  private audioQueue: AudioBuffer[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  private alreadySpoken = new Set<string>();

  // ===== TTS: Read a bubble aloud =====
  async speakBubble(
    bubbleId: string,
    text: string,
    speaker: string | undefined,
    isNarrator: boolean,
    voice?: string
  ): Promise<void> {
    if (!isTtsEnabled()) return;
    if (this.alreadySpoken.has(bubbleId)) return;
    this.alreadySpoken.add(bubbleId);

    if (this.isPaused) return;

    try {
      const response = await fetch(NOVA_TTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 800), speaker, isNarrator, voice }),
      });

      if (!response.ok) {
        console.error("[Nova TTS] HTTP error:", response.status);
        return;
      }

      const { audioChunks } = (await response.json()) as { audioChunks: string[] };
      if (!audioChunks?.length) return;

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
      }

      for (const chunk of audioChunks) {
        if (this.isPaused) break;
        const pcmBytes = Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0));
        const audioBuffer = this.pcmToAudioBuffer(pcmBytes);
        this.audioQueue.push(audioBuffer);
      }

      if (!this.isSpeaking) {
        this.playQueue();
      }
    } catch (err) {
      console.error("[Nova TTS] Fetch error:", err);
    }
  }

  private pcmToAudioBuffer(pcmBytes: Uint8Array): AudioBuffer {
    const sampleRate = 16000;
    const numSamples = pcmBytes.byteLength / 2;
    const audioBuffer = this.audioContext!.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    const dataView = new DataView(pcmBytes.buffer);
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }
    return audioBuffer;
  }

  private playQueue() {
    if (!this.audioQueue.length || this.isPaused) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const buffer = this.audioQueue.shift()!;
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext!.destination);
    this.currentSource = source;

    source.onended = () => {
      this.currentSource = null;
      this.playQueue();
    };

    source.start(0);
  }

  stop() {
    this.isPaused = true;
    try { this.currentSource?.stop(); } catch {}
    this.currentSource = null;
    this.audioQueue = [];
    this.isSpeaking = false;
  }

  resume() {
    this.isPaused = false;
    if (!this.isSpeaking && this.audioQueue.length) {
      this.playQueue();
    }
  }

  clearDedupe() {
    this.alreadySpoken.clear();
  }

  get speaking() { return this.isSpeaking; }
  get paused() { return this.isPaused; }
}

export const novaSonicService = new NovaSonicService();
