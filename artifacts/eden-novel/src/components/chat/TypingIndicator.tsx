import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25 }}
    >
      {/* Avatar placeholder */}
      <div className="w-8 h-8 shrink-0 rounded-full bg-white/05 border border-white/08 animate-pulse" />

      {/* Dots */}
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{
          background: 'rgba(26,26,38,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            style={{
              display: 'inline-block',
              animation: `typing-dot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}
