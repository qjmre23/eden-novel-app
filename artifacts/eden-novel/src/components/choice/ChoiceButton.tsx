import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  text: string;
  roleplayText?: string;
  index: number;
  onClick: () => void;
  disabled?: boolean;
}

export default function ChoiceButton({ text, roleplayText, index, onClick, disabled }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left bg-gray-900/80 hover:bg-gray-800 border border-gray-700 hover:border-blue-600 rounded-xl px-4 py-3.5 text-sm text-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
    >
      <span className="text-blue-400 font-bold mr-2">{index + 1}.</span>
      {text}
      {roleplayText && roleplayText.trim().length > 0 && (
        <p className="text-gray-500 text-xs mt-1 ml-5 italic">"{roleplayText}"</p>
      )}
      {roleplayText !== undefined && roleplayText.trim().length === 0 && (
        <p className="text-gray-600 text-xs mt-1 ml-5 italic opacity-70">(silent)</p>
      )}
    </motion.button>
  );
}
