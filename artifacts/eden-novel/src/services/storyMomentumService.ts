import { Character } from '../database/db';
import { TagParseResult } from '../parsers/tagParser';
import {
  WorldStateData,
  updateWorldStateFields,
  pushSceneTypeHistory,
  updateLastSceneSummary,
  adjustNarrativeTension,
  updateStoryMomentum,
  loadWorldState,
} from './worldStateService';

export type SceneType =
  | 'action'
  | 'dialogue'
  | 'revelation'
  | 'quiet'
  | 'confrontation'
  | 'twist';

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

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function pickFocusNpc(characters: Character[]): string | null {
  const npcs = characters.filter(c => c.role !== 'protagonist' && c.status === 'alive');
  if (!npcs.length) return null;
  // Prefer the NPC with the highest emotional intensity (something to unpack)
  npcs.sort((a, b) => (b.emotion_intensity ?? 0) - (a.emotion_intensity ?? 0));
  const top = npcs[0];
  if ((top.emotion_intensity ?? 0) >= 55) return top.display_name;
  // Otherwise pick the NPC the MC most recently interacted with
  npcs.sort((a, b) => (b.last_interaction_scene ?? 0) - (a.last_interaction_scene ?? 0));
  return npcs[0]?.display_name ?? null;
}

/**
 * Pure rule engine: decides the scene type, required elements, and forbidden
 * elements for the next scene based on current world state and recent
 * history. Designed to be deterministic and instant — no AI call needed.
 */
