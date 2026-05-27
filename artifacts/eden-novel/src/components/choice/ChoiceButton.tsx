import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

interface ChoiceButtonProps {
  text: string
  roleplayText?: string
  index: number
  onClick: () => void
  disabled?: boolean
}

const ACCENT_COLORS = [
  { border: 'rgba(99,102,241,0.35)',  bg: 'rgba(99,102,241,0.08)',  glow: 'rgba(99,102,241,0.15)' },
  { border: 'rgba(244,63,94,0.25)',   bg: 'rgba(244,63,94,0.06)',   glow: 'rgba(244,63,94,0.12)' },
  { border: 'rgba(245,158,11,0.25)',  bg: 'rgba(245,158,11,0.06)',  glow: 'rgba(245,158,11,0.12)' },
]

export function ChoiceButton({ text, roleplayText, index, onClick, disabled }: ChoiceButtonProps) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]
  const isSilent = roleplayText === '' || roleplayText === undefined
  const displayRoleplay = isSilent ? '(silent)' : roleplayText

  return (
    <motion.button
      className="w-full text-left rounded-xl px-4 py-3 transition-all cursor-pointer"
      style={{
        background: accent.bg,
        border: `1px solid ${accent.border}`,
        boxShadow: `0 2px 16px ${accent.glow}`,
      }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01, boxShadow: `0 4px 24px ${accent.glow}` }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {/* Choice label */}
          <p className="text-[13px] font-medium text-[#e6e6f0] leading-snug">{text}</p>

          {/* Roleplay echo */}
          <p
            className="text-[11px] italic leading-snug"
            style={{ color: isSilent ? 'rgba(230,230,240,0.3)' : 'rgba(230,230,240,0.5)' }}
          >
            {displayRoleplay && `→ "${displayRoleplay}"`}
          </p>
        </div>

        <ArrowUpRight className="w-4 h-4 shrink-0 mt-0.5 text-[#7a7a8c]" />
      </div>
    </motion.button>
  )
}
