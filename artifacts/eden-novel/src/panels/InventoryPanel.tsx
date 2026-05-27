import { motion } from 'framer-motion'
import { Package } from 'lucide-react'

const MOCK_ITEMS = [
  { name: 'Cracked Phone', desc: '12% battery. No signal.', rarity: 'common' },
  { name: 'Old Lighter', desc: 'Half fuel. Reliable.', rarity: 'common' },
  { name: 'Handwritten Note', desc: 'Coordinates. Unknown source.', rarity: 'uncommon' },
  { name: 'Adrenaline Shot', desc: 'Single use. Emergency only.', rarity: 'rare' },
]

const RARITY_COLORS = {
  common:   { border: 'rgba(255,255,255,0.1)', glow: 'transparent', text: '#7a7a8c' },
  uncommon: { border: 'rgba(99,102,241,0.3)', glow: 'rgba(99,102,241,0.05)', text: '#818cf8' },
  rare:     { border: 'rgba(245,158,11,0.4)', glow: 'rgba(245,158,11,0.06)', text: '#fbbf24' },
}

export function InventoryPanel() {
  return (
    <div className="space-y-4">
      {/* Currency */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <span className="text-[11px] font-mono-eden uppercase tracking-widest text-amber-400">Funds</span>
        <span className="font-mono-eden text-amber-300 font-bold">¥ 340</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {MOCK_ITEMS.map((item, i) => {
          const style = RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="rounded-xl p-3 space-y-1.5 cursor-default"
              style={{ background: style.glow, border: `1px solid ${style.border}` }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Package className="w-4 h-4 text-[#7a7a8c]" />
              </div>
              <div className="text-[12px] font-medium text-[#e6e6f0] leading-tight">{item.name}</div>
              <div className="text-[10px] text-[#7a7a8c] leading-tight">{item.desc}</div>
              <div className="text-[9px] font-mono-eden uppercase tracking-wider" style={{ color: style.text }}>
                {item.rarity}
              </div>
            </motion.div>
          )
        })}

        {/* Empty slots */}
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-xl h-24 flex items-center justify-center"
            style={{ border: '1px dashed rgba(255,255,255,0.05)' }}
          >
            <span className="text-[#4a4a5c] text-sm">—</span>
          </div>
        ))}
      </div>
    </div>
  )
}
