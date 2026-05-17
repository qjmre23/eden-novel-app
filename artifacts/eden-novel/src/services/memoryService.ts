import { addMemory, getTopMemories, archiveOldMemories } from '../database/memoryDB';
import db from '../database/db';

export async function recordMemory(novelId: number, timelineId: string, content: string, importanceScore: number, tags: string[]): Promise<void> {
  await addMemory({
    novel_id: novelId,
    timeline_id: timelineId,
    content,
    relevance_tags: tags.join(','),
    importance_score: importanceScore,
    archived_at: null,
  });

  const all = await db.memories
    .where('novel_id').equals(novelId)
    .and(m => m.timeline_id === timelineId && m.archived_at === null)
    .toArray();

  if (all.length > 50) {
    await archiveOldMemories(novelId, timelineId, 30);
  }
}

export async function buildMemoryContext(novelId: number, timelineId: string): Promise<string> {
  const memories = await getTopMemories(novelId, timelineId, 10);
  if (memories.length === 0) return 'No notable memories yet.';
  return memories.map(m => `[Memory] ${m.content}`).join('\n');
}
