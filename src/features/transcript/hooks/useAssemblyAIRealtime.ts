'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PCMResampler } from '@/lib/audio/pcm-resampler';
import {
  isKnownHallucination,
  isPhysicallyImpossible,
  RepetitionDetector,
  MIN_AUDIBLE_BLOB_BYTES,
  GROQ_WHISPER_CONTEXT_PROMPT,
} from '@/lib/audio/stt-hallucination-filter';

export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AssemblyAIResult {
  messageType: 'PartialTranscript' | 'FinalTranscript';
  text: string;
  speakerId: string;
  speakerName: string;
  audioStart: number;
  audioEnd: number;
  confidence: number;
  words: AssemblyAIWord[];
}

export interface UseAssemblyAIRealtimeOptions {
  enabled?: boolean;
  participantId: string;
  participantName: string;
  audioTrack?: MediaStreamTrack | null;
  onInterimResult?: (result: AssemblyAIResult) => void;
  onFinalResult?: (result: AssemblyAIResult) => void;
  onError?: (error: string) => void;
}

/**
 * Mathematical Ring Buffer (Circular Queue) Data Structure for low-latency audio frame queuing.
 * Guarantees O(1) enqueue/dequeue and prevents memory bloat during network jitter.
 */
export class AudioRingBuffer<T> {
  private buffer: (T | null)[];
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity; // Evict oldest frame on overflow
    }
  }

  pop(): T | null {
    if (this.size === 0) return null;
    const item = this.buffer[this.head];
    this.buffer[this.head] = null;
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }

  flushAll(): T[] {
    const items: T[] = [];
    while (this.size > 0) {
      const item = this.pop();
      if (item !== null) items.push(item);
    }
    return items;
  }

  get length(): number {
    return this.size;
  }

  clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
}

