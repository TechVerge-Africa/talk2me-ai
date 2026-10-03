'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Participant, LocalParticipant } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, Maximize2, PhoneOff } from 'lucide-react';
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
 * An ultra-clean, high-fidelity compact companion for multitasking (Google Docs, VS Code, Slack, etc.).
 * Operates edge-to-edge in native Document Picture-in-Picture or floating fallback dock.
 * 
 * Features:
 * - Edge-to-edge dark theme without white background flashes
 * - Auto-dimming controls that reveal on mouse movement
 * - Active speaker live video or modern pulsating audio avatar
 * - Single-click mic, camera, return to room, and hang up controls
 * - Signal quality indicator
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Active speaker takes priority, then other participants, then self
  const targetParticipant = activeSpeaker || participants.find(p => p !== localParticipant) || localParticipant;
  const isSpeaking = targetParticipant?.isSpeaking ?? false;
  const targetName = targetParticipant?.name || targetParticipant?.identity || 'Meeting';
  const targetInitials = targetName.slice(0, 2).toUpperCase();

  return (
    <div
      onMouseMove={resetIdleTimer}
      onMouseEnter={resetIdleTimer}
      onClick={resetIdleTimer}
      className={`w-full h-full bg-[#080a0f] text-white flex flex-col justify-between overflow-hidden select-none font-sans group ${
        isFloatingOverlay ? 'relative rounded-2xl border border-white/10 shadow-2xl' : 'fixed inset-0'
      }`}
    >
      {/* ══ Background / Video Layer ════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 bg-[#080a0f]">
        {targetParticipant ? (
          <ParticipantVideo
            participant={targetParticipant as any}
            className="w-full h-full object-cover"
            isMain={true}
            hideBadge={true}
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0c0e14] via-[#12151e] to-[#181c28]">
            <div className="relative">
              {isSpeaking && (
                <div className="absolute -inset-3 rounded-full bg-blue-500/25 blur-md animate-pulse" />
              )}
              <div
                className={`size-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-2xl transition-transform duration-300 ${
                  isSpeaking ? 'scale-105 ring-4 ring-emerald-400/50 shadow-emerald-500/20' : 'ring-2 ring-white/10'
                }`}
              >
                {targetInitials}
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-white/90 tracking-wide">{targetName}</p>
            <span className="text-[10px] text-white/50 mt-0.5">
              {isSpeaking ? 'Speaking...' : 'Microphone muted'}
            </span>
          </div>
        )}
      </div>

      {/* Subtle vignette gradients for text & control readability */}
      <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10" />

      {/* ══ Top Bar: Speaker Badge, Cellular Meter, Return Icon ═════════════ */}
      <div
        className={`relative z-20 flex items-center justify-between p-3 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Speaker Identity & Room Code */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-xl shadow-lg">
          <span className={`size-2 rounded-full shrink-0 ${isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-xs font-semibold tracking-wide text-white/95 truncate max-w-[140px]">
            {targetName}
          </span>
          <span className="text-[10px] text-white/40 font-mono">#{code.slice(-4)}</span>
        </div>

        {/* Right: Cellular Signal Bar + Fast Expand */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="scale-75 origin-center">
            <NetworkStatusIndicator
              quality={quality}
              connectionState={connectionState}
              isAudioPriority={isAudioPriority}
            />
          </div>
          <button
            type="button"
            onClick={onReturnToMeeting}
            title="Return to full room"
            aria-label="Return to full room"
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ══ Center Active Speaker Pulsing Pill ═════════════════════════════ */}
      {isSpeaking && (
        <div className="relative z-20 self-center pointer-events-none -mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md border border-blue-400/30 text-white text-[10px] font-bold shadow-lg shadow-blue-500/20 animate-pulse">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Speaking</span>
          </div>
        </div>
      )}

      {/* ══ Bottom Floating Control Dock ═══════════════════════════════════ */}
      <div
        className={`relative z-20 pb-3 pt-1 flex items-center justify-center transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-white/15 backdrop-blur-2xl shadow-2xl shadow-black/80 pointer-events-auto">
          {/* Mic Button */}
          <button
            type="button"
            onClick={onToggleMic}
            title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
            aria-label={micOn ? 'Mute' : 'Unmute'}
            className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              micOn
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40'
            }`}
          >
            {micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={onToggleCam}
            title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
            aria-label={camOn ? 'Stop Camera' : 'Start Camera'}
            className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              camOn
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40'
            }`}
          >
            {camOn ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          {/* Return to Room Button */}
          <button
            type="button"
            onClick={onReturnToMeeting}
            title="Expand to Full Room"
            aria-label="Expand to full room"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/40 active:scale-95 transition-all cursor-pointer"
          >
            <Maximize2 className="size-3" />
            <span>Room</span>
          </button>

          {/* Leave Button */}
          <button
            type="button"
            onClick={onLeave}
            title="Leave Call"
            aria-label="Leave call"
            className="size-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all cursor-pointer active:scale-90"
          >
            <PhoneOff className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
