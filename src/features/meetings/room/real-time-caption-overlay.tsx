'use client';

import React, { useState, useEffect, memo } from 'react';
import { Message } from '@/types/message';

interface Props {
  captions: Message[];
  size?: 'sm' | 'md' | 'lg';
  activeInterims?: { speakerId: string; speakerName: string; text: string }[];
}

export const RealTimeCaptionOverlay = memo(function RealTimeCaptionOverlay({ captions, size = 'md', activeInterims = [] }: Props) {
  // Priority: active interim caption if available, otherwise latest committed caption
  const activeInterim = activeInterims.length > 0 ? activeInterims[activeInterims.length - 1] : null;
  const latestCaption = captions[captions.length - 1];

  const displayText = activeInterim ? activeInterim.text : (latestCaption ? latestCaption.content : "");
  const senderName = activeInterim ? activeInterim.speakerName : (latestCaption?.sender_id ? latestCaption.sender_id.split('@')[0] : '');
  const isFinal = !activeInterim && (latestCaption?.is_final ?? true);

  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    setIsIdle(false);
    if (!displayText) return;

    const timer = setTimeout(() => {
      setIsIdle(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [displayText, latestCaption?.id]);

  if (!displayText || isIdle) {
    return (
      <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-md px-4 z-40 pointer-events-none animate-in fade-in duration-300">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/70 text-center font-medium flex items-center justify-center gap-2.5 shadow-lg mx-auto w-fit transition-all duration-300">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-cyan-400" />
          </span>
          <span className="tracking-wide drop-shadow-sm">Listening for Ghanaian & Global speech...</span>
        </div>
      </div>
    );
  }

  const sizeClasses = {
    sm: "text-xs sm:text-sm px-4 py-1.5",
    md: "text-sm sm:text-base px-5 py-2",
    lg: "text-base sm:text-lg px-6 py-2.5"
  };

  return (
    <div 
      className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl sm:max-w-2xl px-4 z-40 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative overflow-hidden bg-slate-950/40 backdrop-blur-md hover:bg-slate-950/65 border border-white/15 hover:border-cyan-500/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] px-5 py-2.5 flex flex-col gap-1 text-center pointer-events-auto mx-auto w-fit max-w-full transition-all duration-300">
        
        {/* Subtle glassmorphic top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        {senderName && (
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-cyan-300 pt-0.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-cyan-200 backdrop-blur-sm shadow-sm">
              {/* Animated Equalizer Bars */}
              <div className="flex items-end gap-[2px] h-2.5">
                <span className="w-[2px] bg-cyan-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-2" />
                <span className="w-[2px] bg-teal-300 rounded-full animate-[bounce_0.6s_infinite_300ms] h-2.5" />
                <span className="w-[2px] bg-cyan-300 rounded-full animate-[bounce_0.6s_infinite_200ms] h-1.5" />
              </div>
              <span>CC · {senderName}</span>
            </div>

            {!isFinal ? (
              <span className="flex items-center gap-1 text-amber-300 font-mono text-[9px] bg-black/40 px-2 py-0.5 rounded-full border border-amber-400/30 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-300 font-mono text-[9px] bg-black/40 px-2 py-0.5 rounded-full border border-emerald-400/30 backdrop-blur-sm">
                ✓ SYNCED
              </span>
            )}
          </div>
        )}

        <div className={`flex-1 ${sizeClasses[size]}`}>
          <p className="text-white font-medium leading-relaxed tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-all duration-150">
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
});
