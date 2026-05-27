import React from 'react';

export default function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-end gap-2 mb-2 bubble-animate">
      <div className="w-9 h-9 rounded-full bg-gray-800 shrink-0" />
      <div className="flex flex-col gap-1">
        {name && <span className="text-xs text-gray-500 px-1">{name}</span>}
        <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
          <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
          <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
          <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}
