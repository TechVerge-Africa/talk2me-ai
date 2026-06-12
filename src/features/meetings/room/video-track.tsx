'use client';

import React from 'react';
import { Track, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { useTracks, isTrackReference, VideoTrack as LiveKitVideoTrack } from '@livekit/components-react';
import { Mic, MicOff } from 'lucide-react';

interface ParticipantVideoProps {
  participant: LocalParticipant | RemoteParticipant;
  source?: Track.Source;
  className?: string;
  mirrored?: boolean;
  raised?: boolean;
  reactions?: { id: string; sender_id: string; emoji: string; timestamp: string }[];
  isMain?: boolean;
}

// Renders a single video tile for a participant
export function ParticipantVideo({ 
  participant, 
  source = Track.Source.Camera, 
  className, 
  mirrored, 
  raised, 
  reactions,
  isMain = false
}: ParticipantVideoProps) {
  const tracks = useTracks([source]);
  const trackRef = tracks.find(t => t.participant.identity === participant.identity);

  const initials = participant.identity.slice(0, 2).toUpperCase();
  const isSpeaking = participant.isSpeaking;
  const isMicEnabled = participant.isMicrophoneEnabled;

  return (
    <div 
      className={`relative overflow-hidden bg-[#181a20] transition-all duration-300 ${className ?? ''} ${
        isMain 
          ? 'rounded-none' 
          : `rounded-2xl ${
              isSpeaking 
                ? 'ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)]' 
                : 'ring-1 ring-white/5'
            }`
      }`}
    >
      {trackRef && isTrackReference(trackRef) && trackRef.publication?.isSubscribed !== false ? (
        <LiveKitVideoTrack
          trackRef={trackRef}
          className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1c22] to-[#252830]">
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#06b6d4] grid place-items-center text-white text-base font-black shadow-md border border-white/10">
            {initials}
          </div>
        </div>
      )}

      {/* Mic status indicator on bottom-left (only for thumbnails) */}
      {!isMain && (
        <div className="absolute bottom-2.5 left-2.5 z-30">
          <div className={`p-1.5 rounded-full border border-white/5 flex items-center justify-center shadow-lg ${
            isMicEnabled 
              ? 'bg-[#2d3139]/90 text-white' 
              : 'bg-[#ea4335] text-white shadow-[0_0_10px_rgba(234,67,53,0.3)]'
          }`}>
            {isMicEnabled ? <Mic className="size-3" /> : <MicOff className="size-3" />}
          </div>
        </div>
      )}

      {/* Raised hand indicator */}
      {raised && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-amber-400/90 rounded-lg text-amber-950 text-[10px] font-bold backdrop-blur-sm shadow-md">
          <span>✋</span>
          <span>RAISED</span>
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
      <div 
        className={`absolute z-30 bg-[#2d3139]/70 backdrop-blur-md text-white font-semibold border border-white/5 shadow-md truncate ${
          isMain 
            ? 'top-4 right-4 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide' 
            : 'bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[9px]'
        }`}
      >
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
    <div className={`relative overflow-hidden bg-black rounded-2xl ${className ?? ''}`}>
      <LiveKitVideoTrack
        trackRef={screenTrack}
        className="w-full h-full object-contain"
      />
      <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-500/90 backdrop-blur-sm rounded-lg text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-lg">
        <span className="size-1.5 rounded-full bg-white animate-pulse" />
        Screen Share
      </div>
    </div>
  );
}

