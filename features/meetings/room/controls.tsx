import React from "react";
import { Mic, MicOff, Video, VideoOff, Type, Sparkles, AlertOctagon, PhoneOff, Captions, Ear, EarOff, Share2 } from "lucide-react";

interface ControlDockProps {
  micOn: boolean;
  camOn: boolean;
  transcriptOn: boolean;
  deafOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleTranscript: () => void;
  onToggleDeaf: () => void;
  onAi: () => void;
  onEmergency: () => void;
  onCaptionSize: () => void;
  onShare: () => void;
  onLeave: () => void;
}

export function ControlDock({ 
  micOn, 
  camOn, 
  transcriptOn, 
  deafOn, 
  onToggleMic, 
  onToggleCam, 
  onToggleTranscript, 
  onToggleDeaf, 
  onAi, 
  onEmergency, 
  onCaptionSize, 
  onShare, 
  onLeave 
}: ControlDockProps) {
  const ControlButton = ({ 
    children, 
    onClick, 
    label, 
    variant = "default", 
    active = false 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    label: string; 
    variant?: "default" | "danger" | "primary"; 
    active?: boolean 
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
              : "bg-muted text-foreground hover:bg-muted/70"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute -top-9 px-2 py-0.5 rounded-md bg-foreground text-background text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );

  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-3xl ring-1 ring-border shadow-bridge p-2 flex items-center gap-1.5">
      <ControlButton onClick={onToggleMic} label={micOn ? "Mute" : "Unmute"}>
        {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      </ControlButton>
      <ControlButton onClick={onToggleCam} label={camOn ? "Stop video" : "Start video"}>
        {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
      </ControlButton>
      <ControlButton onClick={onToggleTranscript} label={transcriptOn ? "Hide transcript" : "Show transcript"} active={transcriptOn}>
        <Captions className="size-5" />
      </ControlButton>
      <ControlButton onClick={onToggleDeaf} label={deafOn ? "Deaf mode on" : "Deaf mode off"} active={deafOn}>
        {deafOn ? <EarOff className="size-5" /> : <Ear className="size-5" />}
      </ControlButton>
      <ControlButton onClick={onCaptionSize} label="Caption size"><Type className="size-5" /></ControlButton>
      <div className="w-px h-8 bg-border mx-0.5" />
      <ControlButton onClick={onShare} label="Share room"><Share2 className="size-5" /></ControlButton>
      <ControlButton onClick={onAi} label="AI Assistant" variant="primary"><Sparkles className="size-5" /></ControlButton>
      <ControlButton onClick={onEmergency} label="Emergency phrases" variant="danger"><AlertOctagon className="size-5" /></ControlButton>
      <div className="w-px h-8 bg-border mx-0.5" />
      <ControlButton onClick={onLeave} label="Leave" variant="danger"><PhoneOff className="size-5" /></ControlButton>
    </div>
  );
}
