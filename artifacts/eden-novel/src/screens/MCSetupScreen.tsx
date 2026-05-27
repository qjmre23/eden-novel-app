import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useSearch } from 'wouter'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { adapter } from '../services/adapter'
import { ProgressDots } from '../components/common/ProgressDots'
import { Slider } from '../components/common/Slider'
import { Button } from '../components/common/Button'
import type { McTraits } from '../types'

const SEED_TEMPLATES = [
  'A reborn villain who remembers their past mistakes',
  'The last living human in a world that moved on',
  'A new transfer student with no memory of the last year',
  'Returned from war with something I shouldn\'t have seen',
]

const GENDER_OPTIONS = [
  { id: 'she/her',   label: 'She / Her' },
  { id: 'he/him',    label: 'He / Him' },
  { id: 'they/them', label: 'They / Them' },
]

function generateTraitSummary(traits: McTraits, gender: string): string {
  const pronoun = gender === 'she/her' ? 'She' : gender === 'he/him' ? 'He' : 'They'
  const warmCold    = traits.personality > 60 ? 'warm' : traits.personality < 40 ? 'cold' : 'measured'
  const reckCaut    = traits.attitude > 60 ? 'reckless' : traits.attitude < 40 ? 'cautious' : 'deliberate'
  const self        = traits.altruism > 60 ? 'who protects others before themselves' : traits.altruism < 40 ? 'who guards their own survival above all' : 'who weighs others\' needs against their own'
  const risk        = traits.risk > 60 ? 'drawn toward danger' : traits.risk < 40 ? 'wary of unnecessary risk' : 'selective about when to act'
  return `${pronoun} is ${warmCold} and ${reckCaut} — ${self}, ${risk}.`
}

export function MCSetupScreen() {
  const [, navigate] = useLocation()
  const search = useSearch()
  const params = new URLSearchParams(search)
  const genre  = params.get('genre') ?? 'fantasy'

  const [step, setStep]     = useState(0)
  const [name, setName]     = useState('')
  const [gender, setGender] = useState('she/her')
  const [worldName, setWorldName] = useState('')
  const [traits, setTraits] = useState<McTraits>({ personality: 50, attitude: 50, altruism: 50, risk: 50 })
  const [seed, setSeed]     = useState('')
  const [creating, setCreating] = useState(false)
  const [shake, setShake]   = useState(false)

  function nextStep() {
    if (step === 0 && !name.trim()) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    if (step === 2 && !seed.trim()) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setStep(s => s + 1)
  }

  async function startStory() {
    if (!seed.trim() && step < 2) return
    setCreating(true)
    try {
      const novel = await adapter.createNovel({
        genre,
        mc_name: name.trim() || 'Unknown',
        world_name: worldName.trim() || 'The World',
        story_seed: seed.trim(),
        mc_traits_json: JSON.stringify(traits),
      })
      navigate(`/story/${novel.id}`)
    } catch (e) {
      console.error(e)
      setCreating(false)
    }
  }

  const STEPS = ['Identity', 'Traits', 'Beginning']

  return (
    <div className="eden-gradient-bg min-h-dvh flex flex-col">
      <div className="noise-overlay" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-safe pt-5 pb-4">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/new-novel')}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] hover:bg-white/05 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display italic text-2xl text-[#e6e6f0]">{STEPS[step]}</h1>
        </div>
        <ProgressDots total={3} current={step} />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 h-0.5 bg-white/05 mx-5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-indigo-500"
          animate={{ width: `${((step + 1) / 3) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-5 py-8">
        <AnimatePresence mode="wait">

          {/* Step 0 — Identity */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }}
              className="space-y-6"
            >
              {/* Name */}
              <motion.div
                animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="space-y-2"
              >
                <label className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="What do they call you?"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-[15px] text-[#e6e6f0] placeholder:text-[#4a4a5c] outline-none"
                  style={{ background: 'rgba(26,26,38,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </motion.div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">Pronouns</label>
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer"
                      style={{
                        background: gender === g.id ? 'rgba(99,102,241,0.2)' : 'rgba(26,26,38,0.6)',
                        border: `1px solid ${gender === g.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        color: gender === g.id ? '#a5b4fc' : '#7a7a8c',
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* World name */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">
                  World name <span className="text-[#4a4a5c]">(optional)</span>
                </label>
                <input
                  value={worldName}
                  onChange={e => setWorldName(e.target.value)}
                  placeholder="What is this world called?"
                  className="w-full px-4 py-3 rounded-xl text-[14px] text-[#e6e6f0] placeholder:text-[#4a4a5c] outline-none"
                  style={{ background: 'rgba(26,26,38,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </motion.div>
          )}

          {/* Step 1 — Traits */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <Slider label="Personality" leftLabel="Cold" rightLabel="Warm"
                  value={traits.personality} onChange={v => setTraits(t => ({ ...t, personality: v }))} />
                <Slider label="Attitude" leftLabel="Cautious" rightLabel="Reckless"
                  value={traits.attitude} onChange={v => setTraits(t => ({ ...t, attitude: v }))} />
                <Slider label="Altruism" leftLabel="Self-serving" rightLabel="Selfless"
                  value={traits.altruism} onChange={v => setTraits(t => ({ ...t, altruism: v }))} />
                <Slider label="Risk Tolerance" leftLabel="Avoidant" rightLabel="Pursuer"
                  value={traits.risk} onChange={v => setTraits(t => ({ ...t, risk: v }))} />
              </div>

              {/* Live summary */}
              <motion.div
                key={JSON.stringify(traits)}
                className="rounded-xl p-4"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <p className="font-display italic text-[14px] text-[#e6e6f0]/80 leading-relaxed">
                  {generateTraitSummary(traits, gender)}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2 — Story hook */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-[11px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">
                  Where does this story begin?
                </label>
                <motion.div
                  animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <textarea
                    value={seed}
                    onChange={e => setSeed(e.target.value)}
                    placeholder="In one or two sentences, tell us where this story begins..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-[14px] text-[#e6e6f0] placeholder:text-[#4a4a5c] outline-none resize-none leading-relaxed"
                    style={{ background: 'rgba(26,26,38,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
                    autoFocus
                  />
                </motion.div>
              </div>

              {/* Seed templates */}
              <div className="space-y-2">
                <p className="text-[11px] font-mono-eden text-[#7a7a8c] uppercase tracking-wider">Or start with:</p>
                <div className="space-y-2">
                  {SEED_TEMPLATES.map((t, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => setSeed(t)}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-[13px] text-[#7a7a8c] hover:text-[#e6e6f0] transition-colors cursor-pointer"
                      style={{ background: 'rgba(26,26,38,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      &ldquo;{t}&rdquo;
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="relative z-10 px-5 pb-safe pb-6 pt-3 border-t border-white/05">
        {step < 2 ? (
          <Button fullWidth size="lg" onClick={nextStep}>
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={startStory} loading={creating}>
            <BookOpen className="w-4 h-4" />
            Start the story
          </Button>
        )}
      </div>
    </div>
  )
}
