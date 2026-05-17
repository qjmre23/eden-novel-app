import React from 'react';

interface Props {
  content: string;
  isTimeSkip?: boolean;
  timeSkipLabel?: string;
  isStreaming?: boolean;
  textSize?: 'small' | 'medium' | 'large';
}

const TEXT_SIZE = { small: 'text-xs', medium: 'text-sm', large: 'text-base' };

export default function NarratorBubble({ content, isTimeSkip, timeSkipLabel, isStreaming, textSize = 'medium' }: Props) {
  if (isTimeSkip) {
    return (
      <div className="flex items-center gap-3 my-5 bubble-animate px-4">
        <div className="flex-1 h-px bg-gray-700/60" />
        <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase">{timeSkipLabel}</span>
        <div className="flex-1 h-px bg-gray-700/60" />
      </div>
    );
  }

  return (
    <div className="mx-4 my-4 bubble-animate text-center">
      <p className={`text-gray-400 ${TEXT_SIZE[textSize]} leading-relaxed italic whitespace-pre-wrap`}>
        {content}
        {isStreaming && <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 -mb-1" />}
      </p>
    </div>
  );
}
