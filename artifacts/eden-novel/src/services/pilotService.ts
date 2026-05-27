import { modelService } from './modelService';
import { loadWorldState } from './worldStateService';
import { getCharactersByNovel } from '../database/characterDB';
import { formatNpcEmotionalStates } from './npcIntelligenceService';

export const PILOT_PAUSE_REASONS: Record<string, string> = {
  major_death: 'A character has died. Resume Pilot Mode?',
  moral_dilemma: 'Major moral decision ahead. Take control?',
  relationship_turn: 'Relationship turning point. Resume Pilot?',
  branch_event: 'Story branch detected. Take control?',
};

export interface PilotStoryContext {
  genre: string;
  currentArc: string;
  emotionalState: string;
  recentScenes: string;
  mcTraits: string;
  novelId?: number;
}

/**
 * Make a strategic pilot decision. Uses world state to bias toward the
 * dramatically most interesting choice — not the safest.
 */
export async function makePilotDecision(
  choices: string[],
  storyContext: PilotStoryContext,
): Promise<number> {
  if (!choices.length) return 0;

  let tensionLine = '';
  let chapterGoal = '';
  let threats = '';
  let lastScene = '';
  let npcStates = '';
  let dramaticQuestion = '';

  if (storyContext.novelId != null) {
    try {
      const ws = await loadWorldState(storyContext.novelId);
      tensionLine = `${ws.narrative_tension ?? 20}/100`;
      chapterGoal = ws.chapter_goal || '(none)';
      threats = (ws.active_threats || []).join(' | ') || 'none';
      lastScene = ws.last_scene_summary || '(empty)';
      dramaticQuestion = ws.dramatic_question || '(none)';
      const chars = await getCharactersByNovel(storyContext.novelId);
      npcStates = formatNpcEmotionalStates(chars.filter(c => c.role !== 'protagonist' && c.status === 'alive')) || 'none';
    } catch {
      // Fall back to context-only prompting
    }
  }

  const systemPrompt = 'You are the strategic intelligence layer for an AI autopilot in a dark anime interactive novel. Your job is to choose the option that creates the MOST DRAMATICALLY INTERESTING next scene — not the safest option. Output only a single digit.';

  const userPrompt = `Genre: ${storyContext.genre}
Narrative tension: ${tensionLine || '(unknown)'}
Chapter goal: ${chapterGoal}
Active threats: ${threats}
Last scene: ${lastScene}
NPC emotional states: ${npcStates || '(unknown)'}
Dramatic question: ${dramaticQuestion}
Current arc: ${storyContext.currentArc}
MC emotional state: ${storyContext.emotionalState}
MC traits: ${storyContext.mcTraits}

Recent events: ${storyContext.recentScenes}

Available choices:
${choices.map((c, i) => `${i}: ${c}`).join('\n')}

CHOOSE THE OPTION THAT:
1. Most directly engages with the highest-tension active element.
2. Creates an interesting complication rather than resolving everything cleanly.
3. Is consistent with the MC's established traits.

Output ONLY a single digit in the range 0 to ${choices.length - 1}. Nothing else.`;

  try {
    const response = await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 10, temperature: 0.6 });
    const digit = response.trim().match(/[0-9]/)?.[0];
    const idx = digit ? parseInt(digit, 10) : 0;
    return Math.max(0, Math.min(choices.length - 1, idx));
  } catch {
    return 0;
  }
}

const ROLEPLAY_ACTIONS: Record<string, string[]> = {
  zombie:       ['Check the surroundings for threats', 'Search for supplies', 'Listen carefully for sounds'],
  cultivation:  ['Focus on the spiritual energy around me', 'Reflect on my technique', 'Sense the qi currents'],
  romance:      ['Say something genuine', 'Create a moment to connect', 'Express what I am feeling'],
  horror:       ['Stay very still and listen', 'Look for another way out', 'Keep moving quietly'],
  school:       ['Observe what others are doing', 'Go somewhere less crowded', 'Think about the situation'],
  mafia:        ['Stay composed and watch', 'Make a calculated move', 'Keep my expression neutral'],
  fantasy:      ['Assess the magical surroundings', 'Follow the path forward', 'Study what I notice'],
  isekai:       ['Take in this world carefully', 'Use my knowledge from before', 'Explore what is ahead'],
  survival:     ['Survey my resources', 'Find shelter or higher ground', 'Keep moving carefully'],
  thriller:     ['Stay hidden and observe', 'Look for useful information', 'Move quickly but quietly'],
  cyberpunk:    ['Scan the environment for data', 'Stay in the shadows', 'Look for a network terminal'],
  vampire:      ['Sense the night around me', 'Follow the scent of interest', 'Move with purpose'],
  space_scifi:  ['Check my instruments', 'Scan the area', 'Consider my next move'],
  military_war: ['Stay low and assess', 'Signal my position carefully', 'Observe enemy movement'],
  apocalypse:   ['Check for supplies nearby', 'Find defensible ground', 'Keep a low profile'],
  historical:   ['Behave as expected here', 'Observe the social dynamics', 'Choose words carefully'],
  superpower:   ['Sense the energy around me', 'Keep my power under control', 'Move toward what draws me'],
  detective:    ['Study every detail of the scene', 'Think through what I know', 'Look for what is hidden'],
  crime_noir:   ['Light a cigarette and think', 'Watch who is watching me', 'Make a move before they do'],
  slice_of_life:['Take a moment to breathe', 'Notice what is around me', 'Connect with someone nearby'],
};

export function generatePilotRoleplayAction(genre: string): string {
  const actions = ROLEPLAY_ACTIONS[genre] ?? ['Continue forward', 'Observe carefully', 'Consider the situation'];
  return actions[Math.floor(Math.random() * actions.length)];
}
