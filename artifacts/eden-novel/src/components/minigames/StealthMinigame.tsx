import React, { useState, useCallback } from 'react';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

const GRID = 5;
const GUARD_START = { x: 2, y: 0 };
const EXIT = { x: 4, y: 4 };

type Dir = 'up' | 'down' | 'left' | 'right';

export default function StealthMinigame({ onComplete }: Props) {
  const [player, setPlayer] = useState({ x: 0, y: 4 });
  const [guard, setGuard] = useState(GUARD_START);
  const [moves, setMoves] = useState(0);
  const [caught, setCaught] = useState(false);
  const [escaped, setEscaped] = useState(false);

  const movePlayer = useCallback((dir: Dir) => {
    if (caught || escaped) return;
    setPlayer(p => {
      const next = { ...p };
      if (dir === 'up' && p.y > 0) next.y -= 1;
      if (dir === 'down' && p.y < GRID - 1) next.y += 1;
      if (dir === 'left' && p.x > 0) next.x -= 1;
      if (dir === 'right' && p.x < GRID - 1) next.x += 1;

      const newMoves = moves + 1;
      setMoves(newMoves);

      const newGuard = { ...guard };
      if (guard.x < next.x) newGuard.x += 1;
      else if (guard.x > next.x) newGuard.x -= 1;
      if (guard.y < next.y) newGuard.y += 1;
      else if (guard.y > next.y) newGuard.y -= 1;
      setGuard(newGuard);

      if (newGuard.x === next.x && newGuard.y === next.y) {
        setCaught(true);
        setTimeout(() => onComplete({ statEffects: {}, inventoryChanges: [], relationshipChanges: [], outcomeText: 'You are spotted! The guard raises the alarm.' }), 700);
      } else if (next.x === EXIT.x && next.y === EXIT.y) {
        setEscaped(true);
        const bonus = newMoves <= 6;
        setTimeout(() => onComplete({ statEffects: bonus ? { stealth: 3 } : { stealth: 1 }, inventoryChanges: [], relationshipChanges: [], outcomeText: bonus ? 'Silent as a shadow — you slip past undetected.' : 'You make it, barely. The guard almost had you.' }), 700);
      }

      return next;
    });
  }, [caught, escaped, guard, moves, onComplete]);

  const cell = (x: number, y: number) => {
    const isPlayer = player.x === x && player.y === y;
    const isGuard = guard.x === x && guard.y === y;
    const isExit = EXIT.x === x && EXIT.y === y;
    return (
      <div key={`${x}-${y}`} className={`w-12 h-12 rounded flex items-center justify-center text-lg ${isGuard ? 'bg-red-900/60' : isExit ? 'bg-green-900/40' : 'bg-gray-800/60'}`}>
        {isPlayer ? '🕵' : isGuard ? '👮' : isExit ? '🚪' : ''}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest">Stealth</p>
      <p className="text-gray-500 text-sm">Reach the exit 🚪 without being caught 👮</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
        {Array.from({ length: GRID }, (_, y) => Array.from({ length: GRID }, (_, x) => cell(x, y)))}
      </div>
      {!caught && !escaped && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div />
          <button onClick={() => movePlayer('up')} className="bg-gray-800 rounded-xl p-3 text-white text-lg">↑</button>
          <div />
          <button onClick={() => movePlayer('left')} className="bg-gray-800 rounded-xl p-3 text-white text-lg">←</button>
          <button onClick={() => movePlayer('down')} className="bg-gray-800 rounded-xl p-3 text-white text-lg">↓</button>
          <button onClick={() => movePlayer('right')} className="bg-gray-800 rounded-xl p-3 text-white text-lg">→</button>
        </div>
      )}
      {(caught || escaped) && (
        <p className={`text-lg font-bold ${escaped ? 'text-green-400' : 'text-red-400'}`}>{escaped ? 'Escaped!' : 'Caught!'}</p>
      )}
    </div>
  );
}
