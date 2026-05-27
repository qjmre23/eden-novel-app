import React, { useState } from 'react';
import type { MinigameResult } from '../../services/minigameService';

interface Props {
  onComplete: (result: MinigameResult) => void;
  genre?: string;
}

const INITIAL_DEMAND = 100;
const MINIMUM_ACCEPT = 60;

export default function NegotiationMinigame({ onComplete, genre }: Props) {
  const [demand, setDemand] = useState(INITIAL_DEMAND);
  const [rounds, setRounds] = useState(0);
  const [npcMessage, setNpcMessage] = useState(`"I want ${INITIAL_DEMAND} — not a coin less."`);
  const [done, setDone] = useState(false);

  const offer = (amount: number) => {
    if (done) return;
    const newRounds = rounds + 1;
    setRounds(newRounds);

    if (amount >= demand) {
      setNpcMessage(`"${amount}? Deal."`);
      setDone(true);
      setTimeout(() => onComplete({
        statEffects: { charisma: 1 },
        inventoryChanges: [],
        relationshipChanges: [],
        outcomeText: `After some negotiation, you settle on ${amount}. Both parties seem satisfied.`,
      }), 700);
    } else if (amount >= MINIMUM_ACCEPT && newRounds >= 2) {
      const newDemand = Math.round(demand * 0.85);
      if (amount >= newDemand) {
        setNpcMessage(`"Fine... ${amount} it is. Don't make me regret this."`);
        setDone(true);
        setTimeout(() => onComplete({
          statEffects: { charisma: 3, wealth: 1 },
          inventoryChanges: [],
          relationshipChanges: [],
          outcomeText: `You negotiate down to ${amount}. A small victory.`,
        }), 700);
      } else {
        setDemand(newDemand);
        setNpcMessage(`"${amount}? You insult me. My final offer: ${newDemand}."`);
      }
    } else if (amount < MINIMUM_ACCEPT) {
      if (newRounds >= 3) {
        setNpcMessage('"I\'m done here."');
        setDone(true);
        setTimeout(() => onComplete({
          statEffects: {},
          inventoryChanges: [],
          relationshipChanges: [],
          outcomeText: 'The negotiation falls apart. You walk away empty-handed.',
        }), 700);
      } else {
        const newDemand = Math.round(demand * 0.9);
        setDemand(newDemand);
        setNpcMessage(`"That's laughable. ${newDemand} or we're done."`);
      }
    } else {
      const newDemand = Math.round(demand * 0.93);
      setDemand(newDemand);
      setNpcMessage(`"Hmm. I could go as low as ${newDemand}."`);
    }
  };

  const options = [
    { label: `Offer ${Math.round(demand * 0.6)}`, amount: Math.round(demand * 0.6) },
    { label: `Offer ${Math.round(demand * 0.75)}`, amount: Math.round(demand * 0.75) },
    { label: `Offer ${Math.round(demand * 0.9)}`, amount: Math.round(demand * 0.9) },
    { label: `Accept ${demand}`, amount: demand },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center px-6 gap-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest">Negotiation</p>
      <div className="bg-gray-800/80 border border-gray-700 rounded-xl px-5 py-4 max-w-sm w-full text-center">
        <p className="text-gray-200 text-base italic">{npcMessage}</p>
      </div>
      {!done && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {options.map((opt, i) => (
            <button key={i} onClick={() => offer(opt.amount)}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm transition-colors">
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {done && <p className="text-green-400 font-bold text-lg">Deal concluded</p>}
    </div>
  );
}
