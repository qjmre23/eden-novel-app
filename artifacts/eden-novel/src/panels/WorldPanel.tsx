import { motion } from 'framer-motion'
import type { WorldState } from '../types'
import { MapPin, Clock, Sun, Zap, Eye, BookOpen } from 'lucide-react'

interface WorldPanelProps {
  worldState: WorldState
}

export function WorldPanel({ worldState: ws }: WorldPanelProps) {
  return (
    <div className="space-y-5">

      {/* Location + time */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'rgba(26,26,38,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c] mb-0.5">Location</div>
            <div className="text-[13px] text-[#e6e6f0] leading-snug">{ws.current_location}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[11px] font-mono-eden">
          <div className="flex items-center gap-1.5 text-[#7a7a8c]">
            <Clock className="w-3 h-3" />
            {ws.time_of_day}
          </div>
          <div className="flex items-center gap-1.5 text-[#7a7a8c]">
            <Sun className="w-3 h-3" />
            Day {ws.day_number}
          </div>
        </div>
      </div>

      {/* Dramatic question */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-mono-eden uppercase tracking-widest text-indigo-400">Dramatic Question</span>
        </div>
        <p className="font-display italic text-[14px] text-[#e6e6f0] leading-6">{ws.dramatic_question}</p>
      </div>

      {/* Active threats */}
      {ws.active_threats.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-mono-eden uppercase tracking-widest text-rose-400">Active Threats</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ws.active_threats.map((t, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="px-2.5 py-1 rounded-full text-[11px] font-mono-eden"
                style={{
                  background: 'rgba(244,63,94,0.12)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  color: '#fb7185',
                }}
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Pending revelations */}
      {ws.pending_revelations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono-eden uppercase tracking-widest text-amber-400">Pending Revelations</span>
          </div>
          <div className="space-y-1">
            {ws.pending_revelations.map((r, i) => (
              <div
                key={i}
                className="text-[12px] text-[#7a7a8c] italic pl-3 border-l border-amber-500/20"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter goal */}
      <div className="text-[11px] font-mono-eden text-[#7a7a8c] space-y-1">
        <div className="uppercase tracking-widest text-[#5a5a6c]">Chapter goal</div>
        <div className="text-[#e6e6f0]/50">{ws.chapter_goal}</div>
      </div>
    </div>
  )
}
