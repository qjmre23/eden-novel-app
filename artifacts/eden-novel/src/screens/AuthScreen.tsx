import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'wouter'
import { UserCheck, Mail, Lock, ChevronRight, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from '../components/common/Button'

function genId() {
  return 'guest-' + Math.random().toString(36).slice(2, 10)
}

export function AuthScreen() {
  const [, navigate] = useLocation()
  const { dispatch } = useApp()
  const [showEmail, setShowEmail]   = useState(false)
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [whyOpen, setWhyOpen]       = useState(false)

  function continueAsGuest() {
    dispatch({
      type: 'SET_SESSION',
      session: { id: genId(), mode: 'guest', createdAt: Date.now() },
    })
    navigate('/setup-model')
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    dispatch({
      type: 'SET_SESSION',
      session: {
        id: 'user-' + Math.random().toString(36).slice(2, 10),
        mode: 'authenticated',
        createdAt: Date.now(),
        email,
      },
    })
    navigate('/setup-model')
  }

  return (
    <div className="eden-gradient-bg min-h-dvh flex flex-col items-center justify-center px-5 py-12">
      <div className="noise-overlay" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display italic text-4xl text-[#e6e6f0] mb-2">EDEN</h1>
          <p className="text-[#7a7a8c] text-sm">Begin your story.</p>
        </div>

        {/* Guest card */}
        <motion.div
          layoutId="auth-guest-card"
          className="relative overflow-hidden rounded-2xl cursor-pointer group"
          style={{
            background: 'rgba(18,18,26,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
          }}
          whileHover={{ scale: 1.01, borderColor: 'rgba(244,63,94,0.3)' }}
          whileTap={{ scale: 0.99 }}
          onClick={continueAsGuest}
        >
          {/* Conic sweep on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg at 80% 10%, rgba(244,63,94,0.08), transparent 60%)',
            }}
          />

          {/* Danger glyph */}
          <div className="absolute top-3 right-4 font-display text-2xl text-rose-500/20 select-none pointer-events-none">
            刃
          </div>

          <div className="relative p-6 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[16px] font-semibold text-[#e6e6f0]">Continue as guest</h2>
                <ChevronRight className="w-4 h-4 text-[#7a7a8c] group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[13px] text-[#7a7a8c] leading-snug">No account required. Story lives on this device.</p>
            </div>
          </div>
        </motion.div>

        {/* Email card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(18,18,26,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <motion.button
            className="w-full p-6 flex items-start gap-4 text-left cursor-pointer group"
            style={{
              background: 'conic-gradient(from 180deg at 20% 80%, rgba(99,102,241,0.04), transparent 60%)',
            }}
            whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}
            onClick={() => setShowEmail(v => !v)}
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[16px] font-semibold text-[#e6e6f0]">Sign in with email</h2>
                <motion.span
                  animate={{ rotate: showEmail ? 90 : 0 }}
                  className="text-[#7a7a8c]"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.span>
              </div>
              <p className="text-[13px] text-[#7a7a8c] leading-snug">Sync stories across devices.</p>
            </div>
          </motion.button>

          <AnimatePresence>
            {showEmail && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
                onSubmit={signInWithEmail}
              >
                <div className="px-6 pb-6 space-y-3 border-t border-white/06 pt-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a8c]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] text-[#e6e6f0] placeholder:text-[#4a4a5c] outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a8c]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] text-[#e6e6f0] placeholder:text-[#4a4a5c] outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                  <Button type="submit" fullWidth loading={loading}>
                    Sign in
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Microcopy */}
        <div className="flex items-center justify-center gap-3 text-[12px] text-[#7a7a8c] text-center">
          <span>Guest stories live on this device only. Sign in to sync.</span>
          <button
            onClick={() => setWhyOpen(v => !v)}
            className="text-indigo-400 hover:text-indigo-300 shrink-0 underline underline-offset-2"
          >
            Why?
          </button>
        </div>

        {/* Why drawer */}
        <AnimatePresence>
          {whyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden rounded-xl"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <div className="p-4 flex gap-3">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-[#7a7a8c] leading-relaxed">
                  Guest mode stores your story locally in this browser. If you clear browser data or switch devices,
                  the story is gone. Sign-in syncs progress to our encrypted cloud, so your stories travel with you.
                  We never read your story content.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
