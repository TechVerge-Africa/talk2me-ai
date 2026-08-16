'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PCMResampler } from '@/lib/audio/pcm-resampler';

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

  // Keep callback refs stable to prevent unnecessary re-subscriptions
  const onInterimResultRef = useRef(onInterimResult);
  const onFinalResultRef = useRef(onFinalResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
    onFinalResultRef.current = onFinalResult;
    onErrorRef.current = onError;
  }, [onInterimResult, onFinalResult, onError]);

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    isConnectingRef.current = false;

    // Stop WebSpeech fallback if active
    if (speechRecRef.current) {
      try {
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

    setIsListening(false);
    setIsConnected(false);
  }, [audioTrack]);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (isConnectingRef.current || wsRef.current || speechRecRef.current) return;

    isConnectingRef.current = true;
    isIntentionalStopRef.current = false;
    setError(null);

    try {
      // 1. Fetch AssemblyAI Temporary Token
      const tokenRes = await fetch('/api/assemblyai/token', { method: 'POST' });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || 'Unable to obtain AssemblyAI session token');
      }

      if (tokenData.is_mock) {
        setIsMockMode(true);
        console.warn('[AssemblyAI Realtime] Running in fallback transcriber mode.');
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

      if (tokenData.is_mock) {
        setIsConnected(true);
        setIsListening(true);
        isConnectingRef.current = false;

        // Attach WebSpeech API fallback for seamless local speech capture
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (e: any) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const res = e.results[i];
              const text = res[0].transcript;
              if (res.isFinal) {
                onFinalResultRef.current?.({
                  messageType: 'FinalTranscript',
                  text: text.trim(),
                  speakerId: participantId,
                  speakerName: participantName,
                  audioStart: Date.now() - startTimeRef.current - 1000,
                  audioEnd: Date.now() - startTimeRef.current,
                  confidence: res[0].confidence || 0.95,
                  words: [],
                });
              } else {
                onInterimResultRef.current?.({
                  messageType: 'PartialTranscript',
                  text: text.trim(),
                  speakerId: participantId,
                  speakerName: participantName,
                  audioStart: Date.now() - startTimeRef.current,
                  audioEnd: Date.now() - startTimeRef.current + 500,
                  confidence: 0.9,
                  words: [],
                });
              }
            }
          };

          rec.onerror = (e: any) => {
            console.warn('[WebSpeech Fallback Error]:', e);
          };

          rec.onend = () => {
            if (!isIntentionalStopRef.current && enabled) {
              try { rec.start(); } catch {}
            }
          };

          try {
            rec.start();
            speechRecRef.current = rec;
          } catch (e) {
            console.warn('Failed to start WebSpeech fallback:', e);
          }
        }
        return;
      }

      // 3. Construct AssemblyAI Realtime WebSocket URL (AssemblyAI v3 Streaming API)
      const token = tokenData.token;
      // AssemblyAI v3 accepts raw signed 16-bit little-endian PCM frames. The
      // v3 WebSocket only requires the temporary token and sample rate; the
      // legacy `encoding` query parameter causes the v3 session to close.
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(token)}&sample_rate=16000`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setIsConnected(true);
        setIsListening(true);

        // Initialize PCM Resampler and send binary audio frames over WebSocket
        const resampler = new PCMResampler((pcmArrayBuffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(pcmArrayBuffer);
          }
        });

        resamplerRef.current = resampler;
        void resampler.start(stream).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to process microphone audio';
          setError(message);
          onErrorRef.current?.(message);
          stopListening();
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const msgType = data.type || data.message_type;
          const text = (data.text || data.transcript || '').trim();

          if (!text) return;

          // AssemblyAI v3 Realtime STT emits type: "Turn" with end_of_turn boolean
          const isInterim = msgType === 'PartialTranscript' || msgType === 'partial' || (msgType === 'Turn' && data.end_of_turn === false);
          const isFinal = msgType === 'FinalTranscript' || msgType === 'final' || (msgType === 'Turn' && data.end_of_turn === true);

          if (isInterim) {
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
          console.warn('[AssemblyAI WS Message Parse Error]:', err);
        }
      };



      ws.onerror = () => {
        if (!isIntentionalStopRef.current) {
          const message = 'AssemblyAI realtime connection failed';
          console.warn('[AssemblyAI WS Event]:', message);
          setError(message);
          onErrorRef.current?.(message);
        }
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        setIsConnected(false);
        setIsListening(false);
        wsRef.current = null;

        if (!isIntentionalStopRef.current && enabled) {
          // Reconnect attempt after 3s delay
          setTimeout(() => {
            if (enabled && !isIntentionalStopRef.current) {
              startListening();
            }
          }, 3000);
        }
      };

    } catch (err: any) {
      isConnectingRef.current = false;
      console.error('[AssemblyAI Start Error]:', err);
      setError(err?.message || 'Failed to start microphone audio stream');
      onErrorRef.current?.(err?.message || 'Microphone error');
      setIsListening(false);
      setIsConnected(false);
    }
  }, [audioTrack, enabled, participantId, participantName, stopListening]);

  useEffect(() => {
    if (enabled && !isListening && !isConnectingRef.current && !isIntentionalStopRef.current) {
      startListening();
    } else if (!enabled && (isListening || isConnectingRef.current)) {
      stopListening();
    }
  }, [enabled, isListening, startListening, stopListening]);

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
