import React from 'react';

interface FormattedChatMessageProps {
  content: string;
  className?: string;
}

export function FormattedChatMessage({ content, className = '' }: FormattedChatMessageProps) {
  if (!content) return null;

  // Regex to capture @mentions (e.g. @everyone, @channel, @Talk2Me AI, @Talk2Me, @Name)
  const mentionRegex = /(@everyone|@channel|@Talk2Me\s*AI|@Talk2Me|@[A-Za-z0-9_-]+)/gi;

  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    parts.push(match[0]);
    lastIndex = mentionRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const lower = part.toLowerCase();

          if (lower === '@everyone' || lower === '@channel') {
            return (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/35 font-extrabold text-[0.92em] shadow-xs"
              >
                {part}
              </span>
            );
          }
          
          if (lower.includes('talk2me')) {
            return (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-extrabold text-[0.92em] shadow-xs"
              >
                {part}
              </span>
            );
          }

          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/35 font-extrabold text-[0.92em] shadow-xs"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}
