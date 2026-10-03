'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LiveKitRoom, useTracks, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import { Track, LocalParticipant, RemoteParticipant, VideoPresets, RoomOptions } from 'livekit-client';
import { useNetworkResilience, NetworkStatusIndicator, NetworkDebugPanel } from '@/features/network-resilience';
import { Loader2, Copy, Crown, LogIn, RotateCcw, Home, Video, VideoOff, Mic, MicOff, Eye, EyeOff, X, ChevronDown, Phone, MessageSquare, Shield, ShieldOff, Play, Square, RefreshCw, Building2, Sparkles, PictureInPicture2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { RNNoiseTrackProcessor } from '@/lib/audio/rnnoise-processor';
import { VoiceWaveVisualizer } from '@/components/ui/voice-wave-visualizer';

import { MeetingLayout } from '@/features/meetings/room/layout';
import { ControlDock } from '@/features/meetings/room/controls';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { AiSignerView } from '@/features/accessibility/sign-language';
import { CaptionList } from '@/features/captions/caption-list';

import { createPortal } from 'react-dom';
import { ChatPanel } from '@/features/chat/chat-panel';
import { useMeeting } from '@/features/meetings/hooks/useMeeting';
import { useBackgroundResilience } from '@/features/meetings/hooks/useBackgroundResilience';
import { usePictureInPicture } from '@/features/meetings/hooks/usePictureInPicture';
import { Talk2MeMiniView } from '@/features/meetings/room/mini-meeting-pip';
import { ParticipantVideo, ScreenShareView } from '@/features/meetings/room/video-track';
import { RealTimeCaptionOverlay } from '@/features/meetings/room/real-time-caption-overlay';
import { ParticipantsPanel } from '@/features/meetings/room/participants-panel';
import { CameraPreview } from '@/features/meetings/room/camera-preview';
import { NetworkDoorScene } from '@/features/meetings/room/network-door-scene';
import { useAuth } from '@/features/auth/use-auth';
import { generateToken } from '@/services/livekit/room';
import { supabase } from '@/services/supabase/client';
import { MeetingService } from '@/services/supabase/meetings';
import { WorkspaceService } from '@/services/supabase/workspaces';
import { Meeting } from '@/types/meeting';
import { ActionDetectorService, DetectedActionCandidate } from '@/services/ai/action-detector';
import { ActionConfirmationToast } from '@/features/meetings/room/action-confirmation-toast';
import { MeetingWorkBoardPanel } from '@/features/meetings/room/meeting-work-board-panel';
import { AiScribeIndicator } from '@/features/meetings/room/ai-scribe-indicator';
import { AiNotesPanel } from '@/features/meetings/room/ai-notes-panel';
import { WorkBoardService } from '@/services/supabase/work-boards';
import { WorkspaceBoard, BoardActionItem, BoardActionStatus } from '@/types/work-board';

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
    const wsId = searchParams.get('workspaceId') || searchParams.get('ws') || (() => {
      try { return sessionStorage.getItem('t2_return_workspace_id') || localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; }
    })();
    const tab = searchParams.get('tab') || (() => {
      try { return sessionStorage.getItem('t2_return_tab') || localStorage.getItem('t2_active_tab_v1') || 'home'; } catch { return 'home'; }
    })();
    return wsId ? `/dashboard?ws=${wsId}&tab=${tab}` : (user ? `/dashboard?tab=${tab}` : '/');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-3 sm:px-6 py-6 relative overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl p-4 sm:p-6 rounded-[24px] glass-card border border-border relative overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
      >
        {/* Top-Right Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close meeting preview"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-all cursor-pointer shadow-md"
          title="Close meeting preview"
        >
          <X className="size-4 sm:size-5" />
        </button>
        <div className={`relative rounded-2xl overflow-hidden h-56 sm:h-64 md:h-auto flex flex-col min-h-[260px] sm:min-h-[320px] border border-white/5 ${isSpeaking ? 'ring-4 ring-emerald-400/20 shadow-[0_0_40px_rgba(16,185,129,0.12)]' : ''}`}>
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

// ─── HCI Non-distracting Passing Chat Toast ─────────────────────────
function PassingChatToast({
  notification,
  onOpenChat,
  onDismiss,
}: {
  notification: { id: string; sender: string; content: string };
  onOpenChat: () => void;
  onDismiss: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3800);
    return () => clearTimeout(timer);
  }, [isHovered, onDismiss, notification.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpenChat}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-md bg-[#16181d]/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3 pointer-events-auto cursor-pointer group hover:border-blue-500/40 transition-all select-none overflow-hidden"
    >
      {/* Sender Avatar Icon */}
      <div className="size-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md">
        {notification.sender.charAt(0).toUpperCase()}
      </div>

      {/* Message Preview Content */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 text-xs">
        <span className="font-extrabold text-white truncate max-w-[90px] sm:max-w-[120px]">
          {notification.sender.split('@')[0]}
        </span>
        <span className="text-white/30">•</span>
        <span className="text-white/80 font-medium truncate max-w-[150px] sm:max-w-[220px]">
          {notification.content}
        </span>
      </div>

      {/* Action / Dismiss */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider hidden sm:inline group-hover:underline">
          Reply
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Dismiss message notification"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* "Pass-by" Progress Line Indicator */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: isHovered ? 0 : 3.8, ease: "linear" }}
        className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full origin-left opacity-75"
      />
    </motion.div>
  );
}

// ─── Post-leave screen ──────────────────────────────────────────────
function LeftMeetingScreen({
  code,
  isHost,
  didEndMeeting,
  wasEndedByHost = false,
  onRejoin,
  onReopen,
  workspaceId: workspaceIdProp,
}: {
  code: string;
  isHost: boolean;
  didEndMeeting: boolean;
  wasEndedByHost?: boolean;
  onRejoin: () => void;
  onReopen: () => void;
  workspaceId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [duration] = useState(() => Math.floor(Math.random() * 30) + 10);
  const [randomParticipants] = useState(() => Math.floor(Math.random() * 5) + 2);

  const returnUrl = useMemo(() => {
    const wsId = searchParams.get('workspaceId') || searchParams.get('ws')
      || workspaceIdProp
      || (() => {
        try { return sessionStorage.getItem('t2_return_workspace_id') || localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; }
      })();
    const tab = searchParams.get('tab') || (() => {
      try { return sessionStorage.getItem('t2_return_tab') || localStorage.getItem('t2_active_tab_v1') || 'home'; } catch { return 'home'; }
    })();
    return wsId ? `/dashboard?ws=${wsId}&tab=${tab}` : (user ? `/dashboard?tab=${tab}` : '/');
  }, [searchParams, user, workspaceIdProp]);

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
          <span className="text-4xl">{isHost ? '👑' : (didEndMeeting || wasEndedByHost ? '🏁' : '👋')}</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2 font-heading">
          {didEndMeeting
            ? 'You ended the session'
            : wasEndedByHost
            ? 'This meeting has ended'
            : 'You left the meeting'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {didEndMeeting
            ? 'The meeting has been ended. You can reopen it or return to your workspace.'
            : wasEndedByHost
            ? 'The host has ended this meeting session for all participants.'
            : `Meeting code: `}
          {!didEndMeeting && !wasEndedByHost && <span className="font-mono font-bold text-foreground">{code}</span>}
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
          {/* Summary / Notes link */}
          <Link
            href={`/room/${code}/summary`}
            className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition bg-blue-600"
          >
            <Sparkles className="size-5" />
            View Meeting Summary &amp; Notes
          </Link>

          {/* Primary Return to Workspace / Dashboard Button */}
          <button
            onClick={() => router.push(returnUrl)}
            className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Building2 className="size-5" />
            {user ? 'Return to Workspace' : 'Back to Home'}
          </button>

          {/* Host who ended: offer Reopen. Host who left / participant (if meeting not ended): offer Rejoin */}
          {didEndMeeting ? (
            <button
              onClick={onReopen}
              className="w-full h-12 rounded-2xl bg-card border border-border font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-muted transition text-xs"
            >
              <RotateCcw className="size-4" />
              Reopen &amp; Rejoin
            </button>
          ) : !wasEndedByHost ? (
            <button
              onClick={onRejoin}
              className="w-full h-12 rounded-2xl bg-card border border-border font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-muted transition text-xs"
            >
              <RotateCcw className="size-4" />
              Rejoin Meeting
            </button>
          ) : null}

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

// ─── Meeting Ended Screen (for visitors / rejoiners to concluded rooms) ─
function MeetingEndedScreen({
  code,
  meeting,
  onReopen,
  isHost = false,
}: {
  code: string;
  meeting: Meeting;
  onReopen?: () => void;
  isHost?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const returnUrl = useMemo(() => {
    const wsId = searchParams.get('workspaceId') || searchParams.get('ws')
      || meeting.workspace_id
      || (() => {
        try { return sessionStorage.getItem('t2_return_workspace_id') || localStorage.getItem('t2_active_workspace_v1') || null; } catch { return null; }
      })();
    const tab = searchParams.get('tab') || (() => {
      try { return sessionStorage.getItem('t2_return_tab') || localStorage.getItem('t2_active_tab_v1') || 'home'; } catch { return 'home'; }
    })();
    return wsId ? `/dashboard?ws=${wsId}&tab=${tab}` : (user ? `/dashboard?tab=${tab}` : '/');
  }, [searchParams, user, meeting.workspace_id]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-8 font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md text-center"
      >
        <div className="size-20 rounded-3xl bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 grid place-items-center mx-auto mb-6 shadow-sm">
          <span className="text-4xl">🏁</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">
          <span className="size-1.5 rounded-full bg-slate-400" />
          Session Concluded
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2 font-heading text-slate-900 dark:text-white">
          This meeting has ended
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
          The host has concluded this session. All transcripts and notes captured by Talk2Me AI have been preserved.
        </p>

        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs text-muted-foreground flex items-center justify-between">
          <span className="font-semibold text-foreground truncate max-w-[200px]">{meeting.title || `Room ${code}`}</span>
          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">{code}</span>
        </div>

        <div className="mt-8 flex flex-col gap-3 font-sans">
          <Link
            href={`/room/${code}/summary`}
            className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-sm hover:bg-indigo-500 transition bg-indigo-600 text-sm"
          >
            <Sparkles className="size-4" />
            View Meeting Summary &amp; Notes
          </Link>

          <button
            onClick={() => router.push(returnUrl)}
            className="w-full h-12 rounded-2xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm"
          >
            <Building2 className="size-4" />
            {user ? 'Return to Workspace' : 'Back to Home'}
          </button>

          {isHost && onReopen && (
            <button
              onClick={onReopen}
              className="w-full h-12 rounded-2xl bg-card border border-border font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2 hover:bg-muted transition text-xs"
            >
              <RotateCcw className="size-3.5" />
              Reopen This Meeting (Host Only)
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
  dragConstraints,
  controlsVisible = true,
}: { 
  participant: LocalParticipant; 
  absolute?: boolean; 
  raised?: boolean; 
  reactions?: { id: string; sender_id: string; emoji: string; timestamp: string }[];
  dragConstraints?: React.RefObject<HTMLDivElement | null>;
  controlsVisible?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  // On mobile the dock is ~108px tall; add 12px margin. On desktop ~80px.
  // Use a CSS calc so it works across device sizes.
  const pipStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'fixed',
    right: 12,
    bottom: controlsVisible ? 'calc(var(--dock-h, 120px) + 8px)' : '16px',
    width: 'clamp(100px, 22vw, 160px)',
    height: 'clamp(130px, 28vw, 210px)',
    zIndex: absolute ? 40 : 60,
    transition: 'bottom 0.3s ease-in-out, opacity 0.3s ease-in-out',
  };
  const miniStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'fixed',
    right: 12,
    bottom: controlsVisible ? 'calc(var(--dock-h, 120px) + 8px)' : '16px',
    zIndex: absolute ? 40 : 60,
    transition: 'bottom 0.3s ease-in-out, opacity 0.3s ease-in-out',
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
  meetingRecord,
  accessLevel,
  onToggleAccessLevel,
  onReconnect,
}: {
  code: string;
  isHost: boolean;
  onLeave: (endForAll?: boolean, wasEndedByHost?: boolean) => void;
  hostIdentity?: string;
  meetingId?: string;
  isAppAdmin?: boolean;
  meetingRecord?: Meeting | null;
  accessLevel?: 'members_only' | 'open';
  onToggleAccessLevel?: () => void;
  onReconnect?: () => Promise<void> | void;
}) {
  const room = useRoomContext();
  const { user: authedUser } = useAuth();
  const {
    micOn, camOn, screenShareOn, isDeafMode, aiNoiseShieldOn, noiseReductionLevel, toggleAiNoiseShield,
    captions, canonicalTranscripts, activeInterims, highlightedMs,
    messages, participants, sttStatus,
    toggleMic, toggleCam, toggleScreenShare, toggleDeafMode, sendMessage, requestMute,
    raisedHands, reactions, toggleRaiseHand, sendReaction, requestKick,

    isAdmitted, joinRequests, isEphemeral, cohosts, meetingHostId, allowScreenShare, isAdmin, requireApproval,
    approveJoinRequest, denyJoinRequest, admitAllJoinRequests, muteAllParticipants, updateSettings, changeParticipantRole, stopParticipantScreenShare,
    broadcastBoardSwitch,
    endMeetingForAll,
    connectionState,
    isNetworkOffline,
  } = useMeeting(
    code,
    hostIdentity,
    () => onLeave(false, false),
    isAppAdmin,
    () => onLeave(false, true)
  );

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
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'board'>('chat');

  const roomSearchParams = useSearchParams();
  const currentWorkspaceId = meetingRecord?.workspace_id || roomSearchParams.get('workspaceId') || roomSearchParams.get('ws') || '';

  // Work Board & Real-time Action state
  const [workspaceBoards, setWorkspaceBoards] = useState<WorkspaceBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>(meetingRecord?.board_id || '');
  const [meetingActionItems, setMeetingActionItems] = useState<BoardActionItem[]>([]);
  const [detectedCandidate, setDetectedCandidate] = useState<DetectedActionCandidate | null>(null);
  const [evidenceHighlightedMs, setEvidenceHighlightedMs] = useState<number | null>(null);
  const processedTurnsRef = useRef<Set<string>>(new Set());

  // Load boards for the workspace
  useEffect(() => {
    let mounted = true;
    if (!currentWorkspaceId) return;

    async function loadBoards() {
      try {
        const fetched = await WorkBoardService.getWorkspaceBoards(currentWorkspaceId);
        if (mounted) {
          setWorkspaceBoards(fetched);
          if (!activeBoardId && fetched.length > 0) {
            setActiveBoardId(meetingRecord?.board_id || fetched[0].id);
          }
        }
      } catch (err) {
        console.warn('[RoomContent] Error loading workspace boards:', err);
      }
    }

    loadBoards();
    return () => { mounted = false; };
  }, [currentWorkspaceId, activeBoardId, meetingRecord?.board_id]);

  // Load and subscribe to meeting action items
  useEffect(() => {
    let mounted = true;
    async function loadItems() {
      try {
        const items = await WorkBoardService.getMeetingActionItems(code);
        if (mounted) setMeetingActionItems(items);
      } catch (err) {
        console.warn('[RoomContent] Error loading meeting action items:', err);
      }
    }

    loadItems();

    const unsub = WorkBoardService.subscribeToMeetingActionItems(code, () => {
      loadItems();
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [code]);

  // Listen for board switch events broadcast by host/admin via LiveKit data channel
  useEffect(() => {
    const handler = (e: Event) => {
      const boardId = (e as CustomEvent<{ boardId: string }>).detail?.boardId;
      if (boardId) setActiveBoardId(boardId);
    };
    window.addEventListener('t2_board_switch', handler);
    return () => window.removeEventListener('t2_board_switch', handler);
  }, []);

  // Real-time Action & Milestone Detection from Canonical Transcripts
  useEffect(() => {
    if (!canonicalTranscripts || canonicalTranscripts.length === 0) return;
    const latestTurn = canonicalTranscripts[canonicalTranscripts.length - 1];
    if (!latestTurn || !latestTurn.content) return;

    const turnKey = latestTurn.turn_id || `${latestTurn.start_ms}_${latestTurn.content.slice(0, 30)}`;
    if (processedTurnsRef.current.has(turnKey)) return;
    processedTurnsRef.current.add(turnKey);

    const participantInfos = participants.map((p) => ({
      id: p.identity,
      name: p.identity,
    }));

    const cand = ActionDetectorService.detectActionCandidate(latestTurn, participantInfos);
    if (cand) {
      setDetectedCandidate(cand);
    }
  }, [canonicalTranscripts, participants]);

  const handleConfirmCandidate = async (cand: DetectedActionCandidate, targetBoardId: string) => {
    try {
      const created = await WorkBoardService.createActionItem({
        board_id: targetBoardId,
        workspace_id: currentWorkspaceId,
        meeting_id: code,
        title: cand.title,
        category: cand.category,
        assignee_name: cand.assignee_name,
        assignee_id: cand.assignee_id,
        due_date: cand.due_date,
        priority: cand.priority,
        evidence_quote: cand.evidence_quote,
        evidence_timestamp_ms: cand.evidence_timestamp_ms,
        evidence_speaker: cand.evidence_speaker,
        created_by: authedUser?.id || undefined,
      });

      setMeetingActionItems((prev) => [...prev, created]);
      setDetectedCandidate(null);
    } catch (err) {
      console.error('[RoomContent] Failed to confirm action candidate:', err);
      setDetectedCandidate(null);
    }
  };

  const handleUpdateMeetingActionStatus = async (itemId: string, newStatus: BoardActionStatus) => {
    try {
      setMeetingActionItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
      );
      await WorkBoardService.updateActionItemStatus(itemId, newStatus, localParticipant?.identity, localParticipant?.identity);
    } catch (err) {
      console.error('[RoomContent] Failed to update action status:', err);
    }
  };

  const handleCreateMeetingActionManual = async (
    title: string,
    assigneeName: string,
    category: 'action_item' | 'milestone'
  ) => {
    const targetBId = activeBoardId || workspaceBoards[0]?.id;
    if (!targetBId) return;
    try {
      const created = await WorkBoardService.createActionItem({
        board_id: targetBId,
        workspace_id: currentWorkspaceId,
        meeting_id: code,
        title,
        assignee_name: assigneeName,
        category,
        created_by: authedUser?.id || undefined,
      });
      setMeetingActionItems((prev) => [...prev, created]);
    } catch (err) {
      console.error('[RoomContent] Failed to create manual action:', err);
    }
  };

  const handleSwitchMeetingBoard = async (boardId: string) => {
    setActiveBoardId(boardId);
    // Broadcast the new active board to all remote participants
    broadcastBoardSwitch(boardId);
    if (meetingRecord?.id) {
      await MeetingService.updateMeetingBoard(meetingRecord.id, boardId);
    }
  };

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

  const [networkPortalPhase, setNetworkPortalPhase] = useState<'idle' | 'waiting' | 'entering'>('idle');
  const wasReconnectingRef = useRef(false);
  const [isAttemptingReconnect, setIsAttemptingReconnect] = useState(false);
  const reconnectPollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDisconnectedOrReconnecting = connectionState === 'reconnecting' || connectionState === 'disconnected' || isNetworkOffline;

  const triggerReconnect = useCallback(async () => {
    if (isAttemptingReconnect) return;
    setIsAttemptingReconnect(true);
    console.info('[Talk2Me] Auto-reconnecting LiveKit session...');
    try {
      if (onReconnect) {
        await onReconnect();
      } else if (room) {
        const token = sessionStorage.getItem(`t2_session_${code}`);
        if (token && LIVEKIT_URL) {
          await room.connect(LIVEKIT_URL, token);
        }
      }
    } catch (err) {
      console.warn('[Talk2Me] Reconnect attempt error:', err);
    } finally {
      setIsAttemptingReconnect(false);
    }
  }, [isAttemptingReconnect, onReconnect, room, code]);

  useEffect(() => {
    if (isDisconnectedOrReconnecting) {
      wasReconnectingRef.current = true;
      setNetworkPortalPhase('waiting');
    } else if (wasReconnectingRef.current && connectionState === 'connected' && !isNetworkOffline) {
      wasReconnectingRef.current = false;
      setNetworkPortalPhase('entering');
    }
  }, [isDisconnectedOrReconnecting, connectionState, isNetworkOffline]);

  // When browser signals network is restored, immediately trigger reconnect
  useEffect(() => {
    const handleOnline = () => {
      console.info('[Talk2Me] Browser came back online! Proactively reconnecting...');
      if (isDisconnectedOrReconnecting) {
        triggerReconnect();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [isDisconnectedOrReconnecting, triggerReconnect]);

  // Periodic retry poll while disconnected and network is online
  useEffect(() => {
    if (!isDisconnectedOrReconnecting) {
      if (reconnectPollTimerRef.current) {
        clearInterval(reconnectPollTimerRef.current);
        reconnectPollTimerRef.current = null;
      }
      return;
    }

    reconnectPollTimerRef.current = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        console.info('[Talk2Me] Polling reconnect while disconnected...');
        triggerReconnect();
      }
    }, 3000);

    return () => {
      if (reconnectPollTimerRef.current) {
        clearInterval(reconnectPollTimerRef.current);
        reconnectPollTimerRef.current = null;
      }
    };
  }, [isDisconnectedOrReconnecting, triggerReconnect]);

  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const hasScreenShare = screenTracks.length > 0;
  const activeSpeaker = useActiveSpeaker(participants);
  const localParticipant = participants.find(p => p instanceof LocalParticipant) as LocalParticipant | undefined;
  const _stripParticipants = hasScreenShare ? participants : participants.filter(p => p.identity !== activeSpeaker?.identity);

  // Background Meeting Resilience & Continuity (iOS, Android, Windows, Mac, Linux)
  const { reentryToast, dismissReentryToast } = useBackgroundResilience({
    room,
    code,
    localCamOn: camOn,
    localMicOn: micOn,
    activeSpeakerName: activeSpeaker?.name || activeSpeaker?.identity,
    participantCount: participants.length,
    toggleMic,
    toggleCam,
    onLeave: () => onLeave(false, false),
  });

  // Talk2Me Mini View / Document Picture-in-Picture
  const {
    isPipActive,
    pipWindow,
    togglePip,
    returnToMeeting,
    isFloatingFallback,
    setIsFloatingFallback,
  } = usePictureInPicture(code);

  // Gracefully disconnect room on explicit tab close / browser exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (room) {
        room.disconnect();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [room]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    sender: string;
    content: string;
    isDirect?: boolean;
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

    // Filter 1-to-1 direct messages: do not notify if intended for someone else
    const isDM = Boolean(lastMessage.recipient_id && lastMessage.recipient_id !== 'everyone');
    if (isDM && lastMessage.recipient_id !== localParticipant?.identity) {
      return;
    }

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

    // Show passing toast notification
    const senderPart = participants.find(p => p.identity === lastMessage.sender_id);
    const senderName = senderPart?.identity || lastMessage.sender_id || 'Someone';

    setTimeout(() => {
      setActiveNotification({
        id: lastMessage.id,
        sender: senderName,
        content: lastMessage.content,
        isDirect: isDM,
      });
    }, 0);
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

  const visibleParticipantIds = useMemo(() => participants.map(p => p.identity), [participants]);

  const currentMediaState = useMemo(() => ({
    localCamOn: camOn,
    localMicOn: micOn,
    localScreenShareOn: screenShareOn,
    activeRemoteVideoCount: participants.length > 0 ? participants.length - 1 : 0,
  }), [camOn, micOn, screenShareOn, participants.length]);

  const handleCaptionsRecommended = useCallback((recommended: boolean) => {
    if (recommended && !captionsOn) {
      setCaptionsOn(true);
    }
  }, [captionsOn]);

  const handleSendChatMessage = useCallback(async (text: string) => {
    try {
      await sendMessage(text);
      return true;
    } catch {
      return false;
    }
  }, [sendMessage]);

  // Adaptive Network Resilience Engine
  const resilience = useNetworkResilience({
    room,
    roomCode: code,
    meetingId: meetingRecord?.id,
    activeSpeakerId: activeSpeaker?.identity,
    screenShareActive: hasScreenShare,
    screenShareOwnerId: screenTracks[0]?.participant?.identity,
    visibleParticipantIds,
    totalParticipants: participants.length,
    meetingMode: roomMode === 'onthego' ? 'onthego' : (hasScreenShare ? 'presentation' : 'normal'),
    currentMediaState,
    onCaptionsRecommended: handleCaptionsRecommended,
    onSendChatMessage: handleSendChatMessage,
  });

  // Auto-hide controls, topbar, dock, and padding when user is focused & inactive (no movement/touch/scroll for 3.5s)
  const [controlsVisible, setControlsVisible] = useState(true);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapCooldownRef = useRef<number>(0);

  const resetInactivityTimer = useCallback(() => {
    setControlsVisible(true);
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    // Do not auto-hide controls if any interactive side panel, popup, or menu is open
    if (sidebarOpen || participantsOpen || emojiOpen || viewMenuOpen) {
      return;
    }
    activityTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  }, [sidebarOpen, participantsOpen, emojiOpen, viewMenuOpen]);

  const toggleControls = useCallback(() => {
    tapCooldownRef.current = Date.now() + 400; // Ignore synthetic mousemove immediately following a tap
    setControlsVisible(prev => {
      const next = !prev;
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (next) {
        if (!sidebarOpen && !participantsOpen && !emojiOpen && !viewMenuOpen) {
          activityTimeoutRef.current = setTimeout(() => {
            setControlsVisible(false);
          }, 3500);
        }
      }
      return next;
    });
  }, [sidebarOpen, participantsOpen, emojiOpen, viewMenuOpen]);

  const handleScreenTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target) {
      // Don't toggle if tapping interactive buttons, inputs, links, popovers, or dock controls
      if (target.closest('button, input, a, select, textarea, [role="button"], .pointer-events-auto')) {
        resetInactivityTimer();
        return;
      }
    }
    // Screen tap toggles visibility: hides controls if visible, shows controls if hidden
    toggleControls();
  }, [toggleControls, resetInactivityTimer]);

  useEffect(() => {
    if (sidebarOpen || participantsOpen || emojiOpen || viewMenuOpen) {
      setControlsVisible(true);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      return;
    }

    resetInactivityTimer();

    const handleActivity = () => {
      if (Date.now() < tapCooldownRef.current) return;
      resetInactivityTimer();
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('pointermove', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { capture: true, passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });

    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('scroll', handleActivity, { capture: true });
      window.removeEventListener('keydown', handleActivity);
    };
  }, [resetInactivityTimer, sidebarOpen, participantsOpen, emojiOpen, viewMenuOpen]);

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
    <div className={`transition-transform duration-300 ${showTopbar && controlsVisible ? 'translate-y-0' : '-translate-y-full'}`}>
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

          {/* Privacy & Retention Badge / Ambient AI Scribe */}
          {isEphemeral ? (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] font-bold text-amber-300 shadow-sm"
              title="Private & Off-the-Record: Transcripts and summaries are not saved to the database."
            >
              <Shield className="size-3 text-amber-400" />
              <span>Off-the-Record</span>
            </div>
          ) : (
            <AiScribeIndicator
              capturedCount={meetingActionItems.length}
              isEphemeral={false}
              workspaceMeetingHref={currentWorkspaceId ? `/dashboard?ws=${currentWorkspaceId}&tab=meetings` : undefined}
              onOpenNotes={() => {
                setActiveTab('notes');
                setSidebarOpen(true);
              }}
            />
          )}
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

          {/* Picture-in-Picture Mini View button */}
          <button
            onClick={togglePip}
            title={isPipActive ? "Close Mini View" : "Mini Meeting (Picture-in-Picture)"}
            aria-label="Toggle Picture-in-Picture Mini View"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide border transition-all duration-300 shadow-md touch-manipulation cursor-pointer ${
              isPipActive
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                : 'bg-[#1e2227] border-white/5 text-white/60 hover:text-white'
            }`}
          >
            <PictureInPicture2 className="size-3.5" />
            <span className="hidden sm:inline">Mini View</span>
          </button>

          {/* Mobile-Style Network Signal Strength Meter */}
          <NetworkStatusIndicator
            quality={resilience.effectiveQuality}
            connectionState={connectionState}
            isAudioPriority={resilience.isAudioPriority}
            metrics={resilience.metrics}
            policy={resilience.policy}
            missedContextNotice={resilience.missedContextNotice}
            onDismissMissedNotice={resilience.clearMissedContext}
          />

          {/* REC / LIVE status badge */}
          <div className="hidden xs:flex items-center text-xs">
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
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1 ${
              activeTab === 'board'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span>Board</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1 ${
              activeTab === 'notes'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span>AI Notes</span>
            {meetingActionItems.length > 0 && (
              <span className="size-3.5 rounded-full bg-white/20 text-[9px] font-mono flex items-center justify-center">
                {meetingActionItems.length}
              </span>
            )}
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
        {activeTab === 'chat' ? (
          <div className="h-full">
            <ChatPanel messages={messages} onSendMessage={sendMessage} participants={participants} localParticipantIdentity={localParticipant?.identity} />
          </div>
        ) : activeTab === 'board' ? (
          <div className="h-full">
            <MeetingWorkBoardPanel
              board={workspaceBoards.find(b => b.id === activeBoardId) || workspaceBoards[0] || null}
              boards={workspaceBoards}
              actionItems={meetingActionItems}
              onSelectBoard={handleSwitchMeetingBoard}
              onCreateActionItem={handleCreateMeetingActionManual}
              onUpdateStatus={handleUpdateMeetingActionStatus}
              onEvidenceClick={(timestampMs) => {
                setEvidenceHighlightedMs(timestampMs);
                setActiveTab('notes');
              }}
            />
          </div>
        ) : (
          <div className="h-full">
            <AiNotesPanel
              actionItems={meetingActionItems}
              isEphemeral={isEphemeral}
              roomCode={code}
              workspaceId={currentWorkspaceId}
              onUpdateStatus={handleUpdateMeetingActionStatus}
              onCreateItem={handleCreateMeetingActionManual}
              onEvidenceClick={(timestampMs) => setEvidenceHighlightedMs(timestampMs)}
            />
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
        {/* Talk2Me AI Always-Present Audio Avatar */}
        <motion.div
          animate={activeSpeaker?.isSpeaking ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.5 } } : { scale: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="relative size-14 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 text-white shadow-xl shadow-indigo-500/25 ring-2 ring-indigo-400/40">
            <Sparkles className="size-6 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-[8px] font-black uppercase tracking-wider text-white shadow">
              AGI
            </div>
            {/* Listening pulse ring */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-indigo-500/30 -z-10"
            />
          </div>
          <span className="text-[10px] font-bold text-indigo-300 max-w-[64px] truncate text-center flex items-center gap-0.5">
            Talk2Me AI
          </span>
        </motion.div>
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

      {/* Large central mic control */}
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
        <HidableSelfView participant={localParticipant} absolute raised={!!raisedHands[localParticipant.identity]} reactions={reactions.filter(r => r.sender_id === localParticipant.identity)} dragConstraints={selfViewConstraintsRef} controlsVisible={controlsVisible} />
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
        <HidableSelfView participant={localParticipant} absolute raised={!!raisedHands[localParticipant.identity]} reactions={reactions.filter(r => r.sender_id === localParticipant.identity)} dragConstraints={selfViewConstraintsRef} controlsVisible={controlsVisible} />
      )}
    </div>
  );

  if (!isAdmitted) {
    return (
      <NetworkDoorScene
        status="reconnecting"
        title="Standing at Door"
        subtitle={`Please wait, the host will open the door for room #${code} soon...`}
      />
    );
  }

  return (
    <>
      {isEnteringDoor && (
        <NetworkDoorScene
          status="connected"
          title="Door Open"
          subtitle="Welcome in! Stepping into the meeting..."
          onEntered={() => setIsEnteringDoor(false)}
        />
      )}
      {networkPortalPhase !== 'idle' && (
        <NetworkDoorScene
          status={networkPortalPhase === 'entering' ? 'connected' : (isAttemptingReconnect ? 'reconnecting' : 'disconnected')}
          title={
            networkPortalPhase === 'entering'
              ? 'Network Connected'
              : isAttemptingReconnect
              ? 'Reconnecting...'
              : 'Network Disconnected'
          }
          subtitle={
            networkPortalPhase === 'entering'
              ? 'Opening the door, stepping back into the meeting...'
              : isAttemptingReconnect
              ? 'Connecting back to room, please hold on...'
              : `Holding your spot outside room #${code} while reconnecting...`
          }
          onEntered={() => setNetworkPortalPhase('idle')}
          onRetry={triggerReconnect}
          isRetrying={isAttemptingReconnect}
          onLeave={() => onLeave(false)}
        />
      )}
      <MeetingLayout isDeafMode={isDeafMode} topbar={topbar} sidebar={sidebar} fullBleed={viewMode !== 'grid'} topbarVisible={showTopbar} controlsVisible={controlsVisible}
        dock={
          <ControlDock
            code={code}
            micOn={micOn} camOn={camOn} screenShareOn={screenShareOn}
            transcriptOn={!!raisedHands[localParticipant?.identity || '']} deafOn={isDeafMode}
            participantsOpen={participantsOpen} participantCount={participants.length + 1}
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
            onLeave={(endForAll) => {
              if (endForAll) {
                endMeetingForAll();
              }
              onLeave(endForAll, false);
            }}
            isHost={isHost}
            unreadCount={unreadCount}
            aiNoiseOn={aiNoiseShieldOn}
            noiseReductionLevel={noiseReductionLevel}
            onToggleAiNoise={toggleAiNoiseShield}
            accessLevel={accessLevel}
            onToggleAccessLevel={isHost || isAdmin ? onToggleAccessLevel : undefined}
            isWorkspaceMeeting={!!meetingRecord?.workspace_id}
            onTogglePip={togglePip}
            isPipActive={isPipActive}
          />
        }
      >
        {/* Main active speaker video frame — tap to toggle controls */}
        <div
          className="w-full h-full min-h-0 relative"
          onClick={handleScreenTap}
          onTouchEnd={handleScreenTap}
        >
          {mainStage}
          {/* Show captions only when CC is turned on */}
          {!isDeafMode && captionsOn && <RealTimeCaptionOverlay captions={captions} activeInterims={activeInterims} size={captionSize} />}

          
          {/* Passing Message Notification Toast */}
          <AnimatePresence>
            {activeNotification && (
              <PassingChatToast
                notification={activeNotification}
                onOpenChat={() => {
                  setActiveTab('chat');
                  setSidebarOpen(true);
                  setActiveNotification(null);
                }}
                onDismiss={() => setActiveNotification(null)}
              />
            )}

            {/* Ambient Background Re-entry Toast */}
            {reentryToast && (
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-xl shadow-2xl pointer-events-auto"
              >
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{reentryToast}</span>
                <button
                  onClick={dismissReentryToast}
                  className="ml-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real-Time Action Confirmation Toast */}
          <ActionConfirmationToast
            candidate={detectedCandidate}
            boards={workspaceBoards}
            selectedBoardId={activeBoardId}
            onConfirm={handleConfirmCandidate}
            onDismiss={() => setDetectedCandidate(null)}
          />
        </div>
      </MeetingLayout>

      {/* ══ Native Document Picture-in-Picture Portal (Chrome / Edge / Brave / Opera) ══ */}
      {isPipActive && pipWindow && createPortal(
        <Talk2MeMiniView
          code={code}
          activeSpeaker={activeSpeaker}
          localParticipant={localParticipant}
          participants={participants}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onReturnToMeeting={returnToMeeting}
          onLeave={() => onLeave(false, false)}
          quality={resilience.effectiveQuality}
          connectionState={connectionState}
          isAudioPriority={resilience.isAudioPriority}
        />,
        pipWindow.document.body
      )}

      {/* ══ In-App Floating Mini Meeting Tile Fallback ══════════════════════ */}
      {isFloatingFallback && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/95 pointer-events-auto animate-in zoom-in-95 duration-200">
          <Talk2MeMiniView
            code={code}
            activeSpeaker={activeSpeaker}
            localParticipant={localParticipant}
            participants={participants}
            micOn={micOn}
            camOn={camOn}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onReturnToMeeting={() => setIsFloatingFallback(false)}
            onLeave={() => onLeave(false, false)}
            isFloatingOverlay={true}
            quality={resilience.effectiveQuality}
            connectionState={connectionState}
            isAudioPriority={resilience.isAudioPriority}
          />
        </div>
      )}

      {/* Floating Admission Request list (real admission flow) */}
      <div className={`fixed left-6 top-20 z-50 flex flex-col gap-3 pointer-events-auto transition-all duration-300 ${
        controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
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
      {!showTopbar && controlsVisible && (
        <button onClick={() => setShowTopbar(true)} title="Show topbar" className="fixed top-3 right-3 z-50 bg-black/30 backdrop-blur rounded-full p-2 pointer-events-auto transition-opacity duration-300">
          <Eye className="size-5 text-white" />
        </button>
      )}

      <ParticipantsPanel 
        participants={participants} 
        hostId={meetingHostId || (isHost ? localParticipant?.identity : undefined)} 
        isOpen={participantsOpen} 
        onClose={() => setParticipantsOpen(false)} 
        code={code}
        onShare={shareRoom}
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
        actionItemsCount={meetingActionItems.length}
        isSomeoneSpeaking={!!activeSpeaker?.isSpeaking}
        isEphemeral={isEphemeral}
        onOpenNotes={() => {
          setActiveTab('notes');
          setSidebarOpen(true);
          setParticipantsOpen(false);
        }}
      />

      {/* Emoji picker popover (simple) */}
      {emojiOpen && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
          <EmojiPicker onSelect={(e) => { sendReaction(e); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />
        </div>
      )}

      {/* Floating reactions animation overlay */}
      <FloatingReactionsOverlay reactions={reactions} />

      {/* Development Network Diagnostics & Simulation HUD */}
      <NetworkDebugPanel
        metrics={resilience.metrics}
        policy={resilience.policy}
        simulator={resilience.simulator}
      />
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

  // HCI Refs to protect in-call context from transient network / auth drops
  const tokenRef = useRef<string | null>(token);
  const hasEnteredRoomRef = useRef<boolean>(!!token);

  useEffect(() => {
    tokenRef.current = token;
    if (token) {
      hasEnteredRoomRef.current = true;
    }
  }, [token]);

  // NEW STATES
  const [meetingRecord, setMeetingRecord] = useState<Meeting | null>(null);
  const meetingRecordRef = useRef<Meeting | null>(meetingRecord);
  useEffect(() => {
    meetingRecordRef.current = meetingRecord;
  }, [meetingRecord]);

  const [endOptionSelected, setEndOptionSelected] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [meetingAccessLevel, setMeetingAccessLevel] = useState<'members_only' | 'open'>('members_only');
  const [endedMeetingRecord, setEndedMeetingRecord] = useState<Meeting | null>(null);
  const [meetingEndedByHost, setMeetingEndedByHost] = useState(false);

  useEffect(() => {
    if (meetingRecord?.settings?.access_level) {
      setMeetingAccessLevel(meetingRecord.settings.access_level);
    } else if (meetingRecord?.workspace_id) {
      setMeetingAccessLevel('members_only');
    } else {
      setMeetingAccessLevel('open');
    }
  }, [meetingRecord]);

  const handleToggleAccessLevel = useCallback(async () => {
    if (!meetingRecord) return;
    const newLevel = meetingAccessLevel === 'members_only' ? 'open' : 'members_only';
    setMeetingAccessLevel(newLevel);
    setMeetingRecord(prev => prev ? {
      ...prev,
      settings: {
        ...prev.settings,
        require_approval: prev.settings?.require_approval ?? false,
        access_level: newLevel,
        allow_outsiders: newLevel === 'open',
      }
    } : prev);

    try {
      await MeetingService.updateMeetingSettings(meetingRecord.id, {
        require_approval: meetingRecord.settings?.require_approval ?? false,
        allow_screen_share: meetingRecord.settings?.allow_screen_share ?? true,
        sign_language_enabled: meetingRecord.settings?.sign_language_enabled ?? true,
        is_ephemeral: meetingRecord.settings?.is_ephemeral ?? false,
        access_level: newLevel,
        allow_outsiders: newLevel === 'open',
      });
    } catch (err) {
      console.error('Failed to update meeting access level:', err);
    }
  }, [meetingRecord, meetingAccessLevel]);

  // A user is the host only if their auth ID matches the meeting's host_id.
  // Using !!user here would be a privilege-escalation bug: every signed-in
  // participant would get host controls.
  const isHost = !!(user && meetingRecord && user.id === meetingRecord.host_id);

  const roomOptions = useMemo<RoomOptions>(() => ({
    adaptiveStream: true,
    dynacast: true,
    // Do NOT disconnect WebRTC on tab switch, app minimize, or mobile backgrounding (preserves the conversation)
    disconnectOnPageLeave: false,
    // Route audio via Web Audio context to ensure background audio keepalive on iOS Safari & Android
    webAudioMix: true,
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
      // HCI: Never eject an active caller to the error page during reconnection!
      // If the caller already has a token or already entered the room, preserve the session
      // and let the reconnecting door scene / in-meeting loader continue waiting.
      if (!tokenRef.current && !hasEnteredRoomRef.current) {
        setError(e instanceof Error && e.message ? e.message : 'Could not connect to the room. Please check your connection.');
      }
    }
  }, [code, user, SESSION_KEY, targetRoomCode]);

  const [roomSessionKey, setRoomSessionKey] = useState(0);

  const handleReconnect = useCallback(async () => {
    console.info('[Talk2Me] Auto-reconnecting LiveKit room session in RoomPageInner...');
    try {
      await fetchToken();
    } catch (e) {
      console.warn('[Talk2Me] Token refresh fallback, reusing current token:', e);
    } finally {
      setRoomSessionKey(k => k + 1);
    }
  }, [fetchToken]);

  

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

    const formattedCode = code.includes('-') ? code : (code.length === 7 ? `${code[0]}-${code.slice(1,4)}-${code.slice(4)}` : code);

    // HCI: If the meeting has already been verified and loaded, NEVER re-verify
    // across temporary network dropouts or auth token refreshes!
    if (meetingRecordRef.current && (meetingRecordRef.current.room_code === code || meetingRecordRef.current.room_code === formattedCode)) {
      setIsValidating(false);
      return;
    }

    queueMicrotask(() => {
      setIsValidating(true);
    });

    // Fast path: look for an active meeting (works for everyone)
    MeetingService.getMeetingByCode(formattedCode)
      .then(async (m) => {
        let targetMeeting = m ?? await MeetingService.getMeetingByCode(code);

        if (!targetMeeting) {
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
            targetMeeting = { ...any, status: 'active' as const };
          } else {
            // Meeting was concluded by host — NOT an invalid room!
            setEndedMeetingRecord(any);
            return null;
          }
        }

        // Workspace Member Access Enforcement:
        if (targetMeeting.workspace_id) {
          const isMembersOnly = targetMeeting.settings?.access_level === 'members_only' || targetMeeting.settings?.allow_outsiders === false || (!targetMeeting.settings?.access_level && targetMeeting.settings?.allow_outsiders !== true);
          if (isMembersOnly) {
            if (!user) {
              setError('This meeting is restricted to members of the workspace. Please sign in with a workspace member account.');
              return null;
            }
            if (targetMeeting.host_id !== user.id) {
              const isMember = await WorkspaceService.isUserWorkspaceMember(targetMeeting.workspace_id, user.id);
              if (!isMember) {
                setError('This workspace meeting is restricted to workspace members. Ask an admin or workspace member to allow outsiders if you need guest access.');
                return null;
              }
            }
          }
        }

        return targetMeeting;
      })
      .then(m => { if (m) setMeetingRecord(m); })
      .catch(e => {
        console.error('Failed to load meeting details:', e);
        // HCI: Never eject an active participant to the Invalid Meeting Room error page.
        // Only set error if the user has no token, has never joined, and is not already in the room.
        if (!hasEnteredRoomRef.current && !tokenRef.current && !meetingRecordRef.current) {
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          if (!isOffline) {
            setError('Unable to verify meeting code. Please check your internet connection.');
          }
        }
      })
      .finally(() => setIsValidating(false));
  }, [code, user, authLoading]);

  const handleLeave = useCallback((endForAll: boolean = false, wasEndedByHost: boolean = false) => {
    if (endForAll && meetingRecord) {
      MeetingService.endMeeting(meetingRecord.id).catch(console.error);
    }
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setToken(null);
    hasFetchedToken.current = false;
    setHasLeft(true);
    setEndOptionSelected(endForAll);
    setMeetingEndedByHost(wasEndedByHost);
  }, [meetingRecord, SESSION_KEY]);

  const handleRejoin = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    hasFetchedToken.current = false;
    setShowPreJoin(true);
    setHasLeft(false);
    setEndOptionSelected(false);
    setMeetingEndedByHost(false);
  }, [SESSION_KEY]);

  // Host-only: reactivate the ended meeting then go to pre-join
  const handleReopen = useCallback(async () => {
    const target = meetingRecord || endedMeetingRecord;
    if (target) {
      try {
        await MeetingService.reactivateMeeting(target.id);
        setMeetingRecord(prev => prev ? { ...prev, status: 'active' } : { ...target, status: 'active' });
        setEndedMeetingRecord(null);
      } catch (e) {
        console.error('Failed to reactivate meeting:', e);
      }
    }
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    hasFetchedToken.current = false;
    setShowPreJoin(true);
    setHasLeft(false);
    setEndOptionSelected(false);
    setMeetingEndedByHost(false);
  }, [meetingRecord, endedMeetingRecord, SESSION_KEY]);

  // If the meeting was concluded, show dedicated MeetingEndedScreen (NOT "Invalid Meeting Room")
  if (endedMeetingRecord) {
    return (
      <MeetingEndedScreen
        code={code}
        meeting={endedMeetingRecord}
        onReopen={handleReopen}
        isHost={!!(user && endedMeetingRecord.host_id === user.id)}
      />
    );
  }

  // HCI: Fatal "Invalid Meeting Room" screen is ONLY displayed if the user NEVER
  // entered the room and does NOT have a valid token or active session.
  // During an active meeting, network loss must NEVER kick the user out of the meeting room!
  if (error && !token && !hasEnteredRoomRef.current && !meetingRecord) {
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
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <NetworkDoorScene
        status={isOffline ? "disconnected" : "verifying"}
        title={isOffline ? "Network Disconnected" : "Joining meeting..."}
        subtitle={isOffline ? `Holding your spot outside room #${code} while connecting...` : "Connecting to room..."}
        onRetry={handleReconnect}
      />
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
        const tab = (() => { try { return sessionStorage.getItem('t2_return_tab') || localStorage.getItem('t2_active_tab_v1') || 'home'; } catch { return 'home'; } })();
        router.push(wsId ? `/dashboard?ws=${wsId}&tab=${tab}` : (user ? `/dashboard?tab=${tab}` : '/'));
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
        wasEndedByHost={meetingEndedByHost}
        onRejoin={handleRejoin}
        onReopen={handleReopen}
        workspaceId={meetingRecord?.workspace_id || undefined}
      />
    );
  }

  if (!token) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <NetworkDoorScene
        status={isOffline ? "disconnected" : "verifying"}
        title={isOffline ? "Network Disconnected" : "Connecting to room..."}
        subtitle={isOffline ? `Holding your spot outside room #${code} while reconnecting...` : `Entering room #${code}...`}
        onRetry={handleReconnect}
      />
    );
  }


  return (
    <LiveKitRoom 
      key={`lk_room_${code}_${roomSessionKey}`}
      token={token} 
      serverUrl={LIVEKIT_URL} 
      connect={true} 
      audio={true} 
      video={{ resolution: VideoPresets.h360.resolution }}
      options={roomOptions}
    >
      <RoomAudioRenderer />
      <RoomContent
        code={code}
        isHost={isHost}
        onLeave={handleLeave}
        hostIdentity={user?.email?.split('@')[0]}
        meetingId={meetingRecord?.id}
        isAppAdmin={profile?.role === 'admin'}
        meetingRecord={meetingRecord}
        accessLevel={meetingAccessLevel}
        onToggleAccessLevel={handleToggleAccessLevel}
        onReconnect={handleReconnect}
      />
    </LiveKitRoom>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <NetworkDoorScene
          status="verifying"
          title="Joining meeting..."
          subtitle="Connecting to room..."
        />
      }
    >
      <RoomPageInner />
    </Suspense>
  );
}
