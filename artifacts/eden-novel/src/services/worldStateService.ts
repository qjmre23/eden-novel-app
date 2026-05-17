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
}

export async function loadWorldState(novelId: number): Promise<WorldStateData> {
  const raw = await getWorldState(novelId);
  return raw as unknown as WorldStateData;
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
    ws.world_events.length > 0 ? `Recent Events: ${ws.world_events.slice(-3).join('; ')}` : '',
  ].filter(Boolean).join('\n');
}
