import { getCharactersByNovel, updateCharacter } from '../database/characterDB';

const VOICE_POOL = ['alloy', 'echo', 'fable', 'onyx', 'shimmer', 'nova'];
const NARRATOR_VOICE = 'onyx';
const STORAGE_PREFIX = 'eden_voice_';

function storageKey(novelId: number, characterName: string): string {
  return `${STORAGE_PREFIX}${novelId}_${characterName.toLowerCase().replace(/\s+/g, '_')}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function getVoiceForCharacter(novelId: number, characterName: string, isNarrator = false): string {
  if (isNarrator) return NARRATOR_VOICE;
  const key = storageKey(novelId, characterName);
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const assigned = VOICE_POOL[Math.abs(hashCode(characterName)) % VOICE_POOL.length];
  localStorage.setItem(key, assigned);
  return assigned;
}

export async function assignVoice(novelId: number, characterName: string, isNarrator = false): Promise<string> {
  if (isNarrator) return NARRATOR_VOICE;

  const key = storageKey(novelId, characterName);
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  const assigned = VOICE_POOL[Math.abs(hashCode(characterName)) % VOICE_POOL.length];
  localStorage.setItem(key, assigned);

  try {
    const chars = await getCharactersByNovel(novelId);
    const char = chars.find(c => c.display_name === characterName);
    if (char?.id) {
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(char.metadata_json); } catch {}
      if (!meta.voice_id) {
        meta.voice_id = assigned;
        await updateCharacter(char.id, { metadata_json: JSON.stringify(meta) });
      }
    }
  } catch {}

  return assigned;
}

export function clearVoiceAssignments(novelId: number): void {
  const prefix = `${STORAGE_PREFIX}${novelId}_`;
  const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith(prefix));
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
