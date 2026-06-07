import React from "react";
import {
  Mic, MicOff, Video, VideoOff, Type, Sparkles,
  Smile, PhoneOff, Hand, Ear, EarOff,
  Share2, MonitorUp, Users, Crown, MessageSquare
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
  onToggleChat?: () => void;
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
  onToggleChat,
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
      className={`group relative flex justify-center items-center w-[4.5rem] h-16 md:size-12 rounded-[24px] md:rounded-2xl flex-shrink-0 transition-all active:scale-95 ${
        active
          ? "bg-primary/20 text-primary ring-1 ring-primary/30 shadow-inner"
          : variant === "danger"
            ? "bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            : variant === "primary"
              ? "bg-primary text-primary-foreground shadow-bridge-sm"
              : variant === "amber"
                ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500 hover:text-white"
                : "bg-muted text-foreground hover:bg-muted/70"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute -top-10 px-3 py-1 rounded-lg bg-foreground text-background text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
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
    <div className="bg-card/90 backdrop-blur-3xl rounded-[32px] md:rounded-3xl ring-1 ring-border/50 shadow-bridge p-2 md:p-2 flex items-center gap-2 md:gap-1.5 max-w-[95vw] overflow-x-auto no-scrollbar scroll-smooth">
      {/* Media controls */}
      <ControlButton onClick={onToggleMic} label={micOn ? "Mute" : "Unmute"} active={!micOn} variant={!micOn ? "danger" : "default"}>
        {micOn ? <Mic className="size-7 md:size-5" /> : <MicOff className="size-7 md:size-5" />}
      </ControlButton>
      <ControlButton onClick={onToggleCam} label={camOn ? "Stop video" : "Start video"} active={!camOn} variant={!camOn ? "danger" : "default"}>
        {camOn ? <Video className="size-7 md:size-5" /> : <VideoOff className="size-7 md:size-5" />}
      </ControlButton>
      <ControlButton onClick={onToggleScreenShare} label={screenShareOn ? "Stop sharing" : "Share screen"} active={screenShareOn}>
        <MonitorUp className="size-7 md:size-5" />
      </ControlButton>

      <div className="flex-shrink-0 w-px h-10 md:h-8 bg-border/80 mx-1 md:mx-0.5" />

      {/* Accessibility controls */}
      <ControlButton onClick={onToggleTranscript} label={transcriptOn ? "Lower hand" : "Raise hand"} active={transcriptOn}>
        <Hand className="size-7 md:size-5" />
      </ControlButton>
      <ControlButton onClick={onToggleDeaf} label={deafOn ? "Deaf mode on" : "Exit deaf mode"} active={deafOn}>
        {deafOn ? <EarOff className="size-7 md:size-5" /> : <Ear className="size-7 md:size-5" />}
      </ControlButton>
      <ControlButton onClick={onCaptionSize} label="Caption size">
        <Type className="size-7 md:size-5" />
      </ControlButton>

      <div className="flex-shrink-0 w-px h-10 md:h-8 bg-border/80 mx-1 md:mx-0.5" />

      {/* Social + AI */}
      <ControlButton onClick={onShare} label="Share room code">
        <Share2 className="size-7 md:size-5" />
      </ControlButton>
      {onToggleChat && (
        <ControlButton onClick={onToggleChat} label="Chat">
          <MessageSquare className="size-7 md:size-5" />
        </ControlButton>
      )}
      <ControlButton onClick={onToggleParticipants} label="Participants" active={participantsOpen}>
        <div className="relative">
          <Users className="size-7 md:size-5" />
          {!!participantCount && participantCount > 0 && (
            <span className="absolute -top-2 -right-2 md:-top-1.5 md:-right-1.5 size-5 md:size-4 rounded-full bg-bridge-cyan text-white text-[10px] md:text-[9px] font-bold flex items-center justify-center border-2 border-background">
              {participantCount > 9 ? "9+" : participantCount}
            </span>
          )}
        </div>
      </ControlButton>
      <ControlButton onClick={onAi} label="AI Assistant" variant="primary">
        <Sparkles className="size-7 md:size-5" />
      </ControlButton>
      <ControlButton onClick={onEmergency} label="Reactions" variant="primary">
        <Smile className="size-7 md:size-5" />
      </ControlButton>

      <div className="flex-shrink-0 w-px h-10 md:h-8 bg-border/80 mx-1 md:mx-0.5" />

      {/* Leave / End — visually distinct per role */}
      <div className="flex-shrink-0 pl-1 pr-1">
        {isHost ? (
          <button
            onClick={handleLeave}
            aria-label="End meeting for all"
            className="group relative flex items-center justify-center gap-2 px-6 md:px-4 h-16 md:h-12 rounded-[24px] md:rounded-2xl bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-lg"
          >
            <Crown className="size-5 md:size-4" />
            <span className="text-xs md:text-[11px] font-black uppercase tracking-widest hidden md:inline">End</span>
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-foreground text-background text-[11px] font-bold opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
              End for everyone
            </span>
          </button>
        ) : (
          <ControlButton onClick={handleLeave} label="Leave meeting" variant="danger">
            <PhoneOff className="size-7 md:size-5" />
          </ControlButton>
        )}
      </div>
    </div>
  );
}
