import db, { Character, CharacterRelationship, NpcSceneLog } from './db';
import { generateId } from '../core/utils';
import { CHARACTER_ACCENT_COLORS } from '../core/constants';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export async function createCharacter(data: Omit<Character, 'id' | 'internal_uid' | 'created_at' | 'bubble_color'>): Promise<Character> {
  const existingCount = await db.characters.where('novel_id').equals(data.novel_id).count();
  const char: Character = {
    ...data,
    internal_uid: generateId(),
    bubble_color: CHARACTER_ACCENT_COLORS[existingCount % CHARACTER_ACCENT_COLORS.length],
    current_location: data.current_location ?? '',
    has_introduced_self: data.has_introduced_self ?? (data.role === 'protagonist'),
    created_at: Date.now(),
    // intelligence defaults
    current_emotion: data.current_emotion ?? 'neutral',
    emotion_intensity: data.emotion_intensity ?? 50,
    emotional_history: data.emotional_history ?? '[]',
    speech_style: data.speech_style ?? '',
    verbal_tics: data.verbal_tics ?? '',
    secret: data.secret ?? '',
    motivation: data.motivation ?? '',
    fear: data.fear ?? '',
    known_facts: data.known_facts ?? '[]',
    ignorant_of: data.ignorant_of ?? '[]',
    last_seen_location: data.last_seen_location ?? data.current_location ?? '',
    last_interaction_scene: data.last_interaction_scene ?? 0,
    relationship_label: data.relationship_label ?? '',
    trust_level: data.trust_level ?? 0,
    affection_level: data.affection_level ?? 0,
    respect_level: data.respect_level ?? 0,
    current_agenda: data.current_agenda ?? '',
  };
  const id = await db.characters.add(char);
  return { ...char, id: id as number };
}

export async function getCharactersByNovel(novelId: number): Promise<Character[]> {
  return db.characters.where('novel_id').equals(novelId).toArray();
}

export async function getCharacterByUid(uid: string, novelId: number): Promise<Character | undefined> {
  return db.characters.where('internal_uid').equals(uid).and(c => c.novel_id === novelId).first();
}

export async function updateCharacter(id: number, data: Partial<Character>): Promise<void> {
  await db.characters.update(id, data);
}

export async function markCharacterIntroduced(uid: string, novelId: number): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (char?.id) await db.characters.update(char.id, { has_introduced_self: true });
}

export async function updateCharacterLocation(uid: string, novelId: number, location: string): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (char?.id) await db.characters.update(char.id, { current_location: location, last_seen_location: location });
}

export async function updateCharacterMetadata(uid: string, novelId: number, updates: Record<string, unknown>): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char || !char.id) return;
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(char.metadata_json); } catch {}
  Object.assign(meta, updates);
  await db.characters.update(char.id, { metadata_json: JSON.stringify(meta) });
}

export async function getRelationships(novelId: number): Promise<CharacterRelationship[]> {
  return db.character_relationships.where('novel_id').equals(novelId).toArray();
}

export async function updateRelationship(novelId: number, uidA: string, uidB: string, type: string, value: number, description?: string): Promise<void> {
  const existing = await db.character_relationships
    .where('novel_id').equals(novelId)
    .and(r => (r.character_a_uid === uidA && r.character_b_uid === uidB) || (r.character_a_uid === uidB && r.character_b_uid === uidA))
    .first();
  if (existing?.id) {
    await db.character_relationships.update(existing.id, { relationship_type: type, value, description: description ?? existing.description, updated_at: Date.now() });
  } else {
    await db.character_relationships.add({ novel_id: novelId, character_a_uid: uidA, character_b_uid: uidB, relationship_type: type, value, description: description ?? '', updated_at: Date.now() });
  }
}

/** Apply an additive delta to an existing relationship value. Creates the record if missing. */
export async function applyRelationshipDelta(novelId: number, uidA: string, uidB: string, delta: number): Promise<void> {
  const existing = await db.character_relationships
    .where('novel_id').equals(novelId)
    .and(r => (r.character_a_uid === uidA && r.character_b_uid === uidB) || (r.character_a_uid === uidB && r.character_b_uid === uidA))
    .first();
  const newValue = (existing?.value ?? 0) + delta;
  if (existing?.id) {
    await db.character_relationships.update(existing.id, { value: newValue, updated_at: Date.now() });
  } else {
    await db.character_relationships.add({ novel_id: novelId, character_a_uid: uidA, character_b_uid: uidB, relationship_type: 'minigame', value: newValue, description: '', updated_at: Date.now() });
  }
}

// ─── v5 NPC INTELLIGENCE FUNCTIONS ─────────────────────────────────────────

export async function updateCharacterEmotion(uid: string, novelId: number, emotion: string, intensity: number): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char?.id) return;
  let history: { emotion: string; intensity: number; ts: number }[] = [];
  try { history = JSON.parse(char.emotional_history || '[]'); } catch {}
  history.unshift({ emotion, intensity: clamp(intensity, 0, 100), ts: Date.now() });
  history = history.slice(0, 5);
  await db.characters.update(char.id, {
    current_emotion: emotion,
    emotion_intensity: clamp(intensity, 0, 100),
    emotional_history: JSON.stringify(history),
  });
}

export async function updateCharacterRelationshipMetrics(
  uid: string,
  novelId: number,
  trustDelta: number,
  affectionDelta: number,
  respectDelta: number,
): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char?.id) return;
  const trust = clamp((char.trust_level ?? 0) + trustDelta, -100, 100);
  const affection = clamp((char.affection_level ?? 0) + affectionDelta, -100, 100);
  const respect = clamp((char.respect_level ?? 0) + respectDelta, -100, 100);
  await db.characters.update(char.id, {
    trust_level: trust,
    affection_level: affection,
    respect_level: respect,
  });
}

