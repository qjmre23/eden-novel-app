import { motion } from 'framer-motion'

interface MCEchoBubbleProps {
  content: string
  delay?: number
}

export function MCEchoBubble({ content, delay = 0 }: MCEchoBubbleProps) {
  const isSilent = !content || content.trim() === '(silent)'

  return (
    <motion.div
      className="flex justify-end"
      initial={{ opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] leading-6"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(99,102,241,0.2))',
          border: '1px solid rgba(99,102,241,0.4)',
          boxShadow: '0 2px 20px rgba(99,102,241,0.2)',
          color: isSilent ? 'rgba(230,230,240,0.45)' : '#e6e6f0',
          fontStyle: isSilent ? 'italic' : 'normal',
        }}
      >
        {isSilent ? '(silent)' : `"${content}"`}
      </div>
    </motion.div>
  )
}
