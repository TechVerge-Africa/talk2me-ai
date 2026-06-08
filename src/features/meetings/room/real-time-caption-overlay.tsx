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

  // Always show a small placeholder if no caption yet so the area is persistent
  if (!displayText) return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-40">
      <div className="glass-card bg-black/40 border-white/10 rounded-[20px] px-4 py-2 text-sm text-muted-foreground text-center">Waiting for captions…</div>
    </div>
  );

  const sizeClasses = {
    sm: "text-base p-3",
    md: "text-lg p-4",
    lg: "text-2xl p-6"
  };

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-40">
      <div className="glass-card bg-black/60 border-white/10 rounded-[20px] shadow-lg px-4 py-3 flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="text-xs font-bold text-bridge-cyan">{speakerName ?? 'Speaker'}</div>
          <div className="text-[10px] text-muted-foreground">Live • {latestCaption.confidence ? `${Math.round(latestCaption.confidence*100)}%` : 'confidence N/A'}</div>
        </div>
        <div className={`flex-1 ${sizeClasses[size]}`}>
          <p className="text-white font-medium leading-snug">{displayText}</p>
        </div>
        <div className="flex-shrink-0 text-[11px] text-muted-foreground">
          <div className="px-2 py-1 rounded bg-muted/30">Translated: —</div>
        </div>
      </div>
    </div>
  );
}
