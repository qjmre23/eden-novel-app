import { motion } from 'framer-motion'

interface ChapterTransitionCardProps {
  chapter: number
  title: string
}

export function ChapterTransitionCard({ chapter, title }: ChapterTransitionCardProps) {
  return (
    <motion.div
      className="w-full flex flex-col items-center gap-3 py-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Divider lines */}
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-indigo-500/30" />
        <div className="px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10">
          <span className="text-[10px] font-mono-eden uppercase tracking-[0.2em] text-indigo-400">
            Chapter {chapter}
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-indigo-500/30" />
      </div>

      {/* Title */}
      <h3 className="font-display italic text-xl text-[#e6e6f0] text-center">{title}</h3>
    </motion.div>
  )
}
