/**
 * mongoSync — Syncs local IndexedDB data to MongoDB via the API server.
 * Runs silently in the background; IndexedDB is always the source of truth.
 * MongoDB is a cloud backup / cross-device sync layer.
 *
 * Only syncs when cloudSyncEnabled is true (user is signed in with Firebase).
 * Attaches Firebase UID as `userId` on all sync requests.
 */

import { getNovel, getWorldState } from '../database/novelDB';
import { getCharactersByNovel } from '../database/characterDB';
import { getChaptersByNovel } from '../database/chapterDB';
import { getProgression, getSkills } from '../database/progressionDB';

const API_BASE = `${import.meta.env.BASE_URL}api`;

async function apiPost(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncNovelToMongo(
  novelId: number,
  mcUid: string,
  options?: { cloudSyncEnabled?: boolean; userId?: string }
): Promise<boolean> {
  if (!options?.cloudSyncEnabled || !options?.userId) {
    return false;
  }

  try {
    const [novel, characters, chapters, worldState, progression, skills] = await Promise.all([
      getNovel(novelId),
      getCharactersByNovel(novelId),
      getChaptersByNovel(novelId),
      getWorldState(novelId),
      getProgression(novelId, mcUid).catch(() => null),
      getSkills(novelId, mcUid).catch(() => []),
    ]);

    if (!novel) return false;

    return apiPost(`/mongo/sync/${novelId}`, {
      userId: options?.userId ?? null,
      novel: {
        title: novel.title,
        genre: novel.genre,
        mc_name: novel.mc_name,
        world_name: novel.world_name,
        total_chapters: novel.total_chapters,
        created_at: novel.created_at,
        last_played_at: novel.last_played_at,
        mc_traits_json: novel.mc_traits_json,
        starting_skills_json: novel.starting_skills_json,
      },
      chapters: chapters.map(ch => ({
        chapter_number: ch.chapter_number,
        title: ch.title,
        summary: ch.summary,
        created_at: ch.created_at,
      })),
      characters: characters.map(c => ({
        display_name: c.display_name,
        role: c.role,
        status: c.status,
        gender: c.gender,
        current_location: c.current_location,
        has_introduced_self: c.has_introduced_self,
        first_appeared_chapter: c.first_appeared_chapter,
      })),
      progression: progression ? {
        level: progression.level,
        rank: progression.rank,
        stats_json: progression.stats_json,
        unspent_points: progression.unspent_points,
        active_path: progression.active_path,
      } : null,
      skills: skills.map(s => ({
        skill_name: s.skill_name,
        rarity: s.rarity,
        skill_description: s.skill_description,
        evolution_hint: s.evolution_hint,
        unlocked_at: s.unlocked_at,
      })),
      worldState,
    });
  } catch {
    return false;
  }
}

export async function checkMongoConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/mongo/status`);
    if (!res.ok) return false;
    const data = await res.json() as { status: string };
    return data.status === 'connected';
  } catch {
    return false;
  }
}
