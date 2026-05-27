import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { Character } from '../types'
import { EmotionBadge } from '../components/badges/EmotionBadge'
import { MiniBar } from '../components/badges/MiniBar'

interface CharacterPanelProps {
  characters: Character[]
}

type Filter = 'all' | 'alive' | 'dead'

export function CharacterPanel({ characters }: CharacterPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = characters.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'alive', 'dead'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-mono-eden uppercase tracking-wider transition-colors ${
              filter === f
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-[#7a7a8c] border border-transparent hover:text-[#e6e6f0]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Character list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((char, i) => {
            const isExpanded = expanded === char.internal_uid
            return (
              <motion.div
                key={char.internal_uid}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(26,26,38,0.6)',
                  border: `1px solid ${char.bubble_color}25`,
                }}
              >
                {/* Row */}
                <button
                  className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : char.internal_uid)}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold font-mono-eden border"
                    style={{
                      background: char.bubble_color + '20',
                      borderColor: char.bubble_color + '50',
                      color: char.bubble_color,
                    }}
                  >
                    {char.display_name[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-[#e6e6f0]">{char.display_name}</span>
                      {/* Role chip */}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono-eden uppercase tracking-wider"
                        style={{ background: char.bubble_color + '18', color: char.bubble_color }}
                      >
                        {char.role}
                      </span>
                      {/* Status dot */}
                      {char.status === 'dead' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono-eden bg-rose-900/30 text-rose-400 uppercase tracking-wider">
                          dead
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {char.current_emotion && (
                        <EmotionBadge emotion={char.current_emotion} intensity={char.emotion_intensity} />
                      )}
                    </div>
                  </div>

                  <motion.span
                    className="text-[#7a7a8c] text-sm"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▾
                  </motion.span>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-4 space-y-4 border-t border-white/06 pt-3">
                        {/* Location */}
                        <div className="text-[11px] font-mono-eden text-[#7a7a8c]">
                          <span className="text-indigo-400">Location: </span>
                          {char.current_location}
                        </div>

                        {/* Speech style */}
                        {char.speech_style && (
                          <div className="text-[11px] text-[#7a7a8c] italic">
                            <span className="not-italic text-[#e6e6f0]/50">Voice: </span>
                            {char.speech_style}
                          </div>
                        )}

                        {/* Motivation */}
                        {char.motivation && (
                          <div className="text-[11px] text-[#e6e6f0]/60">
                            <span className="text-amber-400/80">Wants: </span>
                            {char.motivation}
                          </div>
                        )}

                        {/* Relationship label */}
                        {char.relationship_label && (
                          <div className="text-[11px]">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-mono-eden"
                              style={{ background: char.bubble_color + '18', color: char.bubble_color }}
                            >
                              {char.relationship_label}
                            </span>
                          </div>
                        )}

                        {/* Mini bars */}
                        <div className="space-y-2.5">
                          {char.trust_level !== undefined && (
                            <MiniBar label="Trust" value={char.trust_level} />
                          )}
                          {char.affection_level !== undefined && (
                            <MiniBar label="Affection" value={char.affection_level} />
                          )}
                          {char.respect_level !== undefined && (
                            <MiniBar label="Respect" value={char.respect_level} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-[#7a7a8c] text-sm italic font-display">
            No characters match this filter.
          </div>
        )}
      </div>
    </div>
  )
}
