'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, useTracks, RoomAudioRenderer } from '@livekit/components-react';
import { Track, LocalParticipant, RemoteParticipant, VideoPresets, RoomOptions } from 'livekit-client';
import { Loader2, Copy, Check, Crown, User, LogIn, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

import { MeetingLayout } from '@/features/meetings/room/layout';
import { ControlDock } from '@/features/meetings/room/controls';
import { AiSignerView } from '@/features/accessibility/sign-language';
import { CaptionList } from '@/features/captions/caption-list';
import { ChatPanel } from '@/features/chat/chat-panel';
import { useMeeting } from '@/features/meetings/hooks/useMeeting';
import { ParticipantVideo, ScreenShareView } from '@/features/meetings/room/video-track';
import { RealTimeCaptionOverlay } from '@/features/meetings/room/real-time-caption-overlay';
import { ParticipantsPanel } from '@/features/meetings/room/participants-panel';
import { useAuth } from '@/features/auth/use-auth';
import { generateToken } from '@/services/livekit/room';

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

// ─── Guest Prompt Screen ────────────────────────────────────────────
function GuestPromptScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm p-8 rounded-[32px] glass-card border border-border text-center relative overflow-hidden shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-bridge-indigo/5 to-bridge-cyan/5 pointer-events-none" />
        <div className="relative size-16 rounded-2xl bg-gradient-to-br from-bridge-indigo/10 to-bridge-cyan/10 ring-1 ring-bridge-cyan/20 grid place-items-center mx-auto mb-6">
          <User className="size-6 text-bridge-indigo" />
        </div>
        <h2 className="relative text-2xl font-bold tracking-tight mb-2">Join Meeting</h2>
        <p className="relative text-muted-foreground text-sm mb-6">Please enter your name to join as a guest.</p>
        <form onSubmit={e => { e.preventDefault(); if (name.trim()) onJoin(name.trim()); }} className="flex flex-col gap-4 relative z-10">
          <input
            autoFocus
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-14 px-4 text-center rounded-2xl bg-muted/50 border border-border focus:ring-2 focus:ring-bridge-cyan outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
            maxLength={30}
          />
          <button
            disabled={!name.trim()}
            type="submit"
            className="w-full h-14 rounded-2xl font-bold text-white shadow-bridge-sm transition-all hover:scale-[0.98] disabled:hover:scale-100 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--color-bridge-indigo) 0%, var(--color-bridge-cyan) 100%)' }}
          >
            Join Now
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Post-leave screen ──────────────────────────────────────────────
function LeftMeetingScreen({
  code,
  isHost,
  onRejoin,
}: {
  code: string;
  isHost: boolean;
  onRejoin: () => void;
}) {
  const router = useRouter();
  const duration = useRef(Math.floor(Math.random() * 30) + 10); // mock duration

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-8">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-bridge-indigo/5 via-transparent to-bridge-cyan/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md text-center"
      >
        {/* Icon */}
        <div className="size-20 rounded-3xl bg-gradient-to-br from-bridge-indigo/20 to-bridge-cyan/20 border border-bridge-cyan/20 grid place-items-center mx-auto mb-6">
          <span className="text-4xl">{isHost ? '👑' : '👋'}</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {isHost ? 'You ended the session' : 'You left the meeting'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isHost
            ? 'The meeting has ended. You can start a new one anytime.'
            : `Meeting code: `}
          {!isHost && <span className="font-mono font-bold text-foreground">{code}</span>}
        </p>

        {/* Stats row for host */}
        {isHost && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-card ring-1 ring-border text-center">
              <div className="text-2xl font-bold text-bridge-cyan">{duration.current}m</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Duration</div>
            </div>
            <div className="p-4 rounded-2xl bg-card ring-1 ring-border text-center">
              <div className="text-2xl font-bold text-bridge-indigo">{Math.floor(Math.random() * 5) + 2}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Participants</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          {/* Rejoin button — always possible */}
          <button
            onClick={onRejoin}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition"
            style={{ background: 'linear-gradient(135deg, var(--color-bridge-indigo) 0%, var(--color-bridge-cyan) 100%)' }}
          >
            <RotateCcw className="size-5" />
            Rejoin Meeting
          </button>

          {isHost && (
            <button
              onClick={() => router.push('/create')}
              className="w-full h-12 rounded-2xl bg-card ring-1 ring-border font-medium flex items-center justify-center gap-2 hover:bg-muted transition"
            >
              <Crown className="size-4 text-amber-500" />
              Start New Meeting
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="w-full h-12 rounded-2xl font-medium text-muted-foreground flex items-center justify-center gap-2 hover:text-foreground transition"
          >
            <Home className="size-4" />
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Active speaker hook ─────────────────────────────────────────────
function useActiveSpeaker(participants: (LocalParticipant | RemoteParticipant)[]) {
  return useMemo(() => {
    const remote = participants.filter(p => p instanceof RemoteParticipant) as RemoteParticipant[];
    return remote.find(p => p.isSpeaking) ?? remote[0] ?? null;
  }, [participants]);
}

// ─── Inner component — inside LiveKitRoom context ────────────────────
function RoomContent({
  code,
  isHost,
  onLeave,
}: {
  code: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  const {
    micOn, camOn, screenShareOn, isDeafMode,
    captions, messages, participants,
    toggleMic, toggleCam, toggleScreenShare, toggleDeafMode, sendMessage, requestMute,
  } = useMeeting(code);

  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'captions' | 'chat'>('captions');
  const [captionSize, setCaptionSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [codeCopied, setCodeCopied] = useState(false);

  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const hasScreenShare = screenTracks.length > 0;
  const activeSpeaker = useActiveSpeaker(participants);
  const localParticipant = participants.find(p => p instanceof LocalParticipant) as LocalParticipant | undefined;
  const stripParticipants = hasScreenShare ? participants : participants.filter(p => p.identity !== activeSpeaker?.identity);

  const shareRoom = useCallback(async () => {
    const url = `${window.location.origin}/room/${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my Talk2Me meeting', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      }
    } catch {
      // fallback: copy code only
      await navigator.clipboard.writeText(code).catch(() => {});
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [code]);

  // ─── Topbar ────────────────────────────────────────────────────
  const topbar = (
    <div className="px-4 sm:px-6 h-14 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-20">
      {/* Left — logo + code */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-gradient-to-br from-bridge-indigo to-bridge-cyan grid place-items-center text-white text-[10px] font-black">T2</div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-lg">
          <span className="text-xs font-mono font-bold">{code}</span>
          <button
            onClick={shareRoom}
            title={codeCopied ? 'Link copied!' : 'Copy invite link'}
            className="text-bridge-indigo ml-1 hover:text-bridge-indigo/70 transition-colors"
          >
            {codeCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Right — role badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={`size-1.5 rounded-full ${participants.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-muted'}`} />
          <span className="text-muted-foreground hidden sm:block">{participants.length} in call</span>
        </div>

        {hasScreenShare && (
          <span className="px-2 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-lg uppercase animate-pulse hidden sm:flex">
            Screen Sharing
          </span>
        )}

        {/* Role badge — distinct for host vs guest */}
        {isHost ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
            <Crown className="size-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wide">Host</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-muted-foreground">
            <User className="size-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Participant</span>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Sidebar ───────────────────────────────────────────────────
  const sidebar = transcriptOpen && !isDeafMode ? (
    <div className="h-full glass-card rounded-[24px] p-5 flex flex-col border border-border/50">
      <div className="flex items-center gap-3 mb-5 p-1 bg-muted/40 rounded-xl">
        <button onClick={() => setActiveTab('captions')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'captions' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
          Captions
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'chat' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
          Chat
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'captions'
          ? <CaptionList captions={captions} size={captionSize} />
          : <ChatPanel messages={messages} onSendMessage={sendMessage} />
        }
      </div>

      {/* Guest sign-in nudge in sidebar */}
      {!isHost && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="p-3 rounded-xl bg-bridge-indigo/5 border border-bridge-indigo/20 text-center">
            <p className="text-[10px] text-muted-foreground mb-2">Sign in to host your own meetings</p>
            <a href="/auth" className="text-[10px] font-black uppercase tracking-wider text-bridge-indigo flex items-center justify-center gap-1">
              <LogIn className="size-3" /> Create Account
            </a>
          </div>
        </div>
      )}
    </div>
  ) : null;

  // ─── Main stage ────────────────────────────────────────────────
  const mainStage = isDeafMode ? (
    <AiSignerView currentCaption={captions[captions.length - 1]?.content} />
  ) : hasScreenShare ? (
    <div className="relative flex-1 w-full h-full min-h-0">
      <ScreenShareView className="w-full h-full rounded-2xl sm:rounded-[32px]" />
      {localParticipant && (
        <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-44 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl ring-2 ring-border z-10 transition-all">
          <ParticipantVideo participant={localParticipant} source={Track.Source.Camera} className="w-full h-full object-cover" mirrored />
        </div>
      )}
    </div>
  ) : (
    <div className="relative flex-1 w-full h-full min-h-0">
      <div className="w-full h-full rounded-2xl sm:rounded-[32px] overflow-hidden bg-slate-950 sm:ring-1 sm:ring-white/10">
        {activeSpeaker ? (
          <ParticipantVideo participant={activeSpeaker} source={Track.Source.Camera} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="size-24 rounded-full bg-gradient-to-br from-bridge-indigo/20 to-bridge-cyan/20 grid place-items-center ring-1 ring-bridge-cyan/20">
              <span className="text-4xl">👋</span>
            </div>
            <p className="text-sm font-medium">
              {isHost ? 'Waiting for participants to join...' : 'Connecting to the room...'}
            </p>
            {isHost && (
              <button onClick={shareRoom} className="text-[10px] font-black uppercase tracking-wider text-bridge-indigo flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bridge-indigo/10 hover:bg-bridge-indigo/20 transition">
                <Copy className="size-3.5" /> {codeCopied ? 'Copied!' : 'Copy invite link'}
              </button>
            )}
          </div>
        )}
      </div>
      {/* Self-view PiP */}
      {localParticipant && (
        <div className="absolute bottom-4 right-4 w-24 h-36 sm:w-44 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl ring-1 sm:ring-2 ring-border/60 z-10 bg-slate-900 transition-all">
          <ParticipantVideo participant={localParticipant} source={Track.Source.Camera} className="w-full h-full object-cover" mirrored />
        </div>
      )}
    </div>
  );

  return (
    <>
      <MeetingLayout isDeafMode={isDeafMode} topbar={topbar} sidebar={sidebar}
        dock={
          <ControlDock
            micOn={micOn} camOn={camOn} screenShareOn={screenShareOn}
            transcriptOn={transcriptOpen} deafOn={isDeafMode}
            participantsOpen={participantsOpen} participantCount={participants.length}
            onToggleMic={toggleMic} onToggleCam={toggleCam}
            onToggleScreenShare={toggleScreenShare}
            onToggleTranscript={() => setTranscriptOpen(v => !v)}
            onToggleDeaf={toggleDeafMode}
            onToggleParticipants={() => setParticipantsOpen(v => !v)}
            onAi={() => { setActiveTab('chat'); setTranscriptOpen(true); }}
            onEmergency={() => alert('Emergency alert sent!')}
            onCaptionSize={() => setCaptionSize(s => s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm')}
            onShare={shareRoom}
            onLeave={onLeave}
            isHost={isHost}
          />
        }
      >
        <div className="relative w-full h-[calc(100vh-14rem)] min-h-[400px]">
          {mainStage}
          {!isDeafMode && <RealTimeCaptionOverlay captions={captions} size={captionSize} />}
        </div>

        {/* Thumbnail strip */}
        {!isDeafMode && !hasScreenShare && stripParticipants.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {stripParticipants.map(p => (
              <div key={p.sid || p.identity} className="flex-shrink-0 w-36 h-24 rounded-2xl overflow-hidden ring-1 ring-border bg-slate-900">
                <ParticipantVideo participant={p} source={Track.Source.Camera} className="w-full h-full rounded-2xl" mirrored={p instanceof LocalParticipant} />
              </div>
            ))}
          </div>
        )}
      </MeetingLayout>

      <ParticipantsPanel participants={participants} hostId={isHost ? localParticipant?.identity : undefined} isOpen={participantsOpen} onClose={() => setParticipantsOpen(false)} onMuteRequest={isHost ? requestMute : undefined} />
    </>
  );
}

// ─── Outer page — handles token fetch, auth role, leave/rejoin ───────
export default function RoomPage() {
  const params = useParams();
  const code = params.code as string;
  const { user, loading: authLoading } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLeft, setHasLeft] = useState(false);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const hasFetchedToken = useRef(false);

  // A user is a host if they're signed in
  const isHost = !!user;

  const roomOptions = useMemo<RoomOptions>(() => ({
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      videoSimulcastLayers: [
        VideoPresets.h360,
        VideoPresets.h180,
      ],
      videoEncode: {
        maxBitrate: 400_000,
        maxFramerate: 24,
      },
    },
  }), []);

  const fetchToken = useCallback(async (customName?: string) => {
    if (!code) return;
    const username = customName || user?.email?.split('@')[0];
    if (!username) return; // Prevent token fetch without a name
    try {
      const t = await generateToken(code, username);
      setToken(t);
      setHasLeft(false);
      setShowGuestPrompt(false);
    } catch (e) {
      console.error('Failed to generate LiveKit token:', e);
      setError('Could not connect to the room. Please check your connection.');
    }
  }, [code, user]);

  useEffect(() => {
    if (authLoading) return; // wait until auth is resolved
    if (hasFetchedToken.current) return;
    
    if (user) {
      hasFetchedToken.current = true;
      fetchToken();
    } else {
      setShowGuestPrompt(true);
    }
  }, [authLoading, user, fetchToken]);

  const handleLeave = useCallback(() => {
    setToken(null);
    setHasLeft(true);
  }, []);

  const handleRejoin = useCallback(() => {
    hasFetchedToken.current = false;
    if (user) {
      fetchToken();
    } else {
      setShowGuestPrompt(true);
      setHasLeft(false);
    }
  }, [fetchToken, user]);

  // Guest Name Prompt Screen
  if (showGuestPrompt) {
    return <GuestPromptScreen onJoin={(name) => { hasFetchedToken.current = true; fetchToken(name); }} />;
  }

  // Left screen
  if (hasLeft) {
    return (
      <LeftMeetingScreen code={code} isHost={isHost} onRejoin={handleRejoin} />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6 bg-background">
        <div className="size-16 rounded-2xl bg-red-500/10 grid place-items-center text-3xl">⚠️</div>
        <h2 className="font-bold text-xl">Connection Failed</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <a href="/" className="text-sm font-bold text-bridge-indigo underline">Go Home</a>
      </div>
    );
  }

  if (!token || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="size-10 animate-spin text-bridge-indigo" />
        <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Connecting to room...</p>
      </div>
    );
  }


  return (
    <LiveKitRoom 
      token={token} 
      serverUrl={LIVEKIT_URL} 
      connect={true} 
      audio={true} 
      video={{ resolution: VideoPresets.h360.resolution }}
      options={roomOptions}
    >
      <RoomAudioRenderer />
      <RoomContent code={code} isHost={isHost} onLeave={handleLeave} />
    </LiveKitRoom>
  );
}
