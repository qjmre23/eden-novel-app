import { motion } from 'framer-motion'

interface MiniBarProps {
  label: string
  value: number  // -100 to 100
}

export function MiniBar({ label, value }: MiniBarProps) {
  const isPositive = value >= 0
  const pct = Math.abs(value) / 100 * 50  // half-bar max

  const color = isPositive
    ? value > 60 ? '#10b981' : '#6ee7b7'
    : value < -60 ? '#f43f5e' : '#fda4af'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">{label}</span>
        <span className="text-[10px] font-mono-eden" style={{ color }}>{value > 0 ? '+' : ''}{Math.round(value)}</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden bg-white/06">
        {/* Center mark */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
        {/* Fill */}
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}60`,
            left:  isPositive ? '50%' : `calc(50% - ${pct}%)`,
            width: `${pct}%`,
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
