import React from 'react';
import { getRarityColor, getRarityGlow } from '../../core/utils';

interface Props {
  name: string;
  description: string;
  rarity: string;
  evolutionHint?: string;
  compact?: boolean;
}

export default function SkillCard({ name, description, rarity, evolutionHint, compact }: Props) {
  const color = getRarityColor(rarity);
  const glow = getRarityGlow(rarity);
  const isLegendary = rarity === 'legendary';

  return (
    <div
      className={`rounded-xl px-4 py-3 border ${isLegendary ? 'legendary-card' : ''} ${compact ? '' : 'mb-2'}`}
      style={{ borderColor: color, boxShadow: glow, backgroundColor: `${color}11` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-bold text-sm">{name}</span>
        <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}22` }}>
          {rarity}
        </span>
      </div>
      <p className="text-gray-300 text-xs leading-relaxed">{description}</p>
      {evolutionHint && !compact && (
        <p className="text-gray-500 text-xs mt-1.5 italic">✦ {evolutionHint}</p>
      )}
    </div>
  );
}
