import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface CustomActionInputProps {
  onSubmit: (text: string) => void
  isGenerating: boolean
  disabled?: boolean
}

const PLACEHOLDERS = [
  'What do you want to do?',
  'Speak your mind...',
  'Stay silent and observe.',
  'Step forward...',
  'Listen carefully.',
  'Walk away.',
]

export function CustomActionInput({ onSubmit, isGenerating, disabled }: CustomActionInputProps) {
  const [value, setValue] = useState('')
  const [phIdx, setPhIdx] = useState(0)
  const [phVisible, setPhVisible] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Cycle placeholder every 6s
  useEffect(() => {
    const id = setInterval(() => {
      setPhVisible(false)
      setTimeout(() => {
        setPhIdx(i => (i + 1) % PLACEHOLDERS.length)
        setPhVisible(true)
      }, 300)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isGenerating || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="flex items-end gap-2 rounded-2xl px-3 py-2"
      style={{
        background: 'rgba(18, 18, 26, 0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="relative flex-1">
        {/* Animated placeholder */}
        <AnimatePresence mode="wait">
          {!value && (
            <motion.span
              key={phIdx}
              className="absolute inset-0 px-1 py-1.5 text-[13px] text-[#4a4a5c] pointer-events-none select-none leading-snug"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: phVisible ? 1 : 0, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
            >
              {PLACEHOLDERS[phIdx]}
            </motion.span>
          )}
        </AnimatePresence>

        <textarea
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={isGenerating || disabled}
          rows={1}
          className="w-full resize-none bg-transparent text-[13px] text-[#e6e6f0] leading-snug px-1 py-1.5 outline-none min-h-[32px] max-h-[120px] overflow-y-auto no-scrollbar"
          style={{ caretColor: '#6366f1' }}
        />
      </div>

      {/* Send button — morphs to ring while generating */}
      <motion.button
        className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
        style={{
          background: isGenerating ? 'transparent' : 'rgba(99,102,241,0.85)',
          border: isGenerating ? '2px solid rgba(99,102,241,0.5)' : '1px solid rgba(99,102,241,0.5)',
        }}
        whileTap={{ scale: 0.93 }}
        onClick={handleSubmit}
        disabled={isGenerating || disabled || !value.trim()}
        aria-label="Send action"
      >
        {isGenerating ? (
          <>
            {/* Pulsing ring */}
            <span
              className="absolute inset-0 rounded-xl border-2 border-indigo-400 anim-ring"
              style={{ animationDuration: '1.2s' }}
            />
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          </>
        ) : (
          <Send className="w-4 h-4 text-white" />
        )}
      </motion.button>
    </div>
  )
}
