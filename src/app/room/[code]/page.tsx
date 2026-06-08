'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, useTracks, RoomAudioRenderer } from '@livekit/components-react';
import { Track, LocalParticipant, RemoteParticipant, VideoPresets, RoomOptions } from 'livekit-client';
import { Loader2, Copy, Check, Crown, User, LogIn, ArrowRight, RotateCcw, Home, Video, VideoOff, Mic, MicOff, Eye, EyeOff, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { MeetingLayout } from '@/features/meetings/room/layout';
import { ControlDock } from '@/features/meetings/room/controls';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { AiSignerView } from '@/features/accessibility/sign-language';
import { CaptionList } from '@/features/captions/caption-list';
import { ChatPanel } from '@/features/chat/chat-panel';
import { useMeeting } from '@/features/meetings/hooks/useMeeting';
import { ParticipantVideo, ScreenShareView } from '@/features/meetings/room/video-track';
import { RealTimeCaptionOverlay } from '@/features/meetings/room/real-time-caption-overlay';
import { ParticipantsPanel } from '@/features/meetings/room/participants-panel';
import { CameraPreview } from '@/features/meetings/room/camera-preview';
import { useAuth } from '@/features/auth/use-auth';
import { generateToken } from '@/services/livekit/room';

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

// ─── Pre-Join Lobby ──────────────────────────────────────────────────
function PreJoinLobby({ 
  onJoin, 
  defaultName = '', 
  isHost = false 
}: { 
  onJoin: (name: string) => void, 
  defaultName?: string, 
  isHost?: boolean 
}) {
  const [name, setName] = useState(defaultName);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function setupAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        audioStreamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.fftSize;
        const data = new Uint8Array(bufferLength);
        let smooth = 0;
        const tick = () => {
          if (!analyserRef.current) return;
          // use time-domain data for amplitude (RMS) — more sensitive for voice
          analyserRef.current.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128; // normalize to [-1,1]
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / data.length); // 0..1
          // exponential smoothing to avoid jitter — make more responsive
          smooth = smooth * 0.6 + rms * 0.4;
          // apply higher gain so speaking drives the meter into mid/high range
          const GAIN = 8;
          setAudioLevel(Math.min(1, smooth * GAIN));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        // ignore audio permission errors here — user can still join
      }
    }

    if (micOn) setupAudio();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      analyserRef.current = null;
    };
  }, [micOn]);

  // make speaking detection sensitive — lower threshold
  const isSpeaking = audioLevel > 0.03;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl p-6 rounded-[24px] glass-card border border-border relative overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className={`relative rounded-lg overflow-hidden h-64 sm:h-80 md:h-auto ${isSpeaking ? 'ring-4 ring-emerald-400/20 shadow-[0_0_40px_rgba(16,185,129,0.12)]' : ''}`}>
          <CameraPreview camOn={camOn} />
          {isSpeaking && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-start justify-end p-4">
              <div className="relative">
                <span className="absolute -inset-2 rounded-full bg-emerald-400/10 animate-orb-pulse" />
                <div className="relative px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Live • Speaking
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:-translate-x-0 flex items-center gap-3 z-30">
            <button onClick={() => setCamOn(v => !v)} aria-label="Toggle camera" className="px-4 py-3 md:px-3 md:py-2 rounded-full bg-black/50 backdrop-blur text-white flex items-center gap-2 touch-manipulation">
              {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              <span className="text-sm md:text-xs font-bold">{camOn ? 'Video' : 'Video Off'}</span>
            </button>
            <button onClick={() => setMicOn(v => !v)} aria-label="Toggle microphone" className="px-4 py-3 md:px-3 md:py-2 rounded-full bg-black/50 backdrop-blur text-white flex items-center gap-2 touch-manipulation">
              {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              <span className="text-sm md:text-xs font-bold">{micOn ? 'Mic' : 'Mic Off'}</span>
            </button>
          </div>
          <div className="absolute top-4 left-4 z-30">
            <div className="px-3 py-1.5 rounded-full bg-black/40 text-white text-[10px] font-bold">Preview</div>
          </div>

        
        </div>

        <div className="flex flex-col justify-center p-4">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Join Meeting</h2>
          <p className="text-muted-foreground text-sm mb-4">{isHost ? "You're joining as the Host." : "Please enter your name to join."}</p>

          {!micOn && !camOn && (
            <div className="mb-3 text-sm text-muted-foreground text-center">Tap the controls below to enable your camera and microphone.</div>
          )}

          <div className="mb-4">
            <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden mb-2">
              <div
                style={{ width: `${Math.min(100, Math.round(audioLevel * 100))}%` }}
                className={`h-full transition-all ${isSpeaking ? 'bg-gradient-to-r from-emerald-400 via-bridge-cyan to-bridge-indigo' : 'bg-bridge-cyan'}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground">Microphone level</div>
              {isSpeaking ? (
                <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-2">
                  <span className="relative w-3 h-3">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-orb-pulse" />
                    <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-2xl" />
                  </span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-bridge-cyan">Speaking</span>
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); if (name.trim() || isHost) onJoin(name.trim() || 'Host'); }} className="flex flex-col gap-4 relative z-40">
            {!isHost ? (
              <input
                autoFocus
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-14 px-4 text-center rounded-2xl bg-muted/50 border border-border focus:ring-2 focus:ring-bridge-cyan outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                maxLength={30}
              />
            ) : (
              <div className="w-full h-14 px-4 flex items-center justify-center rounded-2xl bg-muted/50 border border-border font-bold text-foreground truncate">
                {name || "Host"}
              </div>
            )}
            <button
              disabled={!name.trim() && !isHost}
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-white shadow-bridge-sm transition-all hover:scale-[0.98] disabled:hover:scale-100 disabled:opacity-50 z-50 bg-gradient-to-br from-bridge-indigo to-bridge-cyan ring-1 ring-white/10"
              style={{ backgroundColor: '#4f46e5' }}
            >
              Ready to Join
            </button>
          </form>
        </div>
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
            className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition bg-gradient-to-br from-bridge-indigo to-bridge-cyan ring-1 ring-white/10"
            style={{ backgroundColor: '#4f46e5' }}
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

// Draggable self-view component (simple pointer-based dragging)
function HidableSelfView({ participant, absolute = false, raised, reactions }: { participant: LocalParticipant; absolute?: boolean; raised?: boolean; reactions?: { id: string; sender_id: string; emoji: string; timestamp: string }[] }) {
  const [hidden, setHidden] = useState(false);
  const width = 160;
  const height = 220;
  const containerStyle: React.CSSProperties = absolute
    ? { right: 16, bottom: 16, width, height, position: 'absolute', zIndex: 40 }
    : { right: 20, bottom: 100, width, height, position: 'fixed', zIndex: 60 };
  const miniStyle: React.CSSProperties = absolute
    ? { right: 14, bottom: 14, position: 'absolute', zIndex: 40 }
    : { right: 18, bottom: 28, position: 'fixed', zIndex: 60 };

  const containerVariants = {
    hidden: { opacity: 0, y: 30, x: 20, scale: 0.97 },
    visible: { opacity: 1, y: 0, x: 0, scale: 1 },
    exit: { opacity: 0, y: 30, x: 20, scale: 0.97 },
  };
  const miniVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  };

  return (
    <AnimatePresence>
      {!hidden ? (
        <motion.div
          key="selfview"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={containerStyle}
          className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-border bg-slate-900"
        >
          <div className="relative w-full h-full">
            <ParticipantVideo participant={participant} source={Track.Source.Camera} className="w-full h-full object-cover" mirrored raised={!!raised} reactions={reactions ?? []} />
            <button onClick={() => setHidden(true)} aria-label="Hide self view" className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2">
              ✕
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="selfview-mini"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={miniVariants}
          transition={{ duration: 0.18 }}
          style={miniStyle}
        >
          <button
            onClick={() => setHidden(false)}
            aria-label="Show self view"
            title="Show your camera"
            className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-bridge-indigo to-bridge-cyan text-white shadow-2xl flex items-center justify-center ring-2 ring-white/20 animate-pulse"
          >
            <Video className="size-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
    raisedHands, reactions, toggleRaiseHand, sendReaction,
  } = useMeeting(code);

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'captions' | 'chat'>('captions');
  const [captionSize, setCaptionSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [codeCopied, setCodeCopied] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const hasScreenShare = screenTracks.length > 0;
  const activeSpeaker = useActiveSpeaker(participants);
  const localParticipant = participants.find(p => p instanceof LocalParticipant) as LocalParticipant | undefined;
  const stripParticipants = hasScreenShare ? participants : participants.filter(p => p.identity !== activeSpeaker?.identity && p.identity !== localParticipant?.identity);

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
  // Meeting duration timer (local to RoomContent)
  const { user: authUser } = useAuth();
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSecondsElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatDuration = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Recording and network indicators (placeholders)
  const [recordingOn, setRecordingOn] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'ok' | 'poor'>('good');

  const [displayName, setDisplayName] = useState<string | null>(() => {
    try { return localStorage.getItem('t2_display_name'); } catch { return null; }
  });

  const openRename = () => {
    const newName = window.prompt('Enter display name (applies on rejoin):', displayName || authUser?.email?.split('@')[0] || '');
    if (newName !== null) {
      setDisplayName(newName);
      try { localStorage.setItem('t2_display_name', newName); } catch {}
      alert('Display name saved. Rejoin to apply the change.');
    }
  };
  const [viewMode, setViewMode] = useState<'grid' | 'speaker' | 'focus' | 'fullscreen'>('grid');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [showTopbar, setShowTopbar] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && viewMode === 'fullscreen') {
        setViewMode('grid');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [viewMode]);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setViewMode('fullscreen');
    } catch (e) {
      console.warn('Fullscreen request failed', e);
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setViewMode('grid');
  };
  const topbar = (
    <div className={`transition-transform duration-300 ${showTopbar ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between border-b border-border bg-black/30 backdrop-blur-xl border-white/10">
      {/* Left — logo + code */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button className="sm:hidden p-2 rounded-md bg-black/20 backdrop-blur text-white" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Open menu">
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
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

          {/* Mobile summary: keep participant count and timer visible */}
          <div className="flex items-center gap-2 sm:hidden ml-2">
            <div className="text-xs font-bold">{participants ? participants.length : 0}</div>
            <div className="text-xs text-muted-foreground">•</div>
            <div className="text-xs text-muted-foreground">{formatDuration(secondsElapsed)}</div>
          </div>
        </div>

      {/* Right — role badge + meeting info */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-xs text-muted-foreground mr-2">
          <span className="font-bold text-foreground">Meeting: {code}</span>
          <span className="text-[11px]">{participants.length} participants • {formatDuration(secondsElapsed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${networkQuality === 'good' ? 'bg-emerald-400' : networkQuality === 'ok' ? 'bg-amber-400' : 'bg-red-500'}`} title={`Network: ${networkQuality}`} />
          <div className={`px-2 py-1 rounded-md text-[11px] ${recordingOn ? 'bg-red-600 text-white' : 'bg-muted/40 text-muted-foreground'}`}>{recordingOn ? 'REC' : 'Not recording'}</div>
        </div>
        {/* View selector */}
        <div className="relative">
          <button onClick={() => setViewMenuOpen(v => !v)} className="px-3 py-1 rounded-lg bg-muted/40 text-xs font-bold">View</button>
          {viewMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-card rounded-lg ring-1 ring-border shadow-xl z-50">
                <button onClick={() => { setViewMode('grid'); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 ${viewMode==='grid' ? 'bg-muted/30' : ''}`}>Grid</button>
                <button onClick={() => { setViewMode('speaker'); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 ${viewMode==='speaker' ? 'bg-muted/30' : ''}`}>Speaker</button>
                <button onClick={() => { setViewMode('focus'); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 ${viewMode==='focus' ? 'bg-muted/30' : ''}`}>Focus</button>
                <button onClick={() => { enterFullscreen(); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 ${viewMode==='fullscreen' ? 'bg-muted/30' : ''}`}>Fullscreen</button>
              </div>
            )}

          {/* Mobile menu panel */}
          {mobileMenuOpen && (
            <div className="absolute left-3 top-full mt-2 w-56 bg-card rounded-lg ring-1 ring-border shadow-xl z-50 p-2 sm:hidden">
              <button onClick={() => { openRename(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Profile • {displayName ?? (authUser?.email?.split('@')[0] ?? 'Guest')}</button>
              <div className="border-t border-border my-1" />
              <div className="text-xs text-muted-foreground px-3 py-1">View</div>
              <button onClick={() => { setViewMode('grid'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Grid</button>
              <button onClick={() => { setViewMode('speaker'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Speaker</button>
              <button onClick={() => { setViewMode('focus'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Focus</button>
              <button onClick={() => { enterFullscreen(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Fullscreen</button>
              <div className="border-t border-border my-1" />
              <button onClick={() => { shareRoom(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Share</button>
              <button onClick={() => { setTranscriptOpen(v => !v); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">{transcriptOpen ? 'Hide captions' : 'Show captions'}</button>
              <button onClick={() => { setParticipantsOpen(v => !v); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Participants</button>
              <button onClick={() => { setChatModalOpen(v => !v); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted/20 rounded">Chat</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={`size-1.5 rounded-full ${participants.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-muted'}`} />
          <span className="text-muted-foreground hidden sm:block">{participants.length} in call</span>
        </div>

        {hasScreenShare && (
          <span className="px-2 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-lg uppercase animate-pulse hidden sm:flex">
            Screen Sharing
          </span>
        )}

        {/* Role badge */}
        <div className="relative">
          <button onClick={openRename} title="Profile / settings" className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/30">
            <User className="size-4" />
            <span className="text-[12px] font-medium">{displayName ?? (authUser?.email?.split('@')[0] ?? 'Guest')}</span>
          </button>
        </div>
        <div className="ml-2 hidden sm:block">
          <button onClick={() => setShowTopbar(false)} title="Hide topbar" className="size-8 rounded-md bg-muted/20 p-2 grid place-items-center">
            <EyeOff className="size-4" />
          </button>
        </div>
      </div>
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
        <HidableSelfView participant={localParticipant} absolute raised={!!raisedHands[localParticipant.identity]} reactions={reactions.filter(r => r.sender_id === localParticipant.identity)} />
      )}
    </div>
  ) : (
    <div className="relative flex-1 w-full h-full min-h-0">
      <div className="w-full h-full rounded-2xl sm:rounded-[32px] overflow-hidden bg-slate-950 sm:ring-1 sm:ring-white/10">
        {activeSpeaker ? (
          <ParticipantVideo participant={activeSpeaker} source={Track.Source.Camera} className="w-full h-full" raised={!!raisedHands[activeSpeaker.identity]} reactions={reactions.filter(r => r.sender_id === activeSpeaker.identity)} />
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
      {/* Self-view PiP (only in grid view) */}
      {localParticipant && viewMode !== 'focus' && (
        <HidableSelfView participant={localParticipant} absolute raised={!!raisedHands[localParticipant.identity]} reactions={reactions.filter(r => r.sender_id === localParticipant.identity)} />
      )}
    </div>
  );

  // Use available layout height so the video fills to the bottom and overlays (controls/captions) sit on top
  const mainContainerClass = viewMode === 'grid' ? "relative w-full h-full min-h-[400px]" : "relative w-full h-full min-h-0";

  return (
    <>
      <MeetingLayout isDeafMode={isDeafMode} topbar={topbar} fullBleed={viewMode !== 'grid'}
        dock={
          <ControlDock
            micOn={micOn} camOn={camOn} screenShareOn={screenShareOn}
            transcriptOn={!!raisedHands[localParticipant?.identity || '']} deafOn={isDeafMode}
            participantsOpen={participantsOpen} participantCount={participants.length}
            onToggleMic={toggleMic} onToggleCam={toggleCam}
            onToggleScreenShare={toggleScreenShare}
            onToggleTranscript={() => toggleRaiseHand()}
            onToggleDeaf={toggleDeafMode}
            onToggleParticipants={() => setParticipantsOpen(v => !v)}
            onAi={() => { setActiveTab('chat'); setChatModalOpen(true); }}
            onToggleChat={() => { setActiveTab('chat'); setChatModalOpen(v => !v); }}
            onEmergency={() => setEmojiOpen(v => !v)}
            onCaptionSize={() => setCaptionSize(s => s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm')}
            captionsOn={transcriptOpen} onToggleCaptions={() => setTranscriptOpen(v => !v)}
            onShare={shareRoom}
            onLeave={onLeave}
            isHost={isHost}
          />
        }
      >
        <div className={mainContainerClass}>
          {mainStage}
          {/* Show captions only when transcript/captions are turned on */}
          {!isDeafMode && transcriptOpen && <RealTimeCaptionOverlay captions={captions} speakerName={activeSpeaker?.identity} size={captionSize} />}
        </div>

        {/* Thumbnail strip (only in grid view) */}
        {!isDeafMode && !hasScreenShare && stripParticipants.length > 0 && viewMode === 'grid' && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {stripParticipants.map(p => (
              <div key={p.sid || p.identity} className="flex-shrink-0 w-36 h-24 rounded-2xl overflow-hidden ring-1 ring-border bg-slate-900">
                  <ParticipantVideo participant={p} source={Track.Source.Camera} className="w-full h-full rounded-2xl" mirrored={p instanceof LocalParticipant} raised={!!raisedHands[p.identity]} reactions={reactions.filter(r => r.sender_id === p.identity)} />
              </div>
            ))}
          </div>
        )}
      </MeetingLayout>

      {/* Floating show-topbar button when topbar is hidden */}
      {!showTopbar && (
        <button onClick={() => setShowTopbar(true)} title="Show topbar" className="fixed top-3 right-3 z-50 bg-black/30 backdrop-blur rounded-full p-2 pointer-events-auto">
          <Eye className="size-5 text-white" />
        </button>
      )}

      <ParticipantsPanel participants={participants} hostId={isHost ? localParticipant?.identity : undefined} isOpen={participantsOpen} onClose={() => setParticipantsOpen(false)} onMuteRequest={isHost ? requestMute : undefined} raisedHands={raisedHands} />

      {/* Emoji picker popover (simple) */}
      {emojiOpen && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
          <EmojiPicker onSelect={(e) => { sendReaction(e); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />
        </div>
      )}

      {/* Reactions overlay: show recent reactions briefly */}
      <div className="fixed right-6 top-24 z-40 flex flex-col gap-2 pointer-events-none">
        {reactions.slice().reverse().slice(0,6).map(r => (
          <div key={r.id} className="animate-pop text-3xl text-center">{r.emoji}</div>
        ))}
      </div>

      {/* Mobile Chat Modal */}
      {chatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChatModalOpen(false)} />
          <div className="relative w-full sm:w-[560px] h-[60vh] sm:h-[70vh] rounded-2xl bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="text-sm font-bold">Chat</div>
              <button onClick={() => setChatModalOpen(false)} className="size-8 rounded-md bg-muted/30 grid place-items-center">
                ✕
              </button>
            </div>
            <div className="p-4 h-[calc(100%-56px)]">
              <ChatPanel messages={messages} onSendMessage={sendMessage} />
            </div>
          </div>
        </div>
      )}
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
  const [showPreJoin, setShowPreJoin] = useState(false);
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
      setShowPreJoin(false);
    } catch (e) {
      console.error('Failed to generate LiveKit token:', e);
      setError('Could not connect to the room. Please check your connection.');
    }
  }, [code, user]);

  

  useEffect(() => {
    if (authLoading) return; // wait until auth is resolved
    if (hasFetchedToken.current) return;
    
    // EVERYONE sees the Pre-Join lobby to satisfy Safari's User Gesture requirement for mic/cam
    setShowPreJoin(true);
  }, [authLoading]);

  const handleLeave = useCallback(() => {
    setToken(null);
    setHasLeft(true);
  }, []);

  const handleRejoin = useCallback(() => {
    hasFetchedToken.current = false;
    setShowPreJoin(true);
    setHasLeft(false);
  }, []);

  // Pre-Join Lobby Screen
  if (showPreJoin) {
    return <PreJoinLobby 
      isHost={isHost} 
      defaultName={user?.email?.split('@')[0]} 
      onJoin={(name) => { hasFetchedToken.current = true; fetchToken(name || 'Host'); }} 
    />;
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
