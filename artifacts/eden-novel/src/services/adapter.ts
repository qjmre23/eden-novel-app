// ─── REAL STORY ADAPTER ──────────────────────────────────────────────────────
// Replaces the prototype's mockAdapter. Wires the prototype UI to the real
// orchestrationService, DB, presets, and v5 NPC intelligence pipeline.
//
// The prototype's UI types (Novel, Character, WorldState, ScenePlan,
// ChoiceOption, ParsedBubble) are aligned with the backend's domain types,
// so the adapter mostly just bridges shapes 1:1.

import type {
  Novel,
  Character as UICharacter,
  WorldState as UIWorldState,
  ChoiceOption,
  ScenePlan,
} from '../types';

import {
  startNewNovel,
  listNovels,
  loadNovel as loadNovelDb,
  incrementActionCount,
} from './novelService';
import { getCharactersByNovel } from '../database/characterDB';
import { loadWorldState as loadFullWorldState } from './worldStateService';
import {
  generateNextScene,
  generateNovelOpening,
} from './orchestrationService';
import { parseNarrativeTags } from '../parsers/tagParser';
import { presetManager } from './presetManager';
import type { Character as DbCharacter } from '../database/db';
import type { McTraits } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map the slider-based prototype traits (0-100) to the descriptive MCTraits strings the backend uses. */
function traitsToDescriptive(traits: McTraits) {
  const personality = traits.personality < 33 ? 'cold, calculating' : traits.personality < 66 ? 'measured, observant' : 'warm, empathic';
  const attitude    = traits.attitude < 33    ? 'cautious, measured'  : traits.attitude < 66    ? 'pragmatic, steady'   : 'reckless, bold';
  const altruism    = traits.altruism < 33    ? 'self-serving'        : traits.altruism < 66    ? 'reciprocal'          : 'selfless';
  const riskTol     = traits.risk < 33        ? 'risk-avoidant'       : traits.risk < 66        ? 'balanced'            : 'risk-seeking';
  return { personality, attitude, riskTolerance: riskTol, altruism };
}

/** Map a backend Character row into the UI Character shape (compatible by structure). */
function toUICharacter(c: DbCharacter): UICharacter {
  return {
    id: c.id,
    novel_id: c.novel_id,
    internal_uid: c.internal_uid,
    display_name: c.display_name,
    portrait_path: c.portrait_path,
    bubble_color: c.bubble_color,
    status: (c.status as UICharacter['status']) ?? 'alive',
    gender: c.gender,
    role: (c.role as UICharacter['role']) ?? 'supporting',
    metadata_json: c.metadata_json,
    first_appeared_chapter: c.first_appeared_chapter,
    current_location: c.current_location,
    has_introduced_self: c.has_introduced_self,
    created_at: c.created_at,
    current_emotion: c.current_emotion,
    emotion_intensity: c.emotion_intensity,
    speech_style: c.speech_style,
    verbal_tics: c.verbal_tics,
    secret: c.secret,
    motivation: c.motivation,
    fear: c.fear,
    relationship_label: c.relationship_label,
    trust_level: c.trust_level,
    affection_level: c.affection_level,
    respect_level: c.respect_level,
  };
}

/** Map backend WorldStateData (with all fields) to the UI's projected WorldState shape. */
function toUIWorldState(ws: any): UIWorldState {
  return {
    genre: ws.genre ?? '',
    current_chapter: ws.current_chapter ?? 1,
    current_scene: ws.current_scene ?? 0,
    current_location: ws.current_location ?? 'Starting Location',
    time_of_day: ws.time_of_day ?? 'morning',
    day_number: ws.day_number ?? 1,
    weather: ws.weather ?? 'Clear',
    narrative_tension: ws.narrative_tension ?? 20,
    story_momentum: ws.story_momentum ?? 30,
    dramatic_question: ws.dramatic_question ?? '',
    active_threats: Array.isArray(ws.active_threats) ? ws.active_threats : [],
    scene_type_history: Array.isArray(ws.scene_type_history) ? ws.scene_type_history : [],
    pending_revelations: Array.isArray(ws.pending_revelations) ? ws.pending_revelations : [],
    chapter_goal: ws.chapter_goal ?? '',
    last_scene_summary: ws.last_scene_summary ?? '',
  };
}

// ─── Adapter Interface ───────────────────────────────────────────────────────

export interface StoryAdapter {
  loadNovels(): Promise<Novel[]>;
  loadNovel(id: number): Promise<Novel>;
  loadCharacters(novelId: number): Promise<UICharacter[]>;
  loadWorldState(novelId: number): Promise<UIWorldState>;
  createNovel(input: {
    genre: string;
    mc_name: string;
    world_name: string;
    story_seed: string;
    mc_traits_json: string;
  }): Promise<Novel>;
  generateOpeningStream(novelId: number, onToken: (t: string) => void): Promise<string>;
  generateNextSceneStream(args: {
    novelId: number;
    userAction: string;
    onToken: (t: string) => void;
    onScenePlan?: (plan: ScenePlan) => void;
  }): Promise<string>;
  refreshAfterScene(novelId: number): Promise<{
    tension: number;
    characters: UICharacter[];
    ws: UIWorldState;
  }>;
}

// ─── Real Implementation ─────────────────────────────────────────────────────

class RealAdapter implements StoryAdapter {
  private presetsLoaded = false;

  private async ensurePresetsLoaded(): Promise<void> {
    if (this.presetsLoaded) return;
    await presetManager.loadAll();
    this.presetsLoaded = true;
  }

