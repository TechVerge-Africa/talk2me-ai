import React from "react";
import { Plus } from "lucide-react";
import { RemoteParticipant, LocalParticipant, Track } from 'livekit-client';
import { VideoTrack } from "./video-track";

interface ParticipantGridProps {
  participants: (RemoteParticipant | LocalParticipant)[];
  onInvite: () => void;
}

export function ParticipantGrid({ participants, onInvite }: ParticipantGridProps) {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {participants.map((p) => (
        <div 
          key={p.sid || p.identity} 
          className={`glass-card p-4 rounded-3xl flex items-center gap-4 transition-all hover:scale-[1.02] relative overflow-hidden ${
             p instanceof LocalParticipant ? "border-primary/20 ring-2 ring-primary/5" : ""
          }`}
        >
          {/* Track background for small preview if needed, but here we focus on info + status */}
          <div className="size-12 rounded-2xl bg-gradient-to-tr from-bridge-cyan to-bridge-indigo grid place-items-center text-white text-sm font-bold shadow-bridge-sm relative z-10 bg-card">
            {p.identity.slice(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0 relative z-10">
            <div className="text-sm font-semibold truncate">
                {p.identity} {p instanceof LocalParticipant && "(You)"}
            </div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">
              {p.isSpeaking ? "Speaking" : !p.isMicrophoneEnabled ? "Muted" : "Active"}
            </div>
          </div>

          <div className="flex items-center gap-0.5 h-4 px-2 relative z-10">
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

          {/* Tiny Video Overlay for Grid Tiles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <VideoTrack participantIdentity={p.identity} source={Track.Source.Camera} />
          </div>
        </div>
      ))}

      {/* Empty Slot / Invite Button */}
      {participants.length < 6 && (
        <div className="glass-card p-4 rounded-3xl flex items-center gap-4 opacity-60 grayscale border-dashed border-2">
          <div className="size-12 rounded-2xl bg-muted/50 border border-border grid place-items-center text-muted-foreground">
             <Plus className="size-5" />
          </div>
          <div className="flex-1">
             <div className="text-sm font-medium">Empty Slot</div>
             <button onClick={onInvite} className="text-[10px] font-bold text-bridge-indigo uppercase">Invite Others →</button>
          </div>
        </div>
      )}
    </div>
  );
}