export interface CharacterMentalState {
  emotion: string;
  intensity: number;
  emotional_history: { emotion: string; intensity: number; ts: number }[];
  trust_level: number;
  affection_level: number;
  respect_level: number;
  motivation: string;
  fear: string;
  secret: string;
}

export async function getCharacterMentalState(uid: string, novelId: number): Promise<CharacterMentalState | null> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char) return null;
  let history: { emotion: string; intensity: number; ts: number }[] = [];
  try { history = JSON.parse(char.emotional_history || '[]'); } catch {}
  return {
    emotion: char.current_emotion ?? 'neutral',
    intensity: char.emotion_intensity ?? 50,
    emotional_history: history,
    trust_level: char.trust_level ?? 0,
    affection_level: char.affection_level ?? 0,
    respect_level: char.respect_level ?? 0,
    motivation: char.motivation ?? '',
    fear: char.fear ?? '',
    secret: char.secret ?? '',
  };
}

export async function logNpcSceneAction(
  novelId: number,
  characterUid: string,
  sceneNumber: number,
  emotion: string,
  actionTaken: string,
  dialogueExcerpt: string,
  relationshipDelta: number,
): Promise<void> {
  const entry: NpcSceneLog = {
    novel_id: novelId,
    character_uid: characterUid,
    scene_number: sceneNumber,
    emotion,
    action_taken: actionTaken,
    dialogue_excerpt: dialogueExcerpt.slice(0, 400),
    relationship_delta: relationshipDelta,
    created_at: Date.now(),
  };
  await db.npc_scene_log.add(entry);
  // Cap the log per novel at 200 entries to prevent unbounded growth
  const count = await db.npc_scene_log.where('novel_id').equals(novelId).count();
  if (count > 200) {
    const oldest = await db.npc_scene_log
      .where('novel_id').equals(novelId)
      .toArray();
    const sorted = oldest.sort((a, b) => a.created_at - b.created_at);
    const toDelete = sorted.slice(0, count - 200).map(e => e.id!).filter(Boolean);
    if (toDelete.length) await db.npc_scene_log.bulkDelete(toDelete);
  }
}

export async function getNpcSceneLog(novelId: number, characterUid: string, limit = 10): Promise<NpcSceneLog[]> {
  const entries = await db.npc_scene_log
    .where('novel_id').equals(novelId)
    .and(e => e.character_uid === characterUid)
    .toArray();
  return entries.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
}

export interface CharacterVoiceProfile {
  speech_style: string;
  verbal_tics: string;
  motivation: string;
  fear: string;
  secret: string;
  known_facts: string[];
  ignorant_of: string[];
}

export async function getCharacterVoiceProfile(uid: string, novelId: number): Promise<CharacterVoiceProfile | null> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char) return null;
  let knownFacts: string[] = [];
  let ignorantOf: string[] = [];
  try { knownFacts = JSON.parse(char.known_facts || '[]'); } catch {}
  try { ignorantOf = JSON.parse(char.ignorant_of || '[]'); } catch {}
  return {
    speech_style: char.speech_style ?? '',
    verbal_tics: char.verbal_tics ?? '',
    motivation: char.motivation ?? '',
    fear: char.fear ?? '',
    secret: char.secret ?? '',
    known_facts: knownFacts,
    ignorant_of: ignorantOf,
  };
}

export async function updateCharacterVoiceProfile(
  uid: string,
  novelId: number,
  profile: Partial<CharacterVoiceProfile>,
): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char?.id) return;
  const update: Partial<Character> = {};
  if (profile.speech_style !== undefined) update.speech_style = profile.speech_style;
  if (profile.verbal_tics !== undefined) update.verbal_tics = profile.verbal_tics;
  if (profile.motivation !== undefined) update.motivation = profile.motivation;
  if (profile.fear !== undefined) update.fear = profile.fear;
  if (profile.secret !== undefined) update.secret = profile.secret;
  if (profile.known_facts !== undefined) update.known_facts = JSON.stringify(profile.known_facts);
  if (profile.ignorant_of !== undefined) update.ignorant_of = JSON.stringify(profile.ignorant_of);
  await db.characters.update(char.id, update);
}

export async function updateCharacterAgenda(uid: string, novelId: number, agenda: string): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (char?.id) await db.characters.update(char.id, { current_agenda: agenda });
}

export async function appendKnownFact(uid: string, novelId: number, fact: string): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char?.id) return;
  let facts: string[] = [];
  try { facts = JSON.parse(char.known_facts || '[]'); } catch {}
  if (!facts.includes(fact)) {
    facts.push(fact);
    facts = facts.slice(-20);
    await db.characters.update(char.id, { known_facts: JSON.stringify(facts) });
  }
}

export async function markSecretRevealed(uid: string, novelId: number): Promise<void> {
  const char = await getCharacterByUid(uid, novelId);
  if (!char?.id) return;
  // Move secret content into known_facts, blank the secret field
  if (char.secret) {
    let facts: string[] = [];
    try { facts = JSON.parse(char.known_facts || '[]'); } catch {}
    facts.push(`[revealed] ${char.secret}`);
    await db.characters.update(char.id, {
      known_facts: JSON.stringify(facts.slice(-20)),
      secret: '',
    });
  }
}
