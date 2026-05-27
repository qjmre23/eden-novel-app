import { addMemory, getTopMemories, archiveOldMemories } from '../database/memoryDB';
import db, { Memory } from '../database/db';
import { modelService } from './modelService';
import { TagParseResult } from '../parsers/tagParser';

const MEMORY_CAP = 50;
const MEMORY_KEEP_AFTER_ARCHIVE = 40;

interface RecordMemoryOptions {
  rawSceneText?: string;        // full scene text (used to generate a richer summary)
  tags?: TagParseResult;        // parsed tags from the same scene (used for importance scoring)
}

function scoreFromTags(tags?: TagParseResult): number {
  let score = 50;
  if (!tags) return score;
  if (tags.levelUp) score += 20;
  if (tags.characterDeaths.length > 0) score += 15;
  if (tags.relationshipUpdates.length > 0) score += 10;
  if ((tags.revelations?.length ?? 0) > 0) score += 15;
  if (tags.chapterEnd) score += 10;
  if (tags.newCharacters.length > 0) score += 5;

  // -10 if scene was pure dialogue with no event-bearing tags
  const eventBearing =
    tags.worldEvents.length +
    tags.newCharacters.length +
    tags.skillUnlocks.length +
    tags.relationshipUpdates.length +
    tags.characterDeaths.length +
    (tags.revelations?.length ?? 0) +
    (tags.tensionValue !== undefined ? 1 : 0) +
    (tags.levelUp ? 1 : 0) +
    (tags.chapterEnd ? 1 : 0);
  if (eventBearing === 0) score -= 10;

  return Math.max(0, Math.min(100, score));
}

async function summarizeScene(sceneText: string): Promise<string> {
  const system = 'Summarize story events as vivid memory entries for future AI context. Max 100 words. Include: what happened, who was involved, emotional stakes, unresolved threads. No bullet lists, just one tight paragraph.';
  const user = sceneText.slice(0, 800);
  try {
    const out = await modelService.generateText(system, user, { maxTokens: 180, temperature: 0.45 });
    return out.trim();
  } catch {
    // Fallback to a deterministic short excerpt if AI summarization fails
    return sceneText.replace(/\s+/g, ' ').trim().slice(0, 280);
  }
}

export async function recordMemory(
  novelId: number,
  timelineId: string,
  contentOrSceneText: string,
  importanceScore: number,
  tags: string[],
  options: RecordMemoryOptions = {},
): Promise<void> {
  // Generate a rich summary instead of just truncating raw text
  let summary: string;
  if (options.rawSceneText && options.rawSceneText.length > 100) {
    summary = await summarizeScene(options.rawSceneText);
  } else {
    summary = contentOrSceneText.slice(0, 500);
  }

  const finalScore = options.tags ? scoreFromTags(options.tags) : importanceScore;

  await addMemory({
    novel_id: novelId,
    timeline_id: timelineId,
    content: summary,
    relevance_tags: tags.join(','),
    importance_score: finalScore,
    archived_at: null,
  });

  const all = await db.memories
    .where('novel_id').equals(novelId)
    .and(m => m.timeline_id === timelineId && m.archived_at === null)
    .toArray();

  if (all.length > MEMORY_CAP) {
    await pruneAndCompressMemories(novelId, timelineId);
  }
}

/**
 * Smarter archive strategy:
 * - Keep all memories with score ≥ 70.
 * - Compress score 40-69 memories pairwise into combined summaries.
 * - Delete score < 40.
 * Falls back to legacy archive if the strategy fails.
 */
async function pruneAndCompressMemories(novelId: number, timelineId: string): Promise<void> {
  try {
    const all = await db.memories
      .where('novel_id').equals(novelId)
      .and(m => m.timeline_id === timelineId && m.archived_at === null)
      .toArray();

    const high = all.filter(m => (m.importance_score ?? 0) >= 70);
    const mid = all.filter(m => {
      const s = m.importance_score ?? 0;
      return s >= 40 && s < 70;
    });
    const low = all.filter(m => (m.importance_score ?? 0) < 40);

    // Delete low-importance memories outright
    if (low.length > 0) {
      await db.memories.bulkDelete(low.map(m => m.id!).filter(Boolean));
    }

    // Compress mid-tier pairs into single summaries
    const sortedMid = mid.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    while (sortedMid.length > 1 && high.length + sortedMid.length > MEMORY_KEEP_AFTER_ARCHIVE) {
      const a = sortedMid.shift()!;
      const b = sortedMid.shift()!;
      const combined: Memory = {
        novel_id: novelId,
        timeline_id: timelineId,
        content: `[compressed] ${a.content} — also: ${b.content}`.slice(0, 700),
        relevance_tags: Array.from(new Set([...(a.relevance_tags || '').split(','), ...(b.relevance_tags || '').split(',')])).filter(Boolean).join(','),
        importance_score: Math.max(a.importance_score ?? 0, b.importance_score ?? 0),
        archived_at: null,
      };
      if (a.id) await db.memories.delete(a.id);
      if (b.id) await db.memories.delete(b.id);
      await db.memories.add(combined);
    }
  } catch {
    // Fall back to the simple archive-by-low-score approach
    await archiveOldMemories(novelId, timelineId, MEMORY_KEEP_AFTER_ARCHIVE);
  }
}

export async function buildMemoryContext(novelId: number, timelineId: string): Promise<string> {
  const memories = await getTopMemories(novelId, timelineId, 12);
  if (memories.length === 0) return 'No notable memories yet.';
  return memories.map(m => `[Memory:${m.importance_score}] ${m.content}`).join('\n');
}
