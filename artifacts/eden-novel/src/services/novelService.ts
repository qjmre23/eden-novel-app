import { createNovel, getAllNovels, getNovel, deleteNovel, updateNovelLastPlayed, incrementNovelActionCount, resetNovelActionCount, updateNovelMcPortrait } from '../database/novelDB';
import { createCharacter, updateCharacter } from '../database/characterDB';
import { initInventory } from '../database/inventoryDB';
import { initPlayerProgression } from './progressionService';
import { addChapter } from '../database/chapterDB';
import { assignPortrait } from './portraitService';
import type { Novel } from '../database/db';
import type { MCTraits, StartingSkillAllocation } from '../core/genreStartingSkills';

export interface CreateNovelInput {
  title: string;
  genre: string;
  mcName: string;
  worldName: string;
  storySeed?: string;
  startingLocation?: string;
  mcTraits?: MCTraits;
  startingSkills?: StartingSkillAllocation[];
}

export async function startNewNovel(input: CreateNovelInput): Promise<{ novelId: number; mcUid: string; timelineId: string }> {
  const novelId = await createNovel({
    title: input.title,
    genre: input.genre,
    mc_name: input.mcName,
    world_name: input.worldName,
    story_seed: input.storySeed ?? '',
    starting_location: input.startingLocation ?? '',
    mc_portrait_path: '',
    mc_traits_json: JSON.stringify(input.mcTraits ?? {}),
    starting_skills_json: JSON.stringify(input.startingSkills ?? []),
  });

  const mcChar = await createCharacter({
    novel_id: novelId,
    display_name: input.mcName,
    portrait_path: '',
    status: 'alive',
    gender: 'unknown',
    role: 'protagonist',
    metadata_json: JSON.stringify({ world: input.worldName }),
    first_appeared_chapter: 1,
    current_location: input.startingLocation || 'Starting Location',
    has_introduced_self: true,
  });

  try {
    const portrait = await assignPortrait(novelId, mcChar.internal_uid, input.mcName, 'unknown', 'protagonist', input.genre);
    const mcPortraitPath = portrait.type === 'image' && portrait.src ? portrait.src : '';
    if (mcPortraitPath && mcChar.id) {
      await updateCharacter(mcChar.id, { portrait_path: mcPortraitPath });
      await updateNovelMcPortrait(novelId, mcPortraitPath);
    }
  } catch {}

  await initInventory(novelId, mcChar.internal_uid);
  await initPlayerProgression(novelId, mcChar.internal_uid, input.genre, input.startingSkills ?? []);

  // Create the initial Chapter 1 record so scenes can link to it
  await addChapter({
    novel_id: novelId,
    timeline_id: 'main',
    chapter_number: 1,
    title: 'Prologue',
    summary: 'The story begins...',
    created_at: Date.now(),
    character_snapshot_json: '[]',
    world_snapshot_json: '{}',
  });

  return { novelId, mcUid: mcChar.internal_uid, timelineId: 'main' };
}

export async function listNovels(): Promise<Novel[]> {
  return getAllNovels();
}

export async function loadNovel(novelId: number): Promise<Novel | undefined> {
  await updateNovelLastPlayed(novelId);
  return getNovel(novelId);
}

export async function removeNovel(novelId: number): Promise<void> {
  return deleteNovel(novelId);
}

export async function incrementActionCount(novelId: number): Promise<number> {
  return incrementNovelActionCount(novelId);
}

export async function resetActionCount(novelId: number): Promise<void> {
  return resetNovelActionCount(novelId);
}
