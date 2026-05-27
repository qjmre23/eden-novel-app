// ── Core domain types — must match real backend exactly ──────────────────────

export type SceneType =
  | 'action'
  | 'dialogue'
  | 'revelation'
  | 'quiet'
  | 'confrontation'
  | 'twist';

export interface Novel {
  id: number;
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

export interface Character {
  id?: number;
  novel_id: number;
  internal_uid: string;
  display_name: string;
  portrait_path: string;
  bubble_color: string;
  status: 'alive' | 'dead' | 'unknown';
  gender: string;
  role:
    | 'protagonist'
    | 'antagonist'
    | 'ally'
    | 'mentor'
    | 'foil'
    | 'love-interest'
    | 'supporting'
    | 'npc';
  metadata_json: string;
  first_appeared_chapter: number;
  current_location: string;
  has_introduced_self: boolean;
  created_at: number;
  // v5 intelligence fields
  current_emotion?: string;
  emotion_intensity?: number;
  speech_style?: string;
  verbal_tics?: string;
  secret?: string;
  motivation?: string;
  fear?: string;
  relationship_label?: string;
  trust_level?: number;
  affection_level?: number;
  respect_level?: number;
}

export interface WorldState {
  genre: string;
  current_chapter: number;
  current_scene: number;
  current_location: string;
  time_of_day: string;
  day_number: number;
  weather: string;
  narrative_tension: number;
  story_momentum: number;
  dramatic_question: string;
  active_threats: string[];
  scene_type_history: SceneType[];
  pending_revelations: string[];
  chapter_goal: string;
  last_scene_summary: string;
}

export interface ParsedBubble {
  speaker?: string;
  content: string;
  isNarrator?: boolean;
}

export interface ChoiceOption {
  label: string;
  roleplayText?: string;
}

export interface ScenePlan {
  scene_type: SceneType;
  tension_target: number;
  directive: string;
  required_elements: string[];
  forbidden_elements: string[];
  npc_focus: string | null;
  dramatic_question_progress: string;
  foreshadow_hint: string | null;
}

// ── UI-only types ────────────────────────────────────────────────────────────

export type ChatItemKind =
  | 'bubble'
  | 'streaming'
  | 'environment'
  | 'chapter'
  | 'mc-echo';

export interface ChatItemBubble {
  kind: 'bubble';
  bubble: ParsedBubble;
  id: string;
  character?: Character;
}

export interface ChatItemStreaming {
  kind: 'streaming';
  content: string;
  id: string;
}

export interface ChatItemEnvironment {
  kind: 'environment';
  location: string;
  timeOfDay: string;
  weather: string;
  genre: string;
  id: string;
}

export interface ChatItemChapter {
  kind: 'chapter';
  chapter: number;
  title: string;
  id: string;
}

export interface ChatItemMcEcho {
  kind: 'mc-echo';
  content: string;
  id: string;
}

export type ChatItem =
  | ChatItemBubble
  | ChatItemStreaming
  | ChatItemEnvironment
  | ChatItemChapter
  | ChatItemMcEcho;

export type InteractionMode = 'decision' | 'free' | 'generating' | 'auto';

export type Genre =
  | 'zombie'
  | 'apocalypse'
  | 'cultivation'
  | 'cyberpunk'
  | 'fantasy'
  | 'mafia'
  | 'romance'
  | 'horror'
  | 'detective'
  | 'space_scifi'
  | 'military_war'
  | 'historical'
  | 'survival'
  | 'superpower'
  | 'isekai'
  | 'vampire'
  | 'school'
  | 'slice_of_life'
  | 'thriller'
  | 'crime_noir';

export interface GenreInfo {
  id: Genre;
  label: string;
  mood: string;
  gradient: string;
  accentColor: string;
}

export interface EdenSession {
  id: string;
  mode: 'guest' | 'authenticated';
  createdAt: number;
  email?: string;
}

export interface EdenSettings {
  provider: string;
  apiKey?: string;
  savedAt: number;
}

export type McTraits = {
  personality: number;
  attitude: number;
  altruism: number;
  risk: number;
};
