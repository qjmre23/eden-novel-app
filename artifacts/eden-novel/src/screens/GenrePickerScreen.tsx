import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronDown, Plus, Minus, Trash2 } from 'lucide-react';
import { GENRES } from '../core/constants';
import { startNewNovel } from '../services/novelService';
import { useStory } from '../context/StoryContext';
import { presetManager } from '../services/presetManager';
import { GENRE_STARTING_SKILLS, MC_TRAITS, INITIAL_SKILL_POINTS, MAX_SKILL_VALUE } from '../core/genreStartingSkills';
import { GENRE_STARTING_LOCATIONS } from '../core/genreStartingLocations';
import type { MCTraits, StartingSkillAllocation } from '../core/genreStartingSkills';

type Step = 'genre' | 'setup' | 'traits' | 'skills';

const TRAIT_LABELS: Record<keyof MCTraits, string> = {
  personality: 'Personality',
  attitude: 'Attitude & Speech',
  riskTolerance: 'Risk Tolerance',
  altruism: 'Willingness to Help Others',
};

function TraitDropdown({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white/3 border border-white/8 hover:border-white/15 rounded-xl px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:border-indigo-500/50 transition-all"
      >
        <span className={value ? 'text-white text-sm' : 'text-gray-700 text-sm'}>
          {value || 'Select…'}
        </span>
        <ChevronDown size={15} className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d0d1e] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto"
          >
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-500/10 ${value === opt ? 'text-indigo-300 bg-indigo-500/8' : 'text-gray-400'}`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Shared header for setup/traits/skills steps */
function StepHeader({ onBack, icon, title, subtitle }: {
  onBack: () => void; icon?: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 safe-top">
      <button onClick={onBack} className="w-8 h-8 rounded-xl bg-white/4 border border-white/6 hover:bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-all">
        <ArrowLeft size={16} />
      </button>
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <h1 className="text-white font-bold text-base leading-tight">{title}</h1>
        <p className="text-gray-600 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

/* Step progress dots */
function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pt-4">
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${n <= current ? 'bg-indigo-500' : 'bg-white/8'}`}
        />
      ))}
    </div>
  );
}

