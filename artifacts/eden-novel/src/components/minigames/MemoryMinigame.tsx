import React, { useState, useEffect } from 'react';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

const SYMBOLS = ['🗡', '🔮', '💀', '🌙', '⚡', '🔥', '❄', '🌀'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function MemoryMinigame({ onComplete, genre }: Props) {
  const pairs = SYMBOLS.slice(0, 4);
  const [cards, setCards] = useState(() => shuffle([...pairs, ...pairs].map((s, i) => ({ id: i, symbol: s, flipped: false, matched: false }))));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a].symbol === cards[b].symbol) {
        setCards(c => c.map((card, i) => i === a || i === b ? { ...card, matched: true } : card));
        setMatches(m => m + 1);
        setFlipped([]);
        if (matches + 1 >= pairs.length && !done) {
          setDone(true);
          const success = moves + 1 <= pairs.length * 2 + 2;
          setTimeout(() => {
            onComplete({
              statEffects: success ? { intelligence: 2 } : { intelligence: 1 },
              inventoryChanges: [],
              relationshipChanges: [],
              outcomeText: success
                ? 'Your memory is razor-sharp — every detail lodged perfectly.'
                : 'You piece it together, though the edges feel blurry.',
            });
          }, 600);
        }
      } else {
        setTimeout(() => {
          setCards(c => c.map((card, i) => i === a || i === b ? { ...card, flipped: false } : card));
          setFlipped([]);
        }, 700);
      }
      setMoves(m => m + 1);
    }
  }, [flipped]);

  const flip = (i: number) => {
    if (done || cards[i].flipped || cards[i].matched || flipped.length === 2) return;
    setCards(c => c.map((card, idx) => idx === i ? { ...card, flipped: true } : card));
    setFlipped(f => [...f, i]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-6">
      <p className="text-gray-400 text-xs uppercase tracking-widest">Memory</p>
      <p className="text-gray-500 text-sm">Find matching pairs • Moves: {moves}</p>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <button key={card.id} onClick={() => flip(i)}
            className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl transition-all ${card.matched ? 'bg-green-900/40 border border-green-600/50' : card.flipped ? 'bg-gray-700 border border-blue-500' : 'bg-gray-800 border border-gray-700'}`}>
            {card.flipped || card.matched ? card.symbol : '?'}
          </button>
        ))}
      </div>
    </div>
  );
}
