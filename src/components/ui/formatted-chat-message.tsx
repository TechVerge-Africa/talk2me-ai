import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Sparkles } from 'lucide-react';

interface FormattedChatMessageProps {
  content: string;
  className?: string;
}

function VoiceNoteAudioPlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error('Audio play exception:', e));
    }
  };

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 my-1.5 p-2 rounded-xl bg-slate-900/10 dark:bg-white/10 border border-slate-300/40 dark:border-white/15 backdrop-blur-md max-w-xs">
      <button
        type="button"
        onClick={togglePlay}
        className="size-8 rounded-full bg-indigo-600 dark:bg-cyan-400 text-white dark:text-slate-950 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex-shrink-0"
      >
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="h-1.5 w-full bg-slate-300 dark:bg-white/20 rounded-full overflow-hidden relative cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = pos * duration;
          }}
        >
          <div
            className="h-full bg-indigo-600 dark:bg-cyan-400 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-600 dark:text-white/70">
          <span>{formatSecs(currentTime)}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>
    </div>
  );
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

        // Audio tag line (e.g. [audio:data:audio/webm;base64,...])
        if (trimmed.startsWith('[audio:') && trimmed.endsWith(']')) {
          const audioSrc = trimmed.slice(7, -1);
          return <VoiceNoteAudioPlayer key={lineIdx} src={audioSrc} />;
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

        // Voice Note Badge line (e.g. 🎙️ Voice Note (0:14))
        if (trimmed.startsWith('🎙️') || trimmed.includes('Voice Note (')) {
          return (
            <div key={lineIdx} className="flex items-center gap-1.5 py-1 px-2.5 my-1 rounded-lg bg-indigo-500/15 dark:bg-cyan-500/15 border border-indigo-500/25 dark:border-cyan-500/30 text-indigo-700 dark:text-cyan-300 text-[11px] font-extrabold shadow-2xs">
              <span className="animate-pulse">🎙️</span>
              <span>{trimmed.replace(/^🎙️\s*/, '')}</span>
            </div>
          );
        }

        // Quote block transcript line (e.g. > "Medaase...")
        if (trimmed.startsWith('> ')) {
          const quoteText = trimmed.slice(2);
          return (
            <blockquote key={lineIdx} className="border-l-2 border-indigo-500 dark:border-cyan-400 pl-2.5 py-0.5 my-1 text-xs sm:text-sm italic opacity-95">
              {renderInlineText(quoteText)}
            </blockquote>
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