export async function planNextScene(
  _novelId: string | number,
  _timelineId: string,
  worldState: WorldStateData,
  characters: Character[],
  lastAction: string,
  actionCount: number,
): Promise<ScenePlan> {
  const tension = worldState.narrative_tension ?? 20;
  const momentum = worldState.story_momentum ?? 30;
  const history = worldState.scene_type_history ?? [];
  const lastType = history[history.length - 1];
  const lastTwo = history.slice(-2);
  const lastThree = history.slice(-3);
  const threats = worldState.active_threats ?? [];
  const foreshadowed = worldState.foreshadowed_events ?? [];

  // ─── Scene type selection ────────────────────────────────────────────────
  let sceneType: SceneType;
  if (tension >= 80) {
    sceneType = Math.random() < 0.6 ? 'twist' : 'confrontation';
  } else if (tension <= 20) {
    sceneType = 'quiet';
  } else if (actionCount > 0 && actionCount % 5 === 0) {
    sceneType = 'revelation';
  } else if (actionCount > 0 && actionCount % 3 === 0) {
    sceneType = tension > 50 ? 'confrontation' : 'dialogue';
  } else if (lastThree.length === 3 && lastThree.every(t => t === lastThree[0])) {
    // Last 3 same type → force a contrast
    const contrast: Record<string, SceneType> = {
      action: 'dialogue',
      dialogue: 'action',
      revelation: 'quiet',
      quiet: 'confrontation',
      confrontation: 'revelation',
      twist: 'quiet',
    };
    sceneType = contrast[lastThree[0]] ?? 'dialogue';
  } else {
    // Default rhythm: alternate dialogue and action with occasional twist
    const r = Math.random();
    if (r < 0.35) sceneType = 'dialogue';
    else if (r < 0.65) sceneType = 'action';
    else if (r < 0.85) sceneType = 'revelation';
    else sceneType = 'confrontation';
  }

  // ─── Tension target ──────────────────────────────────────────────────────
  let tensionTarget = tension;
  if (sceneType === 'quiet') tensionTarget = clamp(tension - 10, 0, 100);
  else if (sceneType === 'twist' || sceneType === 'confrontation') tensionTarget = clamp(tension + 15, 0, 100);
  else if (sceneType === 'revelation') tensionTarget = clamp(tension + 8, 0, 100);
  else if (sceneType === 'action') tensionTarget = clamp(tension + 5, 0, 100);

  // ─── Required & forbidden elements ───────────────────────────────────────
  const required: string[] = [];
  const forbidden: string[] = [];

  if (momentum < 30) required.push('advance the dramatic question directly');
  if (threats.length > 0 && actionCount % 4 === 0) {
    required.push(`directly address the active threat: "${threats[threats.length - 1]}"`);
  }
  if (sceneType === 'revelation') {
    required.push('reveal something about an NPC\'s secret OR an off-screen world event');
  }
  if (sceneType === 'confrontation') {
    required.push('an NPC pushes back on the MC in a way that costs something');
  }
  if (sceneType === 'twist') {
    required.push('contradict an assumption the MC (or player) was relying on');
  }
  if (sceneType === 'quiet') {
    required.push('let unresolved emotional weight surface in a small, physical detail');
  }
  if (sceneType === 'dialogue') {
    required.push('two characters say something they don\'t quite mean');
  }

  // Forbidden — anti-repetition
  if (lastTwo.length >= 2 && lastTwo[0] === lastTwo[1] && lastTwo[1] === sceneType) {
    forbidden.push('do not repeat the same scene structure as the last two scenes');
  }
  if (lastType === sceneType) {
    forbidden.push(`do not echo the rhythm of the previous ${lastType} scene`);
  }
  if (worldState.last_scene_summary) {
    forbidden.push(`do not re-stage the same beat as the previous scene: "${worldState.last_scene_summary.slice(0, 120)}"`);
  }
  if (worldState.current_location && (worldState.sceneCountAtLocation ?? 0) >= 3) {
    forbidden.push(`do not begin in ${worldState.current_location} again — push the MC somewhere new or shift time of day visibly`);
  }
  forbidden.push('no generic filler like "they talked for a while" or "the day passed uneventfully"');
  forbidden.push('no resolving every tension thread — leave at least one dangling');

  // ─── NPC focus ───────────────────────────────────────────────────────────
  const npcFocus = pickFocusNpc(characters);

  // ─── Foreshadow hint ─────────────────────────────────────────────────────
  let foreshadowHint: string | null = null;
  if (foreshadowed.length === 0 && Math.random() < 0.4) {
    foreshadowHint = 'plant a small detail that will pay off later (a name, an object, an absence)';
  } else if (foreshadowed.length > 0 && actionCount % 6 === 0) {
    foreshadowHint = `pay off (partially) this earlier seed: "${foreshadowed[0]}"`;
  }

  // ─── Directive ──────────────────────────────────────────────────────────
  const directiveByType: Record<SceneType, string> = {
    action: 'Drive the MC into immediate physical or situational pressure. Show consequence in the body — heartbeat, breath, the sound of footfalls. Every paragraph forward, never sideways.',
    dialogue: 'Build a conversation that doubles as a power exchange. One character wants something; the other will not give it. Subtext over text.',
    revelation: 'Surface a truth that re-frames an earlier moment. Land it through detail, not exposition — a reaction, a contradiction, a name said too carefully.',
    quiet: 'Slow down. Let the MC notice a single thing the previous scenes were too loud to allow. Underline the wound that has not been spoken of yet.',
    confrontation: 'Force a direct collision between the MC and an NPC. No retreat without cost. The dramatic question must inch toward a partial answer.',
    twist: 'Break an assumption. Something the MC (or the player) was leaning on is suddenly not what it seemed. Land it concrete, not abstract.',
  };
  let directive = directiveByType[sceneType];
  if (lastAction && lastAction.length < 240) {
    directive += ` The MC\'s last action was: "${lastAction.trim()}" — let the scene actually respond to that, not glide past it.`;
  }

  // ─── Dramatic question progress ─────────────────────────────────────────
  const dramaticQuestion = worldState.dramatic_question || '';
  const dramaticProgress = dramaticQuestion
    ? `Nudge the chapter\'s dramatic question — "${dramaticQuestion}" — one inch closer to an answer, then complicate it.`
    : 'Establish a clear unresolved question the player will want to chase.';

  return {
    scene_type: sceneType,
    tension_target: tensionTarget,
    directive,
    required_elements: required,
    forbidden_elements: forbidden,
    npc_focus: npcFocus,
    dramatic_question_progress: dramaticProgress,
    foreshadow_hint: foreshadowHint,
  };
}

/**
 * Builds the [SCENE DIRECTIVE] block injected into the scene prompt.
 */
