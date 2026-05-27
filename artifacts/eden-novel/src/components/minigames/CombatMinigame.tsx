import React, { useState } from 'react';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

type Move = 'attack' | 'defend' | 'skill';
const ENEMY_MOVES: Move[] = ['attack', 'defend', 'attack', 'attack', 'skill', 'defend'];

const OUTCOME: Record<Move, Record<Move, number>> = {
  attack: { attack: 0, defend: -1, skill: 2 },
  defend: { attack: 1, defend: 0, skill: -1 },
  skill: { attack: -1, defend: 2, skill: 0 },
};

export default function CombatMinigame({ onComplete, genre }: Props) {
  const [playerHp, setPlayerHp] = useState(6);
  const [enemyHp, setEnemyHp] = useState(6);
  const [round, setRound] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const makeMove = (move: Move) => {
    if (done) return;
    const enemyMove = ENEMY_MOVES[round % ENEMY_MOVES.length];
    const delta = OUTCOME[move][enemyMove];
    const newPlayerHp = Math.max(0, playerHp - (delta < 0 ? Math.abs(delta) : 0));
    const newEnemyHp = Math.max(0, enemyHp - (delta > 0 ? delta : 0));
    const roundLog = delta > 0 ? `Round ${round + 1}: You deal ${delta} damage!` : delta < 0 ? `Round ${round + 1}: You take ${Math.abs(delta)} damage.` : `Round ${round + 1}: Both hold ground.`;
    setLog(l => [...l.slice(-3), roundLog]);
    setPlayerHp(newPlayerHp);
    setEnemyHp(newEnemyHp);
    setRound(r => r + 1);

    if (newPlayerHp <= 0 || newEnemyHp <= 0) {
      setDone(true);
      const victory = newEnemyHp <= 0;
      setTimeout(() => onComplete({
        statEffects: victory ? { strength: 2, health: -1 } : { health: -2 },
        inventoryChanges: [],
        relationshipChanges: [],
        outcomeText: victory ? 'You emerge victorious, bloodied but standing.' : 'You are forced to retreat, wounds stinging.',
      }), 800);
    }
  };

  const hp = (val: number, max: number) => (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`w-4 h-4 rounded-sm ${i < val ? 'bg-red-500' : 'bg-gray-700'}`} />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest">Combat</p>
      <div className="flex justify-between w-full max-w-sm">
        <div>
          <p className="text-gray-400 text-xs mb-1">You</p>
          {hp(playerHp, 6)}
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs mb-1">Enemy</p>
          {hp(enemyHp, 6)}
        </div>
      </div>
      {log.length > 0 && <p className="text-gray-400 text-xs italic">{log[log.length - 1]}</p>}
      {!done && (
        <div className="flex gap-3 mt-2">
          {(['attack', 'defend', 'skill'] as Move[]).map(m => (
            <button key={m} onClick={() => makeMove(m)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm capitalize transition-colors flex flex-col items-center gap-1">
              <span>{m === 'attack' ? '⚔' : m === 'defend' ? '🛡' : '✨'}</span>
              {m}
            </button>
          ))}
        </div>
      )}
      {done && (
        <p className={`text-lg font-bold ${enemyHp <= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {enemyHp <= 0 ? 'Victory!' : 'Defeated'}
        </p>
      )}
    </div>
  );
}
