import { modelService } from './modelService';
import { presetManager } from './presetManager';
import { loadWorldState } from './worldStateService';
import { getCharactersByNovel } from '../database/characterDB';
import { getChaptersByNovel } from '../database/chapterDB';
import { buildMemoryContext } from './memoryService';

export interface AskEdenMessage {
  role: 'user' | 'eden';
  content: string;
  ts: number;
}

export async function askEden(
  novelId: number,
  timelineId: string,
  question: string
): Promise<string> {
  const ws = await loadWorldState(novelId);
  const characters = await getCharactersByNovel(novelId);
  const chapters = await getChaptersByNovel(novelId);
  const memories = await buildMemoryContext(novelId, timelineId);

  const chapterSummaries = chapters
    .slice(-5)
    .map(c => `Ch.${c.chapter_number}: ${c.title} — ${c.summary}`)
    .join('\n');

  const charList = characters
    .slice(0, 10)
    .map(c => `${c.display_name} (${c.role}, ${c.status})`)
    .join(', ');

  const systemPrompt = presetManager.getAskEdenPrompt();
  const userPrompt = `STORY CONTEXT:\nGenre: ${ws.genre}\nCurrent Chapter: ${ws.current_chapter}\nCurrent Arc: ${ws.current_arc}\nLocation: ${ws.current_location}\n\nCHARACTERS: ${charList}\n\nRECENT CHAPTERS:\n${chapterSummaries}\n\nKEY MEMORIES:\n${memories}\n\nUSER QUESTION: ${question}\n\nAnswer as Eden, the story guide. Only reference events that have already happened. Do not change story state.`;

  return modelService.generateText(systemPrompt, userPrompt, { maxTokens: 400 });
}
