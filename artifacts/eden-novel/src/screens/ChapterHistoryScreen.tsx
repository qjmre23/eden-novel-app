import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, BookOpen, List, Grid3X3, BookMarked, GitBranch, Wand2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getChaptersByNovel, updateChapter } from '../database/chapterDB';
import { countScenesInChapter } from '../database/sceneDB';
import { generateChapterTitle } from '../services/chapterService';
import { formatDate } from '../core/utils';
import type { Chapter } from '../database/db';

type ViewMode = 'list' | 'category';

interface ChapterEntry extends Chapter {
  sceneCount?: number;
  generatingTitle?: boolean;
}

const PLACEHOLDER_TITLE_RE = /^(Chapter \d+|Prologue|In progress\.\.\.)$/;

function isPlaceholderTitle(title: string): boolean {
  return PLACEHOLDER_TITLE_RE.test(title.trim());
}

function groupByArc(chapters: ChapterEntry[]): { label: string; chapters: ChapterEntry[] }[] {
  const ARC_SIZE = 5;
  const groups: { label: string; chapters: ChapterEntry[] }[] = [];
  for (let i = 0; i < chapters.length; i += ARC_SIZE) {
    const slice = chapters.slice(i, i + ARC_SIZE);
    const arcNum = Math.floor(i / ARC_SIZE) + 1;
    const start = slice[0].chapter_number;
    const end = slice[slice.length - 1].chapter_number;
    groups.push({ label: `Arc ${arcNum} — Ch. ${start}–${end}`, chapters: slice });
  }
  return groups;
}

export default function ChapterHistoryScreen() {
  const [, navigate] = useLocation();
  const params = useParams<{ novelId: string }>();
  const novelId = parseInt(params.novelId ?? '0');
  const [chapters, setChapters] = useState<ChapterEntry[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!novelId) return;
    setLoading(true);
    getChaptersByNovel(novelId).then(async chs => {
      const entries: ChapterEntry[] = await Promise.all(
        chs.map(async ch => {
          let sceneCount: number | undefined;
          try { sceneCount = ch.id ? await countScenesInChapter(ch.id) : 0; } catch { sceneCount = 0; }
          return { ...ch, sceneCount };
        })
      );
      setChapters(entries.sort((a, b) => a.chapter_number - b.chapter_number));
      setLoading(false);
    });
  }, [novelId]);

  // Auto-generate titles for placeholder chapters once loaded
  useEffect(() => {
    if (loading) return;
    chapters.forEach(ch => {
      if (!ch.generatingTitle && (!ch.title || /^(Chapter \d+|Prologue|In progress\.\.\.?)$/i.test(ch.title))) {
        handleGenerateTitle(ch);
      }
    });
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateTitle = useCallback(async (ch: ChapterEntry) => {
    setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, generatingTitle: true } : c));
    try {
      const newTitle = await generateChapterTitle(novelId, ch.timeline_id);
      if (ch.id) await updateChapter(ch.id, { title: newTitle });
      setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, title: newTitle, generatingTitle: false } : c));
    } catch {
      setChapters(prev => prev.map(c => c.id === ch.id ? { ...c, generatingTitle: false } : c));
    }
  }, [novelId]);

  const renderChapterCard = (ch: ChapterEntry) => (
    <motion.div
      key={ch.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/70 border border-gray-800 rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs mb-0.5">Chapter {ch.chapter_number}</p>
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold truncate leading-snug">{ch.title}</h3>
            {isPlaceholderTitle(ch.title) && (
              <button
                onClick={() => handleGenerateTitle(ch)}
                disabled={ch.generatingTitle}
                className="shrink-0 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                title="Generate AI title"
              >
                {ch.generatingTitle ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Wand2 size={13} />
                )}
              </button>
            )}
          </div>
        </div>
        <span className="text-gray-600 text-xs shrink-0">{formatDate(ch.created_at)}</span>
      </div>

      {ch.summary && ch.summary !== 'In progress...' && (
        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-3">{ch.summary}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-gray-600 text-xs">
          {ch.sceneCount != null ? `${ch.sceneCount} scene${ch.sceneCount !== 1 ? 's' : ''}` : ''}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/story/${novelId}`)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/40 border border-blue-700/40 text-blue-300 hover:bg-blue-800/50 transition-colors"
          >
            <BookMarked size={11} />
            Read
          </button>
          <button
            disabled
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-800/60 border border-gray-700/40 text-gray-500 cursor-not-allowed opacity-60"
            title="Branch from this chapter — coming soon"
          >
            <GitBranch size={11} />
            Branch
          </button>
        </div>
      </div>
    </motion.div>
  );

  const arcGroups = groupByArc(chapters);

  return (
    <div className="min-h-dvh flex flex-col bg-[#080812]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800 shrink-0">
        <button onClick={() => navigate(-1 as any)} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Chapter History</h1>
        <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-0.5">
          <button
            onClick={() => setView('list')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <List size={13} />
            List
          </button>
          <button
            onClick={() => setView('category')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${view === 'category' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Grid3X3 size={13} />
            Arcs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={28} className="text-gray-600 animate-spin" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No chapters completed yet</p>
            <p className="text-xs text-gray-600 mt-1">Chapters appear here as you play</p>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-3">
            {[...chapters].reverse().map(ch => renderChapterCard(ch))}
          </div>
        ) : (
          <div className="space-y-6">
            {arcGroups.map(group => (
              <div key={group.label}>
                <p className="text-yellow-600/80 text-xs uppercase tracking-widest font-semibold mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-3">
                  {group.chapters.map(ch => renderChapterCard(ch))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
