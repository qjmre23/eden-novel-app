import { motion } from 'framer-motion'

interface ProgressDotsProps {
  total: number
  current: number
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-indigo-500"
          animate={{
            width:   i === current ? 24 : 6,
            height:  6,
            opacity: i <= current ? 1 : 0.25,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  )
}
