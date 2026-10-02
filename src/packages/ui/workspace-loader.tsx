'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WorkspaceLoadingShellProps {
  statusMessage?: string;
}

const DEFAULT_STAGES = [
  { text: 'Connecting to Talk2Me cloud...', hint: 'Securing end-to-end session' },
  { text: 'Synchronizing workspaces & channels...', hint: 'Retrieving team conversations' },
  { text: 'Preparing AI collaborative space...', hint: 'Readying real-time intelligence' },
];

/**
 * HCI-Engineered Workspace Skeleton Loader
 * 
 * Implements:
 * 1. Nielsen Heuristic #1 (Visibility of System Status) - Stage-based progress telemetry
 * 2. Spatial Cognition & Perceived Performance - High-fidelity layout skeleton prevents CLS
 * 3. Doherty Threshold (<400ms feedback loop) - Instant visual scaffold with continuous shimmer
 * 4. Acoustic/AI Brand Identity - Micro-equalizer bars undulating organically
 */
export function WorkspaceLoadingShell({ statusMessage }: WorkspaceLoadingShellProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (statusMessage) return;

    const t1 = setTimeout(() => setStageIndex(1), 900);
    const t2 = setTimeout(() => setStageIndex(2), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [statusMessage]);

  const currentStage = statusMessage
    ? { text: statusMessage, hint: 'Almost there...' }
    : DEFAULT_STAGES[stageIndex] || DEFAULT_STAGES[0];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading your Talk2Me AI workspace"
      className="h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans select-none relative"
    >
      {/* ── Top Micro-Progress Ray ── */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] z-50 overflow-hidden bg-slate-200/50 dark:bg-slate-800/50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400"
          initial={{ width: '10%' }}
          animate={{
            width: stageIndex === 0 ? '45%' : stageIndex === 1 ? '75%' : '94%',
          }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* ── Top Header Skeleton ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
        {/* Left: Brand & Workspace Switcher Skeleton */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-indigo-500/20 dark:bg-indigo-400/20 animate-pulse flex items-center justify-center">
              <Sparkles className="size-3.5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Workspace Pill Skeleton */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 w-36 sm:w-44">
            <div className="size-4 rounded-md bg-indigo-500/20 dark:bg-indigo-400/20 animate-pulse shrink-0" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>

        {/* Center: Search Pill Skeleton */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 w-56 lg:w-72">
          <div className="size-3.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
          <div className="h-2.5 w-32 rounded bg-slate-200 dark:bg-slate-700/70 animate-pulse" />
        </div>

        {/* Right: Actions & User Avatar Skeleton */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 animate-pulse hidden sm:block" />
          <div className="size-8 rounded-full bg-gradient-to-tr from-indigo-500/30 to-cyan-500/30 border border-indigo-500/30 animate-pulse" />
        </div>
      </header>

      {/* ── Main Body Grid Skeleton ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Skeleton */}
        <aside className="w-60 lg:w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 p-3 sm:p-4 space-y-5 hidden md:flex flex-col shrink-0">
          {/* Quick Start Button Skeleton */}
          <div className="h-10 rounded-xl bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-cyan-500/15 border border-indigo-500/20 animate-pulse flex items-center justify-center" />

          {/* Section: Channels */}
          <div className="space-y-2 pt-1">
            <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20" />
              <div className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              <div className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
            </div>
          </div>

          {/* Section: Direct Messages / Quick Links */}
          <div className="space-y-2 pt-2">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              <div className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
            </div>
          </div>

          {/* Bottom user mini-card skeleton */}
          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-2 w-14 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Center Dashboard Viewport Skeleton */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Greeting & Header Skeleton */}
          <div className="space-y-2">
            <div className="h-7 sm:h-8 w-48 sm:w-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-3.5 sm:h-4 w-60 sm:w-80 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          </div>

          {/* Quick Action Cards Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="size-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-44 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Meetings List Skeleton */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-7 w-20 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>

            <div className="space-y-2.5">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-14 sm:h-16 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 px-3.5 sm:px-4 flex items-center justify-between gap-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 sm:size-9 rounded-lg bg-slate-200 dark:bg-slate-700/60 shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 sm:w-40 rounded bg-slate-200 dark:bg-slate-700/60" />
                      <div className="h-2.5 w-16 sm:w-24 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Branded Floating Status Capsule (HCI Nielsen Heuristic #1) ── */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-[90vw]">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="px-4 py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl shadow-indigo-500/10 dark:shadow-slate-950/80 backdrop-blur-xl flex items-center gap-3"
        >
          {/* Animated Acoustic Voice Equalizer Wave */}
          <div className="flex items-center gap-1 h-4 px-1" title="AI audio stream sync">
            <motion.span
              animate={{ height: ['4px', '16px', '6px', '14px', '4px'] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
              className="w-1 rounded-full bg-gradient-to-t from-indigo-600 to-blue-500"
            />
            <motion.span
              animate={{ height: ['12px', '4px', '16px', '8px', '12px'] }}
              transition={{ repeat: Infinity, duration: 0.95, ease: 'easeInOut', delay: 0.1 }}
              className="w-1 rounded-full bg-gradient-to-t from-blue-500 to-cyan-400"
            />
            <motion.span
              animate={{ height: ['6px', '14px', '4px', '16px', '6px'] }}
              transition={{ repeat: Infinity, duration: 1.25, ease: 'easeInOut', delay: 0.2 }}
              className="w-1 rounded-full bg-gradient-to-t from-cyan-400 to-emerald-400"
            />
            <motion.span
              animate={{ height: ['14px', '8px', '12px', '4px', '14px'] }}
              transition={{ repeat: Infinity, duration: 1.05, ease: 'easeInOut', delay: 0.15 }}
              className="w-1 rounded-full bg-gradient-to-t from-emerald-400 to-indigo-500"
            />
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Telemetry Stage Message with Smooth Transition */}
          <div className="min-w-0 pr-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage.text}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentStage.text}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline font-mono">
                  • {currentStage.hint}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Branded Compact Session Verifier for Landing Page / Auth Redirects
 */
export function SessionVerifyingLoader({ message = 'Verifying Session...' }: { message?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white font-sans relative overflow-hidden select-none">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-5 relative z-10 px-6 py-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl text-center max-w-xs w-full"
      >
        {/* Acoustic AI Equalizer Circle */}
        <div className="relative size-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-blue-500/15 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center">
          <div className="flex items-center gap-1.5 h-6">
            <motion.span
              animate={{ height: ['6px', '22px', '8px', '18px', '6px'] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
              className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 to-blue-400"
            />
            <motion.span
              animate={{ height: ['18px', '6px', '22px', '10px', '18px'] }}
              transition={{ repeat: Infinity, duration: 0.95, ease: 'easeInOut', delay: 0.1 }}
              className="w-1.5 rounded-full bg-gradient-to-t from-blue-400 to-cyan-400"
            />
            <motion.span
              animate={{ height: ['10px', '20px', '6px', '22px', '10px'] }}
              transition={{ repeat: Infinity, duration: 1.25, ease: 'easeInOut', delay: 0.2 }}
              className="w-1.5 rounded-full bg-gradient-to-t from-cyan-400 to-emerald-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold tracking-tight text-white">{message}</p>
          <p className="text-[11px] text-slate-400 font-medium">Talk2Me AI Collaboration</p>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * HCI Debounced Loading Hook
 * Prevents "flicker of death" on fast network transitions (<200ms).
 */
export function useDebouncedLoader(
  isLoading: boolean,
  debounceMs = 200,
  minDisplayMs = 300
): boolean {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let minDisplayTimer: ReturnType<typeof setTimeout> | undefined;

    if (isLoading) {
      debounceTimer = setTimeout(() => {
        setShowLoader(true);
      }, debounceMs);
    } else {
      if (!showLoader) {
        clearTimeout(debounceTimer);
      } else {
        minDisplayTimer = setTimeout(() => {
          setShowLoader(false);
        }, minDisplayMs);
      }
    }

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(minDisplayTimer);
    };
  }, [isLoading, debounceMs, minDisplayMs, showLoader]);

  return showLoader;
}
