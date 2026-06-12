'use client';

import React, { useEffect, useState } from 'react';
import { Message } from '@/types/message';

interface Props {
  captions: Message[];
  speakerName?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function RealTimeCaptionOverlay({ captions, speakerName = null, size = 'md' }: Props) {
  const latestCaption = captions[captions.length - 1];
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (latestCaption) {
      setDisplayText(latestCaption.content);
    }
  }, [latestCaption]);

  if (!displayText) {
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40">
        <div className="bg-black/50 backdrop-blur-sm border border-white/5 rounded-full px-6 py-2.5 text-xs text-white/40 text-center font-medium">
          Listening for speech...
        </div>
      </div>
    );
  }

  const sizeClasses = {
    sm: "text-xs px-5 py-2",
    md: "text-sm sm:text-base px-6 py-2.5",
    lg: "text-lg sm:text-xl px-8 py-3.5"
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
      <div className="bg-black/60 backdrop-blur-md border border-white/5 rounded-full shadow-2xl flex items-center justify-center text-center">
        <div className={`flex-1 ${sizeClasses[size]}`}>
          <p className="text-white font-medium leading-relaxed tracking-wide">
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
}

