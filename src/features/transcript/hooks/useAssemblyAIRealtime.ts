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
  onInterimResult?: (result: AssemblyAIResult) => void;
  onFinalResult?: (result: AssemblyAIResult) => void;
  onError?: (error: string) => void;
}

export function useAssemblyAIRealtime({
  enabled = false,
  participantId,
  participantName,
  onInterimResult,
  onFinalResult,
  onError,
}: UseAssemblyAIRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const resamplerRef = useRef<PCMResampler | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isIntentionalStopRef = useRef<boolean>(false);

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;

    // Stop PCM resampler
    if (resamplerRef.current) {
      resamplerRef.current.stop();
      resamplerRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ terminate_session: true }));
          wsRef.current.close();
        }
      } catch {}
      wsRef.current = null;
    }

    setIsListening(false);
    setIsConnected(false);
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    isIntentionalStopRef.current = false;
    setError(null);

    try {
      // 1. Fetch AssemblyAI Temporary Token
      const tokenRes = await fetch('/api/assemblyai/token', { method: 'POST' });
      const tokenData = await tokenRes.json();

      if (tokenData.is_mock) {
        setIsMockMode(true);
        console.warn('[AssemblyAI Realtime] Running in mock transcriber mode.');
      }

      // 2. Request High-Sensitivity Audio MediaStream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Turn off aggressive noise suppression for clean speech capture
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;
      startTimeRef.current = Date.now();

      if (tokenData.is_mock) {
        // Mock mode setup
        setIsConnected(true);
        setIsListening(true);
        return;
      }

      // 3. Construct AssemblyAI Realtime WebSocket URL (AssemblyAI v3 Streaming API)
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(tokenData.token)}&sample_rate=16000`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsListening(true);

        // Initialize PCM Resampler and send binary audio frames over WebSocket
        const resampler = new PCMResampler((pcmArrayBuffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            // AssemblyAI v3 accepts raw binary PCM 16-bit LE buffers directly
            ws.send(pcmArrayBuffer);
          }
        });

        resamplerRef.current = resampler;
        resampler.start(stream);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const msgType = data.type || data.message_type;

          if ((msgType === 'PartialTranscript' || msgType === 'partial') && data.text) {
            const result: AssemblyAIResult = {
              messageType: 'PartialTranscript',
              text: data.text.trim(),
              speakerId: participantId,
              speakerName: participantName,
              audioStart: data.audio_start || (Date.now() - startTimeRef.current),
              audioEnd: data.audio_end || (Date.now() - startTimeRef.current + 500),
              confidence: data.confidence || 0.9,
              words: data.words || [],
            };
            onInterimResult?.(result);
          } else if ((msgType === 'FinalTranscript' || msgType === 'final' || msgType === 'Turn') && data.text) {
            const result: AssemblyAIResult = {
              messageType: 'FinalTranscript',
              text: data.text.trim(),
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
            onFinalResult?.(result);
          }
        } catch (err) {
          console.warn('[AssemblyAI WS Message Parse Error]:', err);
        }
      };


      ws.onerror = (evt) => {
        console.error('[AssemblyAI WS Error]:', evt);
        setError('AssemblyAI WebSocket connection error');
        onError?.('AssemblyAI WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
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
      console.error('[AssemblyAI Start Error]:', err);
      setError(err?.message || 'Failed to start microphone audio stream');
      onError?.(err?.message || 'Microphone error');
      setIsListening(false);
      setIsConnected(false);
    }
  }, [enabled, participantId, participantName, onError, onFinalResult, onInterimResult]);

  useEffect(() => {
    if (enabled && !isListening && !isIntentionalStopRef.current) {
      startListening();
    } else if (!enabled && isListening) {
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
