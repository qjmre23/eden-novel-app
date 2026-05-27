import { motion } from 'framer-motion'

interface EmotionBadgeProps {
  emotion: string
  intensity?: number
  size?: 'sm' | 'md'
}

// Full class strings so Tailwind picks them up at scan time
const EMOTION_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  fearful:    { bg: 'bg-blue-500/15',    text: 'text-blue-300',   border: 'border-blue-500/25',   dot: 'bg-blue-400' },
  terrified:  { bg: 'bg-blue-700/20',    text: 'text-blue-200',   border: 'border-blue-600/30',   dot: 'bg-blue-300' },
  furious:    { bg: 'bg-red-500/15',     text: 'text-red-300',    border: 'border-red-500/25',    dot: 'bg-red-400' },
  angry:      { bg: 'bg-red-500/15',     text: 'text-red-300',    border: 'border-red-500/25',    dot: 'bg-red-400' },
  grieving:   { bg: 'bg-gray-500/15',    text: 'text-gray-300',   border: 'border-gray-500/25',   dot: 'bg-gray-400' },
  sad:        { bg: 'bg-gray-500/15',    text: 'text-gray-300',   border: 'border-gray-500/25',   dot: 'bg-gray-400' },
  hopeful:    { bg: 'bg-yellow-500/15',  text: 'text-yellow-300', border: 'border-yellow-500/25', dot: 'bg-yellow-400' },
  excited:    { bg: 'bg-yellow-400/15',  text: 'text-yellow-300', border: 'border-yellow-400/25', dot: 'bg-yellow-300' },
  conflicted: { bg: 'bg-purple-500/15',  text: 'text-purple-300', border: 'border-purple-500/25', dot: 'bg-purple-400' },
  uncertain:  { bg: 'bg-purple-500/15',  text: 'text-purple-300', border: 'border-purple-500/25', dot: 'bg-purple-400' },
  suspicious: { bg: 'bg-orange-500/15',  text: 'text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  guarded:    { bg: 'bg-orange-500/15',  text: 'text-orange-300', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  happy:      { bg: 'bg-green-500/15',   text: 'text-green-300',  border: 'border-green-500/25',  dot: 'bg-green-400' },
  content:    { bg: 'bg-green-500/15',   text: 'text-green-300',  border: 'border-green-500/25',  dot: 'bg-green-400' },
  tender:     { bg: 'bg-pink-400/15',    text: 'text-pink-300',   border: 'border-pink-400/25',   dot: 'bg-pink-300' },
  ashamed:    { bg: 'bg-amber-600/15',   text: 'text-amber-400',  border: 'border-amber-600/25',  dot: 'bg-amber-500' },
  desperate:  { bg: 'bg-rose-700/20',    text: 'text-rose-300',   border: 'border-rose-700/30',   dot: 'bg-rose-400' },
  numb:       { bg: 'bg-slate-500/15',   text: 'text-slate-400',  border: 'border-slate-500/25',  dot: 'bg-slate-400' },
  amused:     { bg: 'bg-cyan-400/15',    text: 'text-cyan-300',   border: 'border-cyan-400/25',   dot: 'bg-cyan-400' },
  neutral:    { bg: 'bg-gray-500/10',    text: 'text-gray-400',   border: 'border-gray-500/20',   dot: 'bg-gray-500' },
}

const DEFAULT_STYLE = EMOTION_STYLES.neutral

function getStyle(emotion: string) {
  return EMOTION_STYLES[emotion.toLowerCase()] ?? DEFAULT_STYLE
}

export function EmotionBadge({ emotion, intensity, size = 'sm' }: EmotionBadgeProps) {
  const style = getStyle(emotion)
  const pct = intensity ?? 50

  return (
    <motion.span
      layout
      className={`
        inline-flex items-center gap-1.5 rounded-full border
        ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}
        ${style.bg} ${style.text} ${style.border}
        font-mono-eden tracking-wide select-none
      `}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
      <span className="capitalize">{emotion}</span>
      {intensity !== undefined && (
        <span className="opacity-60">{Math.round(pct)}%</span>
      )}
    </motion.span>
  )
}
