import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap, Plus, Minus, Trophy } from 'lucide-react';
import SkillCard from '../components/progression/SkillCard';
import { GENRE_STATS } from '../core/genreStats';
import { spendStatPoints, applyBonusChoice } from '../services/progressionService';
import type { LevelUpResult } from '../services/progressionService';

interface Props {
  result: LevelUpResult;
  novelId: number;
  mcUid: string;
  genre: string;
  onDone: () => void;
}

function Particle({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ left: x, top: y, backgroundColor: color }}
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 0, opacity: 0, y: -80 + Math.random() * 40, x: (Math.random() - 0.5) * 80 }}
      transition={{ duration: 1.2, ease: 'easeOut', delay: Math.random() * 0.3 }}
    />
  );
}

export default function LevelUpOverlay({ result, novelId, mcUid, genre, onDone }: Props) {
  const statKeys = GENRE_STATS[genre] ?? GENRE_STATS.fantasy;
  const [allocations, setAllocations] = useState<Record<string, number>>(() =>
    Object.fromEntries(statKeys.map(k => [k, 0]))
  );
  const [selectedBonus, setSelectedBonus] = useState<number | null>(null);
  const [bonusSkipped, setBonusSkipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 320,
      y: Math.random() * 200,
      color: ['#fbbf24', '#a855f7', '#3b82f6', '#10b981'][Math.floor(Math.random() * 4)],
    }))
  );

  const totalSpent = Object.values(allocations).reduce((a, b) => a + b, 0);
  const remaining = result.unspentPoints - totalSpent;

  const adjust = (key: string, delta: number) => {
    const cur = allocations[key] ?? 0;
    const next = Math.max(0, cur + delta);
    if (delta > 0 && remaining <= 0) return;
    setAllocations(prev => ({ ...prev, [key]: next }));
  };

  const bonusOptions = result.bonusChoices && result.bonusChoices.length > 0
    ? result.bonusChoices.map(label => ({ label, desc: `Gain +3 to ${label.replace('Increase ', '')}` }))
    : [
        { label: '⚡ Bonus Stat Point ×2', desc: 'Double the stat gains from this level' },
        { label: '✦ All stats +3', desc: 'Boost every stat by 3 points immediately' },
        { label: '⭐ Skill Rarity Upgrade', desc: 'Your newest skill rises in rarity' },
      ];

  const canConfirm = remaining <= 0 && (selectedBonus !== null || bonusSkipped);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      if (totalSpent > 0) await spendStatPoints(novelId, mcUid, allocations);
      if (selectedBonus !== null) {
        await applyBonusChoice(novelId, mcUid, bonusOptions[selectedBonus].label, genre);
      }
    } catch {}
    setSaving(false);
    onDone();
  };

  const isRankUp = result.oldRank !== result.newRank;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/97" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => <Particle key={p.id} x={p.x} y={p.y} color={p.color} />)}
      </div>

      <div className="relative w-full max-w-sm mx-auto px-4 overflow-y-auto max-h-dvh py-6 no-scrollbar">
        <motion.div
          initial={{ scale: 0.5, y: -30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="text-center mb-5"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Zap size={26} className="text-yellow-400" />
            <h1 className="text-4xl font-black text-yellow-400 tracking-tight drop-shadow-lg">LEVEL UP!</h1>
            <Zap size={26} className="text-yellow-400" />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2"
          >
            <span className="text-gray-400 text-sm font-semibold">Lv.{result.oldLevel}</span>
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="h-px bg-gradient-to-r from-gray-600 to-yellow-500 inline-block"
            />
            <span className="text-yellow-300 text-xl font-black">Lv.{result.newLevel}</span>
          </motion.div>

          {isRankUp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-2 inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl px-3 py-1.5"
            >
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-yellow-300 font-bold text-sm">Rank Up! {result.oldRank} → {result.newRank}</span>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full h-px bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent mb-5"
        />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-5"
        >
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Stats Gained This Level</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(result.statsGained).map(([k, v], i) => (
              <motion.div
                key={k}
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                className="flex items-center gap-1.5 bg-green-900/20 border border-green-900/30 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-green-400 font-bold text-sm">+{v}</span>
                <span className="text-gray-400 text-xs truncate">{k}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {result.newSkill && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-5"
          >
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">⭐ Skill Unlocked</p>
            <SkillCard
              name={result.newSkill.name}
              description={result.newSkill.description}
              rarity={result.newSkill.rarity}
              evolutionHint={result.newSkill.evolutionHint}
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mb-5"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Allocate Points</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${remaining > 0 ? 'bg-yellow-900/30 text-yellow-300' : 'bg-green-900/30 text-green-400'}`}>
              {remaining} remaining
            </span>
          </div>
          <div className="space-y-2">
            {statKeys.map(k => (
              <div key={k} className="flex items-center gap-2 bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2">
                <span className="text-gray-300 text-xs flex-1 truncate">{k}</span>
                <button
                  onClick={() => adjust(k, -1)}
                  disabled={(allocations[k] ?? 0) <= 0}
                  className="w-7 h-7 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Minus size={12} className="text-white" />
                </button>
                <span className="text-white text-sm w-5 text-center font-bold">{allocations[k] ?? 0}</span>
                <button
                  onClick={() => adjust(k, 1)}
                  disabled={remaining <= 0}
                  className="w-7 h-7 bg-indigo-800 hover:bg-indigo-700 disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Plus size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider">── Choose Your Bonus ──</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {bonusOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => { setSelectedBonus(i); setBonusSkipped(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left text-sm transition-all border ${selectedBonus === i ? 'border-yellow-500/60 bg-yellow-900/25 text-yellow-200' : 'border-gray-700 bg-gray-900/60 text-gray-400 hover:border-gray-600 hover:text-gray-300'}`}
              >
                <div className="font-semibold mb-0.5">{opt.label}</div>
                <div className="text-xs opacity-60">{opt.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setBonusSkipped(true); setSelectedBonus(null); }}
            className="mt-2 text-xs text-gray-500 hover:text-gray-400 underline"
          >
            Skip bonus
          </button>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          onClick={handleConfirm}
          disabled={!canConfirm || saving}
          className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 disabled:opacity-40 text-black font-black rounded-xl text-lg transition-all shadow-xl shadow-yellow-900/30"
        >
          {saving ? 'Saving…' : '✓ CONFIRM LEVEL UP'}
        </motion.button>

        {!canConfirm && (
          <p className="text-center text-xs text-gray-600 mt-2">
            {remaining > 0 ? `Allocate all ${remaining} stat points` : 'Select a bonus or skip to continue'}
          </p>
        )}
      </div>
    </motion.div>
  );
}
