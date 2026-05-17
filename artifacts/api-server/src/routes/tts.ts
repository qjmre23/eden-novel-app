import { Router } from "express";
import { ttsSave } from "edge-tts";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../lib/logger";

const router = Router();

const PREVIEW_PHRASE = "Welcome to Eden Novel. Your story begins now.";
const previewCache = new Map<string, string>();

async function synthesize(text: string, voice: string): Promise<string> {
  const tmpFile = path.join(
    os.tmpdir(),
    `eden_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`,
  );
  try {
    await ttsSave(text, tmpFile, { voice });
    const data = fs.readFileSync(tmpFile);
    return data.toString("base64");
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  }
}

router.post("/speak", async (req, res) => {
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };
    if (!text || !voice) {
      res.status(400).json({ error: "text and voice are required" });
      return;
    }
    const audioBase64 = await synthesize(text.slice(0, 2000), voice);
    res.json({ audioBase64 });
  } catch (err) {
    logger.error({ err }, "TTS /speak error");
    res.status(500).json({ error: "TTS synthesis failed" });
  }
});

router.post("/preview", async (req, res) => {
  try {
    const { voice } = req.body as { voice?: string };
    if (!voice) {
      res.status(400).json({ error: "voice is required" });
      return;
    }
    const cached = previewCache.get(voice);
    if (cached) {
      res.json({ audioBase64: cached });
      return;
    }
    const audioBase64 = await synthesize(PREVIEW_PHRASE, voice);
    previewCache.set(voice, audioBase64);
    res.json({ audioBase64 });
  } catch (err) {
    logger.error({ err }, "TTS /preview error");
    res.status(500).json({ error: "TTS preview failed" });
  }
});

export default router;
