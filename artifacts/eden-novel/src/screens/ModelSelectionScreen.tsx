import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { RefreshCw, Check, Zap, Star } from 'lucide-react';
import { useModel } from '../context/ModelContext';
import { RECOMMENDED_MODELS } from '../core/constants';
import NarratorSetupWidget from '../components/common/NarratorSetupWidget';

export default function ModelSelectionScreen() {
  const [, navigate] = useLocation();
  const { selectedModel, selectModel, availableModels, fetchModels, isConnected } = useModel();
  const [loading, setLoading] = useState(false);
  const [localSelected, setLocalSelected] = useState(selectedModel);

  useEffect(() => {
    if (isConnected && availableModels.length === 0) {
      setLoading(true);
      fetchModels().finally(() => setLoading(false));
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchModels();
    setLoading(false);
  };

  const handleConfirm = () => {
    if (!localSelected) return;
    selectModel(localSelected);
    navigate('/novels');
  };

  const selectedLabel = RECOMMENDED_MODELS.find(m => m.id === localSelected)?.label
    ?? (localSelected ? localSelected.split('/').pop() : null);

  return (
    <div className="min-h-dvh flex flex-col bg-[#080812]">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">Select AI Model</h1>
        <button onClick={handleRefresh} disabled={loading} className="text-gray-400 hover:text-white p-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <p className="text-white font-semibold mb-3">Recommended Models</p>
          <div className="space-y-2">
            {RECOMMENDED_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setLocalSelected(m.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${localSelected === m.id ? 'border-blue-500 bg-blue-900/20' : 'border-gray-800 bg-gray-900/60 hover:border-gray-600'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate">{m.label}</p>
                      {localSelected === m.id && <Check size={14} className="text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{m.description}</p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-xs text-gray-500">⚡ {m.speed}</span>
                      <span className="text-xs text-yellow-500"><Star size={10} className="inline" /> {m.quality}</span>
                      <span className="text-xs text-blue-400">{m.provider}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {availableModels.length > 0 && (
          <div>
            <p className="text-white font-semibold mb-3">All Available Models from your HF account</p>
            <div className="space-y-1">
              {availableModels.slice(0, 50).map(m => {
                const id = String(m.id ?? '');
                const alreadyShown = RECOMMENDED_MODELS.some(r => r.id === id);
                if (alreadyShown) return null;
                return (
                  <button
                    key={id}
                    onClick={() => setLocalSelected(id)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-all ${localSelected === id ? 'bg-blue-900/30 border border-blue-600 text-blue-300' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{id}</span>
                      {localSelected === id && <Check size={14} className="text-blue-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {availableModels.length === 0 && !loading && (
          <p className="text-gray-500 text-sm text-center py-4">Using recommended models list</p>
        )}
      </div>

      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        <button
          onClick={handleConfirm}
          disabled={!localSelected}
          className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-bold rounded-xl py-4 transition-colors"
        >
          {localSelected ? `Use ${selectedLabel}` : 'Select a model'}
        </button>
        <NarratorSetupWidget />
      </div>
    </div>
  );
}
