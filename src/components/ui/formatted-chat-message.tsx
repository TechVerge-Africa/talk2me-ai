import React from 'react';

interface FormattedChatMessageProps {
  content: string;
  className?: string;
}

/**
 * Helper to parse and render inline markdown elements:
 * - `@mentions` (@everyone, @channel, @Talk2Me AI, @User)
 * - `**bold text**`
 * - `*italic text*`
 * - `` `inline code` ``
 */
function renderInlineText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Regex to split by code blocks (`code`), bold (**bold**), italic (*italic*), and mentions (@user)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|@everyone|@channel|@Talk2Me\s*AI|@Talk2Me|@[A-Za-z0-9_-]+)/g;

  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-black/10 dark:bg-white/10 text-cyan-950 dark:text-cyan-300 font-mono text-[0.88em] border border-black/10 dark:border-white/10 font-medium"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold Text
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-extrabold opacity-100">
          {renderInlineText(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic / Emphasis Text
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
      return (
        <em key={index} className="italic font-semibold opacity-95">
          {renderInlineText(part.slice(1, -1))}
        </em>
      );
    }

    // Mentions
    if (part.startsWith('@')) {
      const lower = part.toLowerCase();

      if (lower === '@everyone' || lower === '@channel') {
        return (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-500/35 font-extrabold text-[0.9em] shadow-2xs"
          >
            {part}
          </span>
        );
      }

      if (lower.includes('talk2me')) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-cyan-500/40 font-extrabold text-[0.9em] shadow-2xs"
          >
            {part}
          </span>
        );
      }

      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-900 dark:text-indigo-300 border border-indigo-500/35 font-extrabold text-[0.9em] shadow-2xs"
        >
          {part}
        </span>
      );
    }

    return part;
  });
}

/**
 * Modern Markdown & Mention Formatted Chat Message Component
 * Parses structure (paragraphs, bullet points, headers, lists) and inline styles.
 */
export function FormattedChatMessage({ content, className = '' }: FormattedChatMessageProps) {
  if (!content) return null;

  // Split into lines for structural block parsing
  const lines = content.split('\n');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty lines create a paragraph break gap
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Headings (###, ##, #)
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={lineIdx} className="font-black text-xs sm:text-sm mt-2.5 mb-1 tracking-tight underline-offset-4">
              {renderInlineText(headingText)}
            </h4>
          );
        }

        // Bullet Points (- item, * item, • item)
        if (/^[-*•]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={lineIdx} className="flex items-start gap-2 my-0.5 pl-1 text-xs sm:text-sm">
              <span className="font-black text-cyan-600 dark:text-cyan-400 select-none">•</span>
              <div className="flex-1 leading-relaxed">
                {renderInlineText(bulletText)}
              </div>
            </div>
          );
        }

        // Numbered Lists (1. item, 2. item)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const [, num, itemText] = numMatch;
          return (
            <div key={lineIdx} className="flex items-start gap-2 my-0.5 pl-1 text-xs sm:text-sm">
              <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded bg-cyan-500/20 text-cyan-950 dark:text-cyan-300 border border-cyan-500/30 select-none">
                {num}
              </span>
              <div className="flex-1 leading-relaxed">
                {renderInlineText(itemText)}
              </div>
            </div>
          );
        }

        // Regular Paragraph Line
        return (
          <p key={lineIdx} className="leading-relaxed text-xs sm:text-sm">
            {renderInlineText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
