export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function parseJsonSafe<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

export function stringifyJson(val: unknown): string {
  try { return JSON.stringify(val); } catch { return '{}'; }
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return '#f59e0b';
    case 'epic': return '#8b5cf6';
    case 'rare': return '#3b82f6';
    default: return '#6b7280';
  }
}

export function getRarityGlow(rarity: string): string {
  switch (rarity) {
    case 'legendary': return '0 0 16px #f59e0b88';
    case 'epic': return '0 0 12px #8b5cf688';
    case 'rare': return '0 0 8px #3b82f688';
    default: return 'none';
  }
}

export function getEmergencyChoices(genre: string, location: string): string[] {
  const locationWord = location.split(' ').slice(-1)[0] ?? 'area';
  const genreChoices: Record<string, string[]> = {
    zombie: [
      `Search the ${locationWord} for supplies`,
      'Listen for movement outside',
      'Check on the others in the group',
      'Barricade the nearest entrance',
    ],
    cultivation: [
      'Meditate to recover qi',
      `Examine the ${locationWord} carefully`,
      'Approach the nearest person',
      'Sense the spiritual energy here',
    ],
    school: [
      `Look around the ${locationWord}`,
      'Check who else is nearby',
      'Take out your phone',
      'Approach the nearest person',
    ],
    isekai: [
      'Take in the unfamiliar surroundings',
      'Approach the nearest person cautiously',
      `Examine the ${locationWord} for clues about this world`,
      'Stay still and listen before acting',
    ],
    cyberpunk: [
      'Check your implant status',
      `Scan the ${locationWord} for threats`,
      'Contact your fixer',
      'Find a terminal to jack into',
    ],
    fantasy: [
      `Study the ${locationWord} for magical traces`,
      'Approach the nearest figure',
      'Draw your weapon and assess the threat',
      'Find higher ground to survey the area',
    ],
    mafia: [
      'Read the room — who has the most power here',
      'Stay neutral and say nothing yet',
      `Check the exits in the ${locationWord}`,
      'Make eye contact with someone you recognize',
    ],
    horror: [
      `Back against the wall and scan the ${locationWord}`,
      'Listen — what sounds are present or absent',
      'Look for anything out of place',
      'Find a way out before whatever this is gets worse',
    ],
    military_war: [
      'Take cover and assess the situation',
      'Signal your unit',
      'Check your equipment',
      'Identify the nearest threat',
    ],
    romance: [
      'Make eye contact and hold it',
      'Say something before the moment passes',
      'Find an excuse to stay longer',
      'Pull back and think before acting',
    ],
    detective: [
      'Look for physical evidence',
      'Question the nearest person',
      `Examine the ${locationWord} methodically`,
      'Note what is missing, not just what is there',
    ],
    space_scifi: [
      'Check your HUD for readings',
      'Hail the nearest comm channel',
      `Scan the ${locationWord} for life signs`,
      'Secure your oxygen and assess structural integrity',
    ],
    apocalypse: [
      `Scout the ${locationWord} for resources`,
      'Find higher ground to assess the area',
      'Check on anyone traveling with you',
      'Look for signs of other survivors',
    ],
    historical: [
      'Observe the social dynamics of those around you',
      'Speak carefully — choose your words for this era',
      `Study the ${locationWord} for anything useful`,
      'Identify who holds authority here',
    ],
    survival: [
      'Find water or shelter immediately',
      `Survey the ${locationWord} for dangers`,
      'Inventory what you have',
      'Find high ground to orient yourself',
    ],
    superpower: [
      'Sense the area for other powered individuals',
      'Keep your power suppressed until you understand the situation',
      `Assess the ${locationWord} for threats`,
      'Locate the nearest exit',
    ],
    vampire: [
      'Scent the air — who is here and what are they',
      `Assess the ${locationWord} through the dark`,
      'Identify the nearest mortal',
      'Stay in shadow and observe',
    ],
    slice_of_life: [
      'Take in the familiar details of the moment',
      'Speak to whoever is nearest',
      `Notice what is different about the ${locationWord} today`,
      'Let the moment breathe before acting',
    ],
    thriller: [
      'Move — staying still makes you a target',
      `Check the ${locationWord} for surveillance`,
      'Contact someone you trust',
      'Think through what you know and what it means',
    ],
    crime_noir: [
      'Light a cigarette and think',
      `Read the ${locationWord} — nothing here is innocent`,
      'Ask the question nobody wants to answer',
      'Follow the money, not the story',
    ],
  };
  return genreChoices[genre] ?? [
    `Examine the ${locationWord}`,
    'Approach the nearest person',
    'Stay alert and observe',
    'Move to a better position',
  ];
}
