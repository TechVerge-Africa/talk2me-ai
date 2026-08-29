'use client';

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types/message';

interface Props {
  captions: Message[];
  size?: 'sm' | 'md' | 'lg';
  activeInterims?: { speakerId: string; speakerName: string; text: string }[];
}

export const RealTimeCaptionOverlay = memo(function RealTimeCaptionOverlay({
  captions,
  size = 'md',
  activeInterims = [],
}: Props) {
  // Priority: active interim caption if available, otherwise latest committed caption
  const activeInterim = activeInterims.length > 0 ? activeInterims[activeInterims.length - 1] : null;
  const latestCaption = captions[captions.length - 1];

  const displayText = activeInterim ? activeInterim.text : (latestCaption ? latestCaption.content : '');
  const senderName = activeInterim ? activeInterim.speakerName : (latestCaption?.sender_id ? latestCaption.sender_id.split('@')[0] : '');
  const isFinal = !activeInterim && (latestCaption?.is_final ?? true);

  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    setIsIdle(false);
    if (!displayText) return;

    // Auto-hide overlay after 6 seconds of silence/inactivity
    const timer = setTimeout(() => {
      setIsIdle(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [displayText, latestCaption?.id, activeInterim?.text]);

  // When no speech or idle: NOTHING SHOWS
  if (!displayText || isIdle) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs sm:text-sm px-4 py-1.5',
    md: 'text-sm sm:text-base px-5 py-2',
    lg: 'text-base sm:text-lg px-6 py-2.5',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={senderName || 'caption'}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl sm:max-w-2xl px-4 z-40 pointer-events-none select-none"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="relative overflow-hidden bg-[#090b10]/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_12px_44px_rgba(0,0,0,0.7)] px-5 py-3 flex flex-col gap-1.5 text-center pointer-events-auto mx-auto w-fit max-w-full transition-all duration-150">
          
          {/* Subtle glowing cyan top border line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

          {/* Header Bar: Speaker Name + Animated Sound Wave Equalizer */}
          {senderName && (
            <div className="flex items-center justify-center gap-2.5 text-[10px] uppercase font-bold tracking-widest text-cyan-300 pt-0.5">
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200 backdrop-blur-sm shadow-inner">
                {/* Live Equalizer Wave Animation */}
                <div className="flex items-end gap-[2px] h-3">
                  <span className="w-[2.5px] bg-cyan-400 rounded-full animate-pulse h-2.5" />
                  <span className="w-[2.5px] bg-teal-300 rounded-full animate-bounce h-3.5" />
                  <span className="w-[2.5px] bg-cyan-300 rounded-full animate-pulse h-2" />
                  <span className="w-[2.5px] bg-indigo-400 rounded-full animate-bounce h-2.5" />
                </div>
                <span>CC · {senderName}</span>
              </div>

              {!isFinal ? (
                <span className="flex items-center gap-1 text-amber-300 font-mono text-[9px] bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30 backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-300 font-mono text-[9px] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-400/30 backdrop-blur-sm">
                  ✓ SYNCED
                </span>
              )}
            </div>
          )}

          {/* Real-time zero-latency caption text */}
          <div className={`flex-1 ${sizeClasses[size]}`}>
            <motion.p
              layout
              transition={{ duration: 0.1, ease: 'easeOut' }}
              className="text-white font-sans font-semibold leading-relaxed tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
            >
              {displayText}
              <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-1.5 animate-pulse align-middle" />
            </motion.p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
