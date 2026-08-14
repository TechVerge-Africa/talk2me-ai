'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type STTEngineType = 'groq' | 'whisper_local' | 'webspeech';

export interface UseWebSpeechSTTOptions {
  enabled?: boolean;
  language?: string;
  engine?: STTEngineType;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseWebSpeechSTTReturn {
  isSupported: boolean;
  isListening: boolean;
  usingFallback: boolean;
  interimText: string;
  finalText: string;
  currentLanguage: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  setLanguage: (lang: string) => void;
}

/**
 * Universal Groq Whisper AI STT Hook for Talk2Me AI.
 * Uses MediaRecorder with 3-second audio slicing sent to Groq Whisper AI (whisper-large-v3-turbo).
 * Works reliably across all modern browsers (Chrome, Edge, Firefox, Safari, Brave).
 */
export function useWebSpeechSTT({
  enabled = false,
  language = 'en-US',
  engine = 'groq',
  onTranscript,
  onError,
}: UseWebSpeechSTTOptions = {}): UseWebSpeechSTTReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<string>(language);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isIntentionalStopRef = useRef<boolean>(false);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTranscribingRef = useRef<boolean>(false);
  const currentChunksRef = useRef<Blob[]>([]);

  const clearChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  // Common Whisper silence hallucinations to filter out when silent audio is processed
  const isSilenceHallucination = (text: string): boolean => {
    const lower = text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (!lower || lower.length < 2) return true;
    const hallucinations = [
      'thank you', 'subtitles by', 'mbc news', 'music', 'silence',
      'thanks for watching', 'subscribe', 'bye', 'amara.org', 'you',
      'thank you for watching', 'thanks for listening'
    ];
    return hallucinations.some(h => lower === h || lower.startsWith(h));
  };

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    clearChunkTimer();

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(false);
    setInterimText('');
  }, [clearChunkTimer]);

  const sendAudioChunkToGroq = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size < 1200 || isTranscribingRef.current) return;
    isTranscribingRef.current = true;

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('language', currentLanguage.split('-')[0] || 'en');

      const res = await fetch('/api/stt/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.text) {
        const trimmed = data.text.trim();
        if (trimmed.length > 0 && !isSilenceHallucination(trimmed)) {
          setFinalText(trimmed);
          setInterimText('');
          onTranscript?.(trimmed, true);
        }
      } else if (data.error && data.unconfigured) {
        setError(data.error);
        onError?.(data.error);
      }
    } catch (err) {
      console.warn('[GroqSTT] Transcribe chunk error:', err);
    } finally {
      isTranscribingRef.current = false;
    }
  }, [currentLanguage, onError, onTranscript]);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false);
      setError('Browser audio recording is not supported.');
      return;
    }

    isIntentionalStopRef.current = false;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      currentChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          currentChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (currentChunksRef.current.length > 0) {
          const audioBlob = new Blob(currentChunksRef.current, { type: mimeType || 'audio/webm' });
          currentChunksRef.current = [];
          sendAudioChunkToGroq(audioBlob);
        }
        
        // If recording is still active, restart recorder for next audio window
        if (!isIntentionalStopRef.current && mediaStreamRef.current && mediaStreamRef.current.active) {
          try {
            const newRecorder = new MediaRecorder(mediaStreamRef.current, options);
            mediaRecorderRef.current = newRecorder;
            newRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                currentChunksRef.current.push(e.data);
              }
            };
            newRecorder.onstop = recorder.onstop;
            newRecorder.start();
          } catch (e) {
            console.warn('[GroqSTT] Failed to restart recorder cycle:', e);
          }
        }
      };

      recorder.start();
      setIsListening(true);

      // Rotate audio recording every 3 seconds for continuous header-valid WebM transcription
      clearChunkTimer();
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
            console.warn('[GroqSTT] Cycle stop error:', e);
          }
        }
      }, 3000);

    } catch (err) {
      console.error('[GroqSTT] Mic access error:', err);
      const msg = 'Microphone permission was denied or unavailable.';
      setError(msg);
      onError?.(msg);
      setIsListening(false);
    }
  }, [clearChunkTimer, onError, sendAudioChunkToGroq]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    if (enabled && !isListening && !isIntentionalStopRef.current) {
      startListening();
    } else if (!enabled && isListening) {
      stopListening();
    }
  }, [enabled, isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      clearChunkTimer();
      stopListening();
    };
  }, [clearChunkTimer, stopListening]);

  return {
    isSupported,
    isListening,
    usingFallback: true, // Always uses high-accuracy Groq Whisper AI endpoint
    interimText,
    finalText,
    currentLanguage,
    error,
    startListening,
    stopListening,
    toggleListening,
    setLanguage: setCurrentLanguage,
  };
}

