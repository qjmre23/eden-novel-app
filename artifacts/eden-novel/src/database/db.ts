import Dexie, { Table } from 'dexie';

export interface Novel {
  id?: number;
  title: string;
  genre: string;
  created_at: number;
  last_played_at: number;
  active_timeline_id: string;
  mc_portrait_path: string;
  total_chapters: number;
  story_seed: string;
  mc_name: string;
  world_name: string;
  mc_traits_json: string;
  starting_skills_json: string;
  action_count: number;
  starting_location?: string;
}

export interface Chapter {
  id?: number;
  novel_id: number;
  timeline_id: string;
  chapter_number: number;
  title: string;
  summary: string;
  created_at: number;
  character_snapshot_json: string;
  world_snapshot_json: string;
}

export interface Scene {
  id?: number;
  chapter_id: number;
  novel_id: number;
  timeline_id: string;
  scene_number: number;
  raw_output: string;
  parsed_bubbles_json: string;
  interaction_mode: string;
  metadata_json: string;
  created_at: number;
}

export interface Character {
  id?: number;
  novel_id: number;
  internal_uid: string;
  display_name: string;
  portrait_path: string;
  bubble_color: string;
  status: string;
  gender: string;
  role: string;
  metadata_json: string;
  first_appeared_chapter: number;
  current_location: string;
  has_introduced_self: boolean;
  created_at: number;
  // --- v5 NPC intelligence fields ---
  current_emotion?: string;
  emotion_intensity?: number;
  emotional_history?: string; // JSON array of last 5 { emotion, intensity, ts }
  speech_style?: string;
  verbal_tics?: string;
  secret?: string;
  motivation?: string;
  fear?: string;
  known_facts?: string;     // JSON array of strings
  ignorant_of?: string;     // JSON array of strings
  last_seen_location?: string;
  last_interaction_scene?: number;
  relationship_label?: string;
  trust_level?: number;
  affection_level?: number;
  respect_level?: number;
  current_agenda?: string;
}

export interface CharacterRelationship {
  id?: number;
  novel_id: number;
  character_a_uid: string;
  character_b_uid: string;
  relationship_type: string;
  value: number;
  description: string;
  updated_at: number;
}

export interface WorldState {
  id?: number;
  novel_id: number;
  state_json: string;
  updated_at: number;
}

export interface ProgressionData {
  id?: number;
  novel_id: number;
  character_uid: string;
  level: number;
  rank: string;
  stats_json: string;
  unspent_points: number;
  active_path: string;
  paths_json: string;
  updated_at: number;
}

export interface SkillRegistry {
  id?: number;
  novel_id: number;
  character_uid: string;
  skill_name: string;
  skill_description: string;
  skill_effects_json: string;
  rarity: string;
  evolution_hint: string;
  is_active: boolean;
  unlocked_at: number;
}

export interface SkillTreeNode {
  id?: number;
  novel_id: number;
  character_uid: string;
  node_name: string;
  parent_node_id: number | null;
  path_name: string;
  is_unlocked: boolean;
  is_hidden: boolean;
  required_level: number;
  genre: string;
}

export interface Timeline {
  id?: number;
  novel_id: number;
  parent_timeline_id: string | null;
  branch_point_chapter: number;
  branch_label: string;
  created_at: number;
  is_active: boolean;
}

export interface Memory {
  id?: number;
  novel_id: number;
  timeline_id: string;
  content: string;
  relevance_tags: string;
  importance_score: number;
  archived_at: number | null;
}

export interface Inventory {
  id?: number;
  novel_id: number;
  character_uid: string;
  items_json: string;
  currency: number;
  currency_label: string;
  updated_at: number;
}

export interface PresetRegistry {
  id?: number;
  preset_name: string;
  preset_path: string;
  category: string;
  version: string;
  is_loaded: boolean;
  loaded_at: number;
}

export interface NpcSceneLog {
  id?: number;
  novel_id: number;
  character_uid: string;
  scene_number: number;
  emotion: string;
  action_taken: string;
  dialogue_excerpt: string;
  relationship_delta: number;
  created_at: number;
}

class EdenNovelDB extends Dexie {
  novels!: Table<Novel>;
  chapters!: Table<Chapter>;
  scenes!: Table<Scene>;
  characters!: Table<Character>;
  character_relationships!: Table<CharacterRelationship>;
  world_state!: Table<WorldState>;
  progression_data!: Table<ProgressionData>;
  skill_registry!: Table<SkillRegistry>;
  skill_tree_nodes!: Table<SkillTreeNode>;
  timelines!: Table<Timeline>;
  memories!: Table<Memory>;
  inventory!: Table<Inventory>;
  presets_registry!: Table<PresetRegistry>;
  npc_scene_log!: Table<NpcSceneLog>;

