'use client';

import React, { useEffect, useState } from 'react';
import { Participant, LocalParticipant } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, Maximize2, PhoneOff, Users, Wifi } from 'lucide-react';
import { ParticipantVideo } from './video-track';
import { NetworkStatusIndicator, NetworkQuality } from '@/features/network-resilience';

export interface MiniMeetingProps {
  code: string;
  activeSpeaker?: Participant | null;
  localParticipant?: LocalParticipant | null;
  participants: Participant[];
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onReturnToMeeting: () => void;
  onLeave: () => void;
  isFloatingOverlay?: boolean;
  quality?: NetworkQuality;
  connectionState?: string;
  isAudioPriority?: boolean;
}

/**
 * Talk2Me Mini View
 * 
 * An optimized, high-fidelity compact meeting companion for multitasking (Google Docs, VS Code, Slack, etc.).
 * Can be rendered inside a native OS Document Picture-in-Picture window or as an in-app floating dock.
 * 
 * Contains:
 * - Real-time active speaker video or avatar with speaking ring
 * - Quick mic mute/unmute
 * - Quick camera toggle
 * - Return to full meeting room (focus main tab)
 * - Leave meeting button
 * - Live cellular network quality meter
 */
export function Talk2MeMiniView({
  code,
  activeSpeaker,
  localParticipant,
  participants,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onReturnToMeeting,
  onLeave,
  isFloatingOverlay = false,
  quality = 'excellent',
  connectionState = 'connected',
  isAudioPriority = false,
}: MiniMeetingProps) {
  const [controlsHovered, setControlsHovered] = useState(false);

  // If there's an active speaker, prioritize them; otherwise show first remote or local participant
  const targetParticipant = activeSpeaker || participants.find(p => p !== localParticipant) || localParticipant;
  const isSpeaking = targetParticipant?.isSpeaking ?? false;
  const targetName = targetParticipant?.name || targetParticipant?.identity || 'Meeting';
  const targetInitials = targetName.slice(0, 2).toUpperCase();

  return (
    <div
      onMouseEnter={() => setControlsHovered(true)}
      onMouseLeave={() => setControlsHovered(false)}
      className={`relative w-full h-full bg-[#0a0c10] text-white flex flex-col justify-between overflow-hidden select-none font-sans group ${
        isFloatingOverlay ? 'rounded-2xl border border-white/10 shadow-2xl' : ''
      }`}
    >
      {/* ══ Background / Video Layer ════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0">
        {targetParticipant ? (
          <ParticipantVideo
            participant={targetParticipant as any}
            className="w-full h-full object-cover"
            isMain={true}
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12141a] to-[#1c1f28]">
            <div className={`size-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg transition-transform ${
              isSpeaking ? 'scale-110 ring-4 ring-blue-500/50' : ''
            }`}>
              {targetInitials}
            </div>
            <p className="mt-2 text-xs font-semibold text-white/80">{targetName}</p>
          </div>
        )}
      </div>

      {/* Subtle vignette gradient for contrast over video */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60" />

      {/* ══ Top Bar: Branding, Network Meter, Return Button ═════════════════ */}
      <div className="relative z-20 flex items-center justify-between p-2.5 backdrop-blur-[2px]">
        {/* Room badge & active speaker */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wide uppercase text-white/90 truncate max-w-[120px]">
            {targetName}
          </span>
          <span className="text-[10px] text-white/40">#{code.slice(-4)}</span>
        </div>

        {/* Right actions: Network bar + Return to full room button */}
        <div className="flex items-center gap-1.5">
          {/* Signal Indicator in mini view */}
          <div className="scale-75 origin-right">
            <NetworkStatusIndicator
              quality={quality}
              connectionState={connectionState}
              isAudioPriority={isAudioPriority}
            />
          </div>

          <button
            onClick={onReturnToMeeting}
            title="Return to full meeting"
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ══ Center Speaking Wave Indicator (if audio active) ═══════════════ */}
      {isSpeaking && (
        <div className="relative z-20 self-center pointer-events-none">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600/80 backdrop-blur-md border border-blue-400/30 text-white text-[10px] font-bold shadow-lg animate-pulse">
            <span className="size-1.5 rounded-full bg-white animate-ping" />
            <span>Speaking...</span>
          </div>
        </div>
      )}

      {/* ══ Bottom Floating Control Dock ═══════════════════════════════════ */}
      <div className="relative z-20 p-2.5 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl shadow-2xl">
          {/* Mic Button */}
          <button
            onClick={onToggleMic}
            title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              micOn
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30'
            }`}
          >
            {micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={onToggleCam}
            title={camOn ? "Turn Camera Off" : "Turn Camera On"}
            className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              camOn
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30'
            }`}
          >
            {camOn ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          {/* Return Button */}
          <button
            onClick={onReturnToMeeting}
            title="Open Full Meeting"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-md shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <Maximize2 className="size-3" />
            <span className="hidden sm:inline">Room</span>
          </button>

          {/* Leave Button */}
          <button
            onClick={onLeave}
            title="Leave Meeting"
            className="size-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md shadow-rose-600/30"
          >
            <PhoneOff className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
