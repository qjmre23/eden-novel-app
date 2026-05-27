import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useLocation } from 'wouter'
import {
  Cpu, Zap, Cloud, BrainCircuit, Bot, Database, Server,
  X, Key, ChevronRight
} from 'lucide-react'
import { useModel } from '../context/ModelContext'
import { Button } from '../components/common/Button'

interface Provider {
  id: string
  label: string
  tagline: string
  pricing: string
  vibe: { bg: string; border: string; text: string; icon: string }
  Icon: any
}

const PROVIDERS: Provider[] = [
  {
    id: 'huggingface',
    label: 'Hugging Face',
    tagline: 'Free models, BYO token',
    pricing: 'Free',
    vibe: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', text: '#a1a1aa', icon: '#71717a' },
    Icon: BrainCircuit,
  },
  {
    id: 'grok',
    label: 'Grok',
    tagline: 'Largest context, dark-friendly',
    pricing: 'Pay-as-you-go',
    vibe: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', text: '#c4b5fd', icon: '#a78bfa' },
    Icon: Cpu,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    tagline: 'Fast and broad',
    pricing: 'Pay-as-you-go',
    vibe: { bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)', text: '#7dd3fc', icon: '#38bdf8' },
    Icon: Cloud,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    tagline: 'Polished prose',
    pricing: 'Pay-as-you-go',
    vibe: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', text: '#6ee7b7', icon: '#10b981' },
    Icon: Bot,
  },
  {
    id: 'claude',
    label: 'Claude',
    tagline: 'Deepest character work',
    pricing: 'Pay-as-you-go',
    vibe: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', text: '#fcd34d', icon: '#f59e0b' },
    Icon: Zap,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    tagline: 'Cost-efficient',
    pricing: 'Pay-as-you-go',
    vibe: { bg: 'rgba(20,184,166,0.06)', border: 'rgba(20,184,166,0.2)', text: '#5eead4', icon: '#14b8a6' },
    Icon: Database,
  },
  {
    id: 'bedrock',
    label: 'AWS Bedrock',
    tagline: 'Mistral/Nova on AWS',
    pricing: 'Pay-as-you-go',
    vibe: { bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.2)', text: '#fdba74', icon: '#f97316' },
    Icon: Server,
  },
]

export function ModelSetupScreen() {
  const [, navigate]    = useLocation()
  const { dispatch }    = useModel()
  const [selected, setSelected] = useState<string | null>(null)
  const [apiKey, setApiKey]     = useState('')
  const [saving, setSaving]     = useState(false)

  async function save() {
    if (!selected) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    dispatch({ type: 'SET_PROVIDER', provider: selected, apiKey: apiKey.trim() || undefined })
    navigate('/novels')
  }

  function skip() {
    dispatch({ type: 'USE_MOCK' })
    navigate('/novels')
  }

  const selectedProvider = PROVIDERS.find(p => p.id === selected)

  return (
    <div className="eden-gradient-bg min-h-dvh flex flex-col px-5 py-10">
      <div className="noise-overlay" />

      <div className="relative z-10 w-full max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display italic text-3xl text-[#e6e6f0] mb-1">Choose your engine</h1>
          <p className="text-[#7a7a8c] text-sm">The AI model that will write your story.</p>
        </div>

        {/* Provider cards — horizontal scroll on mobile, grid on md+ */}
        <LayoutGroup>
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {PROVIDERS.map((p, i) => (
                  <motion.button
                    key={p.id}
                    layoutId={`provider-${p.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="text-left rounded-2xl p-4 flex items-start gap-3 cursor-pointer group"
                    style={{ background: p.vibe.bg, border: `1px solid ${p.vibe.border}` }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(p.id)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: p.vibe.icon + '20', border: `1px solid ${p.vibe.icon}30` }}
                    >
                      <p.Icon className="w-5 h-5" style={{ color: p.vibe.icon }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold" style={{ color: p.vibe.text }}>{p.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#7a7a8c] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[12px] text-[#7a7a8c] leading-snug">{p.tagline}</p>
                      <span
                        className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-mono-eden uppercase tracking-wider"
                        style={{ background: p.vibe.icon + '18', color: p.vibe.icon }}
                      >
                        {p.pricing}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              /* API key modal that morphs from the card */
              <motion.div
                key="modal"
                layoutId={`provider-${selected}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-6 space-y-5"
                style={{
                  background: selectedProvider ? selectedProvider.vibe.bg : 'rgba(18,18,26,0.9)',
                  border: `1px solid ${selectedProvider?.vibe.border ?? 'rgba(255,255,255,0.08)'}`,
                  backdropFilter: 'blur(24px)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: selectedProvider?.vibe.icon + '20',
                        border: `1px solid ${selectedProvider?.vibe.icon}30`
                      }}
                    >
                      {selectedProvider && <selectedProvider.Icon className="w-5 h-5" style={{ color: selectedProvider.vibe.icon }} />}
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-[#e6e6f0]">{selectedProvider?.label}</div>
                      <div className="text-[12px] text-[#7a7a8c]">{selectedProvider?.tagline}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelected(null); setApiKey('') }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] hover:bg-white/05 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">
                    API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a8c]" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder={`${selectedProvider?.label ?? ''} API key`}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-[#e6e6f0] placeholder:text-[#4a4a5c] outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                      autoFocus
                    />
                  </div>
                </div>

                <Button fullWidth onClick={save} loading={saving}>
                  Save & Continue
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={skip}
            className="text-[13px] text-[#7a7a8c] hover:text-indigo-400 transition-colors underline underline-offset-2"
          >
            Skip — use mock AI
          </button>
        </div>
      </div>
    </div>
  )
}
