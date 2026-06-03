import React from "react";
import {
  Mic, MicOff, Video, VideoOff, Type, Sparkles,
  AlertOctagon, PhoneOff, Captions, Ear, EarOff,
  Share2, MonitorUp, Users, Crown
} from "lucide-react";

interface ControlDockProps {
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
  onToggleParticipants: () => void;
  onAi: () => void;
  onEmergency: () => void;
  onCaptionSize: () => void;
  onShare: () => void;
  onLeave: () => void;
  participantCount?: number;
  participantsOpen?: boolean;
}

export function ControlDock({
  micOn, camOn, screenShareOn, transcriptOn, deafOn,
  isHost,
  onToggleMic, onToggleCam, onToggleScreenShare,
  onToggleTranscript, onToggleDeaf, onToggleParticipants,
  participantCount, participantsOpen,
  onAi, onEmergency, onCaptionSize, onShare, onLeave,
}: ControlDockProps) {
  const ControlButton = ({
    children, onClick, label,
    variant = "default", active = false,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    label: string;
    variant?: "default" | "danger" | "primary" | "amber";
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      aria-label={label}
      className={`group relative grid place-items-center size-12 rounded-2xl transition-all active:scale-95 ${
        active
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : variant === "danger"
            ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            : variant === "primary"
              ? "bg-primary text-primary-foreground shadow-bridge-sm"
              : variant === "amber"
                ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white"
                : "bg-muted text-foreground hover:bg-muted/70"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute -top-9 px-2 py-0.5 rounded-md bg-foreground text-background text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  );

  const handleLeave = () => {
    const message = isHost
      ? "End the meeting for everyone?"
      : "Leave this meeting?";
    if (window.confirm(message)) {
      onLeave();
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-[28px] sm:rounded-3xl ring-1 ring-border shadow-bridge p-1.5 sm:p-2 flex items-center gap-1 sm:gap-1.5 max-w-[95vw] overflow-x-auto no-scrollbar">
      {/* Media controls */}
      <ControlButton onClick={onToggleMic} label={micOn ? "Mute" : "Unmute"} active={!micOn} variant={!micOn ? "danger" : "default"}>
        {micOn ? <Mic className="size-5 sm:size-5" /> : <MicOff className="size-5 sm:size-5" />}
      </ControlButton>
      <ControlButton onClick={onToggleCam} label={camOn ? "Stop video" : "Start video"} active={!camOn} variant={!camOn ? "danger" : "default"}>
        {camOn ? <Video className="size-5 sm:size-5" /> : <VideoOff className="size-5 sm:size-5" />}
      </ControlButton>
      <ControlButton onClick={onToggleScreenShare} label={screenShareOn ? "Stop sharing" : "Share screen"} active={screenShareOn}>
        <MonitorUp className="size-5 sm:size-5" />
      </ControlButton>

      <div className="flex-shrink-0 w-px h-8 bg-border mx-0.5" />

      {/* Accessibility controls */}
      <ControlButton onClick={onToggleTranscript} label={transcriptOn ? "Hide captions" : "Show captions"} active={transcriptOn}>
        <Captions className="size-5 sm:size-5" />
      </ControlButton>
      <ControlButton onClick={onToggleDeaf} label={deafOn ? "Deaf mode on" : "Exit deaf mode"} active={deafOn}>
        {deafOn ? <EarOff className="size-5 sm:size-5" /> : <Ear className="size-5 sm:size-5" />}
      </ControlButton>
      <ControlButton onClick={onCaptionSize} label="Caption size">
        <Type className="size-5 sm:size-5" />
      </ControlButton>

      <div className="flex-shrink-0 w-px h-8 bg-border mx-0.5" />

      {/* Social + AI */}
      <ControlButton onClick={onShare} label="Share room code">
        <Share2 className="size-5 sm:size-5" />
      </ControlButton>
      <ControlButton onClick={onToggleParticipants} label="Participants" active={participantsOpen}>
        <div className="relative">
          <Users className="size-5 sm:size-5" />
          {!!participantCount && participantCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-bridge-cyan text-white text-[9px] font-bold grid place-items-center">
              {participantCount > 9 ? "9+" : participantCount}
            </span>
          )}
        </div>
      </ControlButton>
      <ControlButton onClick={onAi} label="AI Assistant" variant="primary">
        <Sparkles className="size-5 sm:size-5" />
      </ControlButton>
      <ControlButton onClick={onEmergency} label="Emergency alert" variant="danger">
        <AlertOctagon className="size-5 sm:size-5" />
      </ControlButton>

      <div className="flex-shrink-0 w-px h-8 bg-border mx-0.5" />

      {/* Leave / End — visually distinct per role */}
      <div className="flex-shrink-0">
        {isHost ? (
          <button
            onClick={handleLeave}
            aria-label="End meeting for all"
            className="group relative flex items-center gap-2 px-3 sm:px-4 h-12 rounded-2xl bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all text-[10px] sm:text-[11px] font-black uppercase tracking-wide shadow-lg"
          >
            <Crown className="size-4" />
            <span className="hidden sm:inline">End</span>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-foreground text-background text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              End for everyone
            </span>
          </button>
        ) : (
          <ControlButton onClick={handleLeave} label="Leave meeting" variant="danger">
            <PhoneOff className="size-5 sm:size-5" />
          </ControlButton>
        )}
      </div>
    </div>
  );
}
