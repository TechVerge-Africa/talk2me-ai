'use client';

import React, { useEffect, useRef } from 'react';
import { Track, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { useTracks, isTrackReference, VideoTrack as LiveKitVideoTrack } from '@livekit/components-react';

interface ParticipantVideoProps {
  participant: LocalParticipant | RemoteParticipant;
  source?: Track.Source;
  className?: string;
  mirrored?: boolean;
  raised?: boolean;
  reactions?: { id: string; sender_id: string; emoji: string; timestamp: string }[];
}

// Renders a single video tile for a participant
export function ParticipantVideo({ participant, source = Track.Source.Camera, className, mirrored, raised, reactions }: ParticipantVideoProps) {
  const tracks = useTracks([source]);
  const trackRef = tracks.find(t => t.participant.identity === participant.identity);

  const initials = participant.identity.slice(0, 2).toUpperCase();
  const isSpeaking = participant.isSpeaking;

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className ?? ''} ${isSpeaking ? 'ring-2 ring-bridge-cyan' : ''}`}>
      {trackRef && isTrackReference(trackRef) && trackRef.publication?.isSubscribed !== false ? (
        <LiveKitVideoTrack
          trackRef={trackRef}
          className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="size-16 rounded-2xl bg-gradient-to-tr from-bridge-indigo to-bridge-cyan grid place-items-center text-white text-xl font-bold shadow-lg">
            {initials}
          </div>
        </div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-bridge-cyan/90 rounded-lg text-white text-[10px] font-bold backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          Speaking
        </div>
      )}

      {/* Raised hand indicator */}
      {raised && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-300/90 rounded-lg text-amber-900 text-[12px] font-bold backdrop-blur-sm">
          <span className="text-lg">✋</span>
          <span className="hidden md:inline">Raised</span>
        </div>
      )}

      {/* Reaction overlay: show latest reaction for this participant */}
      {reactions && reactions.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
          {reactions.slice(-1).map(r => (
            <div key={r.id} className="text-4xl animate-pop drop-shadow-lg">{r.emoji}</div>
          ))}
        </div>
      )}
      {/* Name badge */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-[10px] font-semibold max-w-[120px] truncate">
        {participant.identity}{participant instanceof LocalParticipant ? ' (You)' : ''}
      </div>
    </div>
  );
}

// Screen share track renderer
export function ScreenShareView({ className }: { className?: string }) {
  const tracks = useTracks([Track.Source.ScreenShare]);
  const screenTrack = tracks[0];

  if (!screenTrack || !isTrackReference(screenTrack)) return null;

  return (
    <div className={`relative overflow-hidden bg-black ${className ?? ''}`}>
      <LiveKitVideoTrack
        trackRef={screenTrack}
        className="w-full h-full object-contain"
      />
      <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-500/90 backdrop-blur-sm rounded-lg text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-white animate-pulse" />
        Screen Share
      </div>
    </div>
  );
}
