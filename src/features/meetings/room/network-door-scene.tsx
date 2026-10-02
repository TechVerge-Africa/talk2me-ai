'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

interface NetworkDoorSceneProps {
  /** 'disconnected' | 'reconnecting' | 'connected' | 'verifying' */
  status: 'disconnected' | 'reconnecting' | 'connected' | 'verifying';
  /** Optional message or subtext */
  title?: string;
  subtitle?: string;
  /** Callback fired immediately when door opens (or after quick 300ms transition) */
  onEntered?: () => void;
  /** Fullscreen overlay or inline card */
  fullscreen?: boolean;
  /** Optional retry callback for manual or auto reconnection */
  onRetry?: () => void;
  /** Whether a reconnection attempt is currently active */
  isRetrying?: boolean;
  /** Optional callback to leave the meeting if user desires */
  onLeave?: () => void;
}

export function NetworkDoorScene({
  status,
  title,
  subtitle,
  onEntered,
  fullscreen = true,
  onRetry,
  isRetrying = false,
  onLeave,
}: NetworkDoorSceneProps) {
  const isConnected = status === 'connected';
  const isVerifying = status === 'verifying';

  // As soon as status becomes 'connected', fire onEntered after a snappy 350ms so there is zero delay for the user
  useEffect(() => {
    if (isConnected && onEntered) {
      const timer = setTimeout(() => {
        onEntered();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isConnected, onEntered]);

  const defaultTitle = isConnected
    ? 'Entering meeting...'
    : isVerifying
    ? 'Joining meeting...'
    : 'Reconnecting...';

  const defaultSubtitle = isConnected
    ? 'Door open, stepping inside...'
    : isVerifying
    ? 'Preparing your space and connecting you...'
    : 'Waiting outside while reconnecting...';

  const isWalking = isConnected || isVerifying || status === 'reconnecting';

  const content = (
    <div className="relative flex flex-col items-center justify-center p-6 text-center select-none max-w-sm w-full mx-auto">
      {/* ── 3D Door & Walking Human Scene ── */}
      <div
        className="relative flex items-center justify-center mb-6"
        style={{ perspective: '400px' }}
      >
        {/* Door Frame Structure */}
        <div
          className="relative w-16 h-24 rounded-t-lg border-2 border-white/80 bg-slate-950/90 flex items-end justify-start shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Light Radiation Beam inside Doorway when opened */}
          <div
            className={`absolute inset-0 bg-gradient-to-tr from-amber-400 via-amber-200 to-white transition-opacity duration-300 rounded-t-[5px] ${
              isConnected
                ? 'opacity-100 shadow-[0_0_28px_rgba(251,191,36,0.95)]'
                : 'opacity-0'
            }`}
          />

          {/* 3D Swinging Door Panel */}
          <div
            className="absolute top-0 left-0 w-full h-full bg-slate-100 border-r border-slate-300 shadow-md origin-left transition-transform duration-300 ease-out flex items-center justify-end pr-1.5 rounded-t-[5px] z-20"
            style={{
              transformStyle: 'preserve-3d',
              transform: isConnected ? 'rotateY(-85deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Doorknob */}
            <div className="size-2 rounded-full bg-slate-800 shadow-inner" />
          </div>

          {/* 3D Human Figure Walking */}
          <div
            className="absolute bottom-0 transition-all duration-300 ease-out pointer-events-none flex flex-col items-center z-30"
            style={{
              left: isConnected ? '34px' : '10px',
              transform: isConnected
                ? 'scale(1.1) translateZ(24px)'
                : 'scale(0.95) translateZ(0px)',
              opacity: isConnected ? 1 : 0.9,
            }}
          >
            {/* SVG Animated Human with natural walk cycle */}
            <motion.svg
              className="w-8 h-12 overflow-visible text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
              viewBox="0 0 24 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={
                isWalking
                  ? { y: [0, -1.5, 0], rotate: [2, 3, 2] }
                  : { y: 0, rotate: 0 }
              }
              transition={
                isWalking
                  ? { repeat: Infinity, duration: 0.25, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
            >
              {/* Head */}
              <circle cx="12" cy="5" r="3.5" fill="currentColor" />

              {/* Torso */}
              <line x1="12" y1="9" x2="12" y2="18" />

              {/* Arms (Contralateral walk cycle: swings opposite to respective leg) */}
              {/* Front/Right Arm */}
              <motion.line
                x1="12"
                y1="11"
                x2="6"
                y2="16"
                animate={
                  isWalking
                    ? { x2: [6, 17, 6], y2: [16, 13, 16] }
                    : { x2: 8, y2: 16 }
                }
                transition={
                  isWalking
                    ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              />
              {/* Back/Left Arm */}
              <motion.line
                x1="12"
                y1="11"
                x2="17"
                y2="13"
                animate={
                  isWalking
                    ? { x2: [17, 6, 17], y2: [13, 16, 13] }
                    : { x2: 16, y2: 15 }
                }
                transition={
                  isWalking
                    ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              />

              {/* Legs (Contralateral walk cycle) */}
              {/* Front/Right Leg */}
              <motion.line
                x1="12"
                y1="18"
                x2="17"
                y2="28"
                animate={
                  isWalking
                    ? { x2: [17, 6, 17], y2: [27, 29, 27] }
                    : { x2: 14, y2: 29 }
                }
                transition={
                  isWalking
                    ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              />
              {/* Back/Left Leg */}
              <motion.line
                x1="12"
                y1="18"
                x2="6"
                y2="29"
                animate={
                  isWalking
                    ? { x2: [6, 17, 6], y2: [29, 27, 29] }
                    : { x2: 9, y2: 29 }
                }
                transition={
                  isWalking
                    ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              />
            </motion.svg>

            {/* Walking Shadow on Floor with subtle expansion */}
            <motion.div
              className="w-7 h-1.5 rounded-full bg-black/60 blur-[1px] -mt-0.5"
              animate={
                isWalking
                  ? { scaleX: [0.85, 1.15, 0.85], opacity: [0.45, 0.7, 0.45] }
                  : { scaleX: 1, opacity: 0.5 }
              }
              transition={
                isWalking
                  ? { repeat: Infinity, duration: 0.25, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
            />
          </div>
        </div>
      </div>

      {/* Status Pill */}
      <div className="mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : isVerifying
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          {isConnected ? (
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ) : isVerifying ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : (
            <WifiOff className="size-3 text-amber-400 animate-bounce" />
          )}
          {title || defaultTitle}
        </span>
      </div>

      {/* Subtext */}
      <p className="text-xs text-white/60 font-medium leading-relaxed max-w-xs">
        {subtitle || defaultSubtitle}
      </p>

      {/* Interactive Reconnect Button */}
      {onRetry && !isConnected && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Reconnecting to room...' : 'Reconnect Now'}</span>
          </button>
          <span className="text-[10px] text-white/40">
            Automatically retrying when connection returns
          </span>
          {onLeave && (
            <button
              onClick={onLeave}
              className="mt-2 text-xs text-rose-400/80 hover:text-rose-300 underline underline-offset-4 cursor-pointer transition-colors"
            >
              Leave meeting instead
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (!fullscreen) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
      {content}
    </div>
  );
}
