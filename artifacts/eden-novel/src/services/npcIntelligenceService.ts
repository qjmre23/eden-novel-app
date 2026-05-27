import { modelService } from './modelService';
import {
  getCharactersByNovel,
  getCharacterByUid,
  updateCharacterEmotion,
  updateCharacterVoiceProfile,
  logNpcSceneAction,
  updateCharacterAgenda,
} from '../database/characterDB';
import { Character } from '../database/db';
import { WorldStateData } from './worldStateService';

// ─── VOICE PROFILE GENERATION ───────────────────────────────────────────────

export interface VoiceProfile {
  speech_style: string;
  verbal_tics: string;
  motivation: string;
  fear: string;
  secret: string;
}

const SPEECH_STYLES = [
  'terse', 'verbose', 'cryptic', 'warm', 'cold', 'sarcastic', 'formal', 'erratic',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fallbackVoiceProfile(name: string, role: string): VoiceProfile {
  return {
    speech_style: pickRandom(SPEECH_STYLES),
    verbal_tics: `${name} pauses mid-sentence when uncertain, then continues with quiet conviction.`,
    motivation: role === 'antagonist'
      ? 'To control the people around them before they can be hurt again.'
      : 'To prove they belong in a world that has tried to push them out.',
    fear: 'Being seen for what they truly are — and being abandoned for it.',
    secret: 'There is a name they have not spoken aloud in years.',
  };
}

export async function generateVoiceProfile(
  characterName: string,
  characterRole: string,
  genre: string,
  storyContext: string,
): Promise<VoiceProfile> {
  const system = 'You are a character designer for dark anime stories. Create psychologically rich character profiles. Always output the requested labeled lines and nothing else.';
  const user = `Character: ${characterName}
Role: ${characterRole}
Genre: ${genre}
Story context: ${storyContext.slice(0, 400)}

Output EXACTLY this format (one per line, no extras, no markdown):
SPEECH_STYLE: <one of: terse, verbose, cryptic, warm, cold, sarcastic, formal, erratic>
VERBAL_TICS: <1-2 sentence behavioral pattern>
MOTIVATION: <what they secretly want, 1 sentence>
FEAR: <deepest fear, 1 sentence>
SECRET: <hidden truth they conceal, 1 sentence>`;

  try {
    const raw = await modelService.generateText(system, user, { maxTokens: 220, temperature: 0.85 });
    const out: VoiceProfile = { speech_style: '', verbal_tics: '', motivation: '', fear: '', secret: '' };
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*(SPEECH_STYLE|VERBAL_TICS|MOTIVATION|FEAR|SECRET)\s*:\s*(.+)$/i);
      if (!m) continue;
      const key = m[1].toUpperCase();
      const val = m[2].trim();
      if (key === 'SPEECH_STYLE') out.speech_style = val.toLowerCase();
      else if (key === 'VERBAL_TICS') out.verbal_tics = val;
      else if (key === 'MOTIVATION') out.motivation = val;
      else if (key === 'FEAR') out.fear = val;
      else if (key === 'SECRET') out.secret = val;
    }
    if (!out.speech_style) out.speech_style = pickRandom(SPEECH_STYLES);
    if (!out.verbal_tics || !out.motivation || !out.fear || !out.secret) {
      const fb = fallbackVoiceProfile(characterName, characterRole);
      out.verbal_tics ||= fb.verbal_tics;
      out.motivation ||= fb.motivation;
      out.fear ||= fb.fear;
      out.secret ||= fb.secret;
    }
    return out;
  } catch {
    return fallbackVoiceProfile(characterName, characterRole);
  }
}

/** Generate and persist a voice profile for a given character UID. Fire-and-forget safe. */
export async function ensureVoiceProfileForCharacter(
  novelId: number,
  uid: string,
  genre: string,
  storyContext: string,
): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char) return;
  if (char.speech_style && char.motivation && char.fear) return; // already populated
  const profile = await generateVoiceProfile(char.display_name, char.role, genre, storyContext);
  await updateCharacterVoiceProfile(uid, novelId, profile);
}

// ─── EMOTION PROPAGATION ────────────────────────────────────────────────────

const KNOWN_EMOTIONS = [
  'neutral', 'fearful', 'terrified', 'hopeful', 'excited', 'happy', 'content',
  'sad', 'grieving', 'angry', 'furious', 'conflicted', 'uncertain',
  'suspicious', 'guarded', 'amused', 'ashamed', 'desperate', 'numb', 'tender',
];

function normalizeEmotion(raw: string): string {
  const low = raw.toLowerCase().trim();
  const hit = KNOWN_EMOTIONS.find(e => low.includes(e));
  return hit ?? (low || 'neutral');
}

/**
 * Determine how each present NPC's emotional state should shift based on the
 * scene that just happened. Writes the updated emotions to the DB and logs
 * a scene action per NPC. Designed to be fire-and-forget; failures are silent.
 */
