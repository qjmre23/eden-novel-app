import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { BookOpen, Key, ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useModel } from '../context/ModelContext';
import NarratorSetupWidget from '../components/common/NarratorSetupWidget';

export default function HFTokenScreen() {
  const [, navigate] = useLocation();
  const { saveToken, testConnection, isConnected, connectionError } = useModel();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [showCost, setShowCost] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setResult(null);
    saveToken(token);
    const res = await testConnection();
    setLoading(false);
    setResult(res);
    if (res.success) {
      setTimeout(() => navigate('/model-selection'), 800);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#080812] px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-blue-900/40 border border-blue-700/50 flex items-center justify-center">
            <BookOpen size={40} className="text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Eden Novel</h1>
          <p className="text-gray-400 text-sm">AI Narrative Engine</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Key size={16} />
            </div>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="Paste your HuggingFace token (hf_...)"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-4 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Get your free token at{' '}
            <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-400 underline">
              huggingface.co/settings/tokens
            </a>
          </p>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : null}
          {loading ? 'Connecting…' : 'Test and Connect'}
        </button>

        {result && (
          <div className={`w-full rounded-xl border px-4 py-3 flex items-start gap-3 text-sm ${result.success ? 'border-green-700 bg-green-900/20 text-green-400' : 'border-red-700 bg-red-900/20 text-red-400'}`}>
            {result.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            <span>{result.success ? 'Connected! Redirecting…' : result.error}</span>
          </div>
        )}

        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => setShowHow(!showHow)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 rounded-xl text-sm text-gray-300 border border-gray-800"
          >
            <span>How to get a free HF token</span>
            {showHow ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showHow && (
            <div className="bg-gray-900 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1 border border-gray-800">
              <p>1. Visit huggingface.co and create a free account</p>
              <p>2. Go to Settings → Access Tokens</p>
              <p>3. Click "New Token" → set type to "Read"</p>
              <p>4. Copy the token (starts with hf_)</p>
              <p>5. Paste it above and click Connect</p>
            </div>
          )}

          <button
            onClick={() => setShowCost(!showCost)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 rounded-xl text-sm text-gray-300 border border-gray-800"
          >
            <span>What does this cost?</span>
            {showCost ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showCost && (
            <div className="bg-gray-900 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1 border border-gray-800">
              <p><span className="text-green-400 font-semibold">Free tier:</span> Generous daily limits on smaller models</p>
              <p><span className="text-yellow-400 font-semibold">Paid:</span> ~$0.30 per complete 100-chapter story on 70B models</p>
              <p>All inference happens on HuggingFace servers. Your story data stays on your device.</p>
            </div>
          )}
        </div>

        <NarratorSetupWidget />
      </div>
    </div>
  );
}
