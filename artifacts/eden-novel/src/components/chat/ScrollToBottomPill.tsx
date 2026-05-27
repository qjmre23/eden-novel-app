import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface ScrollToBottomPillProps {
  visible: boolean
  onClick: () => void
}

export function ScrollToBottomPill({ visible, onClick }: ScrollToBottomPillProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg cursor-pointer"
          style={{
            background: 'rgba(99,102,241,0.85)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            border: '1px solid rgba(99,102,241,0.6)',
          }}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
        >
          <ChevronDown className="w-4 h-4" />
          <span>New</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