export async function propagateEmotions(
  novelId: number,
  sceneText: string,
  presentCharacterUids: string[],
  mcName: string,
): Promise<void> {
  if (!presentCharacterUids.length) return;
  const characters = await getCharactersByNovel(novelId);
  const present = presentCharacterUids
    .map(uid => characters.find(c => c.internal_uid === uid))
    .filter((c): c is Character => !!c && c.role !== 'protagonist');
  if (!present.length) return;

  const compactState = present
    .map(c => `${c.display_name} (current: ${c.current_emotion ?? 'neutral'} ${c.emotion_intensity ?? 50})`)
    .join('; ');

  const system = 'You track NPC emotional state changes in a dark anime story. Output only structured lines, no preamble.';
  const user = `MC: ${mcName}
Scene text:
"""${sceneText.slice(0, 600)}"""

Present NPCs and their current emotion: ${compactState}

For each NPC, output one line in this exact pipe-delimited format:
NAME|NEW_EMOTION|INTENSITY|REASON
- NEW_EMOTION must be a single word like: fearful, hopeful, grieving, furious, conflicted, suspicious, tender, ashamed, numb, desperate, amused, neutral
- INTENSITY is an integer 0-100
- REASON is max 10 words

Output one line per NPC, nothing else.`;

  try {
    const raw = await modelService.generateText(system, user, { maxTokens: 300, temperature: 0.5 });
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const nameMap = new Map(present.map(c => [c.display_name.toLowerCase(), c]));

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 3) continue;
      const [namePart, emotionRaw, intensityRaw, reasonRaw] = parts;
      const npc = nameMap.get(namePart.toLowerCase());
      if (!npc) continue;
      const emotion = normalizeEmotion(emotionRaw);
      const intensity = Math.max(0, Math.min(100, parseInt(intensityRaw, 10) || 50));
      await updateCharacterEmotion(npc.internal_uid, novelId, emotion, intensity);

      // Extract the most recent dialogue line by this NPC, if any
      const dialogueRe = new RegExp(`\\[${npc.display_name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\][:\\s]*"([^"]{3,200})"`, 'gi');
      const dialogueMatch = [...sceneText.matchAll(dialogueRe)].pop();
      const dialogueExcerpt = dialogueMatch ? dialogueMatch[1] : '';
      const reason = (reasonRaw || '').slice(0, 80);
      await logNpcSceneAction(
        novelId,
        npc.internal_uid,
        0,
        emotion,
        reason,
        dialogueExcerpt,
        0,
      );
    }
  } catch {
    // Silent fail — emotion propagation is non-blocking
  }
}

// ─── PRESENT NPC INFERENCE ──────────────────────────────────────────────────

/**
 * Decide which NPCs are physically present in the upcoming scene. We bias
 * toward characters who appeared in the active_character_uids list, are
 * alive, and have a current_location matching the world location.
 */
export function inferPresentNpcs(
  worldState: WorldStateData,
  allCharacters: Character[],
): Character[] {
  const npcs = allCharacters.filter(c => c.role !== 'protagonist' && c.status === 'alive');
  const activeUids = new Set(worldState.active_character_uids ?? []);
  const here = worldState.current_location?.toLowerCase().trim() ?? '';

  const explicit = npcs.filter(c => activeUids.has(c.internal_uid));
  if (explicit.length > 0) return explicit.slice(0, 6);

  const colocated = npcs.filter(c =>
    !c.current_location ||
    c.current_location.toLowerCase().includes(here) ||
    here.includes(c.current_location.toLowerCase()),
  );
  if (colocated.length > 0) return colocated.slice(0, 6);

  // Fall back to the most recently introduced NPCs
  return npcs
    .sort((a, b) => (b.last_interaction_scene ?? 0) - (a.last_interaction_scene ?? 0))
    .slice(0, 4);
}

// ─── PROMPT-INJECTABLE FORMATTERS ───────────────────────────────────────────

function trimLine(s: string, n: number): string {
  const clean = (s || '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean;
}

/**
 * Build a per-NPC behavioral context block for injection into the scene
 * prompt. Kept compact: max 6 lines per character, max 6 characters.
 */
export function buildNpcContextBlock(characters: Character[]): string {
  if (!characters.length) return '';
  const subset = characters.slice(0, 6);
  const lines: string[] = ['[CHARACTER PROFILES FOR THIS SCENE]'];
  for (const c of subset) {
    const role = c.role || 'npc';
    const status = c.status || 'alive';
    const emotion = c.current_emotion || 'neutral';
    const intensity = c.emotion_intensity ?? 50;
    const trust = c.trust_level ?? 0;
    const affection = c.affection_level ?? 0;
    const label = c.relationship_label || 'undefined';
    const motivation = trimLine(c.motivation || '', 100);
    const fear = trimLine(c.fear || '', 80);
    const style = c.speech_style || 'unset';
    const tic = trimLine(c.verbal_tics || '', 100);
    const secret = trimLine(c.secret || '', 100);
    let ignorantOf: string[] = [];
    try { ignorantOf = JSON.parse(c.ignorant_of || '[]'); } catch {}
    const ignorant = trimLine(ignorantOf.slice(0, 2).join('; '), 100);

    lines.push(`${c.display_name} (${role}, ${status}):`);
    lines.push(`  Emotion: ${emotion} (${intensity}/100) | Rel: ${label} | Trust: ${trust} | Affection: ${affection}`);
    if (motivation) lines.push(`  Motivation: ${motivation}`);
    if (fear) lines.push(`  Fear: ${fear}`);
    lines.push(`  Speech: ${style}${tic ? ` — ${tic}` : ''}`);
    if (secret) lines.push(`  CONCEALING: ${secret}`);
    if (ignorant) lines.push(`  Does not know: ${ignorant}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Returns a compact one-line-per-NPC emotional summary for prompt injection. */
export function formatNpcEmotionalStates(characters: Character[]): string {
  return characters
    .slice(0, 8)
    .map(c => `${c.display_name}: ${c.current_emotion ?? 'neutral'} (${c.emotion_intensity ?? 50}/100) | trust ${c.trust_level ?? 0}`)
    .join(' | ');
}

// ─── AGENDA HOOKS ────────────────────────────────────────────────────────────

export async function setNpcAgenda(novelId: number, uid: string, agenda: string): Promise<void> {
  await updateCharacterAgenda(uid, novelId, agenda.trim().slice(0, 240));
}
