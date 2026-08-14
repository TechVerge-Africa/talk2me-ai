'use client';

import React, { useRef, useEffect } from "react";
import { Message } from "@/types/message";

interface CaptionListProps {
  captions: Message[];
  size?: 'sm' | 'md' | 'lg';
  sttStatus?: {
    isSupported?: boolean;
    isListening?: boolean;
    currentLanguage?: string;
    error?: string | null;
  };
}

export function CaptionList({ captions, size = 'md', sttStatus }: CaptionListProps) {
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
        <span>Accessibility Hub // Live Captions</span>
        {sttStatus?.currentLanguage && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/80 font-mono">
            {sttStatus.currentLanguage}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
        {captions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-6 space-y-3">
            <div className="size-2 rounded-full bg-bridge-cyan/80 animate-ping mb-2" />
            <p className="text-xs uppercase tracking-wider font-semibold">Waiting for audio signals...</p>
            <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
              Speak into your microphone or wait for other participants to speak. Captions will render in real time.
            </p>
          </div>
        ) : (
          captions.map((cap, i) => {
            const senderName = cap.sender_id ? cap.sender_id.split('@')[0] : 'Participant';
            const isLast = i === captions.length - 1;

            return (
              <div 
                key={cap.id} 
                className={`animate-in fade-in slide-in-from-bottom-2 duration-500 transition-opacity ${
                  isLast ? "opacity-100 scale-100" : "opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-bridge-cyan px-2 py-0.5 bg-bridge-cyan/10 rounded border border-bridge-cyan/20">
                      {senderName}
                    </span>
                    {!cap.is_final && (
                      <span className="text-[9px] text-amber-400/90 font-medium animate-pulse">
                        Speaking...
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/60">
                    {new Date(cap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className={`${textSizeClass} font-medium leading-relaxed tracking-tight border-l-2 border-bridge-cyan/40 pl-3 text-foreground/90`}>
                  {cap.content}
                </p>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer / Active Diagnostic Indicator */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${
            sttStatus?.error 
              ? 'bg-rose-500' 
              : sttStatus?.isListening 
              ? 'bg-emerald-500 animate-pulse' 
              : 'bg-amber-400'
          }`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {sttStatus?.error 
              ? 'STT Error' 
              : sttStatus?.isListening 
              ? 'STT Active' 
              : 'STT Ready'}
          </span>
        </div>
        <div className="text-[9px] text-muted-foreground/50 font-mono">
          {sttStatus?.error ? sttStatus.error : 'Groq Whisper STT (whisper-large-v3-turbo)'}
        </div>
      </div>
    </div>
  );
}