export default function GenrePickerScreen() {
  const [, navigate] = useLocation();
  const { dispatch } = useStory();
  const [step, setStep] = useState<Step>('genre');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [title, setTitle] = useState('');
  const [mcName, setMcName] = useState('');
  const [worldName, setWorldName] = useState('');
  const [storySeed, setStorySeed] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [customLocationMode, setCustomLocationMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [traits, setTraits] = useState<MCTraits>({
    personality: '', attitude: '', riskTolerance: '', altruism: '',
  });

  const genre = GENRES.find(g => g.id === selectedGenre);
  const genreSkillDefs = GENRE_STARTING_SKILLS[selectedGenre] ?? [];

  const [skillAllocations, setSkillAllocations] = useState<StartingSkillAllocation[]>([]);
  const [customSkillName, setCustomSkillName] = useState('');

  const totalAllocated = skillAllocations.reduce((s, sk) => s + sk.value, 0);
  const pointsLeft = INITIAL_SKILL_POINTS - totalAllocated;

  const initSkills = (genreId: string) => {
    const defs = GENRE_STARTING_SKILLS[genreId] ?? [];
    setSkillAllocations(defs.map(d => ({ name: d.name, value: 0 })));
  };

  const adjustSkill = (name: string, delta: number) => {
    setSkillAllocations(prev => prev.map(sk => {
      if (sk.name !== name) return sk;
      const next = sk.value + delta;
      if (next < 0 || next > MAX_SKILL_VALUE) return sk;
      if (delta > 0 && pointsLeft <= 0) return sk;
      return { ...sk, value: next };
    }));
  };

  const addCustomSkill = () => {
    const name = customSkillName.trim();
    if (!name || skillAllocations.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    setSkillAllocations(prev => [...prev, { name, value: 0, isCustom: true }]);
    setCustomSkillName('');
  };

  const removeCustomSkill = (name: string) => {
    setSkillAllocations(prev => prev.filter(s => s.name !== name));
  };

  const handleCreate = async () => {
    if (!selectedGenre || !title || !mcName) return;
    setLoading(true);
    try {
      await presetManager.loadAll();
      const { novelId, mcUid, timelineId } = await startNewNovel({
        title, genre: selectedGenre, mcName,
        worldName: worldName || `The World of ${title}`,
        storySeed: storySeed || `A ${genre?.name} story about ${mcName}`,
        startingLocation: startingLocation || undefined,
        mcTraits: traits,
        startingSkills: skillAllocations.filter(s => s.value > 0),
      });
      dispatch({ type: 'SET_NOVEL', novelId, mcUid, genre: selectedGenre, timelineId: timelineId ?? 'main' });
      navigate(`/story/${novelId}`);
    } catch (e) {
      alert('Failed to create novel: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /* ── GENRE SELECTION ── */
  if (step === 'genre') {
    return (
      <div className="min-h-dvh flex flex-col bg-[#04040e] relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-indigo-900/15 blur-[90px]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 safe-top">
          <button
            onClick={() => navigate('/novels')}
            className="w-8 h-8 rounded-xl bg-white/4 border border-white/6 hover:bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-white font-black text-lg tracking-tight">Choose Your Genre</h1>
            <p className="text-gray-700 text-xs">The world your story will take place in</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {GENRES.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setSelectedGenre(g.id);
                  initSkills(g.id);
                  setStep('setup');
                }}
                className="rounded-2xl border border-white/5 p-4 text-left hover:border-white/12 transition-all group relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${g.color}22, rgba(8,8,18,0.95))` }}
              >
                {/* Genre color glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(ellipse at 0% 0%, ${g.color}18 0%, transparent 60%)` }}
                />
                <div className="text-3xl mb-2.5 relative">{g.icon}</div>
                <p className="text-white font-bold text-sm leading-tight relative">{g.name}</p>
                <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed relative">{g.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── BASIC SETUP ── */
  if (step === 'setup') {
    return (
      <div className="min-h-dvh flex flex-col bg-[#04040e]">
        <StepHeader
          onBack={() => setStep('genre')}
          icon={genre?.icon}
          title={genre?.name ?? ''}
          subtitle="Step 1 of 3 — Story details"
        />
        <StepDots current={1} />

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 no-scrollbar">
          {[
            { label: 'Novel Title', placeholder: 'e.g. Rise of the Last Survivor', value: title, onChange: setTitle, required: true },
            { label: "Your Character's Name", placeholder: 'e.g. Kai, Elena, Marcus…', value: mcName, onChange: setMcName, required: true },
            { label: 'World Name', placeholder: 'Auto-generated if empty', value: worldName, onChange: setWorldName, required: false },
          ].map(({ label, placeholder, value, onChange, required }) => (
            <div key={label}>
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
                {label} {required ? <span className="text-indigo-500/70">*</span> : <span className="text-gray-700 normal-case font-normal">(optional)</span>}
              </label>
              <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/3 border border-white/8 hover:border-white/14 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-700 text-sm focus:outline-none transition-all"
              />
            </div>
          ))}

          {/* Starting Location */}
          <div>
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">
              Starting Location <span className="text-gray-700 normal-case font-normal">(optional)</span>
            </label>
            <p className="text-gray-700 text-xs mb-2">Where does your story open? The AI anchors the first scene here.</p>
            {!customLocationMode ? (
              <div className="relative">
                <button
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                  className="w-full bg-white/3 border border-white/8 hover:border-white/14 rounded-xl px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:border-indigo-500/50 transition-all"
                >
                  <span className={startingLocation ? 'text-white text-sm' : 'text-gray-700 text-sm'}>
                    {startingLocation || 'Select a starting location…'}
                  </span>
                  <ChevronDown size={15} className={`text-gray-600 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {locationDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0d0d1e] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto"
                    >
                      <button
                        onClick={() => { setStartingLocation(''); setLocationDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-white/4 transition-colors border-b border-white/5"
                      >
                        — No preference (AI decides)
                      </button>
                      {(GENRE_STARTING_LOCATIONS[selectedGenre] ?? []).map(loc => (
                        <button
                          key={loc}
                          onClick={() => { setStartingLocation(loc); setLocationDropdownOpen(false); setCustomLocationMode(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-500/10 ${startingLocation === loc ? 'text-indigo-300 bg-indigo-500/8' : 'text-gray-400'}`}
                        >
                          {loc}
                        </button>
                      ))}
                      <button
                        onClick={() => { setLocationDropdownOpen(false); setCustomLocationMode(true); setStartingLocation(''); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors border-t border-white/5 font-medium"
                      >
                        ✏️ Or type your own…
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={startingLocation}
                  onChange={e => setStartingLocation(e.target.value)}
                  placeholder="e.g. A crumbling cathedral at the edge of the city…"
                  className="flex-1 bg-white/3 border border-white/8 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-700 text-sm focus:outline-none transition-all"
                />
                <button
                  onClick={() => { setCustomLocationMode(false); setStartingLocation(''); }}
                  className="px-3 py-2 bg-white/4 hover:bg-white/8 text-gray-500 text-xs rounded-xl border border-white/6 transition-all"
                >
                  ↩
                </button>
              </div>
            )}
          </div>

          {/* Story Seed */}
          <div>
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">
              Story Seed / Hook <span className="text-gray-700 normal-case font-normal">(optional)</span>
            </label>
            <p className="text-gray-700 text-xs mb-2">A backstory twist or opening scenario. The AI uses this as a starting point.</p>
            <textarea
              value={storySeed}
              onChange={e => setStorySeed(e.target.value)}
              placeholder="e.g. You wake up in a military facility with no memory. The last thing you remember is your sister's face before the outbreak…"
              rows={4}
              className="w-full bg-white/3 border border-white/8 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-700 text-sm focus:outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="px-4 py-4 border-t border-white/5 safe-bottom">
          <button
            onClick={() => setStep('traits')}
            disabled={!title || !mcName}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 disabled:opacity-25 disabled:cursor-not-allowed text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30"
          >
            Next: Character Traits <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  /* ── MC TRAITS ── */
  if (step === 'traits') {
    return (
      <div className="min-h-dvh flex flex-col bg-[#04040e]">
        <StepHeader
          onBack={() => setStep('setup')}
          title="Character Traits"
          subtitle="Step 2 of 3 — optional but recommended"
        />
        <StepDots current={2} />

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 no-scrollbar">
          <div className="bg-indigo-500/6 border border-indigo-500/15 rounded-xl px-4 py-3">
            <p className="text-indigo-300/70 text-xs leading-relaxed">These traits shape how the AI portrays your MC's voice, reactions, and decision-making throughout the story. You can always override with your own choices.</p>
          </div>

          {(Object.keys(TRAIT_LABELS) as (keyof MCTraits)[]).map(key => (
            <div key={key}>
              <TraitDropdown
                label={TRAIT_LABELS[key]}
                options={MC_TRAITS[key]}
                value={traits[key]}
                onChange={v => setTraits(prev => ({ ...prev, [key]: v }))}
              />
              {traits[key] === '' && (
                <input
                  className="w-full mt-2 bg-white/3 border border-white/6 rounded-xl px-4 py-2.5 text-white placeholder-gray-700 text-xs focus:outline-none focus:border-indigo-500/40 transition-all"
                  placeholder={`Or type a custom ${TRAIT_LABELS[key].toLowerCase()}…`}
                  onBlur={e => { if (e.target.value.trim()) setTraits(prev => ({ ...prev, [key]: e.target.value.trim() })); }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="px-4 py-4 border-t border-white/5 safe-bottom space-y-2">
          <button
            onClick={() => setStep('skills')}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30"
          >
            Next: Allocate Starting Skills <ArrowRight size={18} />
          </button>
          <button
            onClick={() => setStep('skills')}
            className="w-full text-gray-600 text-sm text-center py-2 hover:text-gray-500 transition-colors"
          >
            Skip traits
          </button>
        </div>
      </div>
    );
  }

  /* ── SKILLS ── */
  return (
    <div className="min-h-dvh flex flex-col bg-[#04040e]">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 safe-top">
        <button
          onClick={() => setStep('traits')}
          className="w-8 h-8 rounded-xl bg-white/4 border border-white/6 hover:bg-white/8 flex items-center justify-center text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-base leading-tight">Starting Skills</h1>
          <p className="text-gray-600 text-xs">Step 3 of 3 — optional</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
          pointsLeft > 0
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        }`}>
          {pointsLeft} pts left
        </div>
      </div>
      <StepDots current={3} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        <div className="bg-white/2 border border-white/6 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs leading-relaxed">
            You have <span className="text-amber-400 font-bold">{INITIAL_SKILL_POINTS} points</span> to distribute.
            Max <span className="text-orange-400 font-bold">{MAX_SKILL_VALUE}</span> per skill.
            These shape your MC's early strengths.
          </p>
        </div>

        {skillAllocations.map((sk) => {
          const def = genreSkillDefs.find(d => d.name === sk.name);
          return (
            <div key={sk.name} className="bg-white/2 border border-white/6 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  {def && <span className="text-xl">{def.icon}</span>}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-semibold text-sm">{sk.name}</p>
                      {sk.isCustom && (
                        <span className="text-[10px] bg-violet-500/15 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full">custom</span>
                      )}
                    </div>
                    {def && <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{def.description}</p>}
                  </div>
                </div>
                {sk.isCustom && (
                  <button onClick={() => removeCustomSkill(sk.name)} className="text-gray-700 hover:text-red-500 transition-colors mt-0.5">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustSkill(sk.name, -1)}
                  disabled={sk.value <= 0}
                  className="w-8 h-8 bg-white/4 hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg border border-white/6 flex items-center justify-center transition-all"
                >
                  <Minus size={13} className="text-white" />
                </button>
                <div className="flex-1 bg-white/4 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    animate={{ width: `${(sk.value / MAX_SKILL_VALUE) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
                <button
                  onClick={() => adjustSkill(sk.name, 1)}
                  disabled={pointsLeft <= 0 || sk.value >= MAX_SKILL_VALUE}
                  className="w-8 h-8 bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg border border-indigo-500/20 flex items-center justify-center transition-all"
                >
                  <Plus size={13} className="text-indigo-300" />
                </button>
                <span className="text-white font-bold text-sm w-5 text-center tabular-nums">{sk.value}</span>
              </div>
            </div>
          );
        })}

        {/* Add Custom Skill */}
        <div className="border border-dashed border-white/8 rounded-xl p-4">
          <p className="text-gray-700 text-xs mb-3">Add a custom skill not on the list</p>
          <div className="flex gap-2">
            <input
              value={customSkillName}
              onChange={e => setCustomSkillName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomSkill()}
              placeholder="e.g. Sniping, Lock-picking, Healing…"
              className="flex-1 bg-white/3 border border-white/8 focus:border-indigo-500/40 rounded-xl px-3 py-2.5 text-white placeholder-gray-700 text-sm focus:outline-none transition-all"
            />
            <button
              onClick={addCustomSkill}
              disabled={!customSkillName.trim()}
              className="w-10 h-10 bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-20 disabled:cursor-not-allowed rounded-xl border border-indigo-500/20 flex items-center justify-center transition-all"
            >
              <Plus size={17} className="text-indigo-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-white/5 safe-bottom space-y-2">
        <button
          onClick={handleCreate}
          disabled={!title || !mcName || loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 disabled:opacity-25 disabled:cursor-not-allowed text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>✦ Begin Story <ArrowRight size={18} /></>
          )}
        </button>
        <button
          onClick={handleCreate}
          disabled={!title || !mcName || loading}
          className="w-full text-gray-600 text-xs text-center py-2 hover:text-gray-500 transition-colors"
        >
          Skip skills and begin
        </button>
      </div>
    </div>
  );
}
