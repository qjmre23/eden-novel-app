const ENABLED_KEY = 'eden_minigames_enabled';

export type MinigameType = 'qte' | 'dialogue' | 'memory' | 'negotiation' | 'stealth' | 'combat' | 'exam';

interface GenreKeywordTrigger {
  keywords: string[];
  minigame: MinigameType;
}

const GENRE_TRIGGERS: Record<string, GenreKeywordTrigger[]> = {
  combat: [{ keywords: ['attack', 'fight', 'battle', 'sword', 'slash', 'dodge', 'parry'], minigame: 'combat' }],
  zombie: [{ keywords: ['attack', 'horde', 'bite', 'fight', 'run'], minigame: 'qte' }],
  cultivation: [{ keywords: ['meditat', 'break through', 'pill', 'heavenly', 'tribulation'], minigame: 'exam' }],
  school: [{ keywords: ['exam', 'test', 'quiz', 'class', 'study', 'homework'], minigame: 'exam' }, { keywords: ['confess', 'talk to', 'ask', 'approach'], minigame: 'dialogue' }],
  cyberpunk: [{ keywords: ['hack', 'terminal', 'decrypt', 'bypass', 'system'], minigame: 'memory' }, { keywords: ['sneak', 'stealth', 'guard', 'security'], minigame: 'stealth' }],
  fantasy: [{ keywords: ['fight', 'attack', 'cast', 'spell', 'slay', 'battle'], minigame: 'combat' }],
  mafia: [{ keywords: ['negotiate', 'deal', 'payment', 'demand', 'price'], minigame: 'negotiation' }],
  romance: [{ keywords: ['confess', 'tell them', 'approach', 'talk', 'flirt'], minigame: 'dialogue' }],
  detective: [{ keywords: ['examine', 'clue', 'evidence', 'investigate', 'memory'], minigame: 'memory' }],
  stealth: [{ keywords: ['sneak', 'creep', 'shadow', 'avoid', 'guard', 'patrol'], minigame: 'stealth' }],
  military_war: [{ keywords: ['attack', 'assault', 'fight', 'ambush', 'charge'], minigame: 'qte' }],
  thriller: [{ keywords: ['run', 'escape', 'chase', 'evade', 'hide'], minigame: 'qte' }],
  crime_noir: [{ keywords: ['interrogate', 'threaten', 'bribe', 'bargain'], minigame: 'negotiation' }],
};

const DEFAULT_MINIGAMES_BY_GENRE: Record<string, MinigameType> = {
  zombie: 'qte',
  cultivation: 'exam',
  school: 'dialogue',
  cyberpunk: 'memory',
  fantasy: 'combat',
  mafia: 'negotiation',
  romance: 'dialogue',
  horror: 'qte',
  detective: 'memory',
  space_scifi: 'qte',
  military_war: 'combat',
  apocalypse: 'qte',
  historical: 'dialogue',
  survival: 'qte',
  superpower: 'combat',
  isekai: 'dialogue',
  vampire: 'qte',
  slice_of_life: 'dialogue',
  thriller: 'qte',
  crime_noir: 'negotiation',
};

export function shouldTriggerMinigame(genre: string, text: string, actionCount: number): MinigameType | null {
  if (localStorage.getItem(ENABLED_KEY) === 'false') return null;
  if (actionCount < 3) return null;

  const lowerText = text.toLowerCase();
  const genreTriggers = GENRE_TRIGGERS[genre] ?? [];
  for (const trigger of genreTriggers) {
    if (trigger.keywords.some(kw => lowerText.includes(kw))) {
      if (Math.random() < 0.4) return trigger.minigame;
    }
  }

  if (actionCount > 0 && actionCount % 10 === 0) {
    return DEFAULT_MINIGAMES_BY_GENRE[genre] ?? 'dialogue';
  }

  return null;
}

export interface MinigameResult {
  statEffects: Record<string, number>;
  inventoryChanges: Array<{ item: string; qty: number }>;
  relationshipChanges: Array<{ uid: string; delta: number }>;
  outcomeText: string;
}
