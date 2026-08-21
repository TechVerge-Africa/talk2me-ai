'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LiveKitRoom, useTracks, RoomAudioRenderer } from '@livekit/components-react';
import { Track, LocalParticipant, RemoteParticipant, VideoPresets, RoomOptions } from 'livekit-client';
import { Loader2, Copy, Crown, LogIn, RotateCcw, Home, Video, VideoOff, Mic, MicOff, Eye, EyeOff, X, ChevronDown, Phone, MessageSquare, Shield, ShieldOff, Play, Square, RefreshCw, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { RNNoiseTrackProcessor } from '@/lib/audio/rnnoise-processor';
import { VoiceWaveVisualizer } from '@/components/ui/voice-wave-visualizer';

import { MeetingLayout } from '@/features/meetings/room/layout';
import { ControlDock } from '@/features/meetings/room/controls';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { AiSignerView } from '@/features/accessibility/sign-language';
import { CaptionList } from '@/features/captions/caption-list';
import { CanonicalTranscriptView } from '@/features/transcript/components/canonical-transcript-view';

import { ChatPanel } from '@/features/chat/chat-panel';
import { useMeeting } from '@/features/meetings/hooks/useMeeting';
import { ParticipantVideo, ScreenShareView } from '@/features/meetings/room/video-track';
import { RealTimeCaptionOverlay } from '@/features/meetings/room/real-time-caption-overlay';
import { ParticipantsPanel } from '@/features/meetings/room/participants-panel';
import { CameraPreview } from '@/features/meetings/room/camera-preview';
import { MeetingDoorPortal } from '@/features/meetings/room/door-portal';
import { useAuth } from '@/features/auth/use-auth';
import { generateToken } from '@/services/livekit/room';
import { supabase } from '@/services/supabase/client';
import { MeetingService } from '@/services/supabase/meetings';
import { Meeting } from '@/types/meeting';

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

// ─── Pre-Join Lobby ──────────────────────────────────────────────────
function PreJoinLobby({ 
  onJoin, 
  onClose,
  defaultName = '', 
  isHost = false 
}: { 
  onJoin: (name: string) => void, 
  onClose?: () => void,
  defaultName?: string, 
  isHost?: boolean 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const getReturnUrl = useCallback(() => {
    const wsId = searchParams.get('workspaceId') || (() => {
      try { return sessionStorage.getItem('t2_return_workspace_id') || localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; }
    })();
    return wsId ? `/dashboard?workspaceId=${wsId}` : (user ? '/dashboard' : '/');
  }, [searchParams, user]);

  const handleClose = () => {
    if (onClose) onClose();
    else router.push(getReturnUrl());
  };
  const [name, setName] = useState(defaultName);
  // Read initial mic/cam state from lobby prefs (persisted to localStorage)
  const [camOn, setCamOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_cam') !== 'false'; } catch { return true; }
  });
  const [micOn, setMicOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_mic') !== 'false'; } catch { return true; }
  });
  const [aiNoiseOn, setAiNoiseOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_ai_noise') === 'true'; } catch { return false; }
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseReduction, setNoiseReduction] = useState(0);

  // Microphone recording test drive states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testAiOn, setTestAiOn] = useState(true);
  const [recordingCountdown, setRecordingCountdown] = useState(5);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const lobbyProcessorRef = useRef<RNNoiseTrackProcessor | null>(null);
  const lobbyCtxRef = useRef<AudioContext | null>(null);

  const testSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const testProcessorRef = useRef<RNNoiseTrackProcessor | null>(null);
  const testCtxRef = useRef<AudioContext | null>(null);



  // Persist cam/mic prefs whenever they change
  useEffect(() => {
    try { localStorage.setItem('t2_pref_cam', String(camOn)); } catch {}
  }, [camOn]);
  useEffect(() => {
    try { localStorage.setItem('t2_pref_mic', String(micOn)); } catch {}
  }, [micOn]);
  useEffect(() => {
    try { localStorage.setItem('t2_pref_ai_noise', String(aiNoiseOn)); } catch {}
  }, [aiNoiseOn]);

  useEffect(() => {
    let mounted = true;
    async function setupAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: !aiNoiseOn,
          }
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        audioStreamRef.current = stream;
        
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        lobbyCtxRef.current = ctx;
        
        let finalNode: AudioNode = ctx.createMediaStreamSource(stream);
        
        if (aiNoiseOn) {
          const processor = new RNNoiseTrackProcessor((metrics) => {
            if (mounted) {
              setNoiseReduction(Math.round(metrics.reductionRatio * 100));
            }
          });
          lobbyProcessorRef.current = processor;
          
          await processor.init({ audioContext: ctx, track: stream.getAudioTracks()[0] });
          
          if (processor.processedTrack && mounted) {
            const processedStream = new MediaStream([processor.processedTrack]);
            finalNode = ctx.createMediaStreamSource(processedStream);
          }
        } else {
          setNoiseReduction(0);
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        finalNode.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.fftSize;
        const data = new Uint8Array(bufferLength);
        let smooth = 0;
        const tick = () => {
          if (!mounted || !analyserRef.current) return;
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
        console.warn('Lobby audio preview error:', err);
      }
    }

    if (micOn) {
      setupAudio();
    } else {
      queueMicrotask(() => {
        setAudioLevel(0);
        setNoiseReduction(0);
      });
    }

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (lobbyProcessorRef.current) {
        lobbyProcessorRef.current.destroy().catch(console.error);
        lobbyProcessorRef.current = null;
      }
      if (lobbyCtxRef.current) {
        lobbyCtxRef.current.close().catch(console.error);
        lobbyCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [micOn, aiNoiseOn]);

  const startTestRecording = async () => {
    try {
      setIsRecording(true);
      setRecordedBuffer(null);
      setRecordingCountdown(5);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        setRecordedBuffer(audioBuffer);
        setIsRecording(false);
        stream.getTracks().forEach(t => t.stop());
      };
      
      mediaRecorder.start();
      
      let timeLeft = 5;
      const interval = setInterval(() => {
        timeLeft -= 1;
        setRecordingCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          mediaRecorder.stop();
        }
      }, 1000);
    } catch (e) {
      console.error('Failed to record test sample:', e);
      setIsRecording(false);
    }
  };

  const playTestSample = async () => {
    if (!recordedBuffer) return;
    
    if (isPlayingTest) {
      stopTestPlayback();
      return;
    }
    
    try {
      setIsPlayingTest(true);
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      testCtxRef.current = ctx;
      
      const source = ctx.createBufferSource();
      source.buffer = recordedBuffer;
      testSourceRef.current = source;
      
      if (testAiOn) {
        const processor = new RNNoiseTrackProcessor();
        testProcessorRef.current = processor;
        
        await ctx.audioWorklet.addModule('/worklets/rnnoise-worklet.js');
        const workletNode = new AudioWorkletNode(ctx, 'rnnoise-worklet-processor');
        
        // Connect BufferSource -> RNNoise -> Context Destination
        source.connect(workletNode);
        workletNode.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }
      
      source.onended = () => {
        setIsPlayingTest(false);
      };
      
      source.start(0);
    } catch (e) {
      console.error('Failed to play test sample:', e);
      setIsPlayingTest(false);
    }
  };

  const stopTestPlayback = () => {
    if (testSourceRef.current) {
      try { testSourceRef.current.stop(); } catch {}
      testSourceRef.current = null;
    }
    if (testCtxRef.current) {
      try { testCtxRef.current.close(); } catch {}
      testCtxRef.current = null;
    }
    setIsPlayingTest(false);
  };

  const toggleTestAi = (enabled: boolean) => {
    setTestAiOn(enabled);
    if (testProcessorRef.current) {
      testProcessorRef.current.setEnabled(enabled);
    }
  };

  useEffect(() => {
    return () => {
      stopTestPlayback();
    };
  }, []);

  // make speaking detection sensitive — lower threshold
  const isSpeaking = audioLevel > 0.03;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl p-6 rounded-[24px] glass-card border border-border relative overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* Top-Right Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close meeting preview"
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-all cursor-pointer shadow-md"
          title="Close meeting preview"
        >
          <X className="size-5" />
        </button>
        <div className={`relative rounded-2xl overflow-hidden h-64 md:h-auto flex flex-col min-h-[320px] border border-white/5 ${isSpeaking ? 'ring-4 ring-emerald-400/20 shadow-[0_0_40px_rgba(16,185,129,0.12)]' : ''}`}>
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
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-30">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCamOn(v => !v)}
                aria-label="Toggle camera"
                className={`px-3.5 py-2.5 rounded-full backdrop-blur text-white flex items-center gap-2 touch-manipulation text-sm font-bold transition-all ${
                  camOn ? 'bg-black/50 hover:bg-black/70' : 'bg-bridge-cyan/80 hover:bg-bridge-cyan shadow-lg'
                }`}
              >
                {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
                <span className="text-xs hidden sm:inline">{camOn ? 'Video On' : 'Enable Camera'}</span>
              </button>
              <button
                onClick={() => setMicOn(v => !v)}
                aria-label="Toggle microphone"
                className={`px-3.5 py-2.5 rounded-full backdrop-blur text-white flex items-center gap-2 touch-manipulation text-sm font-bold transition-all ${
                  micOn ? 'bg-black/50 hover:bg-black/70' : 'bg-bridge-indigo/80 hover:bg-bridge-indigo shadow-lg'
                }`}
              >
                {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                <span className="text-xs hidden sm:inline">{micOn ? 'Mic On' : 'Enable Mic'}</span>
              </button>
            </div>
            
            {micOn && (
              <button
                onClick={() => setAiNoiseOn(v => !v)}
                aria-label="Toggle AI Noise Shield"
                className={`px-3.5 py-2.5 rounded-full backdrop-blur text-white flex items-center gap-2 touch-manipulation text-sm font-bold transition-all ${
                  aiNoiseOn 
                    ? 'bg-gradient-to-r from-emerald-505 to-cyan-500 hover:opacity-95 shadow-lg shadow-emerald-500/25 border border-emerald-400/20 bg-emerald-500' 
                    : 'bg-black/50 hover:bg-black/70'
                }`}
              >
                {aiNoiseOn ? <Shield className="size-4 text-white animate-pulse" /> : <ShieldOff className="size-4 text-white/50" />}
                <span className="text-xs">{aiNoiseOn ? 'AI Shield Active' : 'AI Shield Off'}</span>
              </button>
            )}
          </div>
          <div className="absolute top-4 left-4 z-30">
            <div className="px-3 py-1.5 rounded-full bg-black/40 text-white text-[10px] font-bold">Preview</div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-2">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Join Meeting</h2>
          <p className="text-muted-foreground text-sm mb-4">{isHost ? "You're joining as the Host." : "Please enter your name to join."}</p>

          <div className="mb-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lobby Audio Shield</span>
              {aiNoiseOn && noiseReduction > 0 && isSpeaking ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Shield className="size-3 text-emerald-400" />
                  <span>AI Denoising: {noiseReduction}%</span>
                </motion.div>
              ) : null}
            </div>
            
            <VoiceWaveVisualizer audioLevel={audioLevel} aiOn={aiNoiseOn} isSpeaking={isSpeaking} />
          </div>

          {/* Interactive AI Mic Check Widget */}
          <div className="mb-6 p-4 rounded-2xl bg-card border border-border relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-bridge-indigo/5 blur-xl pointer-events-none" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
              AI Mic Test Drive
            </h3>
            
            {!recordedBuffer && !isRecording ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Record a short clip to hear exactly how the AI Voice Isolation cleans your voice.
                </p>
                <button
                  type="button"
                  onClick={startTestRecording}
                  className="mt-1.5 w-full py-2.5 rounded-xl border border-dashed border-bridge-indigo/40 hover:border-bridge-indigo hover:bg-bridge-indigo/5 text-bridge-indigo text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mic className="size-3.5" />
                  Record 5s Sample
                </button>
              </div>
            ) : isRecording ? (
              <div className="flex flex-col items-center justify-center py-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold text-red-500">Recording... Speak now</span>
                </div>
                <div className="text-2xl font-mono font-bold text-foreground">{recordingCountdown}s</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={playTestSample}
                    className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                      isPlayingTest ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4f46e5] hover:bg-[#4f46e5]/90'
                    }`}
                  >
                    {isPlayingTest ? (
                      <>
                        <Square className="size-3.5 fill-white" />
                        Stop Playback
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 fill-white" />
                        Listen To Sample
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={startTestRecording}
                    title="Retake recording"
                    disabled={isPlayingTest}
                    className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/50 border border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    {testAiOn ? (
                      <Shield className="size-3 text-emerald-400 fill-emerald-400/10" />
                    ) : (
                      <ShieldOff className="size-3 text-white/40" />
                    )}
                    AI Voice Isolation
                  </span>
                  
                  <div className="flex items-center gap-1 bg-[#121417] p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => toggleTestAi(false)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        !testAiOn ? 'bg-white/10 text-white font-bold' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Raw
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTestAi(true)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        testAiOn ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/10' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      AI Active
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={e => {
            e.preventDefault();
            const joinName = name.trim() || (isHost ? 'Host' : '');
            if (!joinName) return;
            // Persist final prefs so the room starts with the correct state
            try {
              localStorage.setItem('t2_pref_mic', String(micOn));
              localStorage.setItem('t2_pref_cam', String(camOn));
              localStorage.setItem('t2_pref_ai_noise', String(aiNoiseOn));
              if (name.trim()) localStorage.setItem('t2_display_name', name.trim());
            } catch {}
            onJoin(joinName);
          }} className="flex flex-col gap-4 relative z-40">
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
  didEndMeeting,
  onRejoin,
  onReopen,
}: {
  code: string;
  isHost: boolean;
  didEndMeeting: boolean;
  onRejoin: () => void;
  onReopen: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [duration] = useState(() => Math.floor(Math.random() * 30) + 10);
  const [randomParticipants] = useState(() => Math.floor(Math.random() * 5) + 2);

  const returnUrl = useMemo(() => {
    const wsId = searchParams.get('workspaceId') || (() => {
      try { return sessionStorage.getItem('t2_return_workspace_id') || localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; }
    })();
    return wsId ? `/dashboard?workspaceId=${wsId}` : (user ? '/dashboard' : '/');
  }, [searchParams, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-8 font-sans">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-bridge-indigo/5 via-transparent to-bridge-cyan/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md text-center"
      >
        {/* Icon */}
        <div className="size-20 rounded-3xl bg-blue-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 grid place-items-center mx-auto mb-6">
          <span className="text-4xl">{isHost ? '👑' : '👋'}</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2 font-heading">
          {didEndMeeting ? 'You ended the session' : 'You left the meeting'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {didEndMeeting
            ? 'The meeting has been ended. You can reopen it or return to your workspace.'
            : `Meeting code: `}
          {!didEndMeeting && <span className="font-mono font-bold text-foreground">{code}</span>}
        </p>

        {/* Stats row for host */}
        {isHost && (
          <div className="mt-6 grid grid-cols-2 gap-3 font-sans">
            <div className="p-4 rounded-2xl bg-card ring-1 ring-border text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{duration}m</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Duration</div>
            </div>
            <div className="p-4 rounded-2xl bg-card ring-1 ring-border text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{randomParticipants}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Participants</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 font-sans">
          {/* Primary Return to Workspace / Dashboard Button */}
          <button
            onClick={() => router.push(returnUrl)}
            className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition bg-blue-600"
          >
            <Building2 className="size-5" />
            {user ? 'Return to Workspace' : 'Back to Home'}
          </button>

          {/* Host who ended: offer Reopen. Host who left / participant: offer Rejoin */}
          {didEndMeeting ? (
            <button
              onClick={onReopen}
              className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="size-4" />
              Reopen &amp; Rejoin
            </button>
          ) : (
            <button
              onClick={onRejoin}
              className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="size-4" />
              Rejoin Meeting
            </button>
          )}

          {isHost && (
            <button
              onClick={() => router.push('/create')}
              className="w-full h-12 rounded-2xl bg-card border border-border font-medium flex items-center justify-center gap-2 hover:bg-muted transition text-xs"
            >
              <Crown className="size-4 text-amber-500" />
              Start New Meeting
            </button>
          )}
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

// ─── Floating Reactions Overlay ──────────────────────────────────────
function FloatingReactionsOverlay({ reactions }: { reactions: { id: string; sender_id: string; emoji: string; timestamp: string }[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => {
          const hash = r.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const startX = 20 + (hash % 60); // 20% to 80% of screen width
          const duration = 3.0 + (hash % 15) / 10; // 3.0s to 4.5s duration
          const drift = -80 + (hash % 160); // -80px to +80px horizontal drift
          const size = 28 + (hash % 20); // 28px to 48px size
          const startRotation = -20 + (hash % 40); // -20deg to +20deg
          const endRotation = startRotation + (-30 + (hash % 60)); // rotation sweep

          return (
            <motion.div
              key={r.id}
              initial={{ 
                opacity: 0, 
                y: "105vh", 
                x: `${startX}vw`, 
                scale: 0.4, 
                rotate: startRotation 
              }}
              animate={{ 
                opacity: [0, 1, 1, 0.8, 0], 
                y: "-15vh", 
                x: `${startX}vw`,
                translateX: drift,
                scale: [0.4, 1.2, 1.2, 1.0, 0.8],
                rotate: endRotation
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: duration,
                ease: "easeOut",
              }}
              style={{ 
                position: "absolute", 
                fontSize: size, 
                filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.3))" 
              }}
            >
              <div className="flex flex-col items-center">
                <span className="select-none">{r.emoji}</span>
                <span className="text-[9px] bg-black/60 text-white/90 font-bold px-1.5 py-0.5 rounded-full border border-white/5 backdrop-blur-sm mt-1 scale-75 whitespace-nowrap shadow-md">
                  {r.sender_id}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Self-view PiP — responsive size, safely above the dock
function HidableSelfView({ 
  participant, 
  absolute = false, 
  raised, 
  reactions,
  dragConstraints
}: { 
  participant: LocalParticipant; 
  absolute?: boolean; 
  raised?: boolean; 
  reactions?: { id: string; sender_id: string; emoji: string; timestamp: string }[];
  dragConstraints?: React.RefObject<HTMLDivElement | null>;
}) {
  const [hidden, setHidden] = useState(false);

  // On mobile the dock is ~108px tall; add 12px margin. On desktop ~80px.
  // Use a CSS calc so it works across device sizes.
  const pipStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'fixed',
    right: 12,
    bottom: 'calc(var(--dock-h, 120px) + 8px)',
    width: 'clamp(100px, 22vw, 160px)',
    height: 'clamp(130px, 28vw, 210px)',
    zIndex: absolute ? 40 : 60,
  };
  const miniStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'fixed',
    right: 12,
    bottom: 'calc(var(--dock-h, 120px) + 8px)',
    zIndex: absolute ? 40 : 60,
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.95 },
  };
  const miniVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
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
          style={pipStyle}
          className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-slate-900 cursor-grab active:cursor-grabbing touch-none select-none"
          drag
          dragConstraints={dragConstraints}
          dragMomentum={false}
          dragElastic={0.08}
        >
          <div className="relative w-full h-full pointer-events-none">
            <ParticipantVideo participant={participant} source={Track.Source.Camera} className="w-full h-full object-cover" mirrored raised={!!raised} reactions={reactions ?? []} />
            <button
              onClick={() => setHidden(true)}
              aria-label="Hide self view"
              className="absolute top-1.5 right-1.5 size-6 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-black/80 transition-colors pointer-events-auto cursor-pointer"
            >
              ✕
            </button>
            {raised && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-sm animate-bounce">✋</div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="selfview-mini"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={miniVariants}
          transition={{ duration: 0.2 }}
          style={miniStyle}
        >
          <button
            onClick={() => setHidden(false)}
            aria-label="Show self view"
            title="Show your camera"
            className="size-12 rounded-full bg-gradient-to-br from-bridge-indigo to-bridge-cyan text-white shadow-2xl flex items-center justify-center ring-2 ring-white/20 touch-manipulation"
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
  hostIdentity,
  meetingId: _meetingId,
  isAppAdmin,
}: {
  code: string;
  isHost: boolean;
  onLeave: (endForAll?: boolean) => void;
  hostIdentity?: string;
  meetingId?: string;
  isAppAdmin?: boolean;
}) {
  const {
    micOn, camOn, screenShareOn, isDeafMode, aiNoiseShieldOn, noiseReductionLevel, toggleAiNoiseShield,
    captions, canonicalTranscripts, activeInterims, highlightedMs,
    messages, participants, sttStatus,
    toggleMic, toggleCam, toggleScreenShare, toggleDeafMode, sendMessage, requestMute,
    raisedHands, reactions, toggleRaiseHand, sendReaction, requestKick,

    isAdmitted, joinRequests, cohosts, meetingHostId, allowScreenShare, isAdmin, requireApproval,
    approveJoinRequest, denyJoinRequest, admitAllJoinRequests, muteAllParticipants, updateSettings, changeParticipantRole, stopParticipantScreenShare
  } = useMeeting(code, hostIdentity, () => onLeave(false), isAppAdmin);

  const selfViewConstraintsRef = useRef<HTMLDivElement>(null);
  const [captionsOn, setCaptionsOn] = useState(() => {
    try { return localStorage.getItem('t2_pref_captions') !== 'false'; } catch { return true; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleCaptions = useCallback(() => {
    setCaptionsOn(prev => {
      const next = !prev;
      try { localStorage.setItem('t2_pref_captions', String(next)); } catch {}
      return next;
    });
  }, []);


  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'chat'>('transcript');
  const [captionSize, setCaptionSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [codeCopied, setCodeCopied] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [_admissionPopup, _setAdmissionPopup] = useState(true);
  const [isEnteringDoor, setIsEnteringDoor] = useState(false);
  const prevAdmittedRef = useRef(isAdmitted);

  useEffect(() => {
    if (!prevAdmittedRef.current && isAdmitted) {
      setIsEnteringDoor(true);
    }
    prevAdmittedRef.current = isAdmitted;
  }, [isAdmitted]);

  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const hasScreenShare = screenTracks.length > 0;
  const activeSpeaker = useActiveSpeaker(participants);
  const localParticipant = participants.find(p => p instanceof LocalParticipant) as LocalParticipant | undefined;
  const _stripParticipants = hasScreenShare ? participants : participants.filter(p => p.identity !== activeSpeaker?.identity);

  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    sender: string;
    content: string;
  } | null>(null);

  const lastProcessedMessageIdRef = useRef<string | null>(null);

  // Track unread messages and notifications
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    
    if (lastProcessedMessageIdRef.current === lastMessage.id) return;
    lastProcessedMessageIdRef.current = lastMessage.id;

    // Don't count or notify for our own messages
    const isMe = lastMessage.sender_id === localParticipant?.identity;
    if (isMe) return;

    // Check if chat is open/visible
    const isChatVisible = sidebarOpen && activeTab === 'chat';
    
    if (isChatVisible) {
      setTimeout(() => setUnreadCount(0), 0);
      return;
    }

    // Increment unread count
    setTimeout(() => {
      setUnreadCount(prev => prev + 1);
    }, 0);

    // Show floating toast notification
    const senderPart = participants.find(p => p.identity === lastMessage.sender_id);
    const senderName = senderPart?.identity || lastMessage.sender_id || 'Someone';

    setTimeout(() => {
      setActiveNotification({
        id: lastMessage.id,
        sender: senderName,
        content: lastMessage.content
      });
    }, 0);

    // Auto-dismiss notification after 4 seconds
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [messages, sidebarOpen, activeTab, localParticipant?.identity, participants]);

  // Reset unread count to 0 if chat becomes visible
  useEffect(() => {
    const isChatVisible = sidebarOpen && activeTab === 'chat';
    if (isChatVisible) {
      setTimeout(() => setUnreadCount(0), 0);
    }
  }, [sidebarOpen, activeTab]);


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
  const [recordingOn, _setRecordingOn] = useState(false);
  const [networkQuality, _setNetworkQuality] = useState<'good' | 'ok' | 'poor'>('good');

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
  const [_mobileMenuOpen, _setMobileMenuOpen] = useState(false);
  const [roomMode, setRoomMode] = useState<'call' | 'onthego'>('call');

  // Auto-disable camera when entering On-the-Go / Low-Bandwidth Mode to save bandwidth
  useEffect(() => {
    if (roomMode === 'onthego' && camOn) {
      toggleCam().catch(err => console.error("Failed to disable camera in On-the-Go mode:", err));
    }
  }, [roomMode, camOn, toggleCam]);

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

  const _exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setViewMode('grid');
  };
  const topbar = (
    <div className={`transition-transform duration-300 ${showTopbar ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="px-3 sm:px-5 h-14 flex items-center justify-between border-b border-white/5 bg-[#181b20]/95 backdrop-blur-xl relative z-40">

        {/* Left — Logo + (on desktop) room title + timer */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 sm:size-9 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-500/10">
            <Video className="size-4 sm:size-5" />
          </div>
          {/* Title — hidden on very small screens */}
          <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight truncate max-w-[140px] md:max-w-none">
              Room {code}
            </span>
          </div>
          {/* Timer — always visible */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2a2d35]/70 border border-white/5 rounded-full text-[10px] font-mono font-bold text-white/70 shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {formatDuration(secondsElapsed)}
          </div>
        </div>



        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode toggle — icon only on mobile */}
          <button
            onClick={() => setRoomMode(m => m === 'call' ? 'onthego' : 'call')}
            title={roomMode === 'call' ? 'Switch to On-the-Go (audio only)' : 'Switch to Call mode (video)'}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide border transition-all duration-300 shadow-md touch-manipulation ${
              roomMode === 'onthego'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-[#1e2227] border-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            <Phone className="size-3.5" />
            <span className="hidden sm:inline">{roomMode === 'onthego' ? 'On the Go' : 'Call Mode'}</span>
          </button>

          {/* Network dot + REC — hidden on tiny screens */}
          <div className="hidden xs:flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full ${networkQuality === 'good' ? 'bg-emerald-400 animate-pulse' : networkQuality === 'ok' ? 'bg-amber-400' : 'bg-red-500'}`} title={`Network: ${networkQuality}`} />
            <span className={`hidden sm:inline px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${recordingOn ? 'bg-red-600 text-white' : 'bg-[#1e2227] text-white/40 border border-white/5'}`}>
              {recordingOn ? 'REC' : 'LIVE'}
            </span>
          </div>

          {/* Avatar + view menu */}
          <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 sm:border-l border-white/5 relative">
            <button
              onClick={openRename}
              title="Change display name"
              className="size-8 sm:size-9 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 border border-white/10 flex items-center justify-center text-white text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all touch-manipulation"
            >
              {displayName?.slice(0, 2).toUpperCase() || authUser?.email?.slice(0, 2).toUpperCase() || 'U'}
            </button>
            <button onClick={() => setViewMenuOpen(v => !v)} className="hidden sm:block text-white/40 hover:text-white/95 transition-colors">
              <ChevronDown className="size-4" />
            </button>
            {viewMenuOpen && (
              <div className="absolute right-0 top-11 w-40 bg-[#1e2227] border border-white/5 rounded-xl shadow-2xl z-50 p-1.5 text-white/80 text-xs flex flex-col gap-0.5">
                <button onClick={() => { setViewMode('grid'); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${viewMode==='grid' ? 'bg-blue-500 text-white font-bold' : ''}`}>Grid View</button>
                <button onClick={() => { setViewMode('speaker'); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${viewMode==='speaker' ? 'bg-blue-500 text-white font-bold' : ''}`}>Speaker View</button>
                <button onClick={() => { setViewMode('focus'); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${viewMode==='focus' ? 'bg-blue-500 text-white font-bold' : ''}`}>Focus View</button>
                <button onClick={() => { enterFullscreen(); setViewMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 ${viewMode==='fullscreen' ? 'bg-blue-500 text-white font-bold' : ''}`}>Fullscreen</button>
              </div>
            )}
          </div>

          {/* Hide topbar button */}
          <button
            onClick={() => setShowTopbar(false)}
            title="Hide top bar"
            className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/5 transition-all touch-manipulation"
          >
            <EyeOff className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Sidebar ───────────────────────────────────────────────────
  const sidebar = sidebarOpen && !isDeafMode ? (
    <div className="flex flex-col h-full">

      {/* Drag handle — mobile only */}
      <div className="flex justify-center pt-3 pb-1 sm:hidden">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header: tabs + close */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-1 flex-1 p-1 bg-white/[0.06] border border-white/10 rounded-full">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
              activeTab === 'transcript'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Transcript
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Chat
          </button>
        </div>
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Close panel"
          className="size-8 flex-shrink-0 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-safe">
        {activeTab === 'transcript' ? (
          <CanonicalTranscriptView
            transcripts={canonicalTranscripts}
            highlightedMs={highlightedMs}
          />
        ) : (
          <div className="h-full">
            <ChatPanel messages={messages} onSendMessage={sendMessage} participants={participants} localParticipantIdentity={localParticipant?.identity} />
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ─── Main stage ────────────────────────────────────────────────
  // On-the-Go mode: premium audio-only minimal UI
  const onTheGoStage = (
    <div className="relative flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f1115] via-[#131720] to-[#0c0e12] overflow-hidden">
      {/* Ambient glow rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000 ${
          activeSpeaker
            ? 'w-[540px] h-[540px] bg-emerald-500/8 ring-1 ring-emerald-500/15 blur-3xl scale-110'
            : micOn
            ? 'w-[480px] h-[480px] bg-emerald-500/5 ring-1 ring-emerald-500/10 blur-2xl animate-pulse'
            : 'w-[320px] h-[320px] bg-slate-500/5'
        }`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000 ${
          activeSpeaker
            ? 'w-[300px] h-[300px] bg-cyan-500/10 ring-1 ring-cyan-500/15 blur-2xl scale-105'
            : 'w-[220px] h-[220px] bg-blue-500/5 ring-1 ring-blue-500/10 blur-xl'
        }`} />
      </div>

      {/* Participants audio avatars */}
      <div className="flex items-end justify-center gap-4 mb-10 flex-wrap px-8">
        {participants.slice(0, 6).map((p) => {
          const isActive = p.identity === activeSpeaker?.identity;
          const initials = p.identity.slice(0, 2).toUpperCase();
          return (
            <motion.div
              key={p.identity}
              animate={isActive ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.2 } } : { scale: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className={`relative size-14 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-2xl shadow-emerald-400/30 ring-4 ring-emerald-400/30'
                  : 'bg-gradient-to-br from-[#2a2d35] to-[#1e2227] text-white/60 ring-1 ring-white/5'
              }`}>
                {initials}
                
                {/* Speaking staggered sonic rings */}
                {isActive && (
                  <>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: 2.0, opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeOut",
                      }}
                      className="absolute inset-0 rounded-full bg-emerald-500/25 -z-10"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.6 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        delay: 0.6,
                        ease: "easeOut",
                      }}
                      className="absolute inset-0 rounded-full bg-cyan-500/15 -z-10"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.4 }}
                      animate={{ scale: 3.0, opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        delay: 1.2,
                        ease: "easeOut",
                      }}
                      className="absolute inset-0 rounded-full bg-indigo-500/10 -z-10"
                    />
                  </>
                )}

                {/* Speaking visualizer capsule */}
                {isActive && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-[18px] px-2 rounded-full bg-emerald-500 flex items-center justify-center gap-[2px] border border-[#131720] shadow-lg shadow-emerald-500/20">
                    <motion.span
                      animate={{ height: ["4px", "10px", "4px"] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      className="w-[2px] bg-white rounded-full"
                    />
                    <motion.span
                      animate={{ height: ["2px", "12px", "2px"] }}
                      transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.15 }}
                      className="w-[2px] bg-white rounded-full"
                    />
                    <motion.span
                      animate={{ height: ["4px", "8px", "4px"] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
                      className="w-[2px] bg-white rounded-full"
                    />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-semibold text-white/40 max-w-[56px] truncate text-center">
                {p.identity.split('@')[0]}
              </span>
            </motion.div>
          );
        })}
        {participants.length === 0 && (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <div className="size-16 rounded-full bg-white/5 ring-1 ring-white/5 flex items-center justify-center text-3xl">🎙️</div>
            <p className="text-xs font-semibold tracking-wide">Waiting for others...</p>
          </div>
        )}
      </div>

      {/* Live transcript bubble */}
      <AnimatePresence mode="wait">
        {captions.length > 0 && (
          <motion.div
            key={captions[captions.length - 1]?.id || captions.length}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="max-w-sm w-full mx-auto px-6 mb-10"
          >
            <div className="relative bg-[#1a1d24]/90 backdrop-blur-md border border-white/5 rounded-3xl px-5 py-3.5 shadow-2xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/25 mb-1">
                {captions[captions.length - 1]?.sender_id?.split('@')[0] || activeSpeaker?.identity?.split('@')[0] || 'Speaking'}
              </div>
              <p className="text-white/90 text-sm leading-relaxed">
                {captions[captions.length - 1]?.content}
              </p>
              <span className="absolute bottom-3 right-4 size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Large central mic + deaf controls */}
      <div className="flex items-center gap-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleMic}
          className={`relative flex flex-col items-center gap-2 group`}
        >
          <div className={`size-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            micOn
              ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-emerald-500/30 ring-4 ring-emerald-400/20'
              : 'bg-[#1e2227] ring-1 ring-white/10'
          }`}>
            {micOn ? <Mic className="size-8 text-white" /> : <MicOff className="size-8 text-white/50" />}
          </div>
          <span className={`text-xs font-bold tracking-wide ${
            micOn ? 'text-emerald-400' : 'text-white/30'
          }`}>{micOn ? 'Mic On' : 'Muted'}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleDeafMode}
          className={`relative flex flex-col items-center gap-2 group`}
        >
          <div className={`size-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            !isDeafMode
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30 ring-4 ring-blue-400/20'
              : 'bg-[#1e2227] ring-1 ring-white/10'
          }`}>
            {!isDeafMode ? <Eye className="size-8 text-white" /> : <EyeOff className="size-8 text-white/50" />}
          </div>
          <span className={`text-xs font-bold tracking-wide ${
            !isDeafMode ? 'text-blue-400' : 'text-white/30'
          }`}>{!isDeafMode ? 'Hearing' : 'Deaf Mode'}</span>
        </motion.button>
      </div>

      {/* Duration + meeting code badge */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#1e2227]/80 border border-white/5 rounded-full text-[11px] font-mono font-bold text-white/40 shadow-lg">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        On the Go · {formatDuration(secondsElapsed)}
        <span className="ml-2 text-white/20">#{code}</span>
      </div>
    </div>
  );

  const mainStage = isDeafMode && roomMode === 'call' ? (
    <AiSignerView currentCaption={captions[captions.length - 1]?.content} />
  ) : roomMode === 'onthego' ? onTheGoStage : hasScreenShare ? (
    <div ref={selfViewConstraintsRef} className="relative flex-1 w-full h-full min-h-0">
      <ScreenShareView className="w-full h-full rounded-none" />
      {localParticipant && (
        <HidableSelfView participant={localParticipant} absolute raised={!!raisedHands[localParticipant.identity]} reactions={reactions.filter(r => r.sender_id === localParticipant.identity)} dragConstraints={selfViewConstraintsRef} />
      )}
    </div>
  ) : (
    <div ref={selfViewConstraintsRef} className="relative flex-1 w-full h-full min-h-0">
      <div className="w-full h-full overflow-hidden bg-slate-950">
        {activeSpeaker ? (
          <ParticipantVideo participant={activeSpeaker} source={Track.Source.Camera} className="w-full h-full" raised={!!raisedHands[activeSpeaker.identity]} reactions={reactions.filter(r => r.sender_id === activeSpeaker.identity)} isMain={true} />
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
        <HidableSelfView participant={localParticipant} absolute raised={!!raisedHands[localParticipant.identity]} reactions={reactions.filter(r => r.sender_id === localParticipant.identity)} dragConstraints={selfViewConstraintsRef} />
      )}
    </div>
  );

  if (!isAdmitted) {
    return (
      <MeetingDoorPortal
        isWaiting={true}
        isEntering={false}
        onCancel={() => onLeave(false)}
        displayName={localParticipant?.identity || hostIdentity || 'Communicator'}
        roomCode={code}
      />
    );
  }

  return (
    <>
      {isEnteringDoor && (
        <MeetingDoorPortal
          isWaiting={false}
          isEntering={true}
          onCompleteOpening={() => setIsEnteringDoor(false)}
          displayName={localParticipant?.identity || hostIdentity || 'Communicator'}
          roomCode={code}
        />
      )}
      <MeetingLayout isDeafMode={isDeafMode} topbar={topbar} sidebar={sidebar} fullBleed={viewMode !== 'grid'} topbarVisible={showTopbar}
        dock={
          <ControlDock
            code={code}
            micOn={micOn} camOn={camOn} screenShareOn={screenShareOn}
            transcriptOn={!!raisedHands[localParticipant?.identity || '']} deafOn={isDeafMode}
            participantsOpen={participantsOpen} participantCount={participants.length}
            onToggleMic={toggleMic} onToggleCam={toggleCam}
            onToggleScreenShare={toggleScreenShare}
            onToggleTranscript={() => toggleRaiseHand()}
            onToggleDeaf={toggleDeafMode}
            onToggleParticipants={() => setParticipantsOpen(v => !v)}
            onAi={() => { if (sidebarOpen && activeTab === 'chat') { setSidebarOpen(false); } else { setActiveTab('chat'); setSidebarOpen(true); } }}
            onToggleChat={() => { if (sidebarOpen && activeTab === 'chat') { setSidebarOpen(false); } else { setActiveTab('chat'); setSidebarOpen(true); } }}
            chatOpen={sidebarOpen && activeTab === 'chat'}
            onEmergency={() => setEmojiOpen(v => !v)}
            onCaptionSize={() => setCaptionSize(s => s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm')}
            captionsOn={captionsOn} onToggleCaptions={handleToggleCaptions}
            onShare={shareRoom}
            onLeave={(endForAll) => onLeave(endForAll)}
            isHost={isHost}
            unreadCount={unreadCount}
            aiNoiseOn={aiNoiseShieldOn}
            noiseReductionLevel={noiseReductionLevel}
            onToggleAiNoise={toggleAiNoiseShield}
          />
        }
      >
        {/* Main active speaker video frame */}
        <div className="w-full h-full min-h-0 relative">
          {mainStage}
          {/* Show captions only when CC is turned on */}
          {!isDeafMode && captionsOn && <RealTimeCaptionOverlay captions={captions} activeInterims={activeInterims} size={captionSize} />}

          
          {/* Floating Message Notification popup */}
          <AnimatePresence>
            {activeNotification && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="absolute top-4 right-4 z-40 max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-3 pointer-events-auto cursor-pointer"
                onClick={() => {
                  setActiveTab('chat');
                  setSidebarOpen(true);
                  setActiveNotification(null);
                }}
              >
                <div className="size-9 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <MessageSquare className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">New Message</div>
                  <div className="text-xs text-white/50 font-medium truncate mt-0.5">{activeNotification.sender}</div>
                  <div className="text-sm text-white/90 font-semibold mt-1 break-words line-clamp-2">
                    {activeNotification.content}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNotification(null);
                  }}
                  className="text-white/40 hover:text-white/80 p-0.5 rounded flex-shrink-0 self-start transition-colors"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MeetingLayout>

      {/* Floating Admission Request list (real admission flow) */}
      <div className="fixed left-6 top-20 z-50 flex flex-col gap-3 pointer-events-auto">
        <AnimatePresence>
          {isAdmin && joinRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="flex items-center gap-3 bg-[#1e2227]/95 backdrop-blur-md border border-white/5 rounded-2xl p-3.5 shadow-2xl w-80"
            >
              <div className="size-10 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 border border-white/10 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {req.sender_id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold tracking-wider text-white/40">wants to join</div>
                <div className="text-sm font-bold text-white truncate">{req.sender_id}</div>
              </div>
              <button 
                onClick={() => approveJoinRequest(req.sender_id)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Admit
              </button>
              <button 
                onClick={() => denyJoinRequest(req.sender_id)}
                className="text-white/40 hover:text-white/95 p-1 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating show-topbar button when topbar is hidden */}
      {!showTopbar && (
        <button onClick={() => setShowTopbar(true)} title="Show topbar" className="fixed top-3 right-3 z-50 bg-black/30 backdrop-blur rounded-full p-2 pointer-events-auto">
          <Eye className="size-5 text-white" />
        </button>
      )}

      <ParticipantsPanel 
        participants={participants} 
        hostId={meetingHostId || (isHost ? localParticipant?.identity : undefined)} 
        isOpen={participantsOpen} 
        onClose={() => setParticipantsOpen(false)} 
        onMuteRequest={requestMute} 
        onKickRequest={requestKick} 
        raisedHands={raisedHands} 
        isAdmin={isAdmin}
        cohosts={cohosts}
        meetingHostId={meetingHostId}
        requireApproval={requireApproval}
        allowScreenShare={allowScreenShare}
        joinRequests={joinRequests}
        localParticipantIdentity={localParticipant?.identity}
        onUpdateSettings={updateSettings}
        onChangeParticipantRole={changeParticipantRole}
        onStopParticipantScreenShare={stopParticipantScreenShare}
        onAdmitAllRequests={admitAllJoinRequests}
        onMuteAllParticipants={muteAllParticipants}
      />

      {/* Emoji picker popover (simple) */}
      {emojiOpen && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
          <EmojiPicker onSelect={(e) => { sendReaction(e); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />
        </div>
      )}

      {/* Floating reactions animation overlay */}
      <FloatingReactionsOverlay reactions={reactions} />


    </>
  );
}

// ─── Outer page — handles token fetch, auth role, leave/rejoin ───────
function RoomPageInner() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { user, profile, loading: authLoading } = useAuth();

  const SESSION_KEY = `t2_session_${code}`;

  const [token, setToken] = useState<string | null>(() => {
    // Restore token from sessionStorage on refresh — skip the pre-join lobby
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  });
  const [error, setError] = useState<string | null>(null);
  const [hasLeft, setHasLeft] = useState(false);
  // If we already have a session token, skip pre-join immediately
  const [showPreJoin, setShowPreJoin] = useState(false);
  const hasFetchedToken = useRef(false);

  // NEW STATES
  const [meetingRecord, setMeetingRecord] = useState<Meeting | null>(null);
  const [endOptionSelected, setEndOptionSelected] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // A user is a host if they're signed in
  const isHost = !!user;

  const roomOptions = useMemo<RoomOptions>(() => ({
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      videoSimulcastLayers: [
        VideoPresets.h720,
        VideoPresets.h360,
        VideoPresets.h180,
      ],
      videoEncode: {
        maxBitrate: 1_500_000,
        maxFramerate: 30,
      },
    },
  }), []);

  const targetRoomCode = meetingRecord?.room_code;
  const fetchToken = useCallback(async (customName?: string) => {
    if (!code) return;
    const username = customName || user?.email?.split('@')[0]
      || (() => { try { return localStorage.getItem('t2_display_name') || undefined; } catch { return undefined; } })();
    if (!username) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const actualRoomCode = targetRoomCode || code;
      const t = await generateToken(actualRoomCode, username, session?.access_token);
      // Persist token to sessionStorage so page refresh reconnects without the lobby
      try { sessionStorage.setItem(SESSION_KEY, t); } catch {}
      setToken(t);
      setHasLeft(false);
      setShowPreJoin(false);
    } catch (e) {
      console.error('Failed to generate LiveKit token:', e);
      setError('Could not connect to the room. Please check your connection.');
    }
  }, [code, user, SESSION_KEY, targetRoomCode]);

  

  useEffect(() => {
    if (authLoading) return;
    if (hasFetchedToken.current) return;

    // If we restored a token from sessionStorage (page refresh), skip the lobby
    // and silently reconnect. The token may be expired — fetchToken handles that.
    const savedToken = (() => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } })();
    if (savedToken) {
      // Token already set from useState initialiser — just mark as fetched
      hasFetchedToken.current = true;
      return;
    }

    // Fresh visit: show Pre-Join lobby (required for Safari user-gesture)
    setTimeout(() => {
      setShowPreJoin(true);
    }, 0);
  }, [authLoading, SESSION_KEY]);

  useEffect(() => {
    // Wait for auth to finish loading so we know if the user is signed in
    if (authLoading) return;
    if (!code) return;

    queueMicrotask(() => {
      setIsValidating(true);
    });
    const formattedCode = code.includes('-') ? code : (code.length === 7 ? `${code[0]}-${code.slice(1,4)}-${code.slice(4)}` : code);

    // Fast path: look for an active meeting (works for everyone)
    MeetingService.getMeetingByCode(formattedCode)
      .then(async (m) => {
        if (m) return m;
        const mRaw = await MeetingService.getMeetingByCode(code);
        if (mRaw) return mRaw;

        // Active meeting not found — check if an ended one exists
        const anyFormatted = await MeetingService.getMeetingByCodeAny(formattedCode);
        const any = anyFormatted ?? await MeetingService.getMeetingByCodeAny(code);

        if (!any) {
          setError('Invalid meeting room link or code. This meeting does not exist.');
          return null;
        }

        // Meeting is ended — only the host (signed-in user whose id matches) may re-enter
        if (user && any.host_id === user.id) {
          await MeetingService.reactivateMeeting(any.id);
          return { ...any, status: 'active' as const };
        }

        // Everyone else is blocked
        setError('This meeting has ended. Only the host can reopen it.');
        return null;
      })
      .then(m => { if (m) setMeetingRecord(m); })
      .catch(e => {
        console.error('Failed to load meeting details:', e);
        setError('Unable to verify meeting code. Please check your internet connection.');
      })
      .finally(() => setIsValidating(false));
  }, [code, user, authLoading]);

  const handleLeave = useCallback((endForAll: boolean = false) => {
    if (endForAll && meetingRecord) {
      MeetingService.endMeeting(meetingRecord.id).catch(console.error);
    }
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setToken(null);
    hasFetchedToken.current = false;
    setHasLeft(true);
    setEndOptionSelected(endForAll);
  }, [meetingRecord, SESSION_KEY]);

  const handleRejoin = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    hasFetchedToken.current = false;
    setShowPreJoin(true);
    setHasLeft(false);
    setEndOptionSelected(false);
  }, [SESSION_KEY]);

  // Host-only: reactivate the ended meeting then go to pre-join
  const handleReopen = useCallback(async () => {
    if (meetingRecord) {
      try {
        await MeetingService.reactivateMeeting(meetingRecord.id);
        setMeetingRecord(prev => prev ? { ...prev, status: 'active' } : prev);
      } catch (e) {
        console.error('Failed to reactivate meeting:', e);
      }
    }
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    hasFetchedToken.current = false;
    setShowPreJoin(true);
    setHasLeft(false);
    setEndOptionSelected(false);
  }, [meetingRecord, SESSION_KEY]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6 bg-background">
        <div className="size-16 rounded-2xl bg-red-500/10 grid place-items-center text-3xl">⚠️</div>
        <h2 className="font-bold text-xl">Invalid Meeting Room</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <div className="flex gap-4 mt-2">
          <Link href="/join" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm transition hover:opacity-90">
            Enter Another Code
          </Link>
          <Link href="/" className="px-5 py-2.5 rounded-xl bg-card border border-border font-semibold text-sm transition hover:bg-muted">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (isValidating || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="size-10 animate-spin text-bridge-indigo" />
        <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Verifying meeting code...</p>
      </div>
    );
  }

  // Pre-Join Lobby Screen
  if (showPreJoin) {
    return <PreJoinLobby 
      isHost={isHost} 
      defaultName={user?.email?.split('@')[0]} 
      onJoin={(name) => { hasFetchedToken.current = true; fetchToken(name || 'Host'); }} 
      onClose={() => {
        const wsId = (() => { try { return sessionStorage.getItem('t2_return_workspace_id') || localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; } })();
        router.push(wsId ? `/dashboard?workspaceId=${wsId}` : (user ? '/dashboard' : '/'));
      }}
    />;
  }

  // Left screen
  if (hasLeft) {
    return (
      <LeftMeetingScreen
        code={code}
        isHost={isHost}
        didEndMeeting={isHost && endOptionSelected}
        onRejoin={handleRejoin}
        onReopen={handleReopen}
      />
    );
  }

  if (!token) {
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
      <RoomContent code={code} isHost={isHost} onLeave={handleLeave} hostIdentity={user?.email?.split('@')[0]} meetingId={meetingRecord?.id} isAppAdmin={profile?.role === 'admin'} />
    </LiveKitRoom>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="size-10 animate-spin text-bridge-indigo" />
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Verifying meeting code...</p>
        </div>
      }
    >
      <RoomPageInner />
    </Suspense>
  );
}
