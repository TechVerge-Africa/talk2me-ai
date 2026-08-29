'use client';

import React, { useRef, useEffect, memo } from "react";
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

export const CaptionList = memo(function CaptionList({ captions, size = 'md', sttStatus }: CaptionListProps) {
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [captions]);

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/90 mb-4 pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Live Transcripts & CC</span>
        </div>
        {sttStatus?.currentLanguage && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono">
            {sttStatus.currentLanguage}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20 hover:scrollbar-thumb-cyan-500/40">
        {captions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-60 text-center p-6 space-y-2">
            <div className="flex items-end gap-1 h-5 mb-1">
              <span className="w-1 bg-cyan-400 rounded-full animate-pulse h-3" />
              <span className="w-1 bg-teal-300 rounded-full animate-bounce h-5" />
              <span className="w-1 bg-cyan-300 rounded-full animate-pulse h-2" />
              <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-4" />
            </div>
            <p className="text-xs font-bold text-white/80">Real-Time Transcripts</p>
            <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
              Captions will stream live here with speaker identification as soon as speech begins.
            </p>
          </div>
        ) : (
          captions.map((cap, i) => {
            const senderName = cap.sender_id ? cap.sender_id.split('@')[0] : 'Participant';
            const isLast = i === captions.length - 1;

            return (
              <div 
                key={cap.id} 
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  isLast 
                    ? "bg-slate-900/80 border-cyan-500/40 shadow-[0_4px_20px_rgba(0,180,216,0.15)] scale-[1.01]" 
                    : "bg-slate-950/40 border-border/40 opacity-70 hover:opacity-100 hover:border-cyan-500/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-300 px-2 py-0.5 bg-cyan-500/10 rounded-md border border-cyan-400/30">
                      {senderName}
                    </span>
                    {!cap.is_final && (
                      <span className="text-[9px] text-amber-400 font-mono font-medium animate-pulse flex items-center gap-1">
                        <span className="size-1 rounded-full bg-amber-400" />
                        Speaking...
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/60">
                    {new Date(cap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className={`${textSizeClass} font-medium leading-relaxed tracking-wide text-foreground/90 pl-1`}>
                  {cap.content}
                </p>
              </div>
            );
          })
        )}
      </div>
      
      {/* Diagnostic Indicator Footer */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${
            sttStatus?.error 
              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
              : sttStatus?.isListening 
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' 
              : 'bg-amber-400'
          }`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {sttStatus?.error 
              ? 'STT Error' 
              : sttStatus?.isListening 
              ? 'Real-Time STT Active' 
              : 'STT Ready'}
          </span>
        </div>
        <div className="text-[9px] text-cyan-400/80 font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
          AssemblyAI Universal-3 Pro
        </div>
      </div>
    </div>
  );
});
