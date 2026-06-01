import React from "react";
import { Message } from "../../types/message";


interface CaptionListProps {
  captions: Message[];
  size?: 'sm' | 'md' | 'lg';
}

export function CaptionList({ captions, size = 'md' }: CaptionListProps) {
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';
  return (
    <div className="h-full flex flex-col">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Accessibility Hub // Live Captions
      </div>
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
        {captions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
            <div className="size-1 w-full bg-gradient-to-r from-transparent via-bridge-cyan/50 to-transparent mb-4" />
            <p className="text-xs uppercase tracking-tighter">Waiting for audio signals...</p>
          </div>
        ) : (
          captions.map((cap, i) => (
            <div 
              key={cap.id} 
              className={`animate-in fade-in slide-in-from-bottom-2 duration-700 ${
                i === captions.length - 1 ? "opacity-100 scale-100" : "opacity-40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-bridge-cyan px-1.5 py-0.5 bg-bridge-cyan/10 rounded">
                  {cap.sender_id === "me" ? "Speaker" : "Participant"}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground/60">{new Date(cap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className={`${textSizeClass} font-medium leading-relaxed tracking-tight border-l-2 border-bridge-cyan/30 pl-3`}>
                {cap.content}
              </p>
            </div>
          ))
        )}
      </div>
      
      {/* Footer / Active Indicator */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">STT Engine Online</span>
         </div>
         <div className="text-[9px] text-muted-foreground/40 font-mono">0.02ms latency</div>
      </div>
    </div>
  );
}
