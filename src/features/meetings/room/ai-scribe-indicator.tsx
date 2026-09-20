'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AiScribeIndicatorProps {
  /** Total AI-detected action items / decisions captured so far */
  capturedCount: number;
  /** Whether the meeting is off-the-record (no AI capture) */
  isEphemeral?: boolean;
  /** Optional workspace meeting link, used for the "View in Workspace" CTA */
  workspaceMeetingHref?: string;
  /** Opens the AI Notes sidebar tab */
  onOpenNotes?: () => void;
}

/**
 * Ambient top-bar indicator for the AI Scribe.
 *
 * Design principles (HCI):
 * - Never occupies a video grid tile — represented as native room chrome.
 * - Provides informed consent transparency: everyone in the room can see the
 *   badge and understand that AI is capturing notes.
 * - Clicking opens a lightweight informational popover, not a raw transcript wall.
 */
export function AiScribeIndicator({
  capturedCount,
  isEphemeral = false,
  workspaceMeetingHref,
  onOpenNotes,
}: AiScribeIndicatorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [popoverOpen]);

  if (isEphemeral) {
    // In off-the-record mode the scribe is disabled — show a minimal "off" pill
    return (
      <div
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-[10px] font-bold text-slate-400 cursor-default select-none"
        title="AI Scribe is off — this is an off-the-record session."
      >
        <Sparkles className="size-3 text-slate-500" />
        <span>Scribe Off</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative hidden md:block">
      {/* ── Ambient indicator pill ── */}
      <button
        onClick={() => setPopoverOpen((v) => !v)}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-200 shadow-sm cursor-pointer select-none ${
          popoverOpen
            ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200'
            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400/50'
        }`}
        title="AI Scribe is capturing notes for your workspace. Click to learn more."
      >
        {/* Pulsing dot — visual "active" signal */}
        <span className="relative flex size-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
          <span className="relative inline-flex rounded-full size-1.5 bg-indigo-400" />
        </span>
        <Sparkles className="size-3 text-indigo-400" />
        <span>AI Scribe</span>
        {capturedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-600/60 text-indigo-100 text-[9px] font-black tabular-nums">
            {capturedCount}
          </span>
        )}
      </button>

      {/* ── Popover ── */}
      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            role="dialog"
            aria-label="AI Scribe information"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 340 }}
            className="absolute left-0 top-10 z-50 w-72 rounded-2xl bg-[#1a1d24] border border-white/10 shadow-2xl p-4 flex flex-col gap-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="size-3.5 text-indigo-400" />
                </div>
                <span className="text-xs font-extrabold text-white">AI Scribe</span>
              </div>
              <button
                onClick={() => setPopoverOpen(false)}
                className="size-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Body */}
            <p className="text-[11px] text-white/60 leading-relaxed">
              Talk2Me&apos;s AI Scribe is listening in the background and capturing{' '}
              <strong className="text-white/80">key decisions, action items, and proposals</strong>{' '}
              — not raw speech.
            </p>
            <p className="text-[11px] text-white/60 leading-relaxed">
              The full verbatim transcript and AI-polished meeting notes will be available in your{' '}
              <strong className="text-white/80">Workspace Meetings</strong> hub after the call ends.
            </p>

            {/* Live capture count */}
            {capturedCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="size-4 rounded-full bg-indigo-600/70 text-white text-[9px] font-black grid place-items-center tabular-nums">
                  {capturedCount}
                </span>
                <span className="text-[11px] text-indigo-200 font-semibold">
                  {capturedCount === 1 ? 'note captured so far' : 'notes captured so far'}
                </span>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-1.5 pt-1">
              {onOpenNotes && (
                <button
                  onClick={() => { onOpenNotes(); setPopoverOpen(false); }}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Sparkles className="size-3" /> View Live AI Notes
                </button>
              )}
              {workspaceMeetingHref && (
                <a
                  href={workspaceMeetingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-white/60 hover:text-white/90 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/5"
                  onClick={() => setPopoverOpen(false)}
                >
                  <ExternalLink className="size-3" /> Open in Workspace
                </a>
              )}
            </div>

            {/* Transparency footer */}
            <p className="text-[10px] text-white/25 leading-snug border-t border-white/5 pt-2">
              All participants in this room can see this indicator. Live captions (CC) are still available in the bottom dock.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

