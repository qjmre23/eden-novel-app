import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock } from 'lucide-react'

interface Skill {
  id: string
  name: string
  desc: string
  unlocked: boolean
  tier: number
}

const SKILLS: Skill[] = [
  { id: 'observe', name: 'Observe', desc: 'Read the room before acting.', unlocked: true,  tier: 1 },
  { id: 'deflect', name: 'Deflect', desc: 'Redirect dangerous questions.', unlocked: true, tier: 1 },
  { id: 'pressure',name: 'Pressure', desc: 'Hold your ground under tension.', unlocked: false, tier: 2 },
  { id: 'empathy', name: 'Empathy',  desc: 'Sense what is unsaid.', unlocked: false, tier: 2 },
  { id: 'dominate',name: 'Dominate', desc: 'Command a room with presence.', unlocked: false, tier: 3 },
  { id: 'vanish',  name: 'Vanish',   desc: 'Disappear from a situation cleanly.', unlocked: false, tier: 3 },
]

interface SkillTreeOverlayProps {
  isVisible: boolean
  onClose: () => void
}

export function SkillTreeOverlay({ isVisible, onClose }: SkillTreeOverlayProps) {
  const tiers = [1, 2, 3]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(12,12,20,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ y: 32, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/06">
              <h2 className="font-display italic text-lg text-[#e6e6f0]">Skill Tree</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#7a7a8c] hover:text-[#e6e6f0] hover:bg-white/05 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Skills by tier */}
            <div className="p-5 space-y-5">
              {tiers.map(tier => (
                <div key={tier} className="space-y-2">
                  <div className="text-[10px] font-mono-eden uppercase tracking-widest text-[#7a7a8c]">
                    Tier {tier}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SKILLS.filter(s => s.tier === tier).map((skill, i) => (
                      <motion.div
                        key={skill.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 + tier * 0.1 }}
                        className="rounded-xl p-3 space-y-1.5"
                        style={{
                          background: skill.unlocked
                            ? 'rgba(99,102,241,0.1)'
                            : 'rgba(26,26,38,0.4)',
                          border: `1px solid ${skill.unlocked
                            ? 'rgba(99,102,241,0.3)'
                            : 'rgba(255,255,255,0.05)'}`,
                          opacity: skill.unlocked ? 1 : 0.5,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {!skill.unlocked && <Lock className="w-3 h-3 text-[#7a7a8c]" />}
                          <span
                            className="text-[12px] font-semibold"
                            style={{ color: skill.unlocked ? '#a5b4fc' : '#7a7a8c' }}
                          >
                            {skill.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7a7a8c] leading-snug">{skill.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Points */}
            <div className="px-5 pb-5">
              <div
                className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <span className="text-[11px] font-mono-eden uppercase tracking-widest text-amber-400">Skill Points</span>
                <span className="font-mono-eden text-amber-300 font-bold text-lg">3</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
