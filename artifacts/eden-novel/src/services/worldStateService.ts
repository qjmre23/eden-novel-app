import { getWorldState, setWorldState } from '../database/novelDB';

export interface WorldStateData {
  genre: string;
  active_novel_id: number;
  active_timeline_id: string;
  current_chapter: number;
  current_scene: number;
  scene_count_since_chapter: number;
  current_location: string;
  current_arc: string;
  time_of_day: string;
  day_number: number;
  weather: string;
  allowed_fields: string[];
  forbidden_fields: string[];
  enabled_systems: string[];
  established_locations: string[];
  active_factions: string[];
  world_events: string[];
  emotional_state: string;
  narrative_pacing: string;
  pilot_mode_active: boolean;
  progression_state: {
    current_level: number;
    current_rank: string;
    unspent_points: number;
    active_path: string;
    stats: Record<string, number>;
  };
  active_character_uids: string[];
  sceneCountAtLocation: number;
  tensionLevel: string;
  mcIsReborn: boolean;
  // --- v5: dramatic momentum & NPC intelligence ---
  narrative_tension: number;          // 0-100
  story_momentum: number;             // 0-100
  dramatic_question: string;          // the central question driving this chapter
  active_threats: string[];           // open dangers / conflicts
  scene_type_history: string[];       // last 5 scene types
  pending_revelations: string[];      // planted but not yet revealed
  chapter_goal: string;               // what must happen this chapter
  foreshadowed_events: string[];      // hinted but not paid off
  last_scene_summary: string;         // 1-sentence recap of last scene
  npc_agenda_log: string[];           // recent NPC actions/decisions
}

const DEFAULT_DRAMATIC_FIELDS = {
  narrative_tension: 20,
  story_momentum: 30,
  dramatic_question: '',
  active_threats: [] as string[],
  scene_type_history: [] as string[],
  pending_revelations: [] as string[],
  chapter_goal: '',
  foreshadowed_events: [] as string[],
  last_scene_summary: '',
  npc_agenda_log: [] as string[],
};

function withDramaticDefaults(raw: any): WorldStateData {
  const merged = { ...DEFAULT_DRAMATIC_FIELDS, ...(raw || {}) } as WorldStateData;
  // Ensure arrays are arrays even if persisted as null/undefined
  if (!Array.isArray(merged.active_threats)) merged.active_threats = [];
  if (!Array.isArray(merged.scene_type_history)) merged.scene_type_history = [];
  if (!Array.isArray(merged.pending_revelations)) merged.pending_revelations = [];
  if (!Array.isArray(merged.foreshadowed_events)) merged.foreshadowed_events = [];
  if (!Array.isArray(merged.npc_agenda_log)) merged.npc_agenda_log = [];
  if (typeof merged.narrative_tension !== 'number') merged.narrative_tension = 20;
  if (typeof merged.story_momentum !== 'number') merged.story_momentum = 30;
  return merged;
}

export async function loadWorldState(novelId: number): Promise<WorldStateData> {
  const raw = await getWorldState(novelId);
  return withDramaticDefaults(raw as unknown as WorldStateData);
}

export async function saveWorldState(novelId: number, state: WorldStateData): Promise<void> {
  await setWorldState(novelId, state as unknown as Record<string, unknown>);
}

export async function updateWorldStateFields(novelId: number, updates: Partial<WorldStateData>): Promise<void> {
  const current = await loadWorldState(novelId);
  const next = { ...current, ...updates };
  await saveWorldState(novelId, next);
}

export async function incrementScene(novelId: number): Promise<void> {
  const ws = await loadWorldState(novelId);
  ws.current_scene += 1;
  ws.scene_count_since_chapter += 1;
  await saveWorldState(novelId, ws);
}

export async function incrementSceneCountAtLocation(novelId: number, currentLocation: string): Promise<number> {
  const ws = await loadWorldState(novelId);
  if (!ws.sceneCountAtLocation) ws.sceneCountAtLocation = 0;
  if (ws.current_location && ws.current_location !== currentLocation) {
    ws.sceneCountAtLocation = 1;
    ws.current_location = currentLocation;
  } else {
    ws.sceneCountAtLocation += 1;
  }
  await saveWorldState(novelId, ws);
  return ws.sceneCountAtLocation;
}

export async function addWorldEvent(novelId: number, event: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  ws.world_events = [...(ws.world_events || []), event].slice(-20);
  await saveWorldState(novelId, ws);
}

