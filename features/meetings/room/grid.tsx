import React from "react";
import { Plus } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  role: string;
  isSpeaking?: boolean;
  isMe?: boolean;
  isMuted?: boolean;
  isDeafMode?: boolean;
}

interface ParticipantGridProps {
  participants: Participant[];
  onInvite: () => void;
}

export function ParticipantGrid({ participants, onInvite }: ParticipantGridProps) {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {participants.map((p) => (
        <div 
          key={p.id} 
          className={`glass-card p-4 rounded-3xl flex items-center gap-4 transition-all hover:scale-[1.02] ${
            p.isMe ? "border-primary/20 ring-2 ring-primary/5" : ""
          }`}
        >
          <div className="size-12 rounded-2xl bg-gradient-to-tr from-bridge-cyan to-bridge-indigo grid place-items-center text-white text-sm font-bold shadow-bridge-sm">
            {p.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{p.name} {p.isMe && "(You)"}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">
              {p.isDeafMode ? "Deaf mode" : p.isMuted ? "Muted" : p.role}
            </div>
          </div>
          <div className="flex items-center gap-0.5 h-4 px-2">
            {p.isSpeaking && (
              [4, 10, 6, 12, 5].map((h, i) => (
                <div 
                  key={i} 
                  className="w-0.5 bg-bridge-cyan rounded-full animate-signal-pulse" 
                  style={{ height: h, animationDelay: `${i * 150}ms` }} 
                />
              ))
            )}
          </div>
        </div>
      ))}

      {/* Empty Slot / Invite Button */}
      <div className="glass-card p-4 rounded-3xl flex items-center gap-4 opacity-60 grayscale border-dashed border-2">
        <div className="size-12 rounded-2xl bg-muted/50 border border-border grid place-items-center text-muted-foreground">
           <Plus className="size-5" />
        </div>
        <div className="flex-1">
           <div className="text-sm font-medium">Empty Slot</div>
           <button onClick={onInvite} className="text-[10px] font-bold text-bridge-indigo uppercase">Invite Others →</button>
        </div>
      </div>
    </div>
  );
}
