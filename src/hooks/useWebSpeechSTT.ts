'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API Types Declaration
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
    confidence: number;
  };
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    mozSpeechRecognition?: SpeechRecognitionConstructor;
    msSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type STTEngineType = 'webspeech' | 'groq' | 'whisper_local';

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
 * Universal Cross-Browser STT Hook for Talk2Me AI.
 * Uses native Web Speech API on Chrome/Edge/Safari.
 * Automatically falls back to MediaRecorder + API audio chunking on Firefox/Brave.
 */
export function useWebSpeechSTT({
  enabled = false,
  language = 'en-US',
  engine = 'webspeech',
  onTranscript,
  onError,
}: UseWebSpeechSTTOptions = {}): UseWebSpeechSTTReturn {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<string>(language);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isIntentionalStopRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  // Stop MediaRecorder fallback
  const stopFallbackRecorder = useCallback(() => {
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
  }, [clearChunkTimer]);

  const isTranscribingRef = useRef<boolean>(false);

  // Common Whisper silence hallucinations to filter out when silent audio is processed
  const isSilenceHallucination = (text: string): boolean => {
    const lower = text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    const hallucinations = ['thank you', 'subtitles by', 'mbc news', 'music', 'silence', 'thanks for watching', 'subscribe', 'bye'];
    return hallucinations.some(h => lower === h || lower.startsWith(h));
  };

  // MediaRecorder Fallback for Firefox & Brave
  const startFallbackRecorder = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      setUsingFallback(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 1000 && !isTranscribingRef.current) {
          isTranscribingRef.current = true;
          const formData = new FormData();
          formData.append('file', e.data, 'audio.webm');

          try {
            const res = await fetch('/api/stt/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.text) {
              const trimmed = data.text.trim();
              if (trimmed.length > 0 && !isSilenceHallucination(trimmed)) {
                setFinalText(trimmed);
                onTranscript?.(trimmed, true);
              }
            }
          } catch (err) {
            console.warn('[FallbackSTT] Transcribe chunk error:', err);
          } finally {
            isTranscribingRef.current = false;
          }
        }
      };

      recorder.start();
      setIsListening(true);

      // Request audio slice every 3.0 seconds for optimal accuracy and smooth low-latency STT
      clearChunkTimer();
      chunkTimerRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          try {
            recorder.requestData();
          } catch {}
        }
      }, 3000);

    } catch (err) {

      console.error('[FallbackSTT] Mic access error:', err);
      setError('Microphone permission denied or unavailable.');
    }
  }, [onTranscript, clearChunkTimer]);

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    clearRetryTimer();
    stopFallbackRecorder();
    retryCountRef.current = 0;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, [clearRetryTimer, stopFallbackRecorder]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition;

    // If engine is explicitly 'groq' or native Web Speech API is absent (Firefox / default Brave), use MediaRecorder fallback
    if (engine === 'groq' || !SpeechRecognitionClass) {
      startFallbackRecorder();
      return;
    }


    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    isIntentionalStopRef.current = false;
    lastErrorWasSilenceRef.current = false;
    setError(null);

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLanguage;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setUsingFallback(false);
        retryCountRef.current = 0;
        lastErrorWasSilenceRef.current = false;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        lastErrorWasSilenceRef.current = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = (result[0]?.transcript || '').trim();
          if (!transcript) continue;

          if (result.isFinal) {
            setFinalText(transcript);
            setInterimText('');
            onTranscript?.(transcript, true);
          } else {
            setInterimText(transcript);
            onTranscript?.(transcript, false);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errType = event.error;

        if (errType === 'no-speech' || errType === 'aborted') {
          lastErrorWasSilenceRef.current = true;
          return;
        }

        console.warn(`[WebSpeechSTT] Recognition error: ${errType}`, event.message);

        if (errType === 'network') {
          lastErrorWasSilenceRef.current = true;
          return;
        }

        if (errType === 'not-allowed') {
          isIntentionalStopRef.current = true;
          const userErrMsg = 'Microphone permission was denied.';
          setError(userErrMsg);
          onError?.(userErrMsg);
          setIsListening(false);
          return;
        }

        // On service denial, unsupported flags, or audio-capture issues, switch to Fallback STT
        console.warn(`[WebSpeechSTT] Native STT error (${errType}). Switching to Fallback STT...`);
        startFallbackRecorder();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');

        if (!isIntentionalStopRef.current && enabled && !usingFallback) {
          const isSilence = lastErrorWasSilenceRef.current;
          const delay = isSilence ? 150 : Math.min(1000 * Math.pow(1.5, retryCountRef.current), 5000);
          if (!isSilence) {
            retryCountRef.current += 1;
          } else {
            retryCountRef.current = 0;
          }

          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => {
            if (!isIntentionalStopRef.current) {
              try {
                recognition.start();
              } catch {
                startListening();
              }
            }
          }, delay);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[WebSpeechSTT] Native STT failed to start. Using fallback STT...', err);
      startFallbackRecorder();
    }
  }, [currentLanguage, enabled, engine, onError, onTranscript, clearRetryTimer, startFallbackRecorder, usingFallback]);


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
      clearRetryTimer();
      stopFallbackRecorder();
      if (recognitionRef.current) {
        isIntentionalStopRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [clearRetryTimer, stopFallbackRecorder]);

  return {
    isSupported,
    isListening,
    usingFallback,
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
