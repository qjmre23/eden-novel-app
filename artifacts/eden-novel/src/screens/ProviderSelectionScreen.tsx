import React from 'react';
import { motion } from 'framer-motion';
import { useModel } from '../context/ModelContext';
import { useLocation } from 'wouter';
import type { AIProvider } from '../services/modelService';

interface ProviderCard {
  id: AIProvider;
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  accentFrom: string;
  accentTo: string;
  features: string[];
  needsKey: boolean;
  badge?: string;
}

const PROVIDERS: ProviderCard[] = [
  {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    subtitle: 'Massive multi-model AI ecosystem',
    emoji: '🪨',
    color: 'amber',
    accentFrom: '#d97706',
    accentTo: '#92400e',
    features: [
      'Qwen · Gemma · Mistral · Nova',
      'OpenAI OSS · GLM · MiniMax · NVIDIA',
      'ABSK API key — no IAM needed',
      'Streaming · Long context support',
    ],
    needsKey: true,
    badge: 'Recommended',
  },
  {
    id: 'grok',
    name: 'Grok by xAI',
    subtitle: 'Best for long stories',
    emoji: '🚀',
    color: 'blue',
    accentFrom: '#1d4ed8',
    accentTo: '#3730a3',
    features: ['131K token context window', 'Lowest hallucination rate', 'xAI API key required', 'Unfiltered story content'],
    needsKey: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    subtitle: 'Google AI — Fast & capable',
    emoji: '✨',
    color: 'cyan',
    accentFrom: '#0e7490',
    accentTo: '#155e75',
    features: ['gemini-2.0-flash model', 'Very fast responses', 'Free tier available', 'Google API key required'],
    needsKey: true,
  },
  {
    id: 'openai',
    name: 'GPT (OpenAI)',
    subtitle: 'GPT-4o-mini — Smart & affordable',
    emoji: '🧠',
    color: 'green',
    accentFrom: '#15803d',
    accentTo: '#166534',
    features: ['gpt-4o-mini model', 'Excellent instruction following', 'OpenAI API key required', 'Fallback to gpt-4o'],
    needsKey: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    subtitle: 'Anthropic — Rich narrative writing',
    emoji: '🌙',
    color: 'orange',
    accentFrom: '#c2410c',
    accentTo: '#9a3412',
    features: ['claude-3-5-haiku model', 'Best prose quality', 'Anthropic API key required', 'Great for emotional depth'],
    needsKey: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    subtitle: 'DeepSeek Chat — Fast & cheap',
    emoji: '🔮',
    color: 'purple',
    accentFrom: '#7c3aed',
    accentTo: '#6d28d9',
    features: ['deepseek-chat model', 'Very cost effective', 'DeepSeek API key required', 'Strong reasoning'],
    needsKey: true,
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    subtitle: 'Open-source models',
    emoji: '🤗',
    color: 'rose',
    accentFrom: '#be185d',
    accentTo: '#9f1239',
    features: ['Free tier available', 'Llama, Mistral, Qwen & more', 'HuggingFace token required', 'Choose your own model'],
    needsKey: true,
  },
];

const ACCENT_DOT: Record<string, string> = {
  blue:   'text-blue-400',
  cyan:   'text-cyan-400',
  green:  'text-emerald-400',
  orange: 'text-orange-400',
  purple: 'text-violet-400',
  amber:  'text-amber-400',
  rose:   'text-rose-400',
};

export default function ProviderSelectionScreen() {
  const { setProvider } = useModel();
  const [, navigate] = useLocation();

  const handleSelect = (p: AIProvider, needsKey: boolean) => {
    setProvider(p);
    if (!needsKey) {
      navigate('/novels');
    } else if (p === 'huggingface') {
      navigate('/token-setup');
    } else {
      localStorage.setItem('pending_provider_setup', p);
      navigate('/api-key-setup');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center bg-[#04040e] px-4 py-8 relative overflow-hidden">

      {/* Atmospheric background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-blue-900/15 blur-[90px]" />
        <div className="absolute top-2/3 -right-24 w-72 h-72 rounded-full bg-violet-900/15 blur-[90px]" />
        {[...Array(28)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/30"
            style={{
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              top: `${(i * 37 + 11) % 100}%`,
              left: `${(i * 53 + 7) % 100}%`,
              opacity: 0.15 + (i % 4) * 0.1,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-8 text-center relative"
      >
        <div className="relative inline-block mb-5">
          <div className="absolute inset-0 rounded-[22px] bg-indigo-500/30 blur-xl scale-110" />
          <div className="relative w-20 h-20 rounded-[22px] bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-800 flex items-center justify-center shadow-2xl shadow-indigo-900/60 border border-indigo-400/20">
            <span className="text-4xl">📖</span>
          </div>
        </div>

        <h1 className="text-4xl font-black text-white tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
          Eden Novel
        </h1>
        <p className="text-indigo-300/60 mt-1.5 text-sm tracking-widest uppercase font-medium">
          AI Narrative Engine
        </p>

        <div className="flex items-center gap-3 mt-5 justify-center">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-indigo-500/50" />
          <span className="text-indigo-400/50 text-xs">✦</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-indigo-500/50" />
        </div>
      </motion.div>

      {/* Provider list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <p className="text-center text-gray-300 font-semibold text-base mb-5 tracking-wide">
          Choose your AI Provider
        </p>

        <div className="flex flex-col gap-2.5">
          {PROVIDERS.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.055, duration: 0.35 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSelect(p.id, p.needsKey)}
              className="w-full rounded-2xl p-4 text-left transition-all group relative overflow-hidden border border-white/5 hover:border-white/10"
              style={{ background: 'rgba(12,12,22,0.85)' }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ background: `radial-gradient(ellipse at 0% 50%, ${p.accentFrom}22 0%, transparent 70%)` }}
              />

              {p.badge && (
                <div
                  className="absolute top-3 right-3 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10"
                  style={{ background: `${p.accentFrom}cc` }}
                >
                  {p.badge}
                </div>
              )}

              <div className="flex items-center gap-3 mb-2.5 relative">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border border-white/10 shrink-0"
                  style={{ background: `${p.accentFrom}33` }}
                >
                  {p.emoji}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{p.name}</p>
                  <p className={`text-xs font-medium ${ACCENT_DOT[p.color]}`}>{p.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 relative">
                {p.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <span className={`${ACCENT_DOT[p.color]} shrink-0`}>✦</span>
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>

              <div
                className="w-full py-2 rounded-xl text-sm font-semibold text-center transition-all relative border border-white/8 group-hover:border-white/15"
                style={{ background: `${p.accentFrom}28` }}
              >
                <span className={ACCENT_DOT[p.color]}>Use {p.name} →</span>
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-gray-700 text-xs mt-5 pb-4">
          You can switch providers anytime in Settings
        </p>
      </motion.div>
    </div>
  );
}
