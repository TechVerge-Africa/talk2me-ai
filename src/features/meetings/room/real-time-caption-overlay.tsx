'use client';

import React, { useState, useEffect } from 'react';
import { Message } from '@/types/message';

interface Props {
  captions: Message[];
  size?: 'sm' | 'md' | 'lg';
  activeInterims?: { speakerId: string; speakerName: string; text: string }[];
}

export function RealTimeCaptionOverlay({ captions, size = 'md', activeInterims = [] }: Props) {
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
        <div className="bg-black/80 backdrop-blur-md border border-cyan-500/20 rounded-full px-5 py-2 text-xs text-white/70 text-center font-medium flex items-center justify-center gap-2 shadow-2xl mx-auto w-fit">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Listening for Ghanaian & Global speech...</span>
        </div>
      </div>
    );
  }

  const sizeClasses = {
    sm: "text-xs sm:text-sm px-4 py-2",
    md: "text-sm sm:text-base px-5 py-2.5",
    lg: "text-base sm:text-xl px-7 py-3"
  };

  return (
    <div 
      className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl sm:max-w-2xl px-4 z-40 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="bg-black/85 backdrop-blur-xl border border-cyan-500/30 rounded-xl sm:rounded-2xl shadow-2xl px-5 py-3 flex flex-col gap-1 text-center pointer-events-auto mx-auto w-fit max-w-full">
        {senderName && (
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-cyan-400">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
              CC · {senderName}
            </span>
            {!isFinal && (
              <span className="flex items-center gap-1 text-amber-400 font-mono text-[9px]">
                <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                Interim...
              </span>
            )}
          </div>
        )}
        <div className={`flex-1 ${sizeClasses[size]}`}>
          <p className="text-white font-semibold leading-relaxed tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all duration-150">
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
}
