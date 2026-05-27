import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, CheckCircle, XCircle, Zap, Cloud, CloudOff, RefreshCw, LogOut, LogIn, Volume2 } from 'lucide-react';
import { useModel } from '../context/ModelContext';
import { useAppSettings } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { modelService } from '../services/modelService';
import type { AIProvider } from '../services/modelService';
import { BEDROCK_MODELS, BEDROCK_GROUPS, BEDROCK_DEFAULT_MODEL } from '../services/bedrockService';
import { companionNarratorService, NARRATOR_VOICES } from '../services/companionNarratorService';
import type { NarratorSettings } from '../services/companionNarratorService';

interface ProviderMeta {
  emoji: string;
  label: string;
  modelLine: (model: string) => string;
  editKeyLabel: string;
  editKeyRoute: string;
  color: string;
  colorClass: string;
  borderClass: string;
}

const PROVIDER_META: Record<AIProvider, ProviderMeta> = {
  bedrock: {
    emoji: '🪨',
    label: 'Amazon Bedrock',
    modelLine: m => `Model: ${BEDROCK_MODELS.find(bm => bm.id === m)?.name ?? m.split('.').pop() ?? m}`,
    editKeyLabel: 'Edit Bedrock Key',
    editKeyRoute: '/api-key-setup',
    color: 'amber',
    colorClass: 'text-amber-400',
    borderClass: 'bg-amber-900/20 border-amber-700/40',
  },
  nova: {
    emoji: '⚡',
    label: 'Nova (Amazon Bedrock)',
    modelLine: m => `Model: ${m.split('.').pop() ?? m}`,
    editKeyLabel: 'Edit Bedrock Key',
    editKeyRoute: '/api-key-setup',
    color: 'amber',
    colorClass: 'text-amber-400',
    borderClass: 'bg-amber-900/20 border-amber-700/40',
  },
  grok: {
    emoji: '🚀',
    label: 'Grok by xAI',
    modelLine: () => 'Model: grok-3-fast · 131K context',
    editKeyLabel: 'Edit xAI Key',
    editKeyRoute: '/api-key-setup',
    color: 'blue',
    colorClass: 'text-blue-400',
    borderClass: 'bg-blue-900/20 border-blue-700/40',
  },
  gemini: {
    emoji: '✨',
    label: 'Gemini',
    modelLine: () => 'Model: gemini-2.0-flash',
    editKeyLabel: 'Edit Gemini Key',
    editKeyRoute: '/api-key-setup',
    color: 'cyan',
    colorClass: 'text-cyan-400',
    borderClass: 'bg-cyan-900/20 border-cyan-700/40',
  },
  openai: {
    emoji: '🧠',
    label: 'GPT (OpenAI)',
    modelLine: () => 'Model: gpt-4o-mini',
    editKeyLabel: 'Edit OpenAI Key',
    editKeyRoute: '/api-key-setup',
    color: 'green',
    colorClass: 'text-emerald-400',
    borderClass: 'bg-green-900/20 border-green-700/40',
  },
  claude: {
    emoji: '🌙',
    label: 'Claude (Anthropic)',
    modelLine: () => 'Model: claude-3-5-haiku',
    editKeyLabel: 'Edit Claude Key',
    editKeyRoute: '/api-key-setup',
    color: 'orange',
    colorClass: 'text-orange-400',
    borderClass: 'bg-orange-900/20 border-orange-700/40',
  },
  deepseek: {
    emoji: '🔮',
    label: 'DeepSeek',
    modelLine: () => 'Model: deepseek-chat',
    editKeyLabel: 'Edit DeepSeek Key',
    editKeyRoute: '/api-key-setup',
    color: 'purple',
    colorClass: 'text-violet-400',
    borderClass: 'bg-purple-900/20 border-purple-700/40',
  },
  huggingface: {
    emoji: '🤗',
    label: 'HuggingFace',
    modelLine: m => `Model: ${m ? m.split('/').pop() : 'Not set'}`,
    editKeyLabel: 'Edit HF Token',
    editKeyRoute: '/token-setup',
    color: 'rose',
    colorClass: 'text-rose-400',
    borderClass: 'bg-rose-900/20 border-rose-700/40',
  },
};