export function buildDramaticDirectiveBlock(plan: ScenePlan, worldState: WorldStateData): string {
  const lines: string[] = [];
  lines.push('[SCENE DIRECTIVE]');
  lines.push(`Scene type: ${plan.scene_type}`);
  lines.push(`Tension target: ${plan.tension_target}/100 (current: ${worldState.narrative_tension ?? 20}/100)`);
  lines.push(`Dramatic goal: ${plan.directive}`);
  if (plan.required_elements.length) {
    lines.push(`This scene MUST include: ${plan.required_elements.join('; ')}`);
  }
  if (plan.forbidden_elements.length) {
    lines.push(`This scene must NOT include: ${plan.forbidden_elements.join('; ')}`);
  }
  if (plan.npc_focus) {
    lines.push(`Feature ${plan.npc_focus} prominently — their emotional state should color the scene.`);
  }
  lines.push(plan.dramatic_question_progress);
  if (worldState.chapter_goal) {
    lines.push(`Chapter goal remaining: ${worldState.chapter_goal}`);
  }
  if ((worldState.active_threats ?? []).length > 0) {
    lines.push(`Active threats unresolved: ${worldState.active_threats.join(' | ')}`);
  }
  if (plan.foreshadow_hint) {
    lines.push(`Plant this seed subtly: ${plan.foreshadow_hint}`);
  }
  return lines.join('\n');
}

/**
 * Called after scene generation. Updates tension, momentum, and narrative
 * world state fields based on the parsed tags and the scene text. Safe to
 * fire-and-forget — never throws.
 */
export async function updateMomentum(
  novelId: number,
  _timelineId: string,
  sceneText: string,
  tagsResult: TagParseResult,
): Promise<void> {
  try {
    const ws = await loadWorldState(novelId);

    // Heuristic momentum bump: more tags = more story happened
    const tagCount = tagsResult.tags.length;
    const eventCount =
      tagsResult.worldEvents.length +
      tagsResult.newCharacters.length +
      tagsResult.skillUnlocks.length +
      tagsResult.relationshipUpdates.length +
      tagsResult.characterDeaths.length +
      (tagsResult.levelUp ? 1 : 0) +
      (tagsResult.chapterEnd ? 1 : 0);

    let momentumDelta = 0;
    if (eventCount >= 3) momentumDelta += 8;
    else if (eventCount >= 1) momentumDelta += 4;
    else momentumDelta -= 3; // pure-fluff scenes drag momentum down
    if (tagCount > 6) momentumDelta += 2;
    const newMomentum = clamp((ws.story_momentum ?? 30) + momentumDelta, 0, 100);
    await updateStoryMomentum(novelId, newMomentum);

    // Tension drift if no explicit /tension/ tag fired
    const hasTensionTag = tagsResult.tags.some(t => t.type === 'tension');
    if (!hasTensionTag) {
      let tensionDelta = 0;
      if (tagsResult.characterDeaths.length > 0) tensionDelta += 12;
      if (tagsResult.levelUp) tensionDelta += 3;
      if (tagsResult.chapterEnd) tensionDelta -= 8; // chapter end naturally releases pressure
      if (eventCount === 0) tensionDelta -= 2;
      if (tensionDelta !== 0) await adjustNarrativeTension(novelId, tensionDelta);
    }

    // Push the inferred scene type to history (best-effort)
    const inferredType = inferSceneTypeFromText(sceneText, tagsResult);
    await pushSceneTypeHistory(novelId, inferredType);

    // Update last_scene_summary with a compact one-liner
    const summary = makeSceneSummary(sceneText, tagsResult);
    if (summary) await updateLastSceneSummary(novelId, summary);
  } catch {
    // Silent — never block on momentum bookkeeping
  }
}

function inferSceneTypeFromText(sceneText: string, tags: TagParseResult): string {
  const t = sceneText.toLowerCase();
  if (tags.characterDeaths.length > 0) return 'confrontation';
  if (tags.levelUp || tags.skillUnlocks.length) return 'revelation';
  if (/scream|run|blood|crash|gunshot|fight|punch|slammed|chase|gasp/.test(t)) return 'action';
  if (/whisper|silence|sigh|tear|alone|memory|quietly|listened/.test(t)) return 'quiet';
  if (/(\".*\")/.test(t) && t.split('"').length > 6) return 'dialogue';
  return 'dialogue';
}

function makeSceneSummary(sceneText: string, tags: TagParseResult): string {
  const cleaned = (tags.cleanText || sceneText)
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  // Grab first 2 sentences or 240 chars, whichever is shorter
  const firstSentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  return firstSentences.slice(0, 240);
}

export async function recordSceneTypeHistory(novelId: number, sceneType: SceneType): Promise<void> {
  await pushSceneTypeHistory(novelId, sceneType);
}

export async function setChapterGoal(novelId: number, goal: string): Promise<void> {
  await updateWorldStateFields(novelId, { chapter_goal: goal });
}
