import React, { useState, useRef, useEffect } from 'react';
import AnimatedPanel from '../components/common/AnimatedPanel';
import { Send, Bot, Loader2 } from 'lucide-react';
import { askEden } from '../services/askEdenService';
import type { AskEdenMessage } from '../services/askEdenService';

interface Props {
  open: boolean;
  onClose: () => void;
  novelId: number;
  timelineId: string;
}

export default function AskEdenPanel({ open, onClose, novelId, timelineId }: Props) {
  const [messages, setMessages] = useState<AskEdenMessage[]>([
    { role: 'eden', content: "Hello. I'm Eden, your story guide. Ask me anything about your story, characters, or world — but I can only tell you what has already happened.", ts: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg: AskEdenMessage = { role: 'user', content: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const response = await askEden(novelId, timelineId, q);
      setMessages(prev => [...prev, { role: 'eden', content: response, ts: Date.now() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'eden', content: 'Sorry, I encountered an error. Please try again.', ts: Date.now() }]);
    }
    setLoading(false);
  };

  return (
    <AnimatedPanel open={open} onClose={onClose} title="Ask Eden">
      <div className="flex flex-col h-[55dvh]">
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'eden' && (
                <div className="w-7 h-7 rounded-full bg-purple-900 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-purple-300" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-blue-900/50 text-blue-100 rounded-br-sm' : 'bg-purple-900/30 text-gray-200 border border-purple-800/30 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-900 flex items-center justify-center">
                <Loader2 size={14} className="text-purple-300 animate-spin" />
              </div>
              <div className="bg-purple-900/30 border border-purple-800/30 rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <div className="typing-dot w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  <div className="typing-dot w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  <div className="typing-dot w-1.5 h-1.5 bg-purple-400 rounded-full" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-800">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your story…"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-xl flex items-center justify-center shrink-0"
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      </div>
    </AnimatedPanel>
  );
}
