import db, { Scene } from './db';

export async function addScene(scene: Omit<Scene, 'id'>): Promise<number> {
  return db.scenes.add(scene) as Promise<number>;
}

export async function getScenesByChapter(chapterId: number): Promise<Scene[]> {
  return db.scenes.where('chapter_id').equals(chapterId).sortBy('scene_number');
}

export async function getScenesByNovel(novelId: number, limit = 50): Promise<Scene[]> {
  return db.scenes.where('novel_id').equals(novelId).reverse().limit(limit).toArray();
}

export async function getLastScenes(novelId: number, timelineId: string, count = 5): Promise<Scene[]> {
  const all = await db.scenes
    .where('novel_id').equals(novelId)
    .and(s => s.timeline_id === timelineId)
    .sortBy('created_at');
  return all.slice(-count);
}

export async function countScenesInChapter(chapterId: number): Promise<number> {
  return db.scenes.where('chapter_id').equals(chapterId).count();
}