export function buildContextSummary(ws: WorldStateData): string {
  return [
    `Genre: ${ws.genre}`,
    `Location: ${ws.current_location}`,
    `Arc: ${ws.current_arc}`,
    `Chapter: ${ws.current_chapter}, Scene: ${ws.current_scene}`,
    `Time: ${ws.time_of_day}, Day ${ws.day_number}`,
    `Weather: ${ws.weather}`,
    `Pacing: ${ws.narrative_pacing}`,
    `Emotional State: ${ws.emotional_state}`,
    `Narrative Tension: ${ws.narrative_tension}/100`,
    `Story Momentum: ${ws.story_momentum}/100`,
    ws.dramatic_question ? `Dramatic Question: ${ws.dramatic_question}` : '',
    ws.chapter_goal ? `Chapter Goal: ${ws.chapter_goal}` : '',
    ws.active_threats.length ? `Active Threats: ${ws.active_threats.slice(-4).join(' | ')}` : '',
    ws.world_events.length > 0 ? `Recent Events: ${ws.world_events.slice(-3).join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

// ─── v5 DRAMATIC MOMENTUM HELPERS ─────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export async function updateNarrativeTension(novelId: number, value: number): Promise<void> {
  await updateWorldStateFields(novelId, { narrative_tension: clamp(Math.round(value), 0, 100) });
}

export async function adjustNarrativeTension(novelId: number, delta: number): Promise<void> {
  const ws = await loadWorldState(novelId);
  ws.narrative_tension = clamp(Math.round((ws.narrative_tension ?? 20) + delta), 0, 100);
  await saveWorldState(novelId, ws);
}

export async function updateStoryMomentum(novelId: number, value: number): Promise<void> {
  await updateWorldStateFields(novelId, { story_momentum: clamp(Math.round(value), 0, 100) });
}

export async function addToActiveThreats(novelId: number, threat: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const trimmed = threat.trim();
  if (!trimmed) return;
  if (!ws.active_threats.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
    ws.active_threats = [...ws.active_threats, trimmed].slice(-10);
    await saveWorldState(novelId, ws);
  }
}

export async function removeFromActiveThreats(novelId: number, threatLike: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const needle = threatLike.toLowerCase();
  ws.active_threats = ws.active_threats.filter(t => !t.toLowerCase().includes(needle) && !needle.includes(t.toLowerCase()));
  await saveWorldState(novelId, ws);
}

export async function addToForeshadowedEvents(novelId: number, event: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const trimmed = event.trim();
  if (!trimmed) return;
  if (!ws.foreshadowed_events.some(e => e.toLowerCase() === trimmed.toLowerCase())) {
    ws.foreshadowed_events = [...ws.foreshadowed_events, trimmed].slice(-10);
    await saveWorldState(novelId, ws);
  }
}

export async function removeForeshadowedEvent(novelId: number, eventLike: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const needle = eventLike.toLowerCase();
  ws.foreshadowed_events = ws.foreshadowed_events.filter(e => !e.toLowerCase().includes(needle));
  await saveWorldState(novelId, ws);
}

export async function addPendingRevelation(novelId: number, revelation: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const trimmed = revelation.trim();
  if (!trimmed) return;
  if (!ws.pending_revelations.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
    ws.pending_revelations = [...ws.pending_revelations, trimmed].slice(-10);
    await saveWorldState(novelId, ws);
  }
}

export async function consumePendingRevelation(novelId: number, revelationLike: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const needle = revelationLike.toLowerCase();
  ws.pending_revelations = ws.pending_revelations.filter(r => !r.toLowerCase().includes(needle));
  await saveWorldState(novelId, ws);
}

export async function updateChapterGoal(novelId: number, goal: string): Promise<void> {
  await updateWorldStateFields(novelId, { chapter_goal: goal.trim() });
}

export async function updateDramaticQuestion(novelId: number, question: string): Promise<void> {
  await updateWorldStateFields(novelId, { dramatic_question: question.trim() });
}

export async function updateLastSceneSummary(novelId: number, summary: string): Promise<void> {
  await updateWorldStateFields(novelId, { last_scene_summary: summary.trim().slice(0, 280) });
}

export async function pushSceneTypeHistory(novelId: number, sceneType: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const hist = [...ws.scene_type_history, sceneType].slice(-5);
  ws.scene_type_history = hist;
  await saveWorldState(novelId, ws);
}

export async function pushNpcAgendaLog(novelId: number, entry: string): Promise<void> {
  const ws = await loadWorldState(novelId);
  const stamped = `${new Date().toISOString().slice(0, 16)} — ${entry.trim()}`;
  ws.npc_agenda_log = [...ws.npc_agenda_log, stamped].slice(-15);
  await saveWorldState(novelId, ws);
}
