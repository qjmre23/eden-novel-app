import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, GitBranch, BookOpen, Layers, AlertTriangle } from 'lucide-react';
import db, { type Chapter, type Timeline } from '../database/db';
import { formatDate } from '../core/utils';
import { loadWorldState, updateWorldStateFields } from '../services/worldStateService';

export default function TimelineBranchScreen() {
  const [, navigate] = useLocation();
  const params = useParams<{ novelId: string }>();
  const novelId = parseInt(params.novelId ?? '0');
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTimelineId, setActiveTimelineId] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmChapter, setConfirmChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    if (!novelId) return;
    loadData();
  }, [novelId]);

  const loadData = async () => {
    const tls = await db.timelines.where('novel_id').equals(novelId).toArray();
    const chs = await db.chapters.where('novel_id').equals(novelId).sortBy('chapter_number');
    setTimelines(tls);
    setChapters(chs);
    const active = tls.find(t => t.is_active);
    if (active) setActiveTimelineId(String(active.id ?? ''));
  };

  const handleBranchFromHere = async (chapter: Chapter) => {
    setConfirmChapter(chapter);
    setShowConfirm(true);
  };

  const confirmBranch = async () => {
    if (!confirmChapter || !novelId) return;

    // Deactivate all timelines
    for (const tl of timelines) {
      if (tl.id) await db.timelines.update(tl.id, { is_active: false });
    }

    // Create new timeline
    const newTimelineId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const now = Date.now();
    await db.timelines.add({
      novel_id: novelId,
      parent_timeline_id: activeTimelineId,
      branch_point_chapter: confirmChapter.chapter_number,
      branch_label: `Branch from Ch.${confirmChapter.chapter_number}`,
      created_at: now,
      is_active: true,
    });

    // Update novel active timeline
    const novel = await db.novels.get(novelId);
    if (novel?.id) {
      await db.novels.update(novel.id, { active_timeline_id: newTimelineId });
    }

    // Restore world state from snapshot
    try {
      const snapshot = JSON.parse(confirmChapter.world_snapshot_json || '{}');
      if (Object.keys(snapshot).length > 0) {
        await updateWorldStateFields(novelId, snapshot);
      }
    } catch {}

    setShowConfirm(false);
    await loadData();
    navigate(`/story/${novelId}`);
  };

  const switchToTimeline = async (timeline: Timeline) => {
    if (!timeline.id || !novelId) return;

    // Deactivate all, activate selected
    for (const tl of timelines) {
      if (tl.id) await db.timelines.update(tl.id, { is_active: tl.id === timeline.id });
    }

    // Update novel
    const novel = await db.novels.get(novelId);
    if (novel?.id) {
      await db.novels.update(novel.id, { active_timeline_id: String(timeline.id) });
    }

    // Restore world state from the chapter at the branch point
    const branchChapter = chapters.find(c => c.chapter_number === timeline.branch_point_chapter);
    if (branchChapter) {
      try {
        const snapshot = JSON.parse(branchChapter.world_snapshot_json || '{}');
        if (Object.keys(snapshot).length > 0) {
          await updateWorldStateFields(novelId, snapshot);
        }
      } catch {}
    }

    await loadData();
    navigate(`/story/${novelId}`);
  };

  const readOnlyChapter = (chapter: Chapter) => {
    navigate(`/story/${novelId}?chapter=${chapter.chapter_number}`);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#080812]">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1 as any)} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="text-white font-bold text-lg">Timeline Branches</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Timeline tree */}
        <div className="relative">
          {/* Main spine */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-800" />

          {chapters.length === 0 && (
            <div className="text-center py-12 text-gray-500 ml-8">
              <GitBranch size={48} className="mx-auto mb-3 opacity-30" />
              <p>No chapters yet</p>
              <p className="text-xs mt-2">Play through the story to create chapters and branches</p>
            </div>
          )}

          {chapters.map(ch => {
            const branchTl = timelines.find(t => t.branch_point_chapter === ch.chapter_number && t.parent_timeline_id);
            const isActiveBranch = branchTl?.is_active;

            return (
              <div key={ch.id} className="relative flex items-start gap-4 mb-6 ml-2">
                {/* Chapter dot on spine */}
                <div className="relative z-10 shrink-0">
                  <button
                    onClick={() => setSelectedChapter(selectedChapter === ch.chapter_number ? null : ch.chapter_number)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActiveBranch ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-white">{ch.chapter_number}</span>
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3">
                    <p className="text-white font-semibold text-sm">{ch.title}</p>
                    <p className="text-gray-500 text-xs line-clamp-1">{ch.summary}</p>

                    <AnimatePresence>
                      {selectedChapter === ch.chapter_number && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800">
                            <button
                              onClick={() => readOnlyChapter(ch)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                            >
                              <BookOpen size={12} />
                              Read Only
                            </button>
                            <button
                              onClick={() => handleBranchFromHere(ch)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 text-xs transition-colors border border-blue-800/30"
                            >
                              <GitBranch size={12} />
                              Branch Here
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Branch line extending right */}
                  {branchTl && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mt-2 ml-4 flex items-center gap-2"
                    >
                      <div className="w-6 h-px bg-blue-700" />
                      <button
                        onClick={() => switchToTimeline(branchTl)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          branchTl.is_active
                            ? 'bg-blue-700/30 text-blue-300 border border-blue-600/40'
                            : 'bg-gray-800 text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <Layers size={10} className="inline mr-1" />
                        {branchTl.branch_label}
                        {branchTl.is_active && <span className="ml-1 text-blue-400">(Active)</span>}
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Branch list at bottom */}
        {timelines.length > 1 && (
          <div className="mt-6 border-t border-gray-800 pt-4">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">All Branches</h3>
            <div className="space-y-2">
              {timelines.map(tl => (
                <div key={tl.id} className={`bg-gray-900 border rounded-xl p-3 ${tl.is_active ? 'border-blue-700' : 'border-gray-800'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch size={14} className={tl.is_active ? 'text-blue-400' : 'text-gray-600'} />
                      <p className="text-white text-sm font-semibold">{tl.branch_label}</p>
                    </div>
                    {!tl.is_active && (
                      <button
                        onClick={() => switchToTimeline(tl)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs mt-1">{formatDate(tl.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && confirmChapter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/80" onClick={() => setShowConfirm(false)} />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative bg-[#0e0e1a] border border-gray-700 rounded-2xl p-5 max-w-sm w-full"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-yellow-400" />
                <h3 className="text-white font-bold text-lg">Create New Branch?</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Create a new story branch from <span className="text-white font-semibold">Chapter {confirmChapter.chapter_number}</span>?<br /><br />
                Your current story will be preserved. The new branch diverges from this point forward.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBranch}
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
