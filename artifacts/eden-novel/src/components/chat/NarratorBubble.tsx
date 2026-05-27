import { motion } from 'framer-motion'

interface NarratorBubbleProps {
  content: string
  delay?: number
}

export function NarratorBubble({ content, delay = 0 }: NarratorBubbleProps) {
  return (
    <motion.div
      className="w-full px-1"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <p
        className="font-display italic text-[15px] text-[#c0bfd8] leading-7 tracking-wide"
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
      >
        {content}
      </p>
    </motion.div>
  )
}
