import React, { useState } from 'react';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

const SCENARIOS: Record<string, { npcLine: string; options: { text: string; score: number }[] }[]> = {
  romance: [
    { npcLine: '"You seem distracted today..."', options: [{ text: 'Stay quiet and smile', score: 2 }, { text: '"Just thinking about you."', score: 3 }, { text: '"None of your business."', score: 0 }] },
    { npcLine: '"Do you ever think about the future?"', options: [{ text: '"Not really."', score: 0 }, { text: '"Sometimes. Are you in it?"', score: 3 }, { text: '"I prefer living in the moment."', score: 2 }] },
  ],
  default: [
    { npcLine: '"I don\'t know if I can trust you."', options: [{ text: 'Prove it with actions', score: 3 }, { text: '"You don\'t have a choice."', score: 1 }, { text: 'Offer information', score: 2 }] },
    { npcLine: '"What do you want from me?"', options: [{ text: 'Be honest', score: 3 }, { text: 'Stay vague', score: 1 }, { text: 'Deflect with a question', score: 2 }] },
  ],
};

export default function DialogueMinigame({ onComplete, genre = 'default' }: Props) {
  const rounds = SCENARIOS[genre] ?? SCENARIOS.default;
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const pick = (optScore: number) => {
    const newScore = score + optScore;
    if (round + 1 >= rounds.length) {
      setScore(newScore);
      setDone(true);
      const maxScore = rounds.length * 3;
      const success = newScore >= maxScore * 0.6;
      setTimeout(() => {
        onComplete({
          statEffects: success ? { charisma: 2 } : {},
          inventoryChanges: [],
          relationshipChanges: [],
          outcomeText: success
            ? 'Your words land perfectly — a bond is forged.'
            : 'The conversation ends awkwardly. You sense a missed opportunity.',
        });
      }, 600);
    } else {
      setScore(newScore);
      setRound(r => r + 1);
    }
  };

  const current = rounds[round];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-6">
      <p className="text-gray-400 text-xs uppercase tracking-widest">Dialogue</p>
      <p className="text-white text-sm font-semibold">{round + 1} / {rounds.length}</p>

      {!done ? (
        <>
          <div className="bg-gray-800/80 border border-gray-700 rounded-xl px-5 py-4 max-w-sm w-full text-center">
            <p className="text-gray-200 text-base italic">{current.npcLine}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {current.options.map((opt, i) => (
              <button key={i} onClick={() => pick(opt.score)}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm text-left transition-colors">
                {opt.text}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-white text-lg font-bold">{score >= rounds.length * 2 ? '✦ Well spoken!' : 'Conversation complete'}</p>
      )}
    </div>
  );
}
