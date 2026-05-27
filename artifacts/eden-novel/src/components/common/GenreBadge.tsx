import React from 'react';
import { GENRES } from '../../core/constants';

export default function GenreBadge({ genreId }: { genreId: string }) {
  const g = GENRES.find(x => x.id === genreId);
  if (!g) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${g.color}55`, color: '#e2e8f0', border: `1px solid ${g.color}88` }}>
      <span>{g.icon}</span>
      <span>{g.name}</span>
    </span>
  );
}
