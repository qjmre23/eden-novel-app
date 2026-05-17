import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CustomActionInput({ onSubmit, disabled, placeholder = 'What do you do…' }: Props) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-gray-900/90 border-t border-gray-800">
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 resize-none max-h-24 overflow-y-auto disabled:opacity-50"
        style={{ minHeight: 42 }}
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        className="w-10 h-10 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0"
      >
        <Send size={16} className="text-white" />
      </button>
    </div>
  );
}
