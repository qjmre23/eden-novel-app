import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, ExternalLink, ChevronDown } from 'lucide-react';
import { useModel } from '../context/ModelContext';
import { useLocation } from 'wouter';
import type { AIProvider } from '../services/modelService';
import { BEDROCK_MODELS, BEDROCK_DEFAULT_MODEL, BEDROCK_GROUPS } from '../services/bedrockService';
import NarratorSetupWidget from '../components/common/NarratorSetupWidget';

const PROVIDER_INFO: Record<string, {
  name: string;
  emoji: string;
  color: string;
  keyLabel: string;
  keyPlaceholder: string;
  docsUrl: string;
  docsLabel: string;
  hint: string;
  showModelPicker?: boolean;
}> = {
  bedrock: {
    name: 'Amazon Bedrock',
    emoji: '🪨',
    color: 'amber',
    keyLabel: 'Bedrock API Key (ABSK)',
    keyPlaceholder: 'ABSK...',
    docsUrl: 'https://us-east-1.console.aws.amazon.com/bedrock/home#/api-keys',
    docsLabel: 'Get key at Bedrock console → API Keys',
    hint: 'Uses ABSK key auth · Region locked to us-east-1 · Also covers Mistral (Voxtral, Ministral) models.',
    showModelPicker: true,
  },
  grok: {
    name: 'Grok by xAI',
    emoji: '🚀',
    color: 'blue',
    keyLabel: 'xAI API Key',
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://console.x.ai/',
    docsLabel: 'Get key at console.x.ai',
    hint: 'Uses grok-3-fast model. 131K token context window.',
  },
  gemini: {
    name: 'Gemini',
    emoji: '✨',
    color: 'cyan',
    keyLabel: 'Google AI API Key',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Get key at aistudio.google.com',
    hint: 'Free tier available. Uses gemini-2.0-flash model.',
  },
  openai: {
    name: 'GPT (OpenAI)',
    emoji: '🧠',
    color: 'green',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'Get key at platform.openai.com',
    hint: 'Uses gpt-4o-mini model. Requires paid credits.',
  },
  claude: {
    name: 'Claude (Anthropic)',
    emoji: '🌙',
    color: 'orange',
    keyLabel: 'Anthropic API Key',
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Get key at console.anthropic.com',
    hint: 'Uses claude-3-5-haiku model. Requires paid credits.',
  },
  deepseek: {
    name: 'DeepSeek',
    emoji: '🔮',
    color: 'purple',
    keyLabel: 'DeepSeek API Key',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    docsLabel: 'Get key at platform.deepseek.com',
    hint: 'Uses deepseek-chat model. Very cost effective.',
  },
  nova: {
    name: 'Nova by Amazon',
    emoji: '🪨',
    color: 'amber',
    keyLabel: 'Amazon Bedrock API Key (ABSK)',
    keyPlaceholder: 'ABSK...',
    docsUrl: 'https://us-east-1.console.aws.amazon.com/bedrock/home#/api-keys',
    docsLabel: 'Get key at Bedrock console → API Keys',
    hint: 'Nova is part of Amazon Bedrock. Uses ABSK key auth.',
    showModelPicker: true,
  },
};

