import { motion } from 'framer-motion'
import { MapPin, Clock, Cloud } from 'lucide-react'

interface EnvironmentBubbleProps {
  location: string
  timeOfDay: string
  weather: string
  genre: string
}

const GENRE_GRADIENTS: Record<string, string> = {
  zombie:        'from-[#1a0a0a] via-[#2d1010] to-[#0a0a0a]',
  apocalypse:    'from-[#1a1000] via-[#2d2010] to-[#0a0a0a]',
  cultivation:   'from-[#0a0a1a] via-[#101040] to-[#0a0a0a]',
  cyberpunk:     'from-[#000a1a] via-[#001830] to-[#000a0a]',
  fantasy:       'from-[#0a0a1e] via-[#151035] to-[#0a0a0a]',
  mafia:         'from-[#0a0a0a] via-[#1a1010] to-[#0a0808]',
  romance:       'from-[#1a0a10] via-[#200a18] to-[#0a0a0a]',
  horror:        'from-[#080808] via-[#150808] to-[#080808]',
  detective:     'from-[#0a0808] via-[#181010] to-[#080808]',
  space_scifi:   'from-[#000510] via-[#001025] to-[#000510]',
  military_war:  'from-[#080c08] via-[#101808] to-[#080808]',
  historical:    'from-[#100c00] via-[#1e1800] to-[#0a0a00]',
  survival:      'from-[#080c08] via-[#0c1808] to-[#080808]',
  superpower:    'from-[#08001a] via-[#100030] to-[#000808]',
  isekai:        'from-[#001a0a] via-[#002010] to-[#001010]',
  vampire:       'from-[#100008] via-[#200010] to-[#080008]',
  school:        'from-[#0a0a14] via-[#10101e] to-[#0a0a0a]',
  slice_of_life: 'from-[#0a0a10] via-[#101018] to-[#0a0a0a]',
  thriller:      'from-[#08080e] via-[#10101c] to-[#080808]',
  crime_noir:    'from-[#080808] via-[#141010] to-[#080808]',
}

export function EnvironmentBubble({ location, timeOfDay, weather, genre }: EnvironmentBubbleProps) {
  const grad = GENRE_GRADIENTS[genre] ?? GENRE_GRADIENTS.slice_of_life

  return (
    <motion.div
      className={`w-full rounded-2xl overflow-hidden bg-gradient-to-br ${grad} border border-white/06`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 rounded-2xl opacity-[0.04]"
        style={{ backgroundImage: 'url(/noise.svg)', backgroundSize: '256px' }}
      />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 anim-pulse-glow" />
          <span className="text-[10px] font-mono-eden uppercase tracking-[0.18em] text-indigo-400">
            Scene
          </span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#7a7a8c] mt-0.5 shrink-0" />
          <span className="text-[13px] text-[#e6e6f0] font-medium leading-tight">{location}</span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-[11px] font-mono-eden text-[#7a7a8c]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {timeOfDay}
          </span>
          <span className="flex items-center gap-1.5">
            <Cloud className="w-3 h-3" />
            {weather}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
