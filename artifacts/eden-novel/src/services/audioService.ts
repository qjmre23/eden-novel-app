const AMBIENT_KEY = 'eden_ambient_enabled';
const MUSIC_KEY = 'eden_music_enabled';
const SFX_KEY = 'eden_sfx_enabled';

class AudioService {
  private ambientEl: HTMLAudioElement | null = null;
  private musicEl: HTMLAudioElement | null = null;
  private readonly FADE_STEPS = 20;
  private readonly FADE_INTERVAL_MS = 50;

  private isEnabled(key: string): boolean {
    return localStorage.getItem(key) !== 'false';
  }

  private async fadeOut(el: HTMLAudioElement): Promise<void> {
    const step = el.volume / this.FADE_STEPS;
    return new Promise(resolve => {
      const timer = setInterval(() => {
        if (el.volume <= step) {
          el.volume = 0;
          el.pause();
          clearInterval(timer);
          resolve();
        } else {
          el.volume = Math.max(0, el.volume - step);
        }
      }, this.FADE_INTERVAL_MS);
    });
  }

  private fadeIn(el: HTMLAudioElement, targetVolume = 0.4): void {
    el.volume = 0;
    el.play().catch(() => {});
    const step = targetVolume / this.FADE_STEPS;
    const timer = setInterval(() => {
      if (el.volume >= targetVolume - step) {
        el.volume = targetVolume;
        clearInterval(timer);
      } else {
        el.volume = Math.min(targetVolume, el.volume + step);
      }
    }, this.FADE_INTERVAL_MS);
  }

  async playAmbient(trackPath: string): Promise<void> {
    if (!this.isEnabled(AMBIENT_KEY)) return;
    if (this.ambientEl) {
      await this.fadeOut(this.ambientEl);
      this.ambientEl = null;
    }
    try {
      const el = new Audio(trackPath);
      el.loop = true;
      this.ambientEl = el;
      this.fadeIn(el, 0.3);
    } catch {}
  }

  async stopAmbient(): Promise<void> {
    if (this.ambientEl) {
      await this.fadeOut(this.ambientEl);
      this.ambientEl = null;
    }
  }

  async playMusic(trackPath: string): Promise<void> {
    if (!this.isEnabled(MUSIC_KEY)) return;
    if (this.musicEl) {
      await this.fadeOut(this.musicEl);
      this.musicEl = null;
    }
    try {
      const el = new Audio(trackPath);
      el.loop = true;
      this.musicEl = el;
      this.fadeIn(el, 0.5);
    } catch {}
  }

  async stopMusic(): Promise<void> {
    if (this.musicEl) {
      await this.fadeOut(this.musicEl);
      this.musicEl = null;
    }
  }

  playSfx(trackPath: string): void {
    if (!this.isEnabled(SFX_KEY)) return;
    try {
      const el = new Audio(trackPath);
      el.volume = 0.6;
      el.play().catch(() => {});
    } catch {}
  }
}

export const audioService = new AudioService();
