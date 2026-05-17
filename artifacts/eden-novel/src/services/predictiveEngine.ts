import { generateNextScene } from './orchestrationService';
import type { GenerationCallbacks } from './orchestrationService';
import { modelService } from './modelService';

const ENABLED_KEY = 'eden_predictive_enabled';
const MAX_AGE_MS = 5 * 60 * 1000;
// Pre-generate up to this many choices concurrently to raise cache-hit rate
const MAX_PRE_GENERATE = 2;

interface CacheEntry {
  fullText: string;
  timestamp: number;
}

class PredictiveEngine {
  private cache = new Map<string, CacheEntry>();
  private busy = false;

  isEnabled(): boolean {
    return localStorage.getItem(ENABLED_KEY) !== 'false';
  }

  hasCached(choice: string): boolean {
    const entry = this.cache.get(choice);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > MAX_AGE_MS) {
      this.cache.delete(choice);
      return false;
    }
    return true;
  }

  consume(choice: string): string | null {
    const entry = this.cache.get(choice);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > MAX_AGE_MS) {
      this.cache.delete(choice);
      return null;
    }
    this.cache.delete(choice);
    return entry.fullText;
  }

  clear(): void {
    this.cache.clear();
    this.busy = false;
  }

  async preGenerate(
    novelId: number,
    timelineId: string,
    mcUid: string,
    mcName: string,
    genre: string,
    choices: string[],
    maxTokens: number,
    temperature: number,
  ): Promise<void> {
    if (!this.isEnabled() || this.busy || choices.length === 0) return;
    if (modelService.isStreaming) return;
    this.busy = true;
    this.cache.clear();

    // Pre-generate the top N choices in parallel to maximise cache-hit rate
    const targets = choices.slice(0, MAX_PRE_GENERATE);

    const buildCallbacks = (buf: { text: string }): GenerationCallbacks => ({
      onToken: (t) => { buf.text += t; },
      onTagsParsed: () => {},
      onLevelUp: () => {},
      onChapterEnd: () => {},
      onPilotPause: () => {},
      onNewCharacter: () => {},
      onSkillUnlock: () => {},
      onError: () => {},
    });

    try {
      await Promise.all(targets.map(async (choice) => {
        const buf = { text: '' };
        try {
          // dryRun=true: LLM-only, no DB/state mutations (no scene increment, no memory, no inventory writes)
          await generateNextScene(novelId, timelineId, mcUid, mcName, genre, choice, buildCallbacks(buf), maxTokens, temperature, 0, undefined, true);
          if (buf.text.length > 50) {
            this.cache.set(choice, { fullText: buf.text, timestamp: Date.now() });
          }
        } catch {}
      }));
    } finally {
      this.busy = false;
    }
  }
}

export const predictiveEngine = new PredictiveEngine();
