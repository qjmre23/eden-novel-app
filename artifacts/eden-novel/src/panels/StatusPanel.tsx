import { motion } from 'framer-motion'
import type { Novel } from '../types'

interface StatusPanelProps {
  novel: Novel
  tension: number
}

const STAT_BARS = [
  { key: 'STR', label: 'Strength',    color: '#f43f5e', value: 45 },
  { key: 'AGI', label: 'Agility',     color: '#f59e0b', value: 62 },
  { key: 'INT', label: 'Intellect',   color: '#6366f1', value: 78 },
  { key: 'CHA', label: 'Charisma',    color: '#ec4899', value: 55 },
  { key: 'PER', label: 'Perception',  color: '#10b981', value: 70 },
  { key: 'WIL', label: 'Willpower',   color: '#8b5cf6', value: 60 },
]

function CountUp({ value }: { value: number }) {
  return <span>{value}</span>
}

export function StatusPanel({ novel, tension }: StatusPanelProps) {
  const traits = (() => {
    try { return JSON.parse(novel.mc_traits_json) } catch { return {} }
  })()

  return (
    <div className="space-y-6">
      {/* MC identity */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold font-mono-eden border-2"
            style={{ borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
          >
            {novel.mc_name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-[15px] font-medium text-[#e6e6f0]">{novel.mc_name}</div>
            <div className="text-[11px] font-mono-eden text-[#7a7a8c]">{novel.world_name}</div>
          </div>
        </div>
      </div>

      {/* XP / Level */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Level', value: 1 },
          { label: 'Actions', value: novel.action_count ?? 0 },
          { label: 'Tension', value: Math.round(tension) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(26,26,38,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-xl font-bold font-mono-eden text-[#e6e6f0]">
              <CountUp value={value} />
            </div>
            <div className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Stat bars */}
      <div className="space-y-3">
        <div className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">Stats</div>
        {STAT_BARS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono-eden text-[#7a7a8c]">{stat.key}</span>
              <span className="font-mono-eden" style={{ color: stat.color }}>{stat.value}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-white/06">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: stat.color, boxShadow: `0 0 6px ${stat.color}60` }}
                initial={{ width: 0 }}
                animate={{ width: `${stat.value}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Traits */}
      {traits && Object.keys(traits).length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">Personality Traits</div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-eden text-[#7a7a8c]">
            {traits.personality !== undefined && (
              <div>Personality: <span className="text-indigo-300">{traits.personality}</span></div>
            )}
            {traits.attitude !== undefined && (
              <div>Attitude: <span className="text-indigo-300">{traits.attitude}</span></div>
            )}
            {traits.altruism !== undefined && (
              <div>Altruism: <span className="text-indigo-300">{traits.altruism}</span></div>
            )}
            {traits.risk !== undefined && (
              <div>Risk: <span className="text-indigo-300">{traits.risk}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
