import db, { Novel } from './db';
import { generateId } from '../core/utils';

export async function createNovel(data: Omit<Novel, 'id' | 'created_at' | 'last_played_at' | 'total_chapters' | 'active_timeline_id' | 'action_count'>): Promise<number> {
  const timelineId = generateId();
  const now = Date.now();
  const id = await db.novels.add({
    ...data,
    action_count: 0,
    created_at: now,
    last_played_at: now,
    total_chapters: 0,
    active_timeline_id: timelineId,
  });
  await db.timelines.add({
    novel_id: id as number,
    parent_timeline_id: null,
    branch_point_chapter: 0,
    branch_label: 'Main Timeline',
    created_at: now,
    is_active: true,
  });
  const reborKeywords = /\b(reborn|rebirth|past life|previous life|died|reincarn|transmigrat|regression|second chance|second life|another world|isekai|woke up (?:in|as)|returned to|transported to)\b/i;
  const mcIsReborn = data.genre === 'isekai' || reborKeywords.test((data as { story_seed?: string }).story_seed || '');

  const defaultWorldState = {
    genre: data.genre,
    active_novel_id: id,
    active_timeline_id: timelineId,
    current_chapter: 1,
    current_scene: 0,
    scene_count_since_chapter: 0,
    current_location: (data as { starting_location?: string }).starting_location || 'Starting Location',
    current_arc: 'Prologue',
    time_of_day: 'morning',
    day_number: 1,
    weather: 'Clear',
    allowed_fields: [],
    forbidden_fields: [],
    enabled_systems: ['leveling', 'relationships'],
    established_locations: [],
    active_factions: [],
    world_events: [],
    emotional_state: 'neutral',
    narrative_pacing: 'establishing',
    pilot_mode_active: false,
    progression_state: {
      current_level: 1,
      current_rank: 'Bronze I',
      unspent_points: 0,
      active_path: '',
      stats: {},
    },
    active_character_uids: [],
    sceneCountAtLocation: 0,
    tensionLevel: 'low',
    mcIsReborn,
  };
  await db.world_state.add({
    novel_id: id as number,
    state_json: JSON.stringify(defaultWorldState),
    updated_at: now,
  });
  return id as number;
}

export async function getAllNovels(): Promise<Novel[]> {
  return db.novels.orderBy('last_played_at').reverse().toArray();
}

export async function getNovel(id: number): Promise<Novel | undefined> {
  return db.novels.get(id);
}

export async function updateNovelLastPlayed(id: number): Promise<void> {
  await db.novels.update(id, { last_played_at: Date.now() });
}

export async function incrementNovelActionCount(id: number): Promise<number> {
  const novel = await db.novels.get(id);
  const newCount = (novel?.action_count ?? 0) + 1;
  await db.novels.update(id, { action_count: newCount });
  return newCount;
}

export async function resetNovelActionCount(id: number): Promise<void> {
  await db.novels.update(id, { action_count: 0 });
}

export async function updateNovelMcPortrait(id: number, portraitPath: string): Promise<void> {
  await db.novels.update(id, { mc_portrait_path: portraitPath });
}

export async function deleteNovel(id: number): Promise<void> {
  await db.transaction('rw', [db.novels, db.chapters, db.scenes, db.characters, db.character_relationships, db.world_state, db.progression_data, db.skill_registry, db.skill_tree_nodes, db.timelines, db.memories, db.inventory], async () => {
    await db.novels.delete(id);
    await db.chapters.where('novel_id').equals(id).delete();
    await db.scenes.where('novel_id').equals(id).delete();
    await db.characters.where('novel_id').equals(id).delete();
    await db.character_relationships.where('novel_id').equals(id).delete();
    await db.world_state.where('novel_id').equals(id).delete();
    await db.progression_data.where('novel_id').equals(id).delete();
    await db.skill_registry.where('novel_id').equals(id).delete();
    await db.skill_tree_nodes.where('novel_id').equals(id).delete();
    await db.timelines.where('novel_id').equals(id).delete();
    await db.memories.where('novel_id').equals(id).delete();
    await db.inventory.where('novel_id').equals(id).delete();
  });
}

export async function getWorldState(novelId: number): Promise<Record<string, unknown>> {
  const ws = await db.world_state.where('novel_id').equals(novelId).first();
  if (!ws) return {};
  try { return JSON.parse(ws.state_json); } catch { return {}; }
}

export async function setWorldState(novelId: number, state: Record<string, unknown>): Promise<void> {
  const existing = await db.world_state.where('novel_id').equals(novelId).first();
  if (existing?.id) {
    await db.world_state.update(existing.id, { state_json: JSON.stringify(state), updated_at: Date.now() });
  } else {
    await db.world_state.add({ novel_id: novelId, state_json: JSON.stringify(state), updated_at: Date.now() });
  }
}
