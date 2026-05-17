import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Trash2, Clock, Settings, Layers, ChevronRight, Sparkles } from 'lucide-react';
import { listNovels, removeNovel } from '../services/novelService';
import { formatDate } from '../core/utils';
import { GENRES } from '../core/constants';
import { getChaptersByNovel } from '../database/chapterDB';
import type { Novel } from '../database/db';

export default function NovelSelectionScreen() {
  const [, navigate] = useLocation();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [chapterCounts, setChapterCounts] = useState<Record<number, number>>({});

  const load = async () => {
    setLoading(true);
    const data = await listNovels();
    setNovels(data);
    const counts: Record<number, number> = {};
    await Promise.all(data.map(async n => {
      if (n.id) {
        const chapters = await getChaptersByNovel(n.id);
        counts[n.id] = chapters.length;
      }
    }));
    setChapterCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (deleteConfirm === id) {
      await removeNovel(id);
      setDeleteConfirm(null);
      load();
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const getGenreInfo = (genreId: string) => GENRES.find(g => g.id === genreId);

  return (
    <div className="min-h-dvh flex flex-col bg-[#04040e] safe-top relative overflow-hidden">

      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-indigo-900/15 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-violet-900/10 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-indigo-500/30 blur-md" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-900/50 border border-indigo-400/20">
              <BookOpen size={17} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-white font-black text-base leading-tight tracking-tight">Eden Novel</h1>
            <p className="text-indigo-400/40 text-[10px] uppercase tracking-widest font-medium">AI Narrative Engine</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl bg-white/4 border border-white/6 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/15 transition-all"
        >
          <Settings size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">

        {/* New Novel Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/genre-picker')}
          className="w-full rounded-2xl py-5 flex flex-col items-center gap-2 transition-all mb-5 group relative overflow-hidden border border-dashed border-indigo-500/25 hover:border-indigo-400/50"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,70,229,0.08) 0%, transparent 70%)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:border-indigo-400/40 transition-all">
            <Plus size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </div>
          <span className="font-bold text-sm text-indigo-300 group-hover:text-indigo-200 transition-colors">New Novel</span>
          <span className="text-xs text-indigo-500/70 group-hover:text-indigo-400/80 transition-colors">20 genres · AI-powered narrative</span>
        </motion.button>

        {/* Novel list / states */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-indigo-500/30 rounded-full" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-gray-600 text-xs">Loading your stories…</p>
          </div>
        ) : novels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center py-20"
          >
            {/* Atmospheric empty state */}
            <div className="relative inline-block mb-5">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-xl scale-150" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-900/80 to-black/80 border border-white/6 flex items-center justify-center mx-auto">
                <Sparkles size={34} className="text-indigo-500/40" />
              </div>
            </div>
            <p className="font-bold text-gray-400 text-base mb-1">Your story awaits</p>
            <p className="text-gray-700 text-sm">Create your first novel to begin</p>
            <div className="flex items-center gap-2 justify-center mt-4">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-indigo-500/30" />
              <span className="text-indigo-500/30 text-xs">✦</span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-indigo-500/30" />
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-700 text-xs px-1 mb-3 uppercase tracking-wider font-medium">
              {novels.length} {novels.length === 1 ? 'story' : 'stories'}
            </p>
            <AnimatePresence>
              {novels.map((novel, idx) => {
                const genre = getGenreInfo(novel.genre);
                const chCount = novel.id ? (chapterCounts[novel.id] ?? 0) : 0;
                return (
                  <motion.div
                    key={novel.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.06 }}
                    className="rounded-2xl border border-white/5 overflow-hidden group"
                    style={{
                      background: `linear-gradient(135deg, ${genre?.color ?? '#1a1a2e'}18, rgba(8,8,20,0.95))`,
                    }}
                  >
                    {/* Subtle left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl opacity-60"
                      style={{ background: genre?.color ?? '#4f46e5' }}
                    />

                    <button
                      onClick={() => navigate(`/story/${novel.id}`)}
                      className="w-full text-left p-4 hover:bg-white/2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="text-2xl shrink-0">{genre?.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-bold text-base leading-tight truncate">{novel.title}</h3>
                              <p className="text-gray-500 text-xs mt-0.5">{novel.mc_name} · <span className="capitalize">{genre?.name}</span></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-gray-600 text-xs">
                              <Layers size={10} />
                              <span>{chCount > 0 ? `${chCount} chapters` : `Ch. ${novel.total_chapters || 1}`}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-700 text-xs">
                              <Clock size={10} />
                              <span>{formatDate(novel.last_played_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-white/8 shrink-0"
                          style={{
                            background: `${genre?.color ?? '#4f46e5'}22`,
                            color: genre?.color ?? '#818cf8',
                          }}
                        >
                          Continue <ChevronRight size={11} />
                        </div>
                      </div>
                    </button>

                    {/* Footer actions */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      {chCount > 0 ? (
                        <button
                          onClick={() => navigate(`/chapter-history/${novel.id}`)}
                          className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-500 transition-colors"
                        >
                          <Layers size={10} />
                          View {chCount} chapter{chCount !== 1 ? 's' : ''}
                        </button>
                      ) : <div />}
                      <button
                        onClick={() => handleDelete(novel.id!)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                          deleteConfirm === novel.id
                            ? 'bg-red-900/40 text-red-400 border border-red-700/40'
                            : 'text-gray-800 hover:text-gray-600'
                        }`}
                      >
                        <Trash2 size={11} />
                        {deleteConfirm === novel.id ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
