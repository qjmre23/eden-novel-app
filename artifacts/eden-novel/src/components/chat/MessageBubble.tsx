import { motion } from 'framer-motion'
import type { Character } from '../../types'

interface MessageBubbleProps {
  speaker: string
  content: string
  character?: Character
  delay?: number
}

function AvatarInitial({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold font-mono-eden border select-none"
      style={{
        backgroundColor: color + '22',
        borderColor: color + '55',
        color,
      }}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export function MessageBubble({ speaker, content, character, delay = 0 }: MessageBubbleProps) {
  const bubbleColor = character?.bubble_color ?? '#6366f1'

  return (
    <motion.div
      className="flex items-start gap-3 max-w-[88%]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <AvatarInitial name={speaker} color={bubbleColor} />
      <div className="flex flex-col gap-1 min-w-0">
        <span
          className="text-[11px] font-mono-eden tracking-wider uppercase opacity-70 ml-1"
          style={{ color: bubbleColor }}
        >
          {speaker}
        </span>
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-[14px] leading-6 text-[#e6e6f0]"
          style={{
            background: `linear-gradient(135deg, ${bubbleColor}18, ${bubbleColor}0c)`,
            border: `1px solid ${bubbleColor}30`,
            boxShadow: `0 2px 16px ${bubbleColor}18`,
          }}
        >
          &ldquo;{content}&rdquo;
        </div>
      </div>
    </motion.div>
  )
}
