import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import type { ScenePlan } from '../../types'

interface TensionBarProps {
  tension: number
  scenePlan?: ScenePlan | null
  isDev?: boolean
}

export function TensionBar({ tension, scenePlan, isDev }: TensionBarProps) {
  const [devOpen, setDevOpen] = useState(false)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(null as any)

  if (tension <= 40) return null

  const color =
    tension > 80 ? '#ef4444' :
    tension > 60 ? '#f97316' :
    '#f59e0b'

  const pulseSpeed =
    tension > 80 ? '0.8s' :
    tension > 60 ? '1.2s' :
    '2s'

  function handleTap() {
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    if (tapCount.current >= 3) {
      tapCount.current = 0
      if (isDev) setDevOpen(v => !v)
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 700)
    }
  }

  return (
    <>
      {/* Bar */}
      <div
        className="relative h-[3px] w-full cursor-pointer overflow-hidden bg-white/05"
        onClick={handleTap}
        title={isDev ? 'Triple-tap for scene plan' : undefined}
      >
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}80`,
            animation: `tension-pulse ${pulseSpeed} ease-in-out infinite`,
          }}
          animate={{ width: `${tension}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>

      {/* Dev scene plan overlay */}
      <AnimatePresence>
        {devOpen && scenePlan && (
          <motion.div
            className="absolute top-12 left-1/2 z-50 w-80 -translate-x-1/2 rounded-xl border border-indigo-500/30 p-4 text-xs"
            style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono-eden text-indigo-400 uppercase tracking-widest">DEV · Scene Plan</span>
              <button onClick={() => setDevOpen(false)} className="text-[#7a7a8c] hover:text-white">✕</button>
            </div>
            <div className="space-y-2 font-mono-eden text-[#7a7a8c]">
              <div><span className="text-indigo-300">type:</span> {scenePlan.scene_type}</div>
              <div><span className="text-indigo-300">tension_target:</span> {scenePlan.tension_target}</div>
              <div><span className="text-indigo-300">directive:</span> <span className="text-[#e6e6f0]">{scenePlan.directive}</span></div>
              <div><span className="text-indigo-300">required:</span> {scenePlan.required_elements.join(', ')}</div>
              <div><span className="text-indigo-300">forbidden:</span> {scenePlan.forbidden_elements.join(', ')}</div>
              {scenePlan.foreshadow_hint && (
                <div><span className="text-amber-400">foreshadow:</span> {scenePlan.foreshadow_hint}</div>
              )}
              <div><span className="text-indigo-300">dq_progress:</span> {scenePlan.dramatic_question_progress}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
