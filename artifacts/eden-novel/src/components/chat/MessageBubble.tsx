import React from 'react';

interface Props {
  speaker?: string;
  content: string;
  bubbleColor?: string;
  isUser?: boolean;
  isStreaming?: boolean;
  textSize?: 'small' | 'medium' | 'large';
  mcPortraitPath?: string;
}

const TEXT_SIZE = { small: 'text-xs', medium: 'text-sm', large: 'text-base' };
const DEFAULT_ACCENT = '#4f8ef7';

export default function MessageBubble({ speaker, content, bubbleColor = DEFAULT_ACCENT, isUser = false, isStreaming = false, textSize = 'medium', mcPortraitPath }: Props) {
  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-2 mb-4 bubble-animate">
        <div className="max-w-[80%] text-right">
          <p className="text-xs font-semibold mb-1 text-blue-400">{speaker ?? 'You'}</p>
          <p className={`text-blue-100 ${TEXT_SIZE[textSize]} leading-relaxed whitespace-pre-wrap`}>
            {content}
            {isStreaming && <span className="inline-block w-0.5 h-4 bg-blue-300 animate-pulse ml-0.5 -mb-1" />}
          </p>
        </div>
        {mcPortraitPath ? (
          <img src={mcPortraitPath} alt={speaker ?? 'MC'} className="w-8 h-8 rounded-full shrink-0 object-cover border border-blue-600/40 mt-0.5" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-8 h-8 rounded-full shrink-0 bg-blue-700/50 border border-blue-600/40 flex items-center justify-center mt-0.5">
            <span className="text-blue-200 text-xs font-bold">{(speaker ?? 'Y')[0].toUpperCase()}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 bubble-animate pl-3" style={{ borderLeft: `2px solid ${bubbleColor}` }}>
      {speaker && (
        <p className="text-xs font-semibold mb-1" style={{ color: bubbleColor }}>
          {speaker}
        </p>
      )}
      <p className={`text-gray-100 ${TEXT_SIZE[textSize]} leading-relaxed whitespace-pre-wrap`}>
        {content}
        {isStreaming && <span className="inline-block w-0.5 h-4 bg-gray-300 animate-pulse ml-0.5 -mb-1" />}
      </p>
    </div>
  );
}
