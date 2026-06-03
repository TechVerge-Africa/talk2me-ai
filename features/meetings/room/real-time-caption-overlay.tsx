'use client';

import React, { useEffect, useState } from 'react';
import { Message } from '../../../types/message';

interface Props {
  captions: Message[];
  size?: 'sm' | 'md' | 'lg';
}

export function RealTimeCaptionOverlay({ captions, size = 'md' }: Props) {
  const latestCaption = captions[captions.length - 1];
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (latestCaption) {
      setDisplayText(latestCaption.content);
    }
  }, [latestCaption]);

  if (!displayText) return null;

  const sizeClasses = {
    sm: "text-lg p-4",
    md: "text-2xl p-6",
    lg: "text-4xl p-8"
  };

  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-card bg-black/60 border-white/20 rounded-[32px] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
        <p className={`font-medium tracking-tight text-white text-center leading-relaxed transition-all ${sizeClasses[size]}`}>
          {displayText}
        </p>
        
        {/* Progress line to show it's active */}
        <div className="px-8 pb-3">
           <div className="h-0.5 bg-bridge-cyan/20 rounded-full overflow-hidden">
              <div className="h-full bg-bridge-cyan w-full animate-progress-fast" />
           </div>
        </div>
      </div>
    </div>
  );
}
