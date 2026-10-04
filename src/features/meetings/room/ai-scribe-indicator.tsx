'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Ear, PenLine, Sparkles, X, ExternalLink, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ScribePhase = 'listening' | 'processing' | 'writing';

interface AiScribeIndicatorProps {
  /** Total AI-detected action items / decisions captured so far */
  capturedCount: number;
  /** Whether the meeting is off-the-record (no AI capture) */
  isEphemeral?: boolean;
  /** Optional workspace meeting link, used for the "View in Workspace" CTA */
  workspaceMeetingHref?: string;
  /** Opens the AI Notes sidebar tab */
  onOpenNotes?: () => void;
  /** Optional active speaker indicator to intensify listening animation */
  isSpeaking?: boolean;
}

/**
 * Ambient top-bar indicator for the AI Scribe.
 *
 * Visual Stages:
 * 1. 👂 Ear Listening: Radiating audio sound waves representing active voice capture.
 * 2. ••• Animated Dots: Three staggered bouncing/pulsing dots representing real-time speech processing.
 * 3. ✍️ Hand Writing: A pen with a subtle rhythmic writing stroke animation as notes are scribed.
 */
export function AiScribeIndicator({
  capturedCount,
  isEphemeral = false,
  workspaceMeetingHref,
  onOpenNotes,
  isSpeaking = false,
}: AiScribeIndicatorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [phase, setPhase] = useState<ScribePhase>('listening');
  const ref = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(capturedCount);

  // 1. When a new note is captured, immediately transition to 'writing' for 4.5s
  useEffect(() => {
    if (capturedCount > prevCountRef.current) {
      setPhase('writing');
      const timer = setTimeout(() => {
        setPhase('listening');
      }, 4500);
      prevCountRef.current = capturedCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = capturedCount;
  }, [capturedCount]);

  // 2. Smooth ambient lifecycle loop (Listening -> Processing -> Writing -> Loop)
  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setPhase((current) => {
        if (current === 'listening') return 'processing';
        if (current === 'processing') return 'writing';
        return 'listening';
      });
    }, 4200);

    return () => clearInterval(cycleTimer);
  }, []);

  // 3. Close on outside click
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

  // Dynamic phase metadata
  const phaseConfig = {
    listening: {
      color: 'text-indigo-300',
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-950/40 hover:bg-indigo-900/50',
      dotColor: 'bg-indigo-400',
      title: isSpeaking ? 'AI Scribe is listening to active speech...' : 'AI Scribe is listening in background...',
      badgeLabel: 'Listening',
    },
    processing: {
      color: 'text-violet-300',
      border: 'border-violet-500/35',
      bg: 'bg-violet-950/40 hover:bg-violet-900/50',
      dotColor: 'bg-violet-400',
      title: 'AI Scribe is synthesizing key discussion points...',
      badgeLabel: 'Processing',
    },
    writing: {
      color: 'text-emerald-300',
      border: 'border-emerald-500/35',
      bg: 'bg-emerald-950/40 hover:bg-emerald-900/50',
      dotColor: 'bg-emerald-400',
      title: 'AI Scribe is writing action items and meeting notes...',
      badgeLabel: 'Writing',
    },
  }[phase];

  return (
    <div ref={ref} className="relative hidden md:block">
      {/* ── Ambient animated indicator pill ── */}
      <button
        onClick={() => setPopoverOpen((v) => !v)}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        aria-label="AI Scribe"
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-300 shadow-sm cursor-pointer select-none backdrop-blur-md ${
          popoverOpen
            ? 'bg-indigo-500/30 border-indigo-400/60 text-white shadow-indigo-500/20'
            : `${phaseConfig.bg} ${phaseConfig.border} ${phaseConfig.color} hover:border-indigo-400/50`
        }`}
        title={phaseConfig.title}
      >
        {/* Pulsing state dot */}
        <span className="relative flex size-1.5 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${phaseConfig.dotColor} opacity-75`} />
          <span className={`relative inline-flex rounded-full size-1.5 ${phaseConfig.dotColor}`} />
        </span>

        {/* Morphing Animated Icon Container */}
        <div className="flex items-center h-3.5 min-w-[20px] justify-center overflow-visible">
          <AnimatePresence mode="wait">
            {phase === 'listening' && (
              <motion.div
                key="listening-ear"
                initial={{ opacity: 0, scale: 0.75, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: -2 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-0.5"
              >
                <Ear className="size-3 text-indigo-400" />
                {/* Radiating soundwave bars */}
                <span className="flex items-center gap-[2px] ml-0.5">
                  <motion.span
                    animate={{ scaleY: isSpeaking ? [0.4, 1.4, 0.4] : [0.5, 1.1, 0.5] }}
                    transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-[2px] h-2 bg-indigo-400/80 rounded-full origin-center"
                  />
                  <motion.span
                    animate={{ scaleY: isSpeaking ? [0.6, 1.7, 0.6] : [0.7, 1.25, 0.7] }}
                    transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                    className="w-[2px] h-2.5 bg-indigo-300 rounded-full origin-center"
                  />
                </span>
              </motion.div>
            )}

            {phase === 'processing' && (
              <motion.div
                key="processing-dots"
                initial={{ opacity: 0, scale: 0.75, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: -2 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1 px-0.5"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      scale: [0.8, 1.35, 0.8],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.75,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: 'easeInOut',
                    }}
                    className="size-1 rounded-full bg-violet-400 shadow-sm shadow-violet-400/40"
                  />
                ))}
              </motion.div>
            )}

            {phase === 'writing' && (
              <motion.div
                key="writing-hand"
                initial={{ opacity: 0, scale: 0.75, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: -2 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-0.5"
              >
                <motion.div
                  animate={{
                    rotate: [0, -12, 8, -6, 0],
                    x: [0, 1.2, -0.8, 0.6, 0],
                    y: [0, -0.4, 0.4, -0.2, 0],
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <PenLine className="size-3 text-emerald-400" />
                </motion.div>
                {/* Writing ink underline motion */}
                <motion.span
                  animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1.5 h-[2px] bg-emerald-400/90 rounded-full origin-left ml-0.5"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Note Counter Badge */}
        {capturedCount > 0 && (
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-600/70 border border-indigo-400/40 text-indigo-100 text-[9px] font-black tabular-nums shadow-sm"
          >
            {capturedCount}
          </motion.span>
        )}
      </button>

      {/* ── Popover Dialog ── */}
      <AnimatePresence>
        {popoverOpen && (
          <motion.div
            role="dialog"
            aria-label="AI Scribe information"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 340 }}
            className="absolute left-0 top-10 z-50 w-80 rounded-2xl bg-[#181b22] border border-white/10 shadow-2xl p-4 flex flex-col gap-3.5 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles className="size-3.5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-white block">Talk2Me AI Scribe</span>
                  <span className="text-[10px] text-white/50">Ambient Meeting Intelligence</span>
                </div>
              </div>
              <button
                onClick={() => setPopoverOpen(false)}
                className="size-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* 3-Step Lifecycle Visual Cards */}
            <div className="grid grid-cols-3 gap-1.5">
              <div
                className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                  phase === 'listening'
                    ? 'bg-indigo-500/20 border-indigo-400/50 shadow-sm'
                    : 'bg-white/[0.03] border-white/5 opacity-60'
                }`}
              >
                <div className="size-6 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-1">
                  <Ear className="size-3 text-indigo-300" />
                </div>
                <span className="text-[9px] font-bold text-white">1. Listens</span>
                <span className="text-[8px] text-white/50 leading-tight mt-0.5">Captures voice</span>
              </div>

              <div
                className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                  phase === 'processing'
                    ? 'bg-violet-500/20 border-violet-400/50 shadow-sm'
                    : 'bg-white/[0.03] border-white/5 opacity-60'
                }`}
              >
                <div className="size-6 rounded-lg bg-violet-500/20 flex items-center justify-center mb-1">
                  <span className="flex items-center gap-0.5">
                    <span className="size-1 rounded-full bg-violet-300 animate-pulse" />
                    <span className="size-1 rounded-full bg-violet-300 animate-pulse delay-75" />
                    <span className="size-1 rounded-full bg-violet-300 animate-pulse delay-150" />
                  </span>
                </div>
                <span className="text-[9px] font-bold text-white">2. Synthesizes</span>
                <span className="text-[8px] text-white/50 leading-tight mt-0.5">Extracts facts</span>
              </div>

              <div
                className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                  phase === 'writing'
                    ? 'bg-emerald-500/20 border-emerald-400/50 shadow-sm'
                    : 'bg-white/[0.03] border-white/5 opacity-60'
                }`}
              >
                <div className="size-6 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-1">
                  <PenLine className="size-3 text-emerald-300" />
                </div>
                <span className="text-[9px] font-bold text-white">3. Scribes</span>
                <span className="text-[8px] text-white/50 leading-tight mt-0.5">Action items</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-[11px] text-white/60 leading-relaxed">
              Talk2Me&apos;s AI Scribe listens in real-time to distill{' '}
              <strong className="text-white/90">key decisions, proposals, and action items</strong> into
              structured workspace notes.
            </p>

            {/* Live capture count banner */}
            {capturedCount > 0 ? (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                <span className="size-5 rounded-full bg-indigo-600 text-white text-[10px] font-black grid place-items-center tabular-nums">
                  {capturedCount}
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] text-indigo-200 font-bold">
                    {capturedCount === 1 ? '1 item scribed so far' : `${capturedCount} items scribed so far`}
                  </span>
                  <span className="text-[9px] text-white/40">Ready for review in your workspace notes</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-white/50 font-medium">
                  Listening actively for decisions and tasks...
                </span>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              {onOpenNotes && (
                <button
                  onClick={() => {
                    onOpenNotes();
                    setPopoverOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <PenLine className="size-3" /> View Live AI Notes
                </button>
              )}
              {workspaceMeetingHref && (
                <a
                  href={workspaceMeetingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-white/70 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/5"
                  onClick={() => setPopoverOpen(false)}
                >
                  <ExternalLink className="size-3" /> Open in Workspace
                </a>
              )}
            </div>

            {/* Transparency footer */}
            <p className="text-[9.5px] text-white/30 leading-snug border-t border-white/5 pt-2">
              All participants can see this indicator. Verbatim transcripts are automatically polished upon meeting conclusion.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