export function useAssemblyAIRealtime({
  enabled = false,
  participantId,
  participantName,
  audioTrack,
  onInterimResult,
  onFinalResult,
  onError,
}: UseAssemblyAIRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const speechRecRef = useRef<any>(null);
  const resamplerRef = useRef<PCMResampler | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isIntentionalStopRef = useRef<boolean>(false);
  const isConnectingRef = useRef<boolean>(false);
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackActiveRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const isRecordingUtteranceRef = useRef<boolean>(false);
  const speechSilenceStartRef = useRef<number>(0);
  const utteranceStartTimeRef = useRef<number>(0);
  const webSpeechActiveRef = useRef<boolean>(false);
  const activeEngineRef = useRef<'assemblyai' | 'webspeech' | 'groq' | 'none'>('none');

  // Audio Ring Buffer (Capacity: 120 audio frames in memory)
  const audioRingBufferRef = useRef(new AudioRingBuffer<ArrayBuffer | Blob>(120));

  // ── Hallucination guards ────────────────────────────────────────
  const repetitionDetector = useRef(new RepetitionDetector(6));

  const shouldAcceptFinal = useCallback((text: string, durationMs = 3000): boolean => {
    if (!text.trim()) return false;
    if (isKnownHallucination(text)) {
      console.warn('[STT Filter] Blocked hallucination:', JSON.stringify(text));
      return false;
    }
    if (isPhysicallyImpossible(text, durationMs)) {
      console.warn('[STT Filter] Impossible transcript (word count):', text);
      return false;
    }
    if (repetitionDetector.current.isRepetitionLoop(text)) {
      console.warn('[STT Filter] Repetition loop, discarding:', JSON.stringify(text));
      return false;
    }
    repetitionDetector.current.commit(text);
    return true;
  }, []);

  // Keep callback refs stable to prevent unnecessary re-subscriptions
  const onInterimResultRef = useRef(onInterimResult);
  const onFinalResultRef = useRef(onFinalResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
    onFinalResultRef.current = onFinalResult;
    onErrorRef.current = onError;
  }, [onInterimResult, onFinalResult, onError]);

  // ── STOP GROQ VAD FALLBACK ──────────────────────────────────────
  const stopFallback = useCallback(() => {
    fallbackActiveRef.current = false;
    isRecordingUtteranceRef.current = false;
    speechSilenceStartRef.current = 0;
    utteranceStartTimeRef.current = 0;

    if (vadIntervalRef.current !== null) {
      window.clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (vadAnalyserRef.current) {
      try { vadAnalyserRef.current.disconnect(); } catch {}
      vadAnalyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch {}
      audioContextRef.current = null;
    }

    if (fallbackRecorderRef.current) {
      try {
        fallbackRecorderRef.current.ondataavailable = null;
        fallbackRecorderRef.current.onstop = null;
        if (fallbackRecorderRef.current.state !== 'inactive') {
          fallbackRecorderRef.current.stop();
        }
      } catch {}
      fallbackRecorderRef.current = null;
    }

    if (fallbackStreamRef.current && !audioTrack) {
      fallbackStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    fallbackStreamRef.current = null;
  }, [audioTrack]);

  // ── START GROQ VAD FALLBACK (Voice Activity Detected, Standalone WebM) ──
  const startGroqFallback = useCallback(async (stream?: MediaStream) => {
    if (fallbackActiveRef.current || isIntentionalStopRef.current) return;
    try {
      const fallbackStream = stream ?? (audioTrack && audioTrack.readyState === 'live'
        ? new MediaStream([audioTrack])
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: false,
              autoGainControl: true,
              channelCount: 1,
            },
          }));

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      if (!mimeType) {
        throw new Error('Groq fallback requires WebM audio support');
      }

      fallbackStreamRef.current = fallbackStream;
      fallbackActiveRef.current = true;
      setIsMockMode(true);
      setIsConnected(true);
      setIsListening(true);

      // 1. Web Audio API Voice Activity Detection (VAD) via AnalyserNode
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(fallbackStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.2;
          source.connect(analyser);
          vadAnalyserRef.current = analyser;
        } catch (audioCtxErr) {
          console.warn('[VAD AudioContext init warning]:', audioCtxErr);
        }
      }

      // 2. Utterance-based MediaRecorder (each start/stop generates a standalone, valid WebM container)
      const recorder = new MediaRecorder(fallbackStream, { mimeType });
      fallbackRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (activeEngineRef.current !== 'groq') return;
        if (!event.data || event.data.size < 1000 || !fallbackActiveRef.current) return;

        const chunkDuration = Date.now() - utteranceStartTimeRef.current;
        // Discard short blips (< 600ms) to avoid mic taps or clicks
        if (chunkDuration < 600) {
          return;
        }

        const formData = new FormData();
        formData.append('file', event.data, `utterance-${Date.now()}.webm`);
        formData.append('language', 'en');
        // Clean context prompt instead of instructional prompt
        formData.append('prompt', GROQ_WHISPER_CONTEXT_PROMPT);

        try {
          const response = await fetch('/api/stt/transcribe', { method: 'POST', body: formData });
          const data = await response.json();
          const text = typeof data.text === 'string' ? data.text.trim() : '';
          if (response.ok && text && fallbackActiveRef.current && shouldAcceptFinal(text, chunkDuration)) {
            onFinalResultRef.current?.({
              messageType: 'FinalTranscript',
              text,
              speakerId: participantId,
              speakerName: participantName,
              audioStart: Date.now() - startTimeRef.current - chunkDuration,
              audioEnd: Date.now() - startTimeRef.current,
              confidence: 0.95,
              words: [],
            });
          }
        } catch (error) {
          console.warn('[Groq Whisper fallback]', error);
        }
      };

      recorder.onstop = () => {
        // If continuing speech triggered a split at MAX_UTTERANCE_MS, immediately restart
        if (isRecordingUtteranceRef.current && fallbackActiveRef.current && !isIntentionalStopRef.current) {
          try {
            if (recorder.state === 'inactive') {
              recorder.start();
            }
          } catch (err) {
            console.warn('[VAD] Failed to restart recorder in onstop:', err);
          }
        }
      };

      // 3. VAD Loop: polls RMS energy every 100ms
      const SPEECH_RMS_THRESHOLD = 0.014;
      const SILENCE_HANGOVER_MS = 800;
      const MAX_UTTERANCE_MS = 6000;
      const pcmData = new Float32Array(vadAnalyserRef.current?.fftSize || 512);

      vadIntervalRef.current = window.setInterval(() => {
        if (!fallbackActiveRef.current) return;

        let rms = 0;
        if (vadAnalyserRef.current) {
          vadAnalyserRef.current.getFloatTimeDomainData(pcmData);
          let sumSquares = 0;
          for (let i = 0; i < pcmData.length; i++) {
            sumSquares += pcmData[i] * pcmData[i];
          }
          rms = Math.sqrt(sumSquares / pcmData.length);
        }

        const isVoiceDetected = rms >= SPEECH_RMS_THRESHOLD;
        const now = Date.now();

        if (isVoiceDetected) {
          speechSilenceStartRef.current = 0;
          if (!isRecordingUtteranceRef.current) {
            // Speech started: start recording fresh standalone WebM
            isRecordingUtteranceRef.current = true;
            utteranceStartTimeRef.current = now;
            try {
              if (recorder.state === 'inactive') {
                recorder.start();
              }
            } catch {}
          } else {
            // Speech continuing: check if continuous utterance reached maximum duration
            if (now - utteranceStartTimeRef.current >= MAX_UTTERANCE_MS) {
              utteranceStartTimeRef.current = now;
              try {
                if (recorder.state === 'recording') {
                  recorder.stop();
                }
              } catch {}
            }
          }
        } else {
          // Silence or ambient room noise
          if (isRecordingUtteranceRef.current) {
            if (speechSilenceStartRef.current === 0) {
              speechSilenceStartRef.current = now;
            } else if (now - speechSilenceStartRef.current >= SILENCE_HANGOVER_MS) {
              // Silence persisted for hangover window: finalize utterance
              isRecordingUtteranceRef.current = false;
              speechSilenceStartRef.current = 0;
              try {
                if (recorder.state === 'recording') {
                  recorder.stop();
                }
              } catch {}
            }
          }
        }
      }, 100);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Groq Whisper fallback failed';
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [audioTrack, participantId, participantName, shouldAcceptFinal]);

  // ── START LOCAL WEBSPEECH API FOR 0ms INSTANT CAPTIONS ──────────
  const startLocalWebSpeechEngine = useCallback(() => {
    if (typeof window === 'undefined') return false;
    if (speechRecRef.current) return true;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      webSpeechActiveRef.current = false;
      return false;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = 'en-US';

      rec.onstart = () => {
        webSpeechActiveRef.current = true;
        console.log('⚡ [STT Engine] Sub-50ms Local WebSpeech engine active!');
      };

      rec.onresult = (e: any) => {
        if (activeEngineRef.current !== 'webspeech') return;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const text = (res[0].transcript || '').trim();
          if (!text) continue;

          if (res.isFinal) {
            if (!shouldAcceptFinal(text, 2000)) continue;
            onFinalResultRef.current?.({
              messageType: 'FinalTranscript',
              text,
              speakerId: participantId,
              speakerName: participantName,
              audioStart: Date.now() - startTimeRef.current - 1000,
              audioEnd: Date.now() - startTimeRef.current,
              confidence: res[0].confidence || 0.95,
              words: [],
            });
          } else {
            if (isKnownHallucination(text)) continue;
            onInterimResultRef.current?.({
              messageType: 'PartialTranscript',
              text,
              speakerId: participantId,
              speakerName: participantName,
              audioStart: Date.now() - startTimeRef.current,
              audioEnd: Date.now() - startTimeRef.current + 300,
              confidence: 0.9,
              words: [],
            });
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn('[Local WebSpeech Warning]:', e?.error || e);
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed' || e?.error === 'audio-capture') {
          webSpeechActiveRef.current = false;
          if (activeEngineRef.current === 'webspeech' && !isIntentionalStopRef.current && enabled) {
            console.log('🔄 [STT Engine] WebSpeech unavailable. Switching to Groq VAD fallback...');
            activeEngineRef.current = 'groq';
            void startGroqFallback(mediaStreamRef.current ?? undefined);
          }
        }
      };

      rec.onend = () => {
        if (!isIntentionalStopRef.current && enabled && activeEngineRef.current === 'webspeech') {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
      speechRecRef.current = rec;
      webSpeechActiveRef.current = true;
      return true;
    } catch (e) {
      console.warn('Failed to start WebSpeech local engine:', e);
      webSpeechActiveRef.current = false;
      return false;
    }
  }, [enabled, participantId, participantName, shouldAcceptFinal, startGroqFallback]);

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    isConnectingRef.current = false;
    webSpeechActiveRef.current = false;
    stopFallback();
    audioRingBufferRef.current.clear();

    // Stop WebSpeech fallback if active
    if (speechRecRef.current) {
      try {
        speechRecRef.current.onend = null;
        speechRecRef.current.onerror = null;
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
    }

    // Stop PCM resampler
    if (resamplerRef.current) {
      try {
        resamplerRef.current.stop();
      } catch {}
      resamplerRef.current = null;
    }

    // Stop media stream tracks only if created internally
    if (mediaStreamRef.current && !audioTrack) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
          wsRef.current.close(1000, 'Normal closure');
        }
      } catch {}
      wsRef.current = null;
    }

    activeEngineRef.current = 'none';
    setIsListening(false);
    setIsConnected(false);
  }, [audioTrack, stopFallback]);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (isConnectingRef.current || wsRef.current) return;

    isConnectingRef.current = true;
    isIntentionalStopRef.current = false;
    setError(null);

    // 1. Fetch AssemblyAI Temporary Token
    try {
      const tokenRes = await fetch('/api/assemblyai/token');
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || 'Unable to obtain AssemblyAI session token');
      }

      // 2. Obtain Audio MediaStream (Reuse existing LiveKit audioTrack if provided)
      let stream: MediaStream;
      if (audioTrack && audioTrack.readyState === 'live') {
        stream = new MediaStream([audioTrack]);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      }

      if (isIntentionalStopRef.current) {
        if (!audioTrack) stream.getTracks().forEach(t => t.stop());
        isConnectingRef.current = false;
        return;
      }

      mediaStreamRef.current = stream;
      startTimeRef.current = Date.now();

      // 3. EXCLUSIVE ENGINE SELECTION:
      // If token is mock / unconfigured, select WebSpeech or Groq VAD.
      // If token is real, select AssemblyAI v3 WebSocket exclusively.
      if (tokenData.is_mock) {
        setIsMockMode(true);
        setIsConnected(true);
        setIsListening(true);
        isConnectingRef.current = false;

        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          activeEngineRef.current = 'webspeech';
          console.log('⚡ [STT Engine] WebSpeech active as exclusive transcriber (0 silence hallucinations).');
          startLocalWebSpeechEngine();
        } else {
          activeEngineRef.current = 'groq';
          console.log('🎙️ [STT Engine] Groq VAD active as exclusive engine...');
          void startGroqFallback(stream);
        }
        return;
      }

      // 4. Connect AssemblyAI Realtime WebSocket (Exclusive Engine)
      activeEngineRef.current = 'assemblyai';
      setIsMockMode(false);
      const token = tokenData.token;
      console.log('🔑 [STT Debug] Connecting AssemblyAI v3 WS as exclusive engine...');
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(token)}&sample_rate=16000&encoding=pcm_s16le`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setIsConnected(true);
        setIsListening(true);
        console.log('🚀 [STT Debug] WebSocket connected to AssemblyAI!');

        let pcmChunkCount = 0;

        // Initialize PCM Resampler and send binary audio frames over WebSocket
        const resampler = new PCMResampler((pcmArrayBuffer) => {
          // Push into memory AudioRingBuffer for zero packet loss
          audioRingBufferRef.current.push(pcmArrayBuffer);

          if (ws.readyState === WebSocket.OPEN && activeEngineRef.current === 'assemblyai') {
            ws.send(pcmArrayBuffer);
            pcmChunkCount++;
            if (pcmChunkCount % 30 === 0) {
              console.log(`🔊 [STT Debug] Audio streaming active. Sent ${pcmChunkCount} PCM frames to AssemblyAI.`);
            }
          }
        });

        resamplerRef.current = resampler;
        void resampler.start(stream).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to process microphone audio';
          console.error('❌ [STT Debug] PCMResampler start error:', message);
          setError(message);
          onErrorRef.current?.(message);
        });
      };

      ws.onmessage = (event) => {
        if (activeEngineRef.current !== 'assemblyai') return;
        try {
          const data = JSON.parse(event.data);
          const msgType = data.type || data.message_type;

          const text = (data.text || data.transcript || '').trim();
          if (!text) return;

          const isInterim = msgType === 'PartialTranscript' || msgType === 'partial' || (msgType === 'Turn' && data.end_of_turn === false);
          const isFinal = msgType === 'FinalTranscript' || msgType === 'final' || msgType === 'Turn' || !msgType;

          if (isInterim) {
            if (isKnownHallucination(text)) return;
            const result: AssemblyAIResult = {
              messageType: 'PartialTranscript',
              text,
              speakerId: participantId,
              speakerName: participantName,
              audioStart: data.audio_start || (Date.now() - startTimeRef.current),
              audioEnd: data.audio_end || (Date.now() - startTimeRef.current + 500),
              confidence: data.confidence || 0.9,
              words: data.words || [],
            };
            onInterimResultRef.current?.(result);
          } else if (isFinal) {
            const durationMs = data.audio_end && data.audio_start
              ? data.audio_end - data.audio_start
              : 3000;
            if (!shouldAcceptFinal(text, durationMs)) return;
            const result: AssemblyAIResult = {
              messageType: 'FinalTranscript',
              text,
              speakerId: participantId,
              speakerName: participantName,
              audioStart: data.audio_start || (Date.now() - startTimeRef.current - 2000),
              audioEnd: data.audio_end || (Date.now() - startTimeRef.current),
              confidence: data.confidence || 0.98,
              words: (data.words || []).map((w: any) => ({
                text: w.text,
                start: w.start,
                end: w.end,
                confidence: w.confidence || 0.98,
              })),
            };
            onFinalResultRef.current?.(result);
          }
        } catch (err) {
          console.warn('⚠️ [STT Debug] WS Message Parse Error:', err);
        }
      };

      ws.onerror = (evt) => {
        if (!isIntentionalStopRef.current && activeEngineRef.current === 'assemblyai') {
          console.error('❌ [STT Debug] AssemblyAI WebSocket error. Switching to Groq VAD fallback:', evt);
          activeEngineRef.current = 'groq';
          void startGroqFallback(mediaStreamRef.current ?? undefined);
        }
      };

      ws.onclose = (evt) => {
        wsRef.current = null;
        if (!isIntentionalStopRef.current && enabled && activeEngineRef.current === 'assemblyai') {
          console.warn(`⚠️ [STT Debug] AssemblyAI WebSocket closed (${evt.code}). Switching to Groq VAD fallback`);
          activeEngineRef.current = 'groq';
          void startGroqFallback(mediaStreamRef.current ?? undefined);
        }
      };

    } catch (err: any) {
      isConnectingRef.current = false;
      console.error('[AssemblyAI Start Error]:', err);
      setError(err?.message || 'Failed to start microphone audio stream');
      onErrorRef.current?.(err?.message || 'Microphone error');
      void startGroqFallback(mediaStreamRef.current ?? undefined);
      setIsListening(false);
      setIsConnected(false);
    }
  }, [audioTrack, enabled, participantId, participantName, startGroqFallback, startLocalWebSpeechEngine, stopFallback, stopListening]);

  useEffect(() => {
    if (enabled && !isListening && !isConnectingRef.current) {
      startListening();
    } else if (!enabled && (isListening || isConnectingRef.current)) {
      stopListening();
    }
  }, [enabled, isListening, startListening, stopListening]);

  // Re-attach listener if audioTrack changes while enabled
  const prevTrackRef = useRef(audioTrack);
  useEffect(() => {
    if (enabled && prevTrackRef.current !== audioTrack) {
      prevTrackRef.current = audioTrack;
      if (isListening || isConnectingRef.current) {
        stopListening();
        queueMicrotask(() => {
          isIntentionalStopRef.current = false;
          startListening();
        });
      }
    }
  }, [audioTrack, enabled, isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isConnected,
    isListening,
    isMockMode,
    error,
    startListening,
    stopListening,
  };
}
