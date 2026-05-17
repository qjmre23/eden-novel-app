import { Router } from "express";
import { ttsSave } from "edge-tts";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../lib/logger";

const router = Router();

const PREVIEW_PHRASE = "Welcome to Eden Novel. Your story begins now.";
// Preview cache keyed by "voice::apiKeyHash" so different API keys don't share stale cache
const previewCache = new Map<string, string>();

const BEDROCK_AUDIO_URL =
  "https://bedrock-mantle.us-east-1.api.aws/v1/audio/speech";
const VOXTRAL_MODEL = "mistral.voxtral-small-24b-2507";

// Map our Microsoft Neural voice IDs to Voxtral-compatible voice names
const VOICE_MAP: Record<string, string> = {
  "en-US-AriaNeural":    "aria",
  "en-US-GuyNeural":     "guy",
  "en-GB-SoniaNeural":   "sonia",
  "en-GB-RyanNeural":    "ryan",
  "en-AU-NatashaNeural": "natasha",
  "en-IE-EmilyNeural":   "emily",
};

/**
 * Attempt TTS via Mistral Voxtral on Bedrock Mantle.
 * Returns base64-encoded MP3 on success, null on any failure.
 */
async function synthesizeVoxtral(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const voxtralVoice = VOICE_MAP[voiceId] ?? "aria";
    const res = await fetch(BEDROCK_AUDIO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model: VOXTRAL_MODEL,
        input: text,
        voice: voxtralVoice,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "Voxtral TTS non-OK, will fall back");
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";

    // Binary audio response (OpenAI-style)
    if (
      contentType.includes("audio/") ||
      contentType.includes("application/octet-stream")
    ) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 100) return buffer.toString("base64");
      return null;
    }

    // JSON response with embedded base64
    const json = (await res.json()) as Record<string, unknown>;
    if (typeof json.audioBase64 === "string" && json.audioBase64) {
      return json.audioBase64 as string;
    }
    if (typeof json.data === "string" && json.data) {
      return json.data as string;
    }

    return null;
  } catch (err) {
    logger.warn({ err }, "Voxtral TTS exception, will fall back");
    return null;
  }
}

/**
 * Fallback TTS via edge-tts (Microsoft Neural voices — no API key needed).
 */
async function synthesizeEdgeTts(text: string, voice: string): Promise<string> {
  const tmpFile = path.join(
    os.tmpdir(),
    `eden_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
  );
  try {
    await ttsSave(text, tmpFile, { voice });
    const data = fs.readFileSync(tmpFile);
    return data.toString("base64");
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

/**
 * Synthesize: tries Voxtral first, falls back to edge-tts.
 */
async function synthesize(
  text: string,
  voice: string,
  apiKey: string
): Promise<{ audioBase64: string; engine: "voxtral" | "edge-tts" }> {
  const voxtral = await synthesizeVoxtral(text.slice(0, 2000), voice, apiKey);
  if (voxtral) return { audioBase64: voxtral, engine: "voxtral" };

  const edgeAudio = await synthesizeEdgeTts(text.slice(0, 2000), voice);
  return { audioBase64: edgeAudio, engine: "edge-tts" };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/speak", async (req, res) => {
  try {
    const { text, voice, apiKey } = req.body as {
      text?: string;
      voice?: string;
      apiKey?: string;
    };
    if (!text || !voice) {
      res.status(400).json({ error: "text and voice are required" });
      return;
    }
    const result = await synthesize(text, voice, apiKey ?? "");
    res.json({ audioBase64: result.audioBase64, engine: result.engine });
  } catch (err) {
    logger.error({ err }, "TTS /speak error");
    res.status(500).json({ error: "TTS synthesis failed" });
  }
});

router.post("/preview", async (req, res) => {
  try {
    const { voice, apiKey } = req.body as {
      voice?: string;
      apiKey?: string;
    };
    if (!voice) {
      res.status(400).json({ error: "voice is required" });
      return;
    }
    // Cache key includes whether we have an API key (Voxtral vs edge-tts)
    const cacheKey = `${voice}::${apiKey ? "voxtral" : "edge"}`;
    const cached = previewCache.get(cacheKey);
    if (cached) {
      res.json({ audioBase64: cached, engine: apiKey ? "voxtral" : "edge-tts" });
      return;
    }
    const result = await synthesize(PREVIEW_PHRASE, voice, apiKey ?? "");
    previewCache.set(cacheKey, result.audioBase64);
    res.json({ audioBase64: result.audioBase64, engine: result.engine });
  } catch (err) {
    logger.error({ err }, "TTS /preview error");
    res.status(500).json({ error: "TTS preview failed" });
  }
});

export default router;
