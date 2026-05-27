import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'

interface LevelUpOverlayProps {
  level: number
  isVisible: boolean
  onDismiss: () => void
}

export function LevelUpOverlay({ level, isVisible, onDismiss }: LevelUpOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            className="relative flex flex-col items-center gap-4"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Burst rings */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute w-32 h-32 rounded-full border border-amber-400"
                initial={{ scale: 0.3, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1.2, delay: i * 0.2, ease: 'easeOut' }}
              />
            ))}

            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(244,63,94,0.2))',
                border: '2px solid rgba(245,158,11,0.5)',
                boxShadow: '0 0 60px rgba(245,158,11,0.4)',
              }}
            >
              <Star className="w-10 h-10 text-amber-400" fill="currentColor" />
            </div>

            <div className="text-center">
              <p className="text-[11px] font-mono-eden uppercase tracking-[0.2em] text-amber-400 mb-1">Level Up</p>
              <p className="font-display italic text-5xl text-[#e6e6f0]">{level}</p>
            </div>

            <p className="text-[13px] text-[#7a7a8c]">Tap to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
