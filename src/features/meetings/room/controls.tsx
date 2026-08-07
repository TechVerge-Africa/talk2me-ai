'use client';
import React, { useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Type,
  Smile, PhoneOff, Hand, Ear, EarOff,
  MonitorUp, Users, MessageSquare,
  Copy, Check, MoreHorizontal, X, Shield, ShieldOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ControlDockProps {
  code?: string;
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
  transcriptOn: boolean;
  deafOn: boolean;
  isHost?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscript: () => void;
  onToggleDeaf: () => void;
  onToggleChat?: () => void;
  onToggleParticipants: () => void;
  onAi: () => void;
  onEmergency: () => void;
  onCaptionSize: () => void;
  captionsOn?: boolean;
  onToggleCaptions?: () => void;
  onShare: () => void;
  onLeave: (endForAll?: boolean) => void;
  participantCount?: number;
  participantsOpen?: boolean;
  unreadCount?: number;
  aiNoiseOn?: boolean;
  noiseReductionLevel?: number;
  onToggleAiNoise?: () => void;
}

export function ControlDock({
  code = "abc-def-ghi",
  micOn, camOn, screenShareOn, transcriptOn, deafOn,
  isHost,
  onToggleMic, onToggleCam, onToggleScreenShare,
  onToggleTranscript, onToggleDeaf, onToggleParticipants,
  participantCount, participantsOpen,
  onAi, onEmergency, onCaptionSize, onShare, onLeave,
  onToggleChat,
  captionsOn, onToggleCaptions,
  unreadCount = 0,
  aiNoiseOn = false,
  noiseReductionLevel = 0,
  onToggleAiNoise,
}: ControlDockProps) {
  const [copied, setCopied] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleLeave = () => {
    if (isHost) {
      const choice = window.prompt(
        "Do you want to leave or end the meeting?\n\nType 'end' to end the meeting for everyone\nType 'leave' to leave yourself (others can stay)\nClick Cancel to stay in the meeting:"
      );
      if (choice?.toLowerCase() === "end") {
        onLeave(true);
      } else if (choice?.toLowerCase() === "leave") {
        onLeave(false);
      }
    } else {
      if (window.confirm("Leave this meeting?")) {
        onLeave(false);
      }
    }
  };

  // Shared button style helpers
  const baseBtn = "size-10 md:size-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 touch-manipulation border border-white/5 flex-shrink-0";
  const idleBtn = `${baseBtn} bg-[#2d3139]/90 text-white hover:bg-[#3d434f]`;
  const activeBtn = (color: string) => `${baseBtn} ${color} text-white`;
  const offBtn = `${baseBtn} bg-[#ea4335] text-white hover:bg-[#ea4335]/90 shadow-[0_0_15px_rgba(234,67,53,0.3)]`;

  return (
    <div className="w-full pointer-events-auto">
      {/* ══ MOBILE layout (< md) ══════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2 md:hidden w-full max-w-md mx-auto px-2">
        <div className="flex items-center justify-between gap-1.5 bg-[#1f2228]/95 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl">
          {/* Mic */}
          <button onClick={onToggleMic} title={micOn ? "Mute" : "Unmute"} aria-label={micOn ? "Mute Microphone" : "Unmute Microphone"} className={micOn ? idleBtn : offBtn}>
            {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </button>

          {/* Cam */}
          <button onClick={onToggleCam} title={camOn ? "Stop video" : "Start video"} aria-label={camOn ? "Disable Camera" : "Enable Camera"} className={camOn ? idleBtn : offBtn}>
            {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>

          {/* Chat */}
          {onToggleChat && (
            <button onClick={onToggleChat} title="Chat" aria-label="Toggle Chat" className={`${idleBtn} relative`}>
              <MessageSquare className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ea4335] text-white text-[9px] font-bold flex items-center justify-center border border-[#1f2228]">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Captions */}
          <button
            onClick={onToggleCaptions ?? onCaptionSize}
            title={captionsOn ? "Hide Captions" : "Show Captions"}
            aria-label={captionsOn ? "Hide Captions" : "Show Captions"}
            className={captionsOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}
          >
            <Type className="size-4" />
          </button>

          {/* More options */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            title="More Options"
            aria-label="Open More Options Menu"
            aria-expanded={moreMenuOpen}
            className={moreMenuOpen ? activeBtn("bg-[#3d434f]") : idleBtn}
          >
            <MoreHorizontal className="size-4" />
          </button>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="size-10 rounded-full flex items-center justify-center bg-[#ea4335] hover:bg-[#ea4335]/90 text-white transition-all shadow-lg active:scale-95 touch-manipulation flex-shrink-0"
            title="Leave Meeting"
            aria-label="Leave Meeting"
          >
            <PhoneOff className="size-4" />
          </button>
        </div>
      </div>

      {/* ══ MOBILE BOTTOM SHEET ═════════════════════════════════════════════ */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-[#181b20] border-t border-white/10 p-5 pb-8 z-50 pointer-events-auto shadow-[0_-10px_25px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg tracking-wide">Meeting Options</h3>
                <button
                  onClick={() => setMoreMenuOpen(false)}
                  aria-label="Close Options Menu"
                  className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Grid of options */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Raise Hand */}
                <button
                  onClick={() => {
                    onToggleTranscript();
                  }}
                  aria-label={transcriptOn ? "Lower Hand" : "Raise Hand"}
                  className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                >
                  <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${transcriptOn ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-[#2d3139]/80 text-white/95 group-active:scale-95'}`}>
                    <Hand className="size-5" />
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">{transcriptOn ? "Lower Hand" : "Raise Hand"}</span>
                </button>

                {/* Share Screen */}
                <button
                  onClick={() => {
                    onToggleScreenShare();
                    setMoreMenuOpen(false);
                  }}
                  aria-label="Share Screen"
                  className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                >
                  <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${screenShareOn ? 'bg-[#2563eb] text-white' : 'bg-[#2d3139]/80 text-white/95 group-active:scale-95'}`}>
                    <MonitorUp className="size-5" />
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">Share Screen</span>
                </button>

                {/* Deaf Mode */}
                <button
                  onClick={() => {
                    onToggleDeaf();
                  }}
                  aria-label={deafOn ? "Disable Deaf Mode" : "Enable Deaf Mode"}
                  className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                >
                  <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${deafOn ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-[#2d3139]/80 text-white/95 group-active:scale-95'}`}>
                    {deafOn ? <EarOff className="size-5" /> : <Ear className="size-5" />}
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">{deafOn ? "Audible Mode" : "Deaf Mode"}</span>
                </button>

                {/* Chat */}
                <button
                  onClick={() => {
                    onAi();
                    setMoreMenuOpen(false);
                  }}
                  aria-label="Open Chat"
                  className="flex flex-col items-center gap-2 text-center group relative cursor-pointer"
                >
                  <div className="size-12 rounded-2xl bg-[#2d3139]/80 text-white/95 flex items-center justify-center group-active:scale-95 transition-all relative">
                    <MessageSquare className="size-5 text-indigo-400" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ea4335] text-white text-[9px] font-bold flex items-center justify-center border border-[#181b20]">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">Chat</span>
                </button>

                {/* Reactions */}
                <button
                  onClick={() => {
                    onEmergency();
                    setMoreMenuOpen(false);
                  }}
                  aria-label="Reactions"
                  className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                >
                  <div className="size-12 rounded-2xl bg-[#2d3139]/80 text-white/95 flex items-center justify-center group-active:scale-95 transition-all">
                    <Smile className="size-5 text-amber-400" />
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">Reactions</span>
                </button>

                {/* Participants */}
                <button
                  onClick={() => {
                    onToggleParticipants();
                    setMoreMenuOpen(false);
                  }}
                  aria-label="View Participants"
                  aria-expanded={participantsOpen}
                  className="flex flex-col items-center gap-2 text-center group relative cursor-pointer"
                >
                  <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${participantsOpen ? 'bg-[#2563eb] text-white' : 'bg-[#2d3139]/80 text-white/95 group-active:scale-95'}`}>
                    <Users className="size-5" />
                    {!!participantCount && participantCount > 0 && (
                      <span className="absolute top-0 right-4 size-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#181b20]">
                        {participantCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">People</span>
                </button>

                {/* AI Noise Shield */}
                {micOn && onToggleAiNoise && (
                  <button
                    onClick={() => {
                      onToggleAiNoise();
                    }}
                    aria-label={aiNoiseOn ? "Disable AI Noise Shield" : "Enable AI Noise Shield"}
                    className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                  >
                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${aiNoiseOn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-[#2d3139]/80 text-white/95 group-active:scale-95'}`}>
                      {aiNoiseOn ? <Shield className="size-5 animate-pulse" /> : <ShieldOff className="size-5 text-white/50" />}
                    </div>
                    <span className="text-[11px] text-white/70 font-medium">
                      {aiNoiseOn ? `AI Shield: ${noiseReductionLevel}%` : "AI Shield Off"}
                    </span>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-white/5 my-5" />

              {/* Room Code Widget */}
              <div className="bg-[#1f2228]/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-white/40">Room Code</span>
                  <span className="font-mono text-sm font-bold text-white/90 tracking-wider mt-0.5">{code}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Copy Button */}
                  <button
                    onClick={handleCopyCode}
                    className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 border border-white/5 transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="size-4 text-emerald-400 animate-bounce" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4 text-white/60" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                  
                  {/* Share button */}
                  <button
                    onClick={onShare}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all cursor-pointer"
                  >
                    <span>Invite</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ DESKTOP layout (≥ md) ════════════════════════════════════════════ */}
      <div className="hidden md:flex items-center justify-between gap-4 py-2 px-2">
        {/* Left: room code */}
        <div className="flex items-center gap-2.5 bg-[#1f2228]/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/5 shadow-xl flex-shrink-0">
          <span className="text-xs font-mono font-bold tracking-wider text-white/95">{code}</span>
          <button onClick={handleCopyCode} title="Copy room code" aria-label="Copy room code" className="text-white/40 hover:text-white/90 transition-colors p-1">
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {/* Center: all controls */}
        <div className="flex items-center gap-2.5 bg-[#1f2228]/90 backdrop-blur-md p-2 rounded-full border border-white/5 shadow-xl overflow-x-auto no-scrollbar">
          <button onClick={onToggleMic} title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            aria-label={micOn ? "Mute Microphone" : "Unmute Microphone"}
            className={micOn ? idleBtn : offBtn}>
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          
          {micOn && onToggleAiNoise && (
            <button
              onClick={onToggleAiNoise}
              title={aiNoiseOn ? `AI Noise Shield Active (${noiseReductionLevel}% reduced)` : "Enable AI Noise Shield"}
              aria-label="Toggle AI Noise Shield"
              className={aiNoiseOn ? activeBtn("bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 shadow-lg border border-emerald-400/20 bg-emerald-500") : idleBtn}
            >
              {aiNoiseOn ? <Shield className="size-5 text-white animate-pulse" /> : <ShieldOff className="size-5 text-white/50" />}
            </button>
          )}
          <button onClick={onToggleCam} title={camOn ? "Stop Video" : "Start Video"}
            aria-label={camOn ? "Disable Camera" : "Enable Camera"}
            className={camOn ? idleBtn : offBtn}>
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button onClick={onToggleScreenShare} title={screenShareOn ? "Stop Screen Share" : "Share Screen"}
            aria-label={screenShareOn ? "Stop Screen Share" : "Share Screen"}
            className={screenShareOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}>
            <MonitorUp className="size-5" />
          </button>
          <button onClick={onToggleCaptions ?? onCaptionSize} title={captionsOn ? "Hide Captions" : "Show Captions"}
            aria-label={captionsOn ? "Hide Captions" : "Show Captions"}
            className={captionsOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}>
            <Type className="size-5" />
          </button>
          <button onClick={onToggleTranscript} title={transcriptOn ? "Lower Hand" : "Raise Hand"}
            aria-label={transcriptOn ? "Lower Hand" : "Raise Hand"}
            className={transcriptOn ? activeBtn("bg-amber-500 hover:bg-amber-600") : idleBtn}>
            <Hand className="size-5" />
          </button>
          <button onClick={onEmergency} title="Reactions"
            aria-label="Reactions"
            className={idleBtn}>
            <Smile className="size-5" />
          </button>
          <button onClick={onToggleParticipants} title="Participants"
            aria-label="Toggle Participants Panel"
            aria-expanded={participantsOpen}
            className={`${participantsOpen ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn} relative`}>
            <Users className="size-5" />
            {!!participantCount && participantCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#1f2228]">
                {participantCount}
              </span>
            )}
          </button>
          <button onClick={onAi} title="Chat" aria-label="Toggle Chat Panel" className={`${idleBtn} relative`}>
            <MessageSquare className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ea4335] text-white text-[9px] font-bold flex items-center justify-center border border-[#1f2228]">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={onToggleDeaf} title={deafOn ? "Disable Deaf Mode" : "Enable Deaf Mode"}
            aria-label={deafOn ? "Disable Deaf Mode" : "Enable Deaf Mode"}
            className={deafOn ? activeBtn("bg-purple-600 hover:bg-purple-700") : idleBtn}>
            {deafOn ? <EarOff className="size-5" /> : <Ear className="size-5" />}
          </button>
        </div>

        {/* Right: Leave */}
        <button
          onClick={handleLeave}
          aria-label="Leave Meeting"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#ea4335] hover:bg-[#ea4335]/90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex-shrink-0"
        >
          <PhoneOff className="size-4" />
          <span>Leave Meet</span>
        </button>
      </div>
    </div>
  );
}
