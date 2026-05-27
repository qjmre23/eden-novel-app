import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Star, Flame, Shield, Lock, HelpCircle } from 'lucide-react';
import type { SkillRegistry } from '../database/db';
import { GENRE_SKILL_PATHS } from '../core/genreSkillPaths';

interface Props {
  open: boolean;
  onClose: () => void;
  skills: SkillRegistry[];
  genre?: string;
}

const RARITY_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; glow: string; icon: React.ReactNode }> = {
  legendary: {
    label: 'Legendary', color: '#fbbf24', border: 'border-yellow-500/60', bg: 'bg-yellow-900/20', glow: 'shadow-yellow-500/30', icon: <Star size={14} className="text-yellow-400" />,
  },
  epic: {
    label: 'Epic', color: '#a855f7', border: 'border-purple-500/60', bg: 'bg-purple-900/20', glow: 'shadow-purple-500/30', icon: <Zap size={14} className="text-purple-400" />,
  },
  rare: {
    label: 'Rare', color: '#3b82f6', border: 'border-blue-500/50', bg: 'bg-blue-900/15', glow: 'shadow-blue-500/20', icon: <Shield size={14} className="text-blue-400" />,
  },
  common: {
    label: 'Common', color: '#6b7280', border: 'border-gray-600/50', bg: 'bg-gray-800/40', glow: '', icon: <Flame size={14} className="text-gray-400" />,
  },
};

type NodeState = 'unlocked' | 'locked' | 'hidden';

interface SkillNodeData {
  id?: number;
  name: string;
  description: string;
  rarity: string;
  evolutionHint?: string;
  state: NodeState;
  pathName: string;
  requiredLevel?: number;
}

function PathColumn({
  pathName,
  nodes,
  onNodeTap,
}: {
  pathName: string;
  nodes: SkillNodeData[];
  onNodeTap: (node: SkillNodeData) => void;
}) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center min-w-[200px] px-2">
      <h3 className="text-white font-bold text-sm mb-4 text-center sticky top-0 bg-black/80 py-1 z-10">{pathName}</h3>

      {nodes.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-8">No skills unlocked in this path yet.</p>
      ) : (
        <div className="flex flex-col items-center gap-1">
          {nodes.map((node, i) => {
            const isExpanded = expandedNode === node.name;
            const cfg = RARITY_CONFIG[node.rarity] ?? RARITY_CONFIG.common;

            return (
              <React.Fragment key={node.name + i}>
                {/* Connector line */}
                {i > 0 && (
                  <div className="w-0.5 h-6 bg-gray-800" />
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    if (node.state === 'hidden') return;
                    if (node.state === 'unlocked') {
                      setExpandedNode(isExpanded ? null : node.name);
                      onNodeTap(node);
                    }
                  }}
                  className={`w-full rounded-xl border p-3 cursor-pointer transition-all ${
                    node.state === 'unlocked'
                      ? `${cfg.border} ${cfg.bg} shadow-lg ${cfg.glow}`
                      : node.state === 'locked'
                      ? 'border-gray-700 bg-gray-900/30 opacity-60'
                      : 'border-gray-800 bg-gray-950/50 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                      style={
                        node.state === 'unlocked'
                          ? { borderColor: cfg.color + '40', background: cfg.color + '15' }
                          : { borderColor: '#333', background: '#1a1a1a' }
                      }
                    >
                      {node.state === 'unlocked' ? cfg.icon : node.state === 'locked' ? <Lock size={12} className="text-gray-500" /> : <HelpCircle size={12} className="text-gray-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${node.state === 'hidden' ? 'text-gray-600' : 'text-white'}`}>
                        {node.state === 'hidden' ? '???' : node.name}
                      </p>
                      {node.state === 'unlocked' && (
                        <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      )}
                      {node.state === 'locked' && (
                        <span className="text-xs text-gray-500">Requires Lv.{node.requiredLevel ?? '?'}</span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && node.state === 'unlocked' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-1">
                          <p className="text-gray-400 text-xs">{node.description}</p>
                          {node.evolutionHint && (
                            <p className="text-xs italic" style={{ color: cfg.color + 'cc' }}>✦ {node.evolutionHint}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SkillTreeOverlay({ open, onClose, skills, genre = 'fantasy' }: Props) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 });

  const paths = GENRE_SKILL_PATHS[genre] ?? ['General Path'];

  // Group skills by path
  const skillsByPath: Record<string, SkillNodeData[]> = {};
  for (const p of paths) skillsByPath[p] = [];

  for (const skill of skills) {
    let path = 'General Path';
    try {
      const effects = JSON.parse(skill.skill_effects_json || '{}');
      if (effects.path && paths.includes(effects.path)) path = effects.path;
      else path = paths[0];
    } catch {
      path = paths[skill.id ? (skill.id % paths.length) : 0] ?? paths[0];
    }

    if (!skillsByPath[path]) skillsByPath[path] = [];
    skillsByPath[path].push({
      id: skill.id,
      name: skill.skill_name,
      description: skill.skill_description,
      rarity: skill.rarity,
      evolutionHint: skill.evolution_hint,
      state: 'unlocked',
      pathName: path,
    });
  }

  // Add locked/hidden placeholder nodes to fill out the tree visually
  for (const path of paths) {
    const unlocked = skillsByPath[path]?.length ?? 0;
    const targetNodes = Math.max(5, unlocked + 3);
    for (let i = unlocked; i < targetNodes; i++) {
      skillsByPath[path].push({
        name: `Hidden-${path}-${i}`,
        description: '',
        rarity: 'common',
        state: i === unlocked ? 'locked' : 'hidden',
        pathName: path,
        requiredLevel: (i + 1) * 3,
      });
    }
  }

  const activePaths = activePath ? [activePath] : paths;

  const handlePinchStart = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const touches = Array.from(e.currentTarget.getElementsByTagName('*')).flatMap(() => []); // simplified
    // For true pinch we'd need 2 pointers; simplified: use wheel for desktop, gesture for mobile
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(1.5, Math.max(0.6, prev + delta)));
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9000] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/96" onClick={onClose} />
          <div className="relative flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 shrink-0">
              <div>
                <h2 className="text-white font-bold text-xl">Skill Tree</h2>
                <p className="text-gray-500 text-xs">{skills.length} skill{skills.length !== 1 ? 's' : ''} unlocked</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Path tabs */}
            <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={() => setActivePath(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!activePath ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                All Paths
              </button>
              {paths.map(p => {
                const count = skillsByPath[p]?.filter(n => n.state === 'unlocked').length ?? 0;
                return (
                  <button
                    key={p}
                    onClick={() => setActivePath(activePath === p ? null : p)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${activePath === p ? 'bg-blue-900/30 text-blue-300 border-blue-700/50' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                  >
                    {p} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tree columns */}
            <div
              ref={containerRef}
              className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar"
              style={{ touchAction: 'none' }}
              onWheel={handleWheel}
            >
              <div
                className="flex gap-4 px-4 py-4 min-h-full"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
              >
                {activePaths.map(path => (
                  <PathColumn
                    key={path}
                    pathName={path}
                    nodes={skillsByPath[path] ?? []}
                    onNodeTap={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Zoom hint */}
            <div className="shrink-0 px-4 py-2 text-center text-gray-600 text-xs border-t border-gray-800">
              Hold Ctrl + scroll to zoom · Pinch to zoom on mobile
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
