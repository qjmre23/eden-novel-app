import { addChapter, updateChapter, getChapterByNumber } from '../database/chapterDB';
import { getCharactersByNovel } from '../database/characterDB';
import {
  loadWorldState,
  updateChapterGoal as wsUpdateChapterGoal,
  updateDramaticQuestion,
} from './worldStateService';
import { modelService } from './modelService';
import { presetManager } from './presetManager';
import { buildMemoryContext } from './memoryService';

function stripFormatting(s: string): string {
  return s
    .replace(/^\s+|\s+$/g, '')
    .replace(/^["'`*_]+|["'`*_]+$/g, '')
    .replace(/^#+\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .trim();
}

export async function generateChapterTitle(novelId: number, _timelineId: string): Promise<string> {
  try {
    const ws = await loadWorldState(novelId);
    const characters = await getCharactersByNovel(novelId);
    const npcEmotions = characters
      .filter(c => c.role !== 'protagonist' && c.status === 'alive')
      .slice(0, 4)
      .map(c => `${c.display_name}:${c.current_emotion ?? 'neutral'}`)
      .join(', ');

    const systemPrompt = presetManager.getChapterGenerationPrompt();
    const userPrompt = `Generate an evocative chapter title (max 5 words) that captures the EMOTIONAL TRUTH of this chapter, not just plot events.
Think of Attack on Titan chapter titles — short, evocative, often metaphorical.
Avoid generic titles like "The Beginning", "New Threats", "A Change".

Context:
- Genre: ${ws.genre}
- Dramatic question: ${ws.dramatic_question || '(none set)'}
- Chapter goal: ${ws.chapter_goal || '(none set)'}
- Active threats: ${(ws.active_threats || []).join(' | ') || 'none'}
- NPC emotions: ${npcEmotions || 'none'}
- Last scene summary: ${ws.last_scene_summary || '(empty)'}
- Current arc: ${ws.current_arc || '(unset)'}

Output ONLY the title. No quotes. No markdown. No explanation.`;
    const title = await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 24, temperature: 0.8 });
    const cleaned = stripFormatting(title);
    return cleaned || `Chapter ${ws.current_chapter}`;
  } catch {
    return 'Chapter Unknown';
  }
}

export async function generateChapterSummary(novelId: number, timelineId: string): Promise<string> {
  try {
    const ws = await loadWorldState(novelId);
    const memCtx = await buildMemoryContext(novelId, timelineId);
    const systemPrompt = presetManager.getChapterGenerationPrompt();
    const userPrompt = `Write a chapter summary (3-4 sentences) in the style of a dark anime recap.
Include:
- the central conflict
- the most emotionally significant moment
- how relationships shifted (be specific about characters by name)
- what remains unresolved

Write it as a reader would remember it after closing the book — not as a plot bullet list. No headings. No markdown.

World context:
- Genre: ${ws.genre}
- Arc: ${ws.current_arc}
- Location: ${ws.current_location}
- Dramatic question: ${ws.dramatic_question || '(none)'}
- Active threats: ${(ws.active_threats || []).join(' | ') || 'none'}

Key memories:
${memCtx}`;
    const summary = await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 220, temperature: 0.75 });
    return stripFormatting(summary) || 'The story continues...';
  } catch {
    return 'The story continues...';
  }
}

/**
 * Generate a dramatic question for a chapter. Used at chapter open to set the
 * narrative spine that scene planning will pull against.
 */
export async function generateChapterGoal(
  novelId: number,
  _timelineId: string,
  chapterNumber: number,
): Promise<string> {
  try {
    const ws = await loadWorldState(novelId);
    const characters = await getCharactersByNovel(novelId);
    const npcContext = characters
      .filter(c => c.role !== 'protagonist' && c.status === 'alive')
      .slice(0, 4)
      .map(c => `${c.display_name} (${c.current_emotion ?? 'neutral'}, trust:${c.trust_level ?? 0})`)
      .join(', ');

    const system = 'You design the dramatic spine of chapters in dark anime interactive novels. Output one question, nothing else.';
    const user = `Given the story state and unresolved threads, what dramatic question should drive Chapter ${chapterNumber}?

Answer in ONE sentence that starts with a verb: "Will X...", "Can X...", "What happens when..."
The question must be specific, charged, and resolvable in a few chapters of scenes.

Story state:
- Genre: ${ws.genre}
- Previous dramatic question: ${ws.dramatic_question || '(none)'}
- Active threats: ${(ws.active_threats || []).join(' | ') || 'none'}
- Pending revelations: ${(ws.pending_revelations || []).join(' | ') || 'none'}
- Foreshadowed events: ${(ws.foreshadowed_events || []).join(' | ') || 'none'}
- Last scene: ${ws.last_scene_summary || '(empty)'}
- NPCs in play: ${npcContext || '(none)'}

Output ONLY the question. No quotes. No prefix.`;
    const raw = await modelService.generateText(system, user, { maxTokens: 60, temperature: 0.8 });
    const cleaned = stripFormatting(raw);
    if (cleaned) {
      await wsUpdateChapterGoal(novelId, cleaned);
      await updateDramaticQuestion(novelId, cleaned);
    }
    return cleaned;
  } catch {
    return '';
  }
}

export async function closeChapterAndBeginNext(
  novelId: number,
  timelineId: string,
): Promise<{ closedChapterId: number; newChapterId: number; title: string }> {
  const ws = await loadWorldState(novelId);
  const title = await generateChapterTitle(novelId, timelineId);
  const summary = await generateChapterSummary(novelId, timelineId);
  const characters = await getCharactersByNovel(novelId);

  const existingChapter = await getChapterByNumber(novelId, timelineId, ws.current_chapter);
  let closedChapterId: number;
  if (existingChapter?.id) {
    await updateChapter(existingChapter.id, {
      title,
      summary,
      character_snapshot_json: JSON.stringify(characters),
      world_snapshot_json: JSON.stringify(ws),
    });
    closedChapterId = existingChapter.id;
  } else {
    closedChapterId = await addChapter({
      novel_id: novelId,
      timeline_id: timelineId,
      chapter_number: ws.current_chapter,
      title,
      summary,
      created_at: Date.now(),
      character_snapshot_json: JSON.stringify(characters),
      world_snapshot_json: JSON.stringify(ws),
    });
  }

  const nextChapterNumber = ws.current_chapter + 1;
  const newChapterId = await addChapter({
    novel_id: novelId,
    timeline_id: timelineId,
    chapter_number: nextChapterNumber,
    title: `Chapter ${nextChapterNumber}`,
    summary: 'In progress...',
    created_at: Date.now(),
    character_snapshot_json: JSON.stringify(characters),
    world_snapshot_json: JSON.stringify(ws),
  });

  // Set a fresh dramatic question / chapter goal for the new chapter.
  // Fire-and-forget — we don't want chapter transitions to block on the AI.
  void generateChapterGoal(novelId, timelineId, nextChapterNumber).catch(() => {});

  return { closedChapterId, newChapterId, title };
}
