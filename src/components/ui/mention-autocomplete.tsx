import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Users, User, Bot, Volume2 } from 'lucide-react';

export interface MentionCandidate {
  id: string;
  handle: string; // The text inserted after @, e.g. "Talk2Me", "everyone", "Sarah"
  name: string;   // Display name
  description?: string;
  type: 'ai' | 'all' | 'member';
  avatarUrl?: string;
}

interface MentionAutocompleteProps {
  inputValue: string;
  onSelectMention: (newText: string) => void;
  candidates: MentionCandidate[];
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  className?: string;
}

export function MentionAutocomplete({
  inputValue,
  onSelectMention,
  candidates,
  inputRef,
  className = '',
}: MentionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Detect `@` being typed before the cursor or at end of text
  useEffect(() => {
    const el = inputRef.current;
    if (!el) {
      setIsOpen(false);
      return;
    }

    const cursorPos = el.selectionStart ?? inputValue.length;
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by a space
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
        const currentQuery = textBeforeCursor.slice(lastAtIndex + 1);
        // If there's no space within the @query (still typing handle)
        if (!/\s/.test(currentQuery)) {
          setQuery(currentQuery.toLowerCase());
          setMatchIndex(lastAtIndex);
          setIsOpen(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setIsOpen(false);
  }, [inputValue, inputRef]);

  // Filter candidates based on current query string
  const filteredCandidates = candidates.filter((c) => {
    if (!query) return true;
    return (
      c.handle.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))
    );
  });

  const handleChooseCandidate = (candidate: MentionCandidate) => {
    if (matchIndex === -1) return;
    const el = inputRef.current;
    const cursorPos = el?.selectionStart ?? inputValue.length;

    const beforeAt = inputValue.slice(0, matchIndex);
    const afterCursor = inputValue.slice(cursorPos);
    const insertedMention = `@${candidate.handle} `;

    const newText = `${beforeAt}${insertedMention}${afterCursor}`;
    onSelectMention(newText);
    setIsOpen(false);

    // Refocus input
    setTimeout(() => {
      if (el) {
        el.focus();
        const newCursorPos = matchIndex + insertedMention.length;
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  // Listen for Keyboard Navigation (ArrowUp, ArrowDown, Enter, Tab, Escape)
  useEffect(() => {
    const el = inputRef.current;
    if (!isOpen || !el) return;

    const handleKeyDown = (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (filteredCandidates.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCandidates.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCandidates.length) % filteredCandidates.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredCandidates[selectedIndex] || filteredCandidates[0];
        if (chosen) {
          handleChooseCandidate(chosen);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCandidates, selectedIndex, matchIndex, inputValue]);

  if (!isOpen || filteredCandidates.length === 0) return null;

  return (
    <div
      className={`absolute bottom-full mb-2 left-0 right-0 sm:right-auto sm:min-w-[280px] sm:max-w-md bg-slate-900/95 dark:bg-slate-900/98 backdrop-blur-md border border-slate-700/80 dark:border-white/15 rounded-2xl shadow-2xl z-50 p-1.5 overflow-hidden animate-in slide-in-from-bottom-2 duration-150 font-sans ${className}`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-400">
        <span>Tag Workspace Member or AI</span>
        <span className="text-[9px] text-indigo-400 font-mono">↑↓ Navigate · Enter Select</span>
      </div>

      <div className="max-h-52 overflow-y-auto space-y-0.5 mt-1">
        {filteredCandidates.map((c, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleChooseCandidate(c);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {c.type === 'ai' ? (
                <div className="size-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 grid place-items-center text-white flex-shrink-0">
                  <Sparkles className="size-3.5" />
                </div>
              ) : c.type === 'all' ? (
                <div className="size-7 rounded-xl bg-purple-600/30 border border-purple-400/40 grid place-items-center text-purple-300 flex-shrink-0">
                  <Users className="size-3.5" />
                </div>
              ) : (
                <div className="size-7 rounded-full bg-slate-700 grid place-items-center text-white text-[11px] font-extrabold flex-shrink-0">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold truncate">@{c.handle}</span>
                  {c.name !== c.handle && (
                    <span className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      ({c.name})
                    </span>
                  )}
                </div>
                {c.description && (
                  <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {c.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
