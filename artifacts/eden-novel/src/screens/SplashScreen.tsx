import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'wouter'
import { useApp } from '../context/AppContext'

const GLYPHS = ['禍', '刃', '魂', '影', '滅', '焔', '闇', '境', '狂', '剣', '霊', '鬼', '命', '罪', '誓']

function Glyph({ char, delay }: { char: string; delay: number }) {
  const x = 5 + Math.random() * 90
  const y = 5 + Math.random() * 90
  const rot = Math.random() * 60 - 30
  const dur = 6 + Math.random() * 8

  return (
    <motion.div
      className="absolute font-display text-lg select-none pointer-events-none text-white"
      style={{
        left: `${x}%`,
        top:  `${y}%`,
        opacity: 0.07,
        animation: `drift ${dur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transform: `rotate(${rot}deg)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.07 }}
      transition={{ duration: 1.5, delay }}
    >
      {char}
    </motion.div>
  )
}

export function SplashScreen() {
  const [, navigate] = useLocation()
  const { state } = useApp()
  const timer = useRef<ReturnType<typeof setTimeout>>(null as any)

  useEffect(() => {
    timer.current = setTimeout(() => {
      if (state.session) {
        navigate('/novels')
      } else {
        navigate('/auth')
      }
    }, 1700)
    return () => clearTimeout(timer.current)
  }, [state.session, navigate])

  return (
    <div className="eden-gradient-bg relative min-h-dvh flex flex-col items-center justify-center overflow-hidden">
      {/* Noise */}
      <div className="noise-overlay" />

      {/* Particles */}
      <div className="absolute inset-0">
        {GLYPHS.map((g, i) => (
          <Glyph key={i} char={g} delay={i * 0.3} />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo wordmark */}
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="font-display text-[72px] md:text-[96px] font-semibold tracking-[0.08em] text-[#e6e6f0]"
            style={{
              textShadow: '0 0 60px rgba(99,102,241,0.3), 0 0 120px rgba(99,102,241,0.15)',
              WebkitBackgroundClip: 'text',
            }}
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            EDEN
          </motion.h1>

          {/* Ink bloom underline */}
          <motion.div
            className="h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent mt-1"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="font-display italic text-[17px] text-[#7a7a8c] tracking-widest"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
        >
          A story that remembers you.
        </motion.p>

        {/* Loading dots */}
        <motion.div
          className="flex gap-1.5 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400"
              style={{
                animation: `typing-dot 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Corner pulse - foreshadowing */}
      <motion.div
        className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500"
        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ boxShadow: '0 0 12px rgba(244,63,94,0.6)' }}
      />
    </div>
  )
}
