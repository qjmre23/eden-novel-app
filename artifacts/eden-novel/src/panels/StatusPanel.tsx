import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ChevronDown, ChevronUp, Zap, Check, X } from 'lucide-react';
import AnimatedPanel from '../components/common/AnimatedPanel';
import RankBadge from '../components/progression/RankBadge';
import SkillCard from '../components/progression/SkillCard';
import { useProgression } from '../context/ProgressionContext';
import { GENRE_STARTING_SKILLS } from '../core/genreStartingSkills';
import { parseJsonSafe } from '../core/utils';
import { spendStatPoints } from '../services/progressionService';

interface Props {
  open: boolean;
  onClose: () => void;
  genre: string;
  novelId: number;
  mcUid: string;
  onOpenSkillTree: () => void;
}

const BAR_COLOR = '#6366f1'; // indigo
const CUSTOM_COLOR = '#f59e0b'; // amber

function SkillStatRow({
  icon,
  name,
  description,
  value,
  pending,
  unspentLeft,
  onAdd,
  onRemove,
  isCustom,
}: {
  icon: string;
  name: string;
  description: string;
  value: number;
  pending: number;
  unspentLeft: number;
  onAdd: () => void;
  onRemove: () => void;
  isCustom?: boolean;
}) {
  const total = value + pending;
  const pct = Math.min(100, (total / 30) * 100);
  const barColor = isCustom ? CUSTOM_COLOR : BAR_COLOR;
  const canAdd = unspentLeft > 0 && total < 30;
  const canRemove = pending > 0;

  return (
    <div className="py-3 border-b border-gray-800/50 last:border-0">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-gray-800/80 flex items-center justify-center text-base shrink-0 mt-0.5">
          {icon}
        </div>

        {/* Name + Description + Bar */}
        <div className="flex-1 min-w-0">
          {/* Name row with inline +/- controls */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-white text-sm font-semibold leading-tight">{name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {isCustom && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-800/40 rounded-full px-1.5 py-0.5 mr-1">
                  Custom
                </span>
              )}
              <button
                onClick={onRemove}
                disabled={!canRemove}
                className="w-6 h-6 bg-gray-800 hover:bg-gray-700 disabled:opacity-20 rounded-md flex items-center justify-center transition-colors"
              >
                <Minus size={9} className="text-white" />
              </button>
              <span className="text-white text-sm font-bold w-7 text-center tabular-nums">
                {pending > 0 ? <span className="text-indigo-300">{total}</span> : total}
              </span>
              <button
                onClick={onAdd}
                disabled={!canAdd}
                className="w-6 h-6 bg-gray-800 hover:bg-indigo-800 disabled:opacity-20 rounded-md flex items-center justify-center transition-colors"
              >
                <Plus size={9} className="text-white" />
              </button>
            </div>
          </div>

          <p className="text-gray-500 text-xs leading-snug mb-1.5">{description}</p>

          {/* Progress bar */}
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatusPanel({ open, onClose, genre, novelId, mcUid, onOpenSkillTree }: Props) {
  const { progression, skills, reload } = useProgression();
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSkillName, setCustomSkillName] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  if (!progression) return null;

  const stats = parseJsonSafe<Record<string, number>>(progression.stats_json, {});
  const genreSkills = GENRE_STARTING_SKILLS[genre] ?? GENRE_STARTING_SKILLS.fantasy ?? [];
  const genreSkillNames = new Set(genreSkills.map(s => s.name));

  // Custom skills: any stat in stats_json that isn't in the genre list
  const customStatKeys = Object.keys(stats).filter(k => !genreSkillNames.has(k));

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const unspentTotal = progression.unspent_points ?? 0;
  const pointsLeft = unspentTotal - totalAllocated;

  const adjust = (key: string, delta: number) => {
    const cur = allocations[key] ?? 0;
    const next = cur + delta;
    if (next < 0) return;
    if (delta > 0 && pointsLeft <= 0) return;
    const curVal = stats[key] ?? 0;
    if ((curVal + next) > 30) return;
    setAllocations(prev => ({ ...prev, [key]: next }));
  };

  const handleSave = async () => {
    if (totalAllocated === 0) return;
    setSaving(true);
    try {
      await spendStatPoints(novelId, mcUid, allocations);
      setAllocations({});
      await reload(novelId, mcUid);
    } catch {}
    setSaving(false);
  };

  const handleAddCustomSkill = async () => {
    const name = customSkillName.trim();
    if (!name || genreSkillNames.has(name)) return;
    setAddingCustom(true);
    try {
      // Register the custom skill at 0 (no points spent)
      await spendStatPoints(novelId, mcUid, { [name]: 0 });
      await reload(novelId, mcUid);
      setCustomSkillName('');
      setShowCustomInput(false);
    } catch {}
    setAddingCustom(false);
  };

  const displaySkills = showAllSkills ? skills : skills.slice(0, 4);

  return (
    <AnimatedPanel open={open} onClose={onClose} title="Status">
      <div className="px-4 py-4 space-y-5 eden-scrollbar overflow-y-auto max-h-[80vh]">

        {/* ── Rank + Unspent Points ──────────────────────────── */}
        <div className="flex items-center justify-between">
          <RankBadge rank={progression.rank} level={progression.level} />
          {pointsLeft > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 bg-yellow-900/30 border border-yellow-700/40 px-3 py-1.5 rounded-xl"
            >
              <Zap size={12} className="text-yellow-400" />
              <span className="text-yellow-300 text-xs font-bold">{pointsLeft} pts to allocate</span>
            </motion.div>
          )}
        </div>

        {/* ── Genre Skill Stats ─────────────────────────────── */}
        <div>
          <p className="text-gray-600 text-[11px] uppercase tracking-widest font-semibold mb-1">
            {genre.replace(/_/g, ' ')} skills
          </p>
          <div className="bg-gray-900/60 border border-gray-800/60 rounded-2xl px-3 overflow-hidden">
            {genreSkills.map(skill => (
              <SkillStatRow
                key={skill.name}
                icon={skill.icon}
                name={skill.name}
                description={skill.description}
                value={stats[skill.name] ?? 0}
                pending={allocations[skill.name] ?? 0}
                unspentLeft={pointsLeft}
                onAdd={() => adjust(skill.name, 1)}
                onRemove={() => adjust(skill.name, -1)}
              />
            ))}
          </div>
        </div>

        {/* ── Custom Stats ─────────────────────────────────── */}
        {customStatKeys.length > 0 && (
          <div>
            <p className="text-gray-600 text-[11px] uppercase tracking-widest font-semibold mb-1">
              Custom skills
            </p>
            <div className="bg-gray-900/60 border border-amber-900/30 rounded-2xl px-3 overflow-hidden">
              {customStatKeys.map(key => (
                <SkillStatRow
                  key={key}
                  icon="⭐"
                  name={key}
                  description="Player-added custom skill"
                  value={stats[key] ?? 0}
                  pending={allocations[key] ?? 0}
                  unspentLeft={pointsLeft}
                  onAdd={() => adjust(key, 1)}
                  onRemove={() => adjust(key, -1)}
                  isCustom
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Add Custom Skill ─────────────────────────────── */}
        <AnimatePresence>
          {showCustomInput ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customSkillName}
                onChange={e => setCustomSkillName(e.target.value)}
                placeholder="e.g. Sniping, Lock-picking, Healing…"
                autoFocus
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-600/60 transition-colors"
                onKeyDown={e => { if (e.key === 'Enter') handleAddCustomSkill(); if (e.key === 'Escape') setShowCustomInput(false); }}
              />
              <button
                onClick={handleAddCustomSkill}
                disabled={!customSkillName.trim() || addingCustom}
                className="w-9 h-9 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                {addingCustom ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} className="text-white" />}
              </button>
              <button
                onClick={() => { setShowCustomInput(false); setCustomSkillName(''); }}
                className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowCustomInput(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-700 hover:border-amber-700/60 hover:bg-amber-900/10 text-gray-500 hover:text-amber-400 text-sm transition-all"
            >
              <Plus size={14} />
              Add a custom skill
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Save Allocation ──────────────────────────────── */}
        <AnimatePresence>
          {totalAllocated > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : `Apply ${totalAllocated} point${totalAllocated !== 1 ? 's' : ''} →`}
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Unlocked Skills from leveling ────────────────── */}
        {skills.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-[11px] uppercase tracking-widest font-semibold">
                Unlocked Abilities ({skills.length})
              </p>
              <button
                onClick={onOpenSkillTree}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                Skill Tree →
              </button>
            </div>
            <div className="space-y-2">
              {displaySkills.map(s => (
                <SkillCard
                  key={s.id}
                  name={s.skill_name}
                  description={s.skill_description}
                  rarity={s.rarity}
                  compact
                />
              ))}
            </div>
            {skills.length > 4 && (
              <button
                onClick={() => setShowAllSkills(!showAllSkills)}
                className="w-full mt-2 py-2 text-gray-600 text-xs hover:text-gray-400 flex items-center justify-center gap-1 transition-colors"
              >
                {showAllSkills
                  ? <><ChevronUp size={12} /> Show less</>
                  : <><ChevronDown size={12} /> +{skills.length - 4} more abilities</>
                }
              </button>
            )}
          </div>
        )}

        {/* Empty state when no skills yet */}
        {skills.length === 0 && (
          <div
            onClick={onOpenSkillTree}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-dashed border-gray-800 text-gray-600 hover:border-indigo-800/50 hover:text-indigo-400 cursor-pointer transition-all text-sm"
          >
            <span>Unlocked abilities will appear here</span>
            <span className="text-xs">Skill Tree →</span>
          </div>
        )}

      </div>
    </AnimatedPanel>
  );
}
