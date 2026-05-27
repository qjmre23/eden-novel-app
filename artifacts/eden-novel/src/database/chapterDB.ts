import db, { Chapter } from './db';

export async function addChapter(chapter: Omit<Chapter, 'id'>): Promise<number> {
  const id = await db.chapters.add(chapter) as number;
  await db.novels.update(chapter.novel_id, { total_chapters: chapter.chapter_number });
  return id;
}

export async function updateChapter(id: number, updates: Partial<Chapter>): Promise<void> {
  await db.chapters.update(id, { ...updates });
}

export async function getChaptersByNovel(novelId: number): Promise<Chapter[]> {
  return db.chapters.where('novel_id').equals(novelId).sortBy('chapter_number');
}

export async function getChapterById(id: number): Promise<Chapter | undefined> {
  return db.chapters.get(id);
}

export async function getLastChapter(novelId: number, timelineId: string): Promise<Chapter | undefined> {
  const all = await db.chapters
    .where('novel_id').equals(novelId)
    .and(c => c.timeline_id === timelineId)
    .sortBy('chapter_number');
  return all[all.length - 1];
}

export async function getChapterByNumber(novelId: number, timelineId: string, chapterNumber: number): Promise<Chapter | undefined> {
  const all = await db.chapters
    .where('novel_id').equals(novelId)
    .and(c => c.timeline_id === timelineId)
    .sortBy('chapter_number');
  return all.find(c => c.chapter_number === chapterNumber);
}
