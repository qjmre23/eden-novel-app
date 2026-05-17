import { modelService } from './modelService';
import { presetManager } from './presetManager';

export const PILOT_PAUSE_REASONS: Record<string, string> = {
  major_death: 'A character has died. Resume Pilot Mode?',
  moral_dilemma: 'Major moral decision ahead. Take control?',
  relationship_turn: 'Relationship turning point. Resume Pilot?',
  branch_event: 'Story branch detected. Take control?',
};

export async function makePilotDecision(
  choices: string[],
  storyContext: {
    genre: string;
    currentArc: string;
    emotionalState: string;
    recentScenes: string;
    mcTraits: string;
  }
): Promise<number> {
  const systemPrompt = presetManager.getPilotDecisionPrompt();
  const userPrompt = `Genre: ${storyContext.genre}
Current arc: ${storyContext.currentArc}
MC emotional state: ${storyContext.emotionalState}
Recent events: ${storyContext.recentScenes}
Character motivations: ${storyContext.mcTraits}
Choices:
${choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Output ONLY a single digit (1 through ${choices.length}). Nothing else.`;

  try {
    const response = await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 5, temperature: 0.4 });
    const digit = response.trim().match(/[1-9]/)?.[0];
    const index = digit ? parseInt(digit) - 1 : 0;
    return Math.min(index, choices.length - 1);
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
