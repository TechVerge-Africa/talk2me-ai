'use client';
import React, { useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, Type,
  Smile, PhoneOff, Hand, Ear, EarOff,
  MonitorUp, Users, MessageSquare, Sparkles,
  Copy, Check, MoreHorizontal
} from "lucide-react";

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
}: ControlDockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
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
  const baseBtn = "size-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 touch-manipulation border border-white/5 flex-shrink-0";
  const idleBtn = `${baseBtn} bg-[#2d3139]/90 text-white hover:bg-[#3d434f]`;
  const activeBtn = (color: string) => `${baseBtn} ${color} text-white`;
  const offBtn = `${baseBtn} bg-[#ea4335] text-white hover:bg-[#ea4335]/90 shadow-[0_0_15px_rgba(234,67,53,0.3)]`;

  return (
    <div className="w-full pointer-events-auto">
      {/* ══ MOBILE layout (< md) ══════════════════════════════════════════════ */}
      <div className="flex flex-col gap-2 md:hidden">

        {/* Row 1: Room code + primary controls + Leave */}
        <div className="flex items-center justify-between gap-2 px-1">
          {/* Room code */}
          <button
            onClick={handleCopyCode}
            title="Copy room code"
            className="flex items-center gap-1.5 bg-[#1f2228]/90 backdrop-blur-md px-3 py-2.5 rounded-full border border-white/5 shadow-xl flex-shrink-0 touch-manipulation"
          >
            <span className="text-[11px] font-mono font-bold tracking-wide text-white/80 max-w-[80px] truncate">{code}</span>
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-white/40" />}
          </button>

          {/* Core controls: Mic + Cam */}
          <div className="flex items-center gap-2 bg-[#1f2228]/90 backdrop-blur-md p-2 rounded-full border border-white/5 shadow-xl">
            <button onClick={onToggleMic} title={micOn ? "Mute" : "Unmute"} className={micOn ? idleBtn : offBtn}>
              {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </button>
            <button onClick={onToggleCam} title={camOn ? "Stop video" : "Start video"} className={camOn ? idleBtn : offBtn}>
              {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            </button>
          </div>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-[#ea4335] hover:bg-[#ea4335]/90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 touch-manipulation flex-shrink-0"
          >
            <PhoneOff className="size-4" />
            <span className="hidden xs:inline">Leave</span>
          </button>
        </div>

        {/* Row 2: Secondary scrollable controls */}
        <div className="flex items-center gap-2 bg-[#1f2228]/90 backdrop-blur-md px-3 py-2 rounded-full border border-white/5 shadow-xl overflow-x-auto no-scrollbar mx-1">
          <button onClick={onToggleScreenShare} title="Share Screen"
            className={screenShareOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}>
            <MonitorUp className="size-5" />
          </button>

          <button onClick={onToggleCaptions ?? onCaptionSize} title={captionsOn ? "Hide Captions" : "Show Captions"}
            className={captionsOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}>
            <Type className="size-5" />
          </button>

          <button onClick={onToggleTranscript} title={transcriptOn ? "Lower Hand" : "Raise Hand"}
            className={transcriptOn ? activeBtn("bg-amber-500 hover:bg-amber-600") : idleBtn}>
            <Hand className="size-5" />
          </button>

          <button onClick={onEmergency} title="Reactions" className={idleBtn}>
            <Smile className="size-5" />
          </button>

          <button onClick={onToggleParticipants} title="Participants"
            className={`${participantsOpen ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn} relative`}>
            <Users className="size-5" />
            {!!participantCount && participantCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#1f2228]">
                {participantCount}
              </span>
            )}
          </button>

          <button onClick={onToggleDeaf} title={deafOn ? "Disable Deaf Mode" : "Deaf Mode"}
            className={deafOn ? activeBtn("bg-purple-600 hover:bg-purple-700") : idleBtn}>
            {deafOn ? <EarOff className="size-5" /> : <Ear className="size-5" />}
          </button>

          <button onClick={onAi} title="AI Assistant" className={idleBtn}>
            <Sparkles className="size-5" />
          </button>
        </div>
      </div>

      {/* ══ DESKTOP layout (≥ md) ════════════════════════════════════════════ */}
      <div className="hidden md:flex items-center justify-between gap-4 py-2 px-2">
        {/* Left: room code */}
        <div className="flex items-center gap-2.5 bg-[#1f2228]/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/5 shadow-xl flex-shrink-0">
          <span className="text-xs font-mono font-bold tracking-wider text-white/95">{code}</span>
          <button onClick={handleCopyCode} title="Copy room code" className="text-white/40 hover:text-white/90 transition-colors p-1">
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
        </div>

        {/* Center: all controls */}
        <div className="flex items-center gap-2.5 bg-[#1f2228]/90 backdrop-blur-md p-2 rounded-full border border-white/5 shadow-xl overflow-x-auto no-scrollbar">
          <button onClick={onToggleMic} title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            className={micOn ? idleBtn : offBtn}>
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button onClick={onToggleCam} title={camOn ? "Stop Video" : "Start Video"}
            className={camOn ? idleBtn : offBtn}>
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button onClick={onToggleScreenShare} title={screenShareOn ? "Stop Screen Share" : "Share Screen"}
            className={screenShareOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}>
            <MonitorUp className="size-5" />
          </button>
          <button onClick={onToggleCaptions ?? onCaptionSize} title={captionsOn ? "Hide Captions" : "Show Captions"}
            className={captionsOn ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn}>
            <Type className="size-5" />
          </button>
          <button onClick={onToggleTranscript} title={transcriptOn ? "Lower Hand" : "Raise Hand"}
            className={transcriptOn ? activeBtn("bg-amber-500 hover:bg-amber-600") : idleBtn}>
            <Hand className="size-5" />
          </button>
          <button onClick={onEmergency} title="Reactions"
            className={idleBtn}>
            <Smile className="size-5" />
          </button>
          <button onClick={onToggleParticipants} title="Participants"
            className={`${participantsOpen ? activeBtn("bg-[#2563eb] hover:bg-[#1d4ed8]") : idleBtn} relative`}>
            <Users className="size-5" />
            {!!participantCount && participantCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#1f2228]">
                {participantCount}
              </span>
            )}
          </button>
          <button onClick={onAi} title="AI Assistant" className={idleBtn}>
            <Sparkles className="size-5" />
          </button>
          <button onClick={onToggleDeaf} title={deafOn ? "Disable Deaf Mode" : "Enable Deaf Mode"}
            className={deafOn ? activeBtn("bg-purple-600 hover:bg-purple-700") : idleBtn}>
            {deafOn ? <EarOff className="size-5" /> : <Ear className="size-5" />}
          </button>
        </div>

        {/* Right: Leave */}
        <button
          onClick={handleLeave}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#ea4335] hover:bg-[#ea4335]/90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex-shrink-0"
        >
          <PhoneOff className="size-4" />
          <span>Leave Meet</span>
        </button>
      </div>
    </div>
  );
}
