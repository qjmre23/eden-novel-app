import db, { Character, CharacterRelationship } from './db';
import { generateId } from '../core/utils';
import { CHARACTER_ACCENT_COLORS } from '../core/constants';

export async function createCharacter(data: Omit<Character, 'id' | 'internal_uid' | 'created_at' | 'bubble_color'>): Promise<Character> {
  const existingCount = await db.characters.where('novel_id').equals(data.novel_id).count();
  const char: Character = {
    ...data,
    internal_uid: generateId(),
    bubble_color: CHARACTER_ACCENT_COLORS[existingCount % CHARACTER_ACCENT_COLORS.length],
    current_location: data.current_location ?? '',
    has_introduced_self: data.has_introduced_self ?? (data.role === 'protagonist'),
    created_at: Date.now(),
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
  if (char?.id) await db.characters.update(char.id, { current_location: location });
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
