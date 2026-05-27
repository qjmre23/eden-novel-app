import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

export default function QTEMinigame({ onComplete, genre = 'default' }: Props) {
  const [progress, setProgress] = useState(0);
  const [zoneStart] = useState(0.35 + Math.random() * 0.2);
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());
  const DURATION = 2200;

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / DURATION);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!done) {
        handleMiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handlePress = () => {
    if (done) return;
    cancelAnimationFrame(rafRef.current);
    setDone(true);
    const inZone = progress >= zoneStart && progress <= zoneStart + 0.25;
    setSuccess(inZone);
    setTimeout(() => {
      onComplete({
        statEffects: inZone ? { reflexes: 2 } : {},
        inventoryChanges: [],
        relationshipChanges: [],
        outcomeText: inZone
          ? 'Your reflexes are sharp — you react with perfect timing!'
          : 'You reacted too late. The moment slips through your fingers.',
      });
    }, 800);
  };

  const handleMiss = () => {
    setDone(true);
    setSuccess(false);
    setTimeout(() => {
      onComplete({
        statEffects: {},
        inventoryChanges: [],
        relationshipChanges: [],
        outcomeText: 'You hesitate too long. The opportunity passes.',
      });
    }, 800);
  };

  const zoneLeft = `${zoneStart * 100}%`;
  const zoneWidth = '25%';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-6">
      <p className="text-white text-lg font-bold tracking-widest uppercase">React!</p>
      <p className="text-gray-400 text-sm">Tap when the bar enters the highlighted zone</p>

      <div className="w-full max-w-sm h-6 bg-gray-800 rounded-full relative overflow-hidden">
        <div className="absolute h-full rounded-full bg-yellow-500/40" style={{ left: zoneLeft, width: zoneWidth }} />
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${progress * 100}%`, background: done ? (success ? '#22c55e' : '#ef4444') : '#4f8ef7' }}
        />
      </div>

      {!done ? (
        <button
          onPointerDown={handlePress}
          className="w-32 h-32 rounded-full bg-blue-600 active:bg-blue-400 flex items-center justify-center text-white text-4xl shadow-lg"
        >
          ⚡
        </button>
      ) : (
        <p className={`text-2xl font-bold ${success ? 'text-green-400' : 'text-red-400'}`}>
          {success ? 'PERFECT!' : 'MISSED'}
        </p>
      )}
    </div>
  );
}
