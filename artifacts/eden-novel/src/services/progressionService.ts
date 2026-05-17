import { getProgression, createProgression, updateProgression, addSkill } from '../database/progressionDB';
import { GENRE_STATS, SKILL_FALLBACKS } from '../core/genreStats';
import { BONUS_CHOICES_BY_GENRE, GENRE_SKILL_PATHS } from '../core/genreSkillPaths';
import { RANK_NAMES } from '../core/constants';
import { modelService } from './modelService';
import { presetManager } from './presetManager';
import type { StartingSkillAllocation } from '../core/genreStartingSkills';

export interface LevelUpResult {
  oldLevel: number;
  newLevel: number;
  oldRank: string;
  newRank: string;
  statsGained: Record<string, number>;
  newSkill: { name: string; description: string; rarity: string; evolutionHint: string } | null;
  unspentPoints: number;
  bonusChoices: string[];
}

export function getRankForLevel(level: number, genre: string): string {
  const ranks = RANK_NAMES[genre] ?? RANK_NAMES.default;
  const idx = Math.min(Math.floor((level - 1) / 3), ranks.length - 1);
  return ranks[idx];
}

export async function initPlayerProgression(
  novelId: number,
  characterUid: string,
  genre: string,
  startingSkills: StartingSkillAllocation[] = []
): Promise<void> {
  const existing = await getProgression(novelId, characterUid);
  if (existing) return;

  const statKeys = GENRE_STATS[genre] ?? GENRE_STATS.fantasy;
  const statsObj: Record<string, number> = {};

  for (const s of statKeys) statsObj[s] = 0;

  for (const alloc of startingSkills) {
    if (alloc.value <= 0) continue;
    const matchingKey = statKeys.find(k =>
      k.toLowerCase().includes(alloc.name.toLowerCase()) ||
      alloc.name.toLowerCase().includes(k.toLowerCase())
    );
    if (matchingKey) {
      statsObj[matchingKey] = Math.min(30, (statsObj[matchingKey] ?? 0) + alloc.value * 2);
    } else {
      statsObj[alloc.name] = Math.min(30, alloc.value * 2);
    }
  }

  await createProgression({
    novel_id: novelId,
    character_uid: characterUid,
    level: 1,
    rank: getRankForLevel(1, genre),
    stats_json: JSON.stringify(statsObj),
    unspent_points: 0,
    active_path: '',
    paths_json: '[]',
    updated_at: Date.now(),
  });
}