const COLOR_MAP: Record<string, { ring: string; btn: string; accent: string; link: string; select: string }> = {
  blue:   { ring: 'focus:ring-blue-600/50 border-blue-800/60',   btn: 'bg-blue-700 hover:bg-blue-600',   accent: 'text-blue-400',   link: 'text-blue-500 hover:text-blue-400',   select: 'border-blue-800/60' },
  cyan:   { ring: 'focus:ring-cyan-600/50 border-cyan-800/60',   btn: 'bg-cyan-700 hover:bg-cyan-600',   accent: 'text-cyan-400',   link: 'text-cyan-500 hover:text-cyan-400',   select: 'border-cyan-800/60' },
  green:  { ring: 'focus:ring-green-600/50 border-green-800/60', btn: 'bg-green-700 hover:bg-green-600', accent: 'text-green-400',  link: 'text-green-500 hover:text-green-400', select: 'border-green-800/60' },
  orange: { ring: 'focus:ring-orange-600/50 border-orange-800/60',btn:'bg-orange-700 hover:bg-orange-600',accent:'text-orange-400', link: 'text-orange-500 hover:text-orange-400',select: 'border-orange-800/60' },
  purple: { ring: 'focus:ring-purple-600/50 border-purple-800/60',btn:'bg-purple-700 hover:bg-purple-600',accent:'text-purple-400', link: 'text-purple-500 hover:text-purple-400',select: 'border-purple-800/60' },
  amber:  { ring: 'focus:ring-amber-600/50 border-amber-800/60', btn: 'bg-amber-700 hover:bg-amber-600', accent: 'text-amber-400',  link: 'text-amber-500 hover:text-amber-400', select: 'border-amber-800/60' },
};

export default function ApiKeySetupScreen() {
  const { saveApiKey, provider } = useModel();
  const [, navigate] = useLocation();
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    localStorage.getItem('bedrock_model') || BEDROCK_DEFAULT_MODEL
  );

  // Read provider directly from ModelContext (set by setProvider() before navigation).
  // Never rely on pending_provider_setup localStorage key — it can be stale if the
  // user navigates between providers without completing setup.
  const info = PROVIDER_INFO[provider] || PROVIDER_INFO.gemini;
  const colors = COLOR_MAP[info.color] || COLOR_MAP.cyan;

  const isBedrockProvider = info.showModelPicker === true;

  const handleSave = async () => {
    if (!isBedrockProvider && !key.trim()) { setError('Please enter your API key.'); return; }
    setSaving(true);
    setError('');
    try {
      saveApiKey(provider, key.trim());
      if (info.showModelPicker) {
        localStorage.setItem('bedrock_model', selectedModel);
        localStorage.setItem('selected_model', selectedModel);
      }
      localStorage.removeItem('pending_provider_setup');
      navigate('/novels');
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#080812] px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={() => { navigate('/provider-select'); }}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back to providers
        </button>

        <div className="text-center mb-7">
          <div className="text-4xl mb-3">{info.emoji}</div>
          <h2 className="text-xl font-bold text-white">{info.name}</h2>
          <p className={`text-xs mt-1 ${colors.accent}`}>{info.hint}</p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">{info.keyLabel}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                placeholder={info.keyPlaceholder}
                autoComplete="off"
                className={`w-full bg-gray-950 border ${colors.ring} text-white text-sm rounded-xl px-3.5 py-3 pr-10 placeholder-gray-700 focus:outline-none focus:ring-2 transition-all`}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {info.showModelPicker && (
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Model</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className={`w-full appearance-none bg-gray-950 border ${colors.select} text-white text-sm rounded-xl px-3.5 py-3 pr-8 focus:outline-none focus:ring-2 ${colors.ring} transition-all`}
                >
                  {BEDROCK_GROUPS.map(group => (
                    <optgroup key={group} label={group}>
                      {BEDROCK_MODELS.filter(m => m.group === group).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <p className="text-gray-600 text-xs mt-1">Default: Qwen3 32B — best for stories</p>
            </div>
          )}

          <a
            href={info.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-xs ${colors.link} transition-colors`}
          >
            <ExternalLink size={12} />
            {info.docsLabel}
          </a>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>
          )}

          {isBedrockProvider && (
            <p className="text-gray-600 text-xs">
              Leave empty to use the <span className="font-mono text-gray-500">BEDROCK_API_KEY</span> environment variable.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || (!isBedrockProvider && !key.trim())}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 ${colors.btn}`}
          >
            {saving ? 'Saving…' : 'Save & Continue →'}
          </button>
        </div>

        <p className="text-center text-gray-700 text-xs mt-4">Your key is stored locally on your device only.</p>

        <NarratorSetupWidget />
      </motion.div>
    </div>
  );
}
