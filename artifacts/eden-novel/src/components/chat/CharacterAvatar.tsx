import React, { useState } from 'react';
import type { PortraitResult } from '../../services/portraitService';

interface Props {
  name: string;
  color?: string;
  size?: number;
  portrait?: PortraitResult | null;
}

export default function CharacterAvatar({ name, color = '#1e3a5f', size = 36, portrait }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (portrait?.type === 'image' && portrait.src && !imgFailed) {
    return (
      <img
        src={portrait.src}
        alt={name}
        className="rounded-full shrink-0 select-none object-cover"
        style={{ width: size, height: size, border: `2px solid ${color}88` }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: portrait?.color ?? color,
        border: `2px solid ${(portrait?.color ?? color)}99`,
      }}
    >
      {portrait?.initials ?? initials}
    </div>
  );
}