  constructor() {
    super('EdenNovelDB');
    this.version(1).stores({
      novels: '++id, title, genre, created_at, last_played_at, active_timeline_id',
      chapters: '++id, novel_id, timeline_id, chapter_number, created_at',
      scenes: '++id, chapter_id, novel_id, timeline_id, scene_number, created_at',
      characters: '++id, novel_id, internal_uid, display_name, status, role, created_at',
      character_relationships: '++id, novel_id, character_a_uid, character_b_uid, updated_at',
      world_state: '++id, &novel_id, updated_at',
      progression_data: '++id, novel_id, character_uid, updated_at',
      skill_registry: '++id, novel_id, character_uid, skill_name, rarity',
      skill_tree_nodes: '++id, novel_id, character_uid, node_name, path_name',
      timelines: '++id, novel_id, parent_timeline_id, created_at',
      memories: '++id, novel_id, timeline_id, importance_score',
      inventory: '++id, novel_id, character_uid, updated_at',
      presets_registry: '++id, preset_name, category, is_loaded',
    });
    this.version(2).stores({
      novels: '++id, title, genre, created_at, last_played_at, active_timeline_id',
      characters: '++id, novel_id, internal_uid, display_name, status, role, created_at',
    }).upgrade(tx => {
      return tx.table('novels').toCollection().modify((novel: Novel) => {
        if (!novel.mc_traits_json) novel.mc_traits_json = '{}';
        if (!novel.starting_skills_json) novel.starting_skills_json = '[]';
        if (!novel.action_count) novel.action_count = 0;
      });
    });
    this.version(3).stores({
      characters: '++id, novel_id, internal_uid, display_name, status, role, created_at',
    }).upgrade(tx => {
      return tx.table('characters').toCollection().modify((char: Character) => {
        if (!char.current_location) char.current_location = '';
        if (char.has_introduced_self === undefined) char.has_introduced_self = false;
      });
    });
    this.version(4).upgrade(tx => {
      return tx.table('novels').toCollection().modify((novel: Novel) => {
        if (!novel.starting_location) novel.starting_location = '';
      });
    });
    // === v5: NPC intelligence + dramatic momentum ===
    this.version(5).stores({
      characters: '++id, novel_id, internal_uid, display_name, status, role, created_at, current_emotion, trust_level',
      npc_scene_log: '++id, novel_id, character_uid, scene_number, created_at',
    }).upgrade(async tx => {
      // Backfill characters with new intelligence defaults
      await tx.table('characters').toCollection().modify((char: Character) => {
        if (char.current_emotion === undefined) char.current_emotion = 'neutral';
        if (char.emotion_intensity === undefined) char.emotion_intensity = 50;
        if (char.emotional_history === undefined) char.emotional_history = '[]';
        if (char.speech_style === undefined) char.speech_style = '';
        if (char.verbal_tics === undefined) char.verbal_tics = '';
        if (char.secret === undefined) char.secret = '';
        if (char.motivation === undefined) char.motivation = '';
        if (char.fear === undefined) char.fear = '';
        if (char.known_facts === undefined) char.known_facts = '[]';
        if (char.ignorant_of === undefined) char.ignorant_of = '[]';
        if (char.last_seen_location === undefined) char.last_seen_location = char.current_location || '';
        if (char.last_interaction_scene === undefined) char.last_interaction_scene = 0;
        if (char.relationship_label === undefined) char.relationship_label = '';
        if (char.trust_level === undefined) char.trust_level = 0;
        if (char.affection_level === undefined) char.affection_level = 0;
        if (char.respect_level === undefined) char.respect_level = 0;
        if (char.current_agenda === undefined) char.current_agenda = '';
      });
      // Backfill world_state JSON with new dramatic momentum fields
      await tx.table('world_state').toCollection().modify((row: WorldState) => {
        let state: Record<string, unknown> = {};
        try { state = JSON.parse(row.state_json) as Record<string, unknown>; } catch {}
        if (state.narrative_tension === undefined) state.narrative_tension = 20;
        if (state.story_momentum === undefined) state.story_momentum = 30;
        if (state.dramatic_question === undefined) state.dramatic_question = '';
        if (state.active_threats === undefined) state.active_threats = [];
        if (state.scene_type_history === undefined) state.scene_type_history = [];
        if (state.pending_revelations === undefined) state.pending_revelations = [];
        if (state.chapter_goal === undefined) state.chapter_goal = '';
        if (state.foreshadowed_events === undefined) state.foreshadowed_events = [];
        if (state.last_scene_summary === undefined) state.last_scene_summary = '';
        if (state.npc_agenda_log === undefined) state.npc_agenda_log = [];
        row.state_json = JSON.stringify(state);
        row.updated_at = Date.now();
      });
    });
  }
}

export const db = new EdenNovelDB();
export default db;
