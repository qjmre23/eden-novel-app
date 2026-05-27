import React, { useState } from 'react';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

interface Question {
  q: string;
  options: string[];
  correct: number;
}

const QUESTIONS: Record<string, Question[]> = {
  cultivation: [
    { q: 'The first step on the cultivation path is?', options: ['Qi Condensation', 'Body Tempering', 'Spiritual Awakening', 'Foundation Building'], correct: 0 },
    { q: 'What fuels a cultivator\'s power?', options: ['Willpower', 'Spiritual Energy (Qi)', 'Physical Strength', 'Bloodline'], correct: 1 },
  ],
  school: [
    { q: 'What makes a study session most effective?', options: ['Cramming the night before', 'Active recall and spacing', 'Reading once carefully', 'Highlighting everything'], correct: 1 },
    { q: 'Club recruitment usually peaks when?', options: ['Mid-semester', 'School year start', 'Finals week', 'Summer break'], correct: 1 },
  ],
  default: [
    { q: 'In a critical situation, the best first action is?', options: ['Act immediately', 'Panic', 'Assess, then act', 'Wait for others'], correct: 2 },
    { q: 'The most dangerous enemy is one who is?', options: ['Loud and aggressive', 'Unknown and patient', 'Weak but numerous', 'Injured'], correct: 1 },
  ],
};

export default function ExamMinigame({ onComplete, genre = 'default' }: Props) {
  const questions = QUESTIONS[genre] ?? QUESTIONS.default;
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const pick = (i: number) => {
    if (chosen !== null || done) return;
    setChosen(i);
    const correct = i === questions[qIdx].correct;
    const newScore = correct ? score + 1 : score;
    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        setDone(true);
        const success = newScore >= questions.length * 0.6;
        setTimeout(() => onComplete({
          statEffects: success ? { intelligence: 3 } : { intelligence: 1 },
          inventoryChanges: [],
          relationshipChanges: [],
          outcomeText: success
            ? `You answer ${newScore}/${questions.length} correctly. Your knowledge is formidable.`
            : `You answer ${newScore}/${questions.length} correctly. There is still much to learn.`,
        }), 500);
      } else {
        setScore(newScore);
        setQIdx(q => q + 1);
        setChosen(null);
      }
    }, 700);
  };

  const q = questions[qIdx];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest">Knowledge Check</p>
      <p className="text-gray-500 text-xs">{qIdx + 1} / {questions.length}</p>
      <div className="bg-gray-800/80 border border-gray-700 rounded-xl px-5 py-4 max-w-sm w-full text-center">
        <p className="text-white text-sm font-semibold">{q.q}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {q.options.map((opt, i) => {
          let bg = 'bg-gray-800 hover:bg-gray-700 border-gray-700';
          if (chosen !== null) {
            if (i === q.correct) bg = 'bg-green-900/60 border-green-600';
            else if (i === chosen && i !== q.correct) bg = 'bg-red-900/60 border-red-600';
            else bg = 'bg-gray-800 border-gray-700 opacity-50';
          }
          return (
            <button key={i} onClick={() => pick(i)} disabled={chosen !== null}
              className={`w-full ${bg} border rounded-xl px-4 py-3 text-gray-200 text-sm text-left transition-colors`}>
              {opt}
            </button>
          );
        })}
      </div>
      {done && <p className="text-white font-bold text-lg">Exam complete</p>}
    </div>
  );
}
