import React from 'react';
import type { MinigameType, MinigameResult } from '../../services/minigameService';
import QTEMinigame from './QTEMinigame';
import DialogueMinigame from './DialogueMinigame';
import MemoryMinigame from './MemoryMinigame';
import NegotiationMinigame from './NegotiationMinigame';
import StealthMinigame from './StealthMinigame';
import CombatMinigame from './CombatMinigame';
import ExamMinigame from './ExamMinigame';

interface Props {
  type: MinigameType;
  genre: string;
  onComplete: (result: MinigameResult) => void;
}

export default function MinigameWrapper({ type, genre, onComplete }: Props) {
  switch (type) {
    case 'qte': return <QTEMinigame onComplete={onComplete} genre={genre} />;
    case 'dialogue': return <DialogueMinigame onComplete={onComplete} genre={genre} />;
    case 'memory': return <MemoryMinigame onComplete={onComplete} genre={genre} />;
    case 'negotiation': return <NegotiationMinigame onComplete={onComplete} genre={genre} />;
    case 'stealth': return <StealthMinigame onComplete={onComplete} genre={genre} />;
    case 'combat': return <CombatMinigame onComplete={onComplete} genre={genre} />;
    case 'exam': return <ExamMinigame onComplete={onComplete} genre={genre} />;
    default: return null;
  }
}
