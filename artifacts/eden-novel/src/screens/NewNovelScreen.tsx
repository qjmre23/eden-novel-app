import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import type { Genre, GenreInfo } from '../types'

const GENRES: GenreInfo[] = [
  { id: 'zombie',       label: 'Zombie',        mood: 'The infected roam. Every sound matters.',                  gradient: 'from-red-950 to-rose-900',      accentColor: '#f43f5e' },
  { id: 'apocalypse',  label: 'Apocalypse',    mood: 'The sky has been the wrong color for weeks.',              gradient: 'from-orange-950 to-amber-900',  accentColor: '#f97316' },
  { id: 'cultivation', label: 'Cultivation',   mood: 'Heaven\'s path is steep. Power demands sacrifice.',        gradient: 'from-violet-950 to-purple-900', accentColor: '#8b5cf6' },
  { id: 'cyberpunk',   label: 'Cyberpunk',     mood: 'Rain and neon. Every truth costs something.',             gradient: 'from-sky-950 to-cyan-900',      accentColor: '#38bdf8' },
  { id: 'fantasy',     label: 'Fantasy',       mood: 'Magic decays. Empires fall. You arrive at the edge.',     gradient: 'from-indigo-950 to-violet-900', accentColor: '#a78bfa' },
  { id: 'mafia',       label: 'Mafia',         mood: 'Loyalty is the most dangerous currency.',                 gradient: 'from-zinc-950 to-gray-900',     accentColor: '#9ca3af' },
  { id: 'romance',     label: 'Romance',       mood: 'What we carry shapes who we become to each other.',       gradient: 'from-pink-950 to-rose-900',     accentColor: '#ec4899' },
  { id: 'horror',      label: 'Horror',        mood: 'Something in the walls has been listening.',              gradient: 'from-red-950 to-neutral-950',   accentColor: '#dc2626' },
  { id: 'detective',   label: 'Detective',     mood: 'Every answer opens a worse question.',                    gradient: 'from-amber-950 to-stone-900',   accentColor: '#d97706' },
  { id: 'space_scifi', label: 'Space Sci-Fi',  mood: 'Out here, the light you see is ancient and already gone.', gradient: 'from-slate-950 to-sky-900',     accentColor: '#0ea5e9' },
  { id: 'military_war',label: 'Military War',  mood: 'Orders and conscience don\'t always share a foxhole.',    gradient: 'from-green-950 to-lime-900',    accentColor: '#84cc16' },
  { id: 'historical',  label: 'Historical',    mood: 'History is written by those who survive the secret.',     gradient: 'from-stone-950 to-amber-950',   accentColor: '#b45309' },
  { id: 'survival',    label: 'Survival',      mood: 'Mathematics is cruel when time is the only resource.',    gradient: 'from-emerald-950 to-teal-900',  accentColor: '#10b981' },
  { id: 'superpower',  label: 'Superpower',    mood: 'The ability came without instructions.',                  gradient: 'from-purple-950 to-violet-900', accentColor: '#7c3aed' },
  { id: 'isekai',      label: 'Isekai',        mood: 'You died on a Tuesday. You woke somewhere else.',         gradient: 'from-teal-950 to-green-900',    accentColor: '#0d9488' },
  { id: 'vampire',     label: 'Vampire',       mood: 'Centuries is enough time to collect enemies.',            gradient: 'from-rose-950 to-red-950',      accentColor: '#be123c' },
  { id: 'school',      label: 'School',        mood: 'The social architecture here has real consequences.',     gradient: 'from-indigo-950 to-blue-900',   accentColor: '#6366f1' },
  { id: 'slice_of_life',label: 'Slice of Life','mood': 'The extraordinary hides inside the ordinary.',          gradient: 'from-gray-950 to-zinc-900',     accentColor: '#9ca3af' },
  { id: 'thriller',    label: 'Thriller',      mood: 'The message arrived from someone who shouldn\'t exist.',  gradient: 'from-neutral-950 to-zinc-900',  accentColor: '#dc2626' },
  { id: 'crime_noir',  label: 'Crime Noir',    mood: 'Everyone in this city is running from something.',        gradient: 'from-zinc-950 to-neutral-900',  accentColor: '#6b7280' },
]

export function NewNovelScreen() {
  const [, navigate] = useLocation()
  const [selected, setSelected] = useState<Genre | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  function handleSelect(genre: Genre) {
    if (selected === genre) {
      setConfirmed(true)
      setTimeout(() => navigate(`/mc-setup?genre=${genre}`), 320)
    } else {
      setSelected(genre)
    }
  }

  const selectedInfo = GENRES.find(g => g.id === selected)

  return (
    <div className="eden-gradient-bg min-h-dvh flex flex-col">
      <div className="noise-overlay" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-safe pt-5 pb-4">
        <button
          onClick={() => navigate('/novels')}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] hover:bg-white/05 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display italic text-2xl text-[#e6e6f0]">Choose a genre</h1>
          <p className="text-[12px] text-[#7a7a8c]">Tap once to preview · tap again to confirm</p>
        </div>
      </div>

      {/* Genre list */}
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-5 pb-8 space-y-2">
        {GENRES.map((genre, i) => {
          const isSelected = selected === genre.id
          return (
            <motion.button
              key={genre.id}
              className={`w-full text-left rounded-2xl overflow-hidden cursor-pointer transition-all`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => handleSelect(genre.id as Genre)}
            >
              <AnimatePresence mode="wait">
                {isSelected ? (
                  <motion.div
                    key="expanded"
                    className={`bg-gradient-to-br ${genre.gradient} p-5 space-y-3`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ border: `1px solid ${genre.accentColor}40` }}
                  >
                    {/* Ripple */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: `radial-gradient(circle at center, ${genre.accentColor}20, transparent 70%)` }}
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    />

                    <div className="flex items-center justify-between">
                      <h2
                        className="font-display italic text-2xl font-semibold"
                        style={{ color: genre.accentColor }}
                      >
                        {genre.label}
                      </h2>
                      <span
                        className="text-[11px] font-mono-eden uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{ background: genre.accentColor + '20', color: genre.accentColor, border: `1px solid ${genre.accentColor}30` }}
                      >
                        Tap to confirm
                      </span>
                    </div>
                    <p className="text-[14px] text-[#e6e6f0]/80 italic leading-relaxed">{genre.mood}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapsed"
                    className="flex items-center gap-4 p-4"
                    style={{
                      background: 'rgba(18,18,26,0.8)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    whileHover={{ borderColor: genre.accentColor + '30', backgroundColor: 'rgba(26,26,38,0.8)' }}
                  >
                    <div
                      className="w-1.5 h-12 rounded-full shrink-0"
                      style={{ background: `linear-gradient(to bottom, ${genre.accentColor}, ${genre.accentColor}40)` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-display italic text-[16px] text-[#e6e6f0]">{genre.label}</div>
                      <div className="text-[12px] text-[#7a7a8c] leading-snug mt-0.5 line-clamp-1">{genre.mood}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
