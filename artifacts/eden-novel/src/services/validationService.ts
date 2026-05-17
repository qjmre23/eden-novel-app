import { GENRE_STATS } from '../core/genreStats';

export function validateCharacterData(data: Record<string, unknown>, genre: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const forbiddenFields: Record<string, string[]> = {
    zombie: ['cultivation_rank', 'mana_core', 'sect_rank', 'school_grade', 'noble_rank'],
    cultivation: ['infection_status', 'zombie_mutation', 'school_grade', 'crime_boss'],
    school: ['zombie_mutation', 'mana_core', 'cultivation_rank', 'crime_boss'],
  };
  const forbidden = forbiddenFields[genre] ?? [];
  for (const key of forbidden) {
    if (key in data) errors.push(`Field "${key}" is not allowed in genre "${genre}"`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateStatAllocation(stats: Record<string, number>, genre: string, spentPoints: number, maxPoints: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validStats = GENRE_STATS[genre] ?? GENRE_STATS.fantasy;
  for (const key of Object.keys(stats)) {
    if (!validStats.includes(key)) errors.push(`"${key}" is not a valid stat for genre "${genre}"`);
    if (stats[key] < 0) errors.push(`Stat "${key}" cannot be negative`);
  }
  if (spentPoints > maxPoints) errors.push(`Cannot spend ${spentPoints} points (max: ${maxPoints})`);
  return { valid: errors.length === 0, errors };
}

export function sanitizeAIOutput(text: string): string {
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 4000);
}

export function detectHallucination(text: string, genre: string): boolean {
  const genreKeywords: Record<string, string[]> = {
    zombie: ['cultivation', 'qi', 'dao', 'sect', 'mana spell'],
    cultivation: ['zombie horde', 'infection', 'apocalypse bunker'],
    school: ['zombie horde', 'qi cultivation', 'mafia boss territory'],
  };
  const keywords = genreKeywords[genre] ?? [];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}
