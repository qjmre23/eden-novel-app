import db, { Memory } from './db';

export async function addMemory(memory: Omit<Memory, 'id'>): Promise<number> {
  return db.memories.add(memory) as Promise<number>;
}

export async function getMemories(novelId: number, timelineId: string, limit = 20): Promise<Memory[]> {
  return db.memories
    .where('novel_id').equals(novelId)
    .and(m => m.timeline_id === timelineId && m.archived_at === null)
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getTopMemories(novelId: number, timelineId: string, count = 10): Promise<Memory[]> {
  const all = await db.memories
    .where('novel_id').equals(novelId)
    .and(m => m.timeline_id === timelineId && m.archived_at === null)
    .toArray();
  return all.sort((a, b) => b.importance_score - a.importance_score).slice(0, count);
}

export async function archiveOldMemories(novelId: number, timelineId: string, keepCount = 30): Promise<void> {
  const all = await db.memories
    .where('novel_id').equals(novelId)
    .and(m => m.timeline_id === timelineId && m.archived_at === null)
    .sortBy('importance_score');
  if (all.length <= keepCount) return;
  const toArchive = all.slice(0, all.length - keepCount);
  for (const m of toArchive) {
    if (m.id) await db.memories.update(m.id, { archived_at: Date.now() });
  }
}
