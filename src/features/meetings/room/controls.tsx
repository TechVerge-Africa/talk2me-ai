'use client';
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Mic, MicOff, Video, VideoOff, Type,
  Smile, PhoneOff, Hand, Ear, EarOff,
  MonitorUp, Users, MessageSquare,
  Copy, Check, MoreHorizontal, X, Shield, ShieldOff,
  Lock, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ControlDockProps {
  code?: string;
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
  transcriptOn: boolean;
  deafOn?: boolean;
  isHost?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscript: () => void;
  onToggleDeaf?: () => void;
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
  chatOpen?: boolean;
  aiNoiseOn?: boolean;
  noiseReductionLevel?: number;
  onToggleAiNoise?: () => void;
  accessLevel?: 'members_only' | 'open';
  onToggleAccessLevel?: () => void;
  isWorkspaceMeeting?: boolean;
}

export function ControlDock({
  code = "abc-def-ghi",
  micOn, camOn, screenShareOn, transcriptOn, deafOn = false,
  isHost,
  onToggleMic, onToggleCam, onToggleScreenShare,
  onToggleTranscript, onToggleDeaf, onToggleParticipants,
  participantCount, participantsOpen,
  onAi, onEmergency, onCaptionSize, onShare, onLeave,
  onToggleChat,
  captionsOn, onToggleCaptions,
  unreadCount = 0,
  chatOpen = false,
  aiNoiseOn = false,
  noiseReductionLevel = 0,
  onToggleAiNoise,
  accessLevel = 'members_only',
  onToggleAccessLevel,
  isWorkspaceMeeting = false,
}: ControlDockProps) {
  const [copied, setCopied] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard accessibility (HCI Escape key handler)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && leaveModalOpen) {
        setLeaveModalOpen(false);
      }
    };
    if (leaveModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [leaveModalOpen]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleLeave = () => {
    setLeaveModalOpen(true);
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
          <LeaveMeetingButton onClick={handleLeave} compact />
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

                {/* Workspace Access Control Toggle */}
                {onToggleAccessLevel && (
                  <button
                    onClick={() => {
                      onToggleAccessLevel();
                    }}
                    aria-label="Toggle Workspace Meeting Access"
                    className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                  >
                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${
                      accessLevel === 'members_only'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {accessLevel === 'members_only' ? <Lock className="size-5" /> : <Globe className="size-5" />}
                    </div>
                    <span className="text-[11px] text-white/70 font-medium">
                      {accessLevel === 'members_only' ? "Members Only" : "Open to All"}
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
      <div className="hidden md:flex items-center justify-center relative py-2 px-2">
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
          <button onClick={onAi} title={chatOpen ? "Close Chat" : "Open Chat"} aria-label="Toggle Chat Panel" aria-pressed={chatOpen} className={`${chatOpen ? activeBtn("bg-blue-600 hover:bg-blue-700") : idleBtn} relative`}>
            <MessageSquare className="size-5" />
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ea4335] text-white text-[9px] font-bold flex items-center justify-center border border-[#1f2228]">
                {unreadCount}
              </span>
            )}
          </button>

        </div>

        {/* Right: Leave */}
        <div className="absolute right-2">
          <LeaveMeetingButton onClick={handleLeave} />
        </div>
      </div>

      {/* ══ LEAVE MEETING CUSTOM MODAL OVERLAY (PORTALLED TO BODY SO IT NEVER HIDES) ═════ */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {leaveModalOpen && (
              <div
                className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-auto select-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="leave-modal-title"
                aria-describedby="leave-modal-desc"
              >
                {/* Backdrop / Scrim */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setLeaveModalOpen(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Responsive Modal Dialog / Bottom Sheet Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full max-w-[94vw] sm:max-w-md bg-[#16181d] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden z-10 text-white max-h-[90vh] overflow-y-auto no-scrollbar"
                >
                  {/* Ambient Glow */}
                  <div className="absolute -top-16 -right-16 size-40 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 size-40 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Drag Handle Accent for Mobile */}
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

                  {/* Close Icon Button */}
                  <button
                    onClick={() => setLeaveModalOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close modal"
                  >
                    <X className="size-4" />
                  </button>

                  {/* Header / Icon */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="size-12 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/10">
                      <PhoneOff className="size-6" />
                    </div>
                    <div className="pr-6">
                      <h3 id="leave-modal-title" className="text-lg font-black tracking-tight text-white">
                        {isHost ? "Leave or End Meeting?" : "Leave Meeting?"}
                      </h3>
                      <p id="leave-modal-desc" className="text-xs text-white/65 mt-1 leading-relaxed">
                        {isHost
                          ? "As the meeting host, choose whether to terminate the call for all participants or exit yourself."
                          : "Are you sure you want to exit this meeting session?"}
                      </p>
                    </div>
                  </div>

                  {/* Actions Grid / List */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    {isHost ? (
                      <>
                        <button
                          onClick={() => {
                            setLeaveModalOpen(false);
                            onLeave(true);
                          }}
                          className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/25 active:scale-[0.98] flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex flex-col items-start text-left">
                            <span className="font-extrabold">End Meeting for Everyone</span>
                            <span className="text-[10px] text-white/70 normal-case font-normal">Terminates the room for all users</span>
                          </div>
                          <Shield className="size-4 text-white/90 group-hover:scale-110 transition-transform ml-2 flex-shrink-0" />
                        </button>

                        <button
                          onClick={() => {
                            setLeaveModalOpen(false);
                            onLeave(false);
                          }}
                          className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-[#232730] hover:bg-[#2c313c] border border-white/10 text-white font-semibold text-xs tracking-wider transition-all active:scale-[0.98] flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex flex-col items-start text-left">
                            <span className="font-bold">Just Leave Meeting</span>
                            <span className="text-[10px] text-white/60 normal-case font-normal">Leave room active for remaining users</span>
                          </div>
                          <PhoneOff className="size-4 text-white/50 group-hover:scale-110 transition-transform ml-2 flex-shrink-0" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setLeaveModalOpen(false);
                          onLeave(false);
                        }}
                        className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/25 active:scale-[0.98] cursor-pointer"
                      >
                        Yes, Leave Meeting
                      </button>
                    )}

                    <button
                      onClick={() => setLeaveModalOpen(false)}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-transparent hover:bg-white/5 text-white/60 hover:text-white text-xs font-semibold tracking-wide transition-all cursor-pointer mt-1"
                    >
                      Cancel & Return
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

function LeaveMeetingButton({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Leave Meeting"
      className={`group relative flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 active:scale-95 border border-white/20 flex-shrink-0 select-none overflow-hidden ${
        compact ? 'px-3.5 py-2' : 'px-5 py-2.5'
      }`}
    >
      {/* 3D Door & Walking Human Scene */}
      <div className="relative size-6 flex items-center justify-center overflow-visible" style={{ perspective: '240px' }}>
        {/* Door Frame Structure */}
        <div
          className="relative w-[18px] h-[22px] rounded-t-sm border-[1.5px] border-white/90 bg-slate-950/80 flex items-end justify-start overflow-visible shadow-md"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Light Radiation Beam inside Doorway */}
          <div
            className={`absolute inset-0 bg-gradient-to-tr from-amber-300 via-yellow-200 to-white transition-opacity duration-300 rounded-t-[1px] ${
              isHovered ? 'opacity-100 shadow-[0_0_12px_rgba(251,191,36,0.9)]' : 'opacity-0'
            }`}
          />

          {/* 3D Swinging Door Panel */}
          <div
            className="absolute top-0 left-0 w-full h-full bg-white border-r border-slate-300 shadow-md origin-left transition-transform duration-500 ease-out flex items-center justify-end pr-0.5 rounded-t-[1px] z-20"
            style={{
              transformStyle: 'preserve-3d',
              transform: isHovered ? 'rotateY(-85deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Doorknob */}
            <div className="size-1 rounded-full bg-slate-800 shadow-inner" />
          </div>

          {/* 3D Human Figure Walking Out */}
          <div
            className="absolute bottom-0 transition-all duration-500 ease-out pointer-events-none flex flex-col items-center z-30"
            style={{
              left: isHovered ? '13px' : '4px',
              transform: isHovered ? 'scale(1.18) translateZ(24px)' : 'scale(0.85) translateZ(0px)',
              opacity: isHovered ? 1 : 0.75,
            }}
          >
            {/* SVG Animated Human */}
            <svg
              className="w-4 h-5 overflow-visible text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              viewBox="0 0 24 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Head */}
              <circle cx="12" cy="5" r="3.5" fill="currentColor" />

              {/* Torso */}
              <line x1="12" y1="9" x2="12" y2="18" />

              {/* Arms (Left & Right alternating walk cycle) */}
              <motion.line
                x1="12"
                y1="11"
                x2="5"
                y2="17"
                animate={
                  isHovered
                    ? { x2: [5, 17, 5], y2: [17, 13, 17] }
                    : { x2: 5, y2: 17 }
                }
                transition={{ repeat: Infinity, duration: 0.45, ease: 'easeInOut' }}
              />
              <motion.line
                x1="12"
                y1="11"
                x2="18"
                y2="15"
                animate={
                  isHovered
                    ? { x2: [18, 5, 18], y2: [15, 17, 15] }
                    : { x2: 18, y2: 15 }
                }
                transition={{ repeat: Infinity, duration: 0.45, ease: 'easeInOut' }}
              />

              {/* Legs (Left & Right alternating walk cycle) */}
              <motion.line
                x1="12"
                y1="18"
                x2="6"
                y2="29"
                animate={
                  isHovered
                    ? { x2: [6, 17, 6], y2: [29, 25, 29] }
                    : { x2: 6, y2: 29 }
                }
                transition={{ repeat: Infinity, duration: 0.45, ease: 'easeInOut' }}
              />
              <motion.line
                x1="12"
                y1="18"
                x2="17"
                y2="28"
                animate={
                  isHovered
                    ? { x2: [17, 6, 17], y2: [28, 30, 28] }
                    : { x2: 17, y2: 28 }
                }
                transition={{ repeat: Infinity, duration: 0.45, ease: 'easeInOut' }}
              />
            </svg>

            {/* Walking Shadow on Floor */}
            <div
              className={`w-3.5 h-1 rounded-full bg-black/60 blur-[1px] transition-all duration-300 -mt-0.5 ${
                isHovered ? 'scale-x-125 opacity-90' : 'scale-x-75 opacity-40'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Button Text */}
      <span className="font-extrabold tracking-wider text-xs">Leave</span>
    </button>
  );
}
