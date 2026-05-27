import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedPanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  side?: 'bottom' | 'right'
}

export function AnimatedPanel({ isOpen, onClose, children, title, side = 'bottom' }: AnimatedPanelProps) {
  const reduced = useReducedMotion()

  const variants = {
    bottom: {
      hidden:  { y: '100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
    },
    right: {
      hidden:  { x: '100%', opacity: 0 },
      visible: { x: 0, opacity: 1 },
    },
  }

  const panelClass = side === 'right'
    ? 'fixed top-0 right-0 h-full w-full max-w-sm z-50'
    : 'fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] rounded-t-2xl'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={`${panelClass} flex flex-col`}
            style={{
              background: 'rgba(12, 12, 20, 0.96)',
              borderTop: side === 'bottom' ? '1px solid rgba(255,255,255,0.08)' : undefined,
              borderLeft: side === 'right' ? '1px solid rgba(255,255,255,0.08)' : undefined,
              backdropFilter: 'blur(32px)',
            }}
            variants={variants[side]}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              duration: reduced ? 0 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Drag handle / header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
              {side === 'bottom' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/15" />
              )}
              {title && (
                <h3 className="font-display text-lg font-medium text-[#e6e6f0] italic">{title}</h3>
              )}
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] hover:bg-white/05 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
