import React from 'react';

interface Props {
  rank: string;
  level: number;
}

function getRankColor(rank: string): string {
  const r = rank.toLowerCase();
  if (r.includes('legend') || r.includes('myth') || r.includes('transcen')) return '#f59e0b';
  if (r.includes('diamond') || r.includes('plat') || r.includes('divine')) return '#a78bfa';
  if (r.includes('gold') || r.includes('immortal')) return '#fbbf24';
  if (r.includes('silver') || r.includes('spirit')) return '#94a3b8';
  return '#92400e';
}

export default function RankBadge({ rank, level }: Props) {
  const color = getRankColor(rank);
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ borderColor: color, color, backgroundColor: `${color}18` }}>
      <span className="text-xs font-bold">Lv.{level}</span>
      <span className="w-px h-3 bg-current opacity-40" />
      <span className="text-xs font-semibold">{rank}</span>
    </div>
  );
}
