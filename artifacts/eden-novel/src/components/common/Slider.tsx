import { motion } from 'framer-motion'

interface SliderProps {
  label: string
  leftLabel: string
  rightLabel: string
  value: number
  onChange: (v: number) => void
}

export function Slider({ label, leftLabel, rightLabel, value, onChange }: SliderProps) {
  const pct = value / 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">{label}</span>
        <span className="text-[11px] font-mono-eden text-indigo-400">{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-[#7a7a8c] w-16 text-right leading-tight">{leftLabel}</span>
        <div className="relative flex-1">
          {/* Track fill */}
          <div className="absolute top-1/2 -translate-y-1/2 h-1 left-0 right-0 rounded-full bg-white/08" />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-1 left-0 rounded-full bg-indigo-500"
            style={{ width: `${value}%` }}
            transition={{ duration: 0.1 }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="relative z-10 w-full opacity-0 cursor-pointer h-4"
            style={{ WebkitAppearance: 'none' }}
          />
          {/* Thumb visual */}
          <motion.div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
            style={{ left: `calc(${value}% - 8px)` }}
            transition={{ duration: 0.05 }}
          />
        </div>
        <span className="text-[11px] text-[#7a7a8c] w-16 leading-tight">{rightLabel}</span>
      </div>
    </div>
  )
}