export async function triggerLevelUp(novelId: number, characterUid: string, genre: string): Promise<LevelUpResult> {
  const prog = await getProgression(novelId, characterUid);
  if (!prog || !prog.id) throw new Error('No progression found');

  const oldLevel = prog.level;
  const newLevel = oldLevel + 1;
  const oldRank = prog.rank;
  const newRank = getRankForLevel(newLevel, genre);

  let stats: Record<string, number> = {};
  try { stats = JSON.parse(prog.stats_json); } catch {}

  const statKeys = GENRE_STATS[genre] ?? GENRE_STATS.fantasy;
  const statsGained: Record<string, number> = {};

  for (const key of statKeys) {
    const basePower = Math.floor(newLevel / 5) + 1;
    const gain = Math.floor(Math.random() * basePower) + 1;
    stats[key] = (stats[key] ?? 0) + gain;
    statsGained[key] = gain;
  }

  const unspentPoints = (prog.unspent_points ?? 0) + 3;
  let newSkill = null;

  // Determine path for this skill
  const paths = GENRE_SKILL_PATHS[genre] ?? ['General Path'];
  const assignedPath = paths[(newLevel - 2) % paths.length];

  try {
    const systemPrompt = presetManager.getSkillGenerationPrompt(genre);
    const userPrompt = `Genre: ${genre}\nLevel: ${newLevel}\nRank: ${newRank}\nPath: ${assignedPath}\nCurrent stats: ${Object.entries(stats).slice(0,4).map(([k,v])=>`${k}:${v}`).join(', ')}\n\nGenerate ONE unique skill appropriate for level ${newLevel} on the ${assignedPath}.\nFormat:\nNAME: [skill name]\nDESC: [1-2 sentence description]\nEFFECT: [specific mechanical effect]\nRARITY: [common/rare/epic/legendary]\nEVOLVE: [hint for next evolution]\nPATH: ${assignedPath}`;
    const raw = await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 220 });
    const nameM = raw.match(/NAME:\s*(.+)/i);
    const descM = raw.match(/DESC:\s*(.+)/i);
    const rarityM = raw.match(/RARITY:\s*(\w+)/i);
    const evolveM = raw.match(/EVOLVE:\s*(.+)/i);

    newSkill = {
      name: nameM?.[1]?.trim() ?? (SKILL_FALLBACKS[genre] ?? SKILL_FALLBACKS.fantasy)[newLevel % 7],
      description: descM?.[1]?.trim() ?? 'A powerful ability gained through experience.',
      rarity: ['common','rare','epic','legendary'].includes(rarityM?.[1]?.toLowerCase() ?? '') ? rarityM![1].toLowerCase() : 'common',
      evolutionHint: evolveM?.[1]?.trim() ?? 'Continues to grow stronger.',
    };
  } catch {
    const fallback = (SKILL_FALLBACKS[genre] ?? SKILL_FALLBACKS.fantasy)[newLevel % 7];
    newSkill = { name: fallback, description: 'A skill forged through hardship.', rarity: 'common', evolutionHint: 'More power awaits.' };
  }

  await addSkill({
    novel_id: novelId,
    character_uid: characterUid,
    skill_name: newSkill.name,
    skill_description: newSkill.description,
    skill_effects_json: JSON.stringify({ path: assignedPath }),
    rarity: newSkill.rarity,
    evolution_hint: newSkill.evolutionHint,
    is_active: true,
    unlocked_at: Date.now(),
  });

  await updateProgression(prog.id, {
    level: newLevel,
    rank: newRank,
    stats_json: JSON.stringify(stats),
    unspent_points: unspentPoints,
  });

  const bonusChoices = BONUS_CHOICES_BY_GENRE[genre] ?? ['Increase Power', 'Increase Speed', 'Increase Defense'];

  return { oldLevel, newLevel, oldRank, newRank, statsGained, newSkill, unspentPoints, bonusChoices };
}

export async function spendStatPoints(novelId: number, characterUid: string, allocations: Record<string, number>): Promise<void> {
  const prog = await getProgression(novelId, characterUid);
  if (!prog || !prog.id) return;
  let stats: Record<string, number> = {};
  try { stats = JSON.parse(prog.stats_json); } catch {}
  let spent = 0;
  for (const [key, val] of Object.entries(allocations)) {
    if (val > 0) {
      stats[key] = Math.min(30, (stats[key] ?? 0) + val);
      spent += val;
    }
  }
  const remaining = Math.max(0, (prog.unspent_points ?? 0) - spent);
  await updateProgression(prog.id, { stats_json: JSON.stringify(stats), unspent_points: remaining });
}

export async function applyBonusChoice(
  novelId: number,
  characterUid: string,
  bonusLabel: string,
  genre: string
): Promise<void> {
  const prog = await getProgression(novelId, characterUid);
  if (!prog || !prog.id) return;

  let stats: Record<string, number> = {};
  try { stats = JSON.parse(prog.stats_json); } catch {}

  const statKeys = GENRE_STATS[genre] ?? GENRE_STATS.fantasy;
  // Map bonus label to a stat key via simple keyword matching
  const bonusLower = bonusLabel.toLowerCase();
  let matchedKey = statKeys[0];
  for (const key of statKeys) {
    if (bonusLower.includes(key.toLowerCase().split(' ')[0])) {
      matchedKey = key;
      break;
    }
  }

  stats[matchedKey] = Math.min(30, (stats[matchedKey] ?? 0) + 3);
  await updateProgression(prog.id, { stats_json: JSON.stringify(stats) });
}