  async loadNovels(): Promise<Novel[]> {
    await this.ensurePresetsLoaded();
    const novels = await listNovels();
    return novels.map(n => ({
      id: n.id!,
      title: n.title,
      genre: n.genre,
      created_at: n.created_at,
      last_played_at: n.last_played_at,
      active_timeline_id: n.active_timeline_id,
      mc_portrait_path: n.mc_portrait_path,
      total_chapters: n.total_chapters,
      story_seed: n.story_seed,
      mc_name: n.mc_name,
      world_name: n.world_name,
      mc_traits_json: n.mc_traits_json,
      starting_skills_json: n.starting_skills_json,
      action_count: n.action_count,
      starting_location: n.starting_location,
    }));
  }

  async loadNovel(id: number): Promise<Novel> {
    await this.ensurePresetsLoaded();
    const n = await loadNovelDb(id);
    if (!n) throw new Error(`Novel ${id} not found`);
    return {
      id: n.id!,
      title: n.title,
      genre: n.genre,
      created_at: n.created_at,
      last_played_at: n.last_played_at,
      active_timeline_id: n.active_timeline_id,
      mc_portrait_path: n.mc_portrait_path,
      total_chapters: n.total_chapters,
      story_seed: n.story_seed,
      mc_name: n.mc_name,
      world_name: n.world_name,
      mc_traits_json: n.mc_traits_json,
      starting_skills_json: n.starting_skills_json,
      action_count: n.action_count,
      starting_location: n.starting_location,
    };
  }

  async loadCharacters(novelId: number): Promise<UICharacter[]> {
    const chars = await getCharactersByNovel(novelId);
    return chars.map(toUICharacter);
  }

  async loadWorldState(novelId: number): Promise<UIWorldState> {
    const ws = await loadFullWorldState(novelId);
    return toUIWorldState(ws);
  }

  async createNovel(input: {
    genre: string;
    mc_name: string;
    world_name: string;
    story_seed: string;
    mc_traits_json: string;
  }): Promise<Novel> {
    await this.ensurePresetsLoaded();

    // Map the prototype's slider-based traits to descriptive MCTraits the backend expects.
    let traits: McTraits;
    try {
      traits = JSON.parse(input.mc_traits_json) as McTraits;
    } catch {
      traits = { personality: 50, attitude: 50, altruism: 50, risk: 50 };
    }
    const descriptive = traitsToDescriptive(traits);

    const title = `${input.mc_name}'s ${input.genre.replace(/_/g, ' ')} story`;

    const { novelId } = await startNewNovel({
      title,
      genre: input.genre,
      mcName: input.mc_name,
      worldName: input.world_name || 'The World',
      storySeed: input.story_seed,
      mcTraits: descriptive,
      startingSkills: [],
    });

    return this.loadNovel(novelId);
  }

  async generateOpeningStream(
    novelId: number,
    onToken: (t: string) => void,
  ): Promise<string> {
    await this.ensurePresetsLoaded();
    const novel = await loadNovelDb(novelId);
    if (!novel) throw new Error(`Novel ${novelId} not found`);

    let fullText = '';
    await generateNovelOpening(
      novelId,
      novel.genre,
      novel.mc_name,
      novel.world_name,
      novel.story_seed,
      {
        onToken: (t) => {
          fullText += t;
          onToken(t);
        },
        onError: (e) => {
          console.warn('[adapter] opening error:', e);
        },
      },
      novel.mc_traits_json,
      novel.starting_location,
      novel.starting_skills_json,
    );

    return fullText;
  }

  async generateNextSceneStream(args: {
    novelId: number;
    userAction: string;
    onToken: (t: string) => void;
    onScenePlan?: (plan: ScenePlan) => void;
  }): Promise<string> {
    await this.ensurePresetsLoaded();
    const novel = await loadNovelDb(args.novelId);
    if (!novel) throw new Error(`Novel ${args.novelId} not found`);
    const characters = await getCharactersByNovel(args.novelId);
    const mc = characters.find(c => c.role === 'protagonist');
    const mcUid = mc?.internal_uid ?? '';

    let fullText = '';
    await generateNextScene(
      args.novelId,
      novel.active_timeline_id || 'main',
      mcUid,
      novel.mc_name,
      novel.genre,
      args.userAction,
      {
        onToken: (t) => {
          fullText += t;
          args.onToken(t);
        },
        onTagsParsed: () => {},
        onLevelUp: () => {},
        onChapterEnd: () => {},
        onPilotPause: () => {},
        onNewCharacter: () => {},
        onSkillUnlock: () => {},
        onError: (e) => console.warn('[adapter] scene error:', e),
        onScenePlan: (plan) => args.onScenePlan?.(plan as ScenePlan),
      },
      600,
      0.75,
      0,
      undefined,
      false,
    );

    // Bump action count after each scene
    try { await incrementActionCount(args.novelId); } catch {}

    return fullText;
  }

  async refreshAfterScene(novelId: number): Promise<{
    tension: number;
    characters: UICharacter[];
    ws: UIWorldState;
  }> {
    const [ws, chars] = await Promise.all([
      loadFullWorldState(novelId),
      getCharactersByNovel(novelId),
    ]);
    const uiWs = toUIWorldState(ws);
    return {
      tension: uiWs.narrative_tension,
      characters: chars.map(toUICharacter),
      ws: uiWs,
    };
  }
}

// ─── Choice parser (re-exported for StoryScreen compatibility) ───────────────

export function parseChoicesFromScene(text: string): ChoiceOption[] {
  // Use the backend tag parser which handles `/choice/ label -> "roleplay"`
  // including silent (empty quote) cases.
  const parsed = parseNarrativeTags(text);
  return parsed.choiceOptions.map(opt => ({
    label: opt.label,
    roleplayText: opt.roleplayText,
  }));
}

// ─── Singleton instance ──────────────────────────────────────────────────────

export const adapter: StoryAdapter = new RealAdapter();
