import { addChapter, updateChapter, getChapterByNumber, getLastChapter } from '../database/chapterDB';
import { getCharactersByNovel } from '../database/characterDB';
import { loadWorldState } from './worldStateService';
import { modelService } from './modelService';
import { presetManager } from './presetManager';
import { buildMemoryContext } from './memoryService';

export async function generateChapterTitle(novelId: number, timelineId: string): Promise<string> {
  try {
    const ws = await loadWorldState(novelId);
    const systemPrompt = presetManager.getChapterGenerationPrompt();
    const userPrompt = `Genre: ${ws.genre}\nCurrent arc: ${ws.current_arc}\nLocation: ${ws.current_location}\nScenes completed: ${ws.scene_count_since_chapter}\nGenerate a short, evocative chapter title (max 6 words). Output ONLY the title, nothing else.`;
    const title = await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 20 });
    return title.trim().replace(/["']/g, '') || `Chapter ${ws.current_chapter}`;
  } catch {
    return `Chapter Unknown`;
  }
}

export async function generateChapterSummary(novelId: number, timelineId: string): Promise<string> {
  try {
    const ws = await loadWorldState(novelId);
    const memCtx = await buildMemoryContext(novelId, timelineId);
    const systemPrompt = presetManager.getChapterGenerationPrompt();
    const userPrompt = `Generate a 2-3 sentence chapter summary.\nWorld context:\n${JSON.stringify({ genre: ws.genre, arc: ws.current_arc, location: ws.current_location })}\nKey memories:\n${memCtx}`;
    return await modelService.generateText(systemPrompt, userPrompt, { maxTokens: 150 });
  } catch {
    return 'The story continues...';
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

  return { closedChapterId, newChapterId, title };
}
