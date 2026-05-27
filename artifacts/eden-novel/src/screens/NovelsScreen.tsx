import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'wouter'
import { Plus, Clock, Settings, BookOpen, Trash2, Pencil } from 'lucide-react'
import { adapter } from '../services/adapter'
import type { Novel } from '../types'
import { Button } from '../components/common/Button'

const GENRE_BADGES: Record<string, { text: string; color: string }> = {
  zombie:       { text: 'Zombie',       color: '#f43f5e' },
  apocalypse:   { text: 'Apocalypse',   color: '#f97316' },
  cultivation:  { text: 'Cultivation',  color: '#8b5cf6' },
  cyberpunk:    { text: 'Cyberpunk',    color: '#38bdf8' },
  fantasy:      { text: 'Fantasy',      color: '#a78bfa' },
  mafia:        { text: 'Mafia',        color: '#6b7280' },
  romance:      { text: 'Romance',      color: '#ec4899' },
  horror:       { text: 'Horror',       color: '#dc2626' },
  detective:    { text: 'Detective',    color: '#d97706' },
  space_scifi:  { text: 'Sci-Fi',       color: '#0ea5e9' },
  military_war: { text: 'War',          color: '#84cc16' },
  historical:   { text: 'Historical',   color: '#b45309' },
  survival:     { text: 'Survival',     color: '#16a34a' },
  superpower:   { text: 'Superpower',   color: '#7c3aed' },
  isekai:       { text: 'Isekai',       color: '#0d9488' },
  vampire:      { text: 'Vampire',      color: '#be123c' },
  school:       { text: 'School',       color: '#6366f1' },
  slice_of_life:{ text: 'Slice of Life',color: '#9ca3af' },
  thriller:     { text: 'Thriller',     color: '#dc2626' },
  crime_noir:   { text: 'Noir',         color: '#4b5563' },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

interface ContextMenuProps {
  novel: Novel
  onClose: () => void
  onDelete: (id: number) => void
  onContinue: (id: number) => void
}

function ContextMenu({ novel, onClose, onDelete, onContinue }: ContextMenuProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: 'rgba(18,18,26,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="px-5 pt-5 pb-3">
            <p className="font-display italic text-[15px] text-[#e6e6f0]">{novel.title}</p>
          </div>
          {[
            { icon: BookOpen, label: 'Continue', action: () => { onContinue(novel.id); onClose() } },
            { icon: Pencil,   label: 'Rename',   action: onClose },
            { icon: Trash2,   label: 'Delete',   action: () => { onDelete(novel.id); onClose() }, danger: true },
          ].map(({ icon: Icon, label, action, danger }) => (
            <button
              key={label}
              onClick={action}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-[14px] transition-colors ${
                danger ? 'text-rose-400 hover:bg-rose-500/08' : 'text-[#e6e6f0] hover:bg-white/04'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <div className="p-3">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-[13px] text-[#7a7a8c] hover:bg-white/04 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function NovelsScreen() {
  const [, navigate] = useLocation()
  const [novels, setNovels] = useState<Novel[]>([])
  const [contextNovel, setContextNovel] = useState<Novel | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [fabPulse, setFabPulse] = useState(false)

  useEffect(() => {
    adapter.loadNovels().then(setNovels)
  }, [])

  // FAB pulse every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setFabPulse(true)
      setTimeout(() => setFabPulse(false), 600)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  function deleteNovel(id: number) {
    const updated = novels.filter(n => n.id !== id)
    setNovels(updated)
    localStorage.setItem('eden_novels', JSON.stringify(updated))
  }

  function startLongPress(novel: Novel) {
    const t = setTimeout(() => setContextNovel(novel), 500)
    setLongPressTimer(t)
  }

  function cancelLongPress() {
    if (longPressTimer) clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }

  const sorted = [...novels].sort((a, b) => b.last_played_at - a.last_played_at)
  const recent = sorted[0]
  const rest   = sorted.slice(1)

  return (
    <div className="eden-gradient-bg min-h-dvh flex flex-col">
      <div className="noise-overlay" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-safe pt-5 pb-4">
        <div>
          <p className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">EDEN NOVEL</p>
          <h1 className="font-display italic text-2xl text-[#e6e6f0] mt-0.5">
            {novels.length === 0 ? 'Your library' : 'Welcome back, traveler.'}
          </h1>
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] hover:bg-white/05 transition-colors">
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-5 pb-24 space-y-6">
        {novels.length === 0 ? (
          /* Empty state */
          <motion.div
            className="flex flex-col items-center justify-center gap-6 pt-20"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="w-32 h-44 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(244,63,94,0.08))',
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 0 40px rgba(99,102,241,0.1)',
              }}
              animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.08)', '0 0 50px rgba(99,102,241,0.18)', '0 0 20px rgba(99,102,241,0.08)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              onClick={() => navigate('/new-novel')}
            >
              <span className="font-display text-5xl text-indigo-400/60 rotate-12">✦</span>
              <span className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">First story</span>
            </motion.div>
            <div className="text-center space-y-2">
              <p className="font-display italic text-xl text-[#e6e6f0]">No stories yet.</p>
              <p className="text-[13px] text-[#7a7a8c]">Every great narrative begins with a single choice.</p>
            </div>
            <Button onClick={() => navigate('/new-novel')} size="lg">
              Begin a new story
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Continue strip */}
            {recent && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">Continue</div>
                <motion.div
                  className="rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/story/${recent.id}`)}
                  onPointerDown={() => startLongPress(recent)}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-display italic text-xl text-[#e6e6f0] leading-tight">{recent.title}</h2>
                        <div className="flex items-center gap-2 mt-2">
                          {(() => {
                            const badge = GENRE_BADGES[recent.genre]
                            return badge ? (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-mono-eden uppercase tracking-wider"
                                style={{ background: badge.color + '18', color: badge.color, border: `1px solid ${badge.color}30` }}
                              >
                                {badge.text}
                              </span>
                            ) : null
                          })()}
                          <span className="text-[10px] font-mono-eden text-[#7a7a8c] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(recent.last_played_at)}
                          </span>
                        </div>
                      </div>
                      {/* MC Avatar */}
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold font-mono-eden border shrink-0"
                        style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}
                      >
                        {recent.mc_name[0]?.toUpperCase()}
                      </div>
                    </div>

                    {/* Last scene snippet */}
                    <div className="relative">
                      <p className="text-[12px] text-[#7a7a8c] italic leading-relaxed line-clamp-3">
                        {recent.story_seed || 'The story continues...'}
                      </p>
                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#12121a] to-transparent" />
                    </div>

                    {/* Tension bar */}
                    <div className="h-0.5 rounded-full bg-white/05">
                      <div className="h-full w-3/4 rounded-full" style={{ background: 'linear-gradient(90deg, #6366f1, #f43f5e)' }} />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Other novels grid */}
            {rest.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">Library</div>
                <div className="grid grid-cols-2 gap-2">
                  {rest.map((novel, i) => {
                    const badge = GENRE_BADGES[novel.genre]
                    return (
                      <motion.div
                        key={novel.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.25 }}
                        className="rounded-xl overflow-hidden cursor-pointer"
                        style={{ background: 'rgba(18,18,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/story/${novel.id}`)}
                        onPointerDown={() => startLongPress(novel)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                      >
                        <div className="p-3 space-y-2">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-mono-eden"
                            style={{ background: badge ? badge.color + '15' : 'rgba(99,102,241,0.15)', color: badge?.color ?? '#818cf8' }}
                          >
                            {novel.mc_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[12px] font-medium text-[#e6e6f0] leading-tight line-clamp-2">{novel.title}</p>
                            {badge && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded font-mono-eden uppercase tracking-wider mt-1 inline-block"
                                style={{ background: badge.color + '15', color: badge.color }}
                              >
                                {badge.text}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono-eden text-[#7a7a8c] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(novel.last_played_at)}
                          </div>
                          {/* Tiny tension bar */}
                          <div className="h-0.5 rounded-full bg-white/04">
                            <div className="h-full w-1/2 rounded-full bg-indigo-500/50" />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <motion.button
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full flex items-center justify-center z-20 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
          animation: fabPulse ? 'fab-pulse 0.6s ease-out' : undefined,
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/new-novel')}
        aria-label="New story"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      {/* Context menu */}
      {contextNovel && (
        <ContextMenu
          novel={contextNovel}
          onClose={() => setContextNovel(null)}
          onDelete={deleteNovel}
          onContinue={id => navigate(`/story/${id}`)}
        />
      )}
    </div>
  )
}