export default function SettingsScreen() {
  const [, navigate] = useLocation();
  const { hfToken, selectedModel, testConnection, isConnected, provider, clearProvider } = useModel();
  const { settings, dispatch } = useAppSettings();
  const { user, isGuest, cloudSyncEnabled, signInWithGoogle, logout, lastSyncedAt, setLastSyncedAt } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; ms?: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [bedrockModel, setBedrockModelState] = useState(
    localStorage.getItem('bedrock_model') || BEDROCK_DEFAULT_MODEL
  );
  const [narratorSettings, setNarratorSettings] = useState<NarratorSettings>(() => companionNarratorService.getSettings());
  const [narPreviewing, setNarPreviewing] = useState(false);

  const meta = PROVIDER_META[provider] ?? PROVIDER_META.huggingface;
  const isHuggingFace = provider === 'huggingface';
  const isBedrock = provider === 'bedrock' || provider === 'nova';
  const isGrok = provider === 'grok';
  const hasApiKey = !isHuggingFace;

  const handleTest = async () => {
    setTesting(true);
    const start = Date.now();
    const res = await testConnection();
    const ms = Date.now() - start;
    setTestResult({ ...res, ms });
    setTesting(false);
  };

  const handleSwitchProvider = () => {
    clearProvider();
    navigate('/provider-select');
  };

  const handleBedrockModelChange = (modelId: string) => {
    setBedrockModelState(modelId);
    modelService.selectBedrockModel(modelId);
  };

  const updateNarrator = (partial: Partial<NarratorSettings>) => {
    const next = { ...narratorSettings, ...partial };
    setNarratorSettings(next);
    companionNarratorService.saveSettings(next);
  };

  const handleNarPreview = async () => {
    setNarPreviewing(true);
    await companionNarratorService.previewVoice(narratorSettings.voice);
    setNarPreviewing(false);
  };

  const maskedToken = hfToken
    ? `hf_${'*'.repeat(Math.max(0, hfToken.length - 7))}${hfToken.slice(-4)}`
    : 'Not set';

  const displayModel = isBedrock
    ? (BEDROCK_MODELS.find(m => m.id === bedrockModel)?.name ?? bedrockModel)
    : selectedModel?.split('/').pop() ?? 'Not set';

  return (
    <div className="min-h-dvh flex flex-col bg-[#080812]">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1 as any)} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-bold text-lg">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* AI PROVIDER */}
        <Section title="AI Provider">
          <div className="px-4 pb-4">
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-3 border ${meta.borderClass}`}>
              <span className="text-2xl">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{meta.label}</p>
                <p className={`text-xs ${meta.colorClass}`}>
                  {meta.modelLine(isBedrock ? bedrockModel : selectedModel ?? '')}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleSwitchProvider}
                className="flex items-center gap-1.5 text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Zap size={12} />
                Switch Provider
              </button>
              {isHuggingFace && (
                <>
                  <button onClick={() => navigate('/token-setup')} className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                    {meta.editKeyLabel}
                  </button>
                  <button onClick={() => navigate('/model-selection')} className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                    Change Model
                  </button>
                </>
              )}
              {hasApiKey && !isHuggingFace && (
                <button
                  onClick={() => {
                    localStorage.setItem('pending_provider_setup', provider);
                    navigate(meta.editKeyRoute);
                  }}
                  className="text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {meta.editKeyLabel}
                </button>
              )}
              <button
                onClick={handleTest}
                disabled={testing}
                className="text-xs bg-blue-900/60 border border-blue-700/40 text-blue-300 px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-blue-900/80 transition-colors"
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
            </div>

            {isHuggingFace && <Row label="HF Token" value={maskedToken} />}

            {testResult && (
              <div className={`mt-3 text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                {testResult.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {testResult.success
                  ? `Connected — response in ${testResult.ms ?? 0}ms`
                  : `Failed: ${testResult.error ?? 'Unknown error'}`}
              </div>
            )}
          </div>
        </Section>

        {/* BEDROCK MODEL PICKER */}
        {isBedrock && (
          <Section title="Story Model">
            <div className="px-4 pb-4">
              <p className="text-gray-500 text-xs mb-2">Story generation model — changes take effect immediately</p>
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-800/40">
                <span className="text-purple-300 text-xs">🎙️</span>
                <p className="text-purple-300 text-xs">TTS is handled separately by <span className="font-semibold">Mistral Voxtral</span> using your ABSK key</p>
              </div>
              {BEDROCK_GROUPS.map(group => (
                <div key={group} className="mb-3">
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1.5">{group}</p>
                  <div className="flex flex-col gap-1">
                    {BEDROCK_MODELS.filter(m => m.group === group).map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleBedrockModelChange(m.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${bedrockModel === m.id ? 'bg-amber-900/40 border border-amber-700/60 text-amber-300 font-semibold' : 'bg-gray-900/40 border border-gray-800/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}`}
                      >
                        {m.name}
                        {m.id === 'qwen.qwen3-32b-v1:0' && (
                          <span className="ml-2 text-[10px] text-amber-500 font-normal">recommended</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Story Settings">
          <div className="px-4 pb-4 space-y-4">
            <div>
              <p className="text-gray-400 text-xs mb-2">Bubble Delay</p>
              <div className="flex gap-2">
                {[{ label: 'Slow', val: 600 }, { label: 'Normal', val: 300 }, { label: 'Fast', val: 100 }].map(o => (
                  <button key={o.val} onClick={() => dispatch({ type: 'SET_BUBBLE_DELAY', delay: o.val })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${settings.bubbleDelay === o.val ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-2">Auto-chapter every: <span className="text-white">{settings.autoChapterEvery} scenes</span></p>
              <input type="range" min={1} max={20} step={1} value={settings.autoChapterEvery}
                onChange={e => dispatch({ type: 'SET_AUTO_CHAPTER', every: Number(e.target.value) })}
                className="w-full accent-blue-600" />
            </div>
            {isGrok && (
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3">
                <p className="text-blue-300 text-xs font-semibold mb-1">🚀 Grok Full Context Mode</p>
                <p className="text-gray-400 text-xs">Grok receives ALL chapters, characters, memories, and world state in every prompt — up to 131K tokens. Maximum story coherence, minimum hallucination.</p>
              </div>
            )}
          </div>
        </Section>

        <Section title="Appearance">
          <div className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-gray-400 text-xs mb-2">Theme</p>
              <div className="flex gap-2">
                {(['dark', 'amoled', 'light'] as const).map(t => (
                  <button key={t} onClick={() => dispatch({ type: 'SET_THEME', theme: t })}
                    className={`flex-1 py-2 rounded-lg text-sm capitalize font-medium transition-colors ${settings.theme === t ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-2">Text Size</p>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map(t => (
                  <button key={t} onClick={() => dispatch({ type: 'SET_TEXT_SIZE', size: t })}
                    className={`flex-1 py-2 rounded-lg text-sm capitalize font-medium transition-colors ${settings.textSize === t ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Audio & Immersion">
          <div className="pb-2">
            {([
              { key: 'eden_ambient_enabled',       label: 'Ambient Sounds',        desc: 'Background audio loops for each scene' },
              { key: 'eden_music_enabled',          label: 'Story Music',            desc: 'Dynamic soundtrack based on tension level' },
              { key: 'eden_sfx_enabled',            label: 'Sound Effects',          desc: 'Impact sounds for key story moments' },
              { key: 'eden_char_voices_enabled',    label: 'Character Voices',       desc: 'Consistent TTS voice per character' },
              { key: 'eden_narrator_voice_enabled', label: 'Narrator Voice',         desc: 'Dedicated voice for narrator passages' },
              { key: 'eden_predictive_enabled',     label: 'Predictive Generation',  desc: 'Pre-generates next scene in the background' },
              { key: 'eden_minigames_enabled',      label: 'Minigames',              desc: 'Interactive challenges every ~10 actions' },
              { key: 'eden_env_images_enabled',     label: 'Environment Images',     desc: 'Show location visuals on scene changes' },
            ] as const).map(({ key, label, desc }) => (
              <ImmersionToggle key={key} storageKey={key} label={label} desc={desc} />
            ))}
          </div>
        </Section>

        <Section title="Companion Narrator">
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-800/40">
              <span className="text-purple-300 text-xs">🎙️</span>
              <p className="text-purple-300 text-xs">Powered by <span className="font-semibold">Mistral Voxtral</span> via your ABSK key · Falls back to Microsoft Neural if unavailable</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Enable Narrator</p>
                <p className="text-xs text-gray-500 mt-0.5">Read story bubbles aloud via Mistral Voxtral</p>
              </div>
              <ToggleSwitch checked={narratorSettings.enabled} onChange={v => updateNarrator({ enabled: v })} />
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1.5">Voice</p>
              <select
                value={narratorSettings.voice}
                onChange={e => updateNarrator({ voice: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600"
              >
                {NARRATOR_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1.5">Mode</p>
              <div className="flex gap-2">
                {([
                  { val: 'narrator_only', label: 'Narrator Only' },
                  { val: 'all_dialogue', label: 'All Dialogue' },
                ] as const).map(o => (
                  <button
                    key={o.val}
                    onClick={() => updateNarrator({ mode: o.val })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${narratorSettings.mode === o.val ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-200">Auto-play</p>
                <p className="text-xs text-gray-500 mt-0.5">Speak each bubble as it appears</p>
              </div>
              <ToggleSwitch checked={narratorSettings.autoPlay} onChange={v => updateNarrator({ autoPlay: v })} />
            </div>

            <button
              onClick={handleNarPreview}
              disabled={narPreviewing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Volume2 size={14} />
              {narPreviewing ? 'Playing…' : 'Preview Voice'}
            </button>
          </div>
        </Section>

        <Section title="Account & Cloud Sync">
          <div className="px-4 pb-4">
            {/* User info row */}
            <div className="flex items-center gap-3 py-3">
              {user ? (
                <>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-sm">
                      {user.displayName?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.displayName ?? 'Signed in'}</p>
                    <p className="text-gray-500 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" title="Cloud sync active" />
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">
                    <CloudOff size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-300 text-sm font-medium">Guest Mode</p>
                    <p className="text-gray-500 text-xs">Progress saved locally</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-600 shrink-0" title="Cloud sync off" />
                </>
              )}
            </div>

            {/* Last synced */}
            {lastSyncedAt && (
              <p className="text-gray-600 text-xs mb-3">
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {cloudSyncEnabled ? (
                <>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setSyncing(true);
                      try {
                        const { syncNovelToMongo } = await import('../services/mongoSync');
                        const { getAllNovels } = await import('../database/novelDB');
                        const { getCharactersByNovel } = await import('../database/characterDB');
                        const novels = await getAllNovels();
                        let allOk = true;
                        for (const novel of novels) {
                          const chars = await getCharactersByNovel(novel.id!);
                          const mc = chars.find(c => c.role === 'protagonist');
                          const ok = await syncNovelToMongo(novel.id!, mc?.internal_uid ?? '', {
                            cloudSyncEnabled: true,
                            userId: user.uid,
                          });
                          if (!ok) allOk = false;
                        }
                        if (allOk || novels.length === 0) setLastSyncedAt(Date.now());
                      } catch {}
                      setSyncing(false);
                    }}
                    disabled={syncing}
                    className="flex items-center justify-center gap-2 bg-purple-900/40 border border-purple-700/50 text-purple-300 text-sm font-medium py-2.5 rounded-xl hover:bg-purple-800/50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing…' : 'Sync to Cloud'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      setSyncing(true);
                      try {
                        const { checkMongoConnection } = await import('../services/mongoSync');
                        const ok = await checkMongoConnection();
                        if (ok) setLastSyncedAt(Date.now());
                      } catch {}
                      setSyncing(false);
                    }}
                    disabled={syncing}
                    className="flex items-center justify-center gap-2 bg-gray-800/80 border border-gray-700/50 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-700/80 transition-colors disabled:opacity-50"
                  >
                    <Cloud size={14} />
                    Restore from Cloud
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2 bg-red-900/20 border border-red-800/30 text-red-400 text-sm font-medium py-2.5 rounded-xl hover:bg-red-900/30 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <LogIn size={14} />
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section title="About">
          <Row label="Version" value="Eden Novel v1.0.0" />
          <Row label="Provider" value={`${meta.label} — ${displayModel}`} />
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-800">
      <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-700'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ImmersionToggle({ storageKey, label, desc }: { storageKey: string; label: string; desc: string }) {
  const [enabled, setEnabled] = React.useState(() => localStorage.getItem(storageKey) !== 'false');

  const toggle = (v: boolean) => {
    localStorage.setItem(storageKey, String(v));
    setEnabled(v);
  };

  return (
    <div className="flex items-center justify-between w-full py-3 px-4">
      <div className="flex-1 mr-4 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <div className="flex-shrink-0">
        <ToggleSwitch checked={enabled} onChange={toggle} />
      </div>
    </div>
  );
}
