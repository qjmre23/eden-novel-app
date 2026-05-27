import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot } from 'lucide-react'

interface AskMessage {
  role: 'user' | 'eden'
  content: string
}

const EDEN_REPLIES = [
  "The tension in this scene is building toward a confrontation. The character hasn't said everything they know.",
  "Trust is the currency being negotiated right now. Every choice either deposits or withdraws.",
  "There's a secret buried in this relationship. You won't find it by asking directly.",
  "The environment is not neutral — it was chosen by someone, and that choice was deliberate.",
  "Something that was said three exchanges ago will matter more than it seemed at the time.",
  "Watch what they don't say. The silence carries as much meaning as the words.",
  "This character's fear is driving them more than their motivation right now.",
]

let replyIdx = 0

export function AskEdenPanel() {
  const [messages, setMessages] = useState<AskMessage[]>([
    { role: 'eden', content: 'I am the thread beneath the story. Ask me anything about what is happening.' },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const q = input.trim()
    if (!q || thinking) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }])
    setThinking(true)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
    const reply = EDEN_REPLIES[replyIdx % EDEN_REPLIES.length]
    replyIdx++
    setMessages(m => [...m, { role: 'eden', content: reply }])
    setThinking(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full gap-4" style={{ minHeight: '300px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
        <AnimatePresence mode="popLayout">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {m.role === 'eden' && (
                <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}
              <div
                className="max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-snug"
                style={m.role === 'eden'
                  ? { background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#c7d2fe' }
                  : { background: 'rgba(26,26,38,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6e6f0' }
                }
              >
                {m.role === 'eden'
                  ? <em className="font-display italic text-[13px]">{m.content}</em>
                  : m.content
                }
              </div>
            </motion.div>
          ))}

          {thinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5 items-center"
            >
              <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="flex gap-1.5 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: `typing-dot 1.2s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 shrink-0"
        style={{ background: 'rgba(18,18,26,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask Eden anything..."
          className="flex-1 bg-transparent text-[13px] text-[#e6e6f0] outline-none placeholder:text-[#4a4a5c]"
        />
        <button
          onClick={send}
          disabled={!input.trim() || thinking}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30 disabled:opacity-30 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>
    </div>
  )
}
