import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { companionNarratorService, NARRATOR_VOICES } from '../../services/companionNarratorService';
import type { NarratorSettings } from '../../services/companionNarratorService';

export default function NarratorSetupWidget() {
  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState<NarratorSettings>(() => companionNarratorService.getSettings());
  const [previewing, setPreviewing] = useState(false);

  const update = (partial: Partial<NarratorSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    companionNarratorService.saveSettings(next);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    await companionNarratorService.previewVoice(settings.voice);
    setPreviewing(false);
  };

  return (
    <div className="w-full mt-2 rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Volume2 size={15} className="text-blue-400" />
          <span className="text-sm font-medium text-gray-200">Companion Narrator</span>
          {settings.enabled && (
            <span className="text-[10px] bg-blue-700/50 text-blue-300 px-1.5 py-0.5 rounded-full font-semibold">ON</span>
          )}
        </div>
        {expanded ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Enable narrator</span>
            <button
              onClick={() => update({ enabled: !settings.enabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${settings.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Voice</label>
            <select
              value={settings.voice}
              onChange={e => update({ voice: e.target.value })}
              className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
            >
              {NARRATOR_VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Mode</label>
            <div className="flex gap-2">
              {([
                { val: 'narrator_only', label: 'Narrator Only' },
                { val: 'all_dialogue', label: 'All Dialogue' },
              ] as const).map(o => (
                <button
                  key={o.val}
                  onClick={() => update({ mode: o.val })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${settings.mode === o.val ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePreview}
            disabled={previewing}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Volume2 size={13} />
            {previewing ? 'Playing…' : 'Preview Voice'}
          </button>
        </div>
      )}
    </div>
  );
}
