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

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Universal Dual-Engine STT Hook for Talk2Me AI.
 * Combines Browser Native WebSpeech (for real-time streaming zero-latency captions)
 * with Groq/Gemini Whisper AI (with valid WebM container header slicing).
 * Optimized for high microphone sensitivity to capture quiet speech and soft words.
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
  const headerBlobRef = useRef<Blob | null>(null);
  const recognitionRef = useRef<any>(null);
  const isIntentionalStopRef = useRef<boolean>(false);
  const isProcessingQueueRef = useRef<boolean>(false);
  const audioQueueRef = useRef<Blob[]>([]);

  // Filter out standalone Whisper silent artifacts (exact match only, never drop conversational speech)
  const isSilenceHallucination = (text: string): boolean => {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 1) return true;
    const lower = cleaned.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (!lower || lower.length < 1) return true;

    // Strict exact match for common Whisper artifacts on pure silence
    const exactHallucinations = [
      'subtitles by', 'mbc news', 'amara.org', 'thanks for watching',
      'subscribe for more', 'captions by', 'translated by'
    ];
    return exactHallucinations.includes(lower);
  };

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    audioQueueRef.current = [];
    headerBlobRef.current = null;

    // Stop Native WebSpeech Recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder if active
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }

    // Stop microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(false);
    setInterimText('');
  }, []);

  const processAudioQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioBlob = audioQueueRef.current.shift();
      if (!audioBlob || audioBlob.size < 300) continue;

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
        } else if (data.error && data.unconfigured && !recognitionRef.current) {
          setError(data.error);
          onError?.(data.error);
        }
      } catch (err) {
        console.warn('[Talk2Me STT] Queue chunk transcribe notice:', err);
      }
    }

    isProcessingQueueRef.current = false;
  }, [currentLanguage, onError, onTranscript]);

  const enqueueAudioChunk = useCallback((audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size < 300) return;

    // Save header from first chunk to assemble valid standalone WebM containers for subsequent chunks
    if (!headerBlobRef.current) {
      headerBlobRef.current = audioBlob;
      audioQueueRef.current.push(audioBlob);
    } else {
      // Prepend header to new cluster chunk so backend FFmpeg/Whisper can decode it cleanly
      const validWebmBlob = new Blob([headerBlobRef.current, audioBlob], { type: audioBlob.type || 'audio/webm' });
      audioQueueRef.current.push(validWebmBlob);
    }

    processAudioQueue();
  }, [processAudioQueue]);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    isIntentionalStopRef.current = false;
    setError(null);
    audioQueueRef.current = [];
    headerBlobRef.current = null;

    const win = window as IWindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    let nativeStarted = false;

    // 1. Try Browser Native WebSpeech Engine (instant, zero-latency streaming)
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = currentLanguage;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript;
            } else {
              currentInterim += transcript;
            }
          }

          if (currentInterim.trim()) {
            setInterimText(currentInterim.trim());
            onTranscript?.(currentInterim.trim(), false);
          }

          if (currentFinal.trim() && !isSilenceHallucination(currentFinal)) {
            setFinalText(currentFinal.trim());
            setInterimText('');
            onTranscript?.(currentFinal.trim(), true);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.warn('[Talk2Me STT] Native WebSpeech warning:', event.error);
          }
        };

        recognition.onend = () => {
          if (!isIntentionalStopRef.current && enabled) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        nativeStarted = true;
        setIsSupported(true);
      } catch (err) {
        console.warn('[Talk2Me STT] Failed to initialize WebSpeech recognition:', err);
      }
    }

    // 2. Start MediaRecorder High-Sensitivity Audio Recording (for Groq/Whisper API fallback or dual engine)
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Turn off aggressive noise suppression so quiet speech & soft words are preserved
            autoGainControl: true,   // Automatically boost low volume spoken words for maximum microphone sensitivity
            channelCount: 1,
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

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 300) {
            enqueueAudioChunk(e.data);
          }
        };

        recorder.onerror = (event) => {
          console.warn('[Talk2Me STT] MediaRecorder error:', event);
        };

        recorder.onstop = () => {
          if (!nativeStarted) {
            setIsListening(false);
          }
        };

        recorder.start(2500);
        setIsListening(true);
        setIsSupported(true);

      } catch (err) {
        console.warn('[Talk2Me STT] Mic access error:', err);
        if (!nativeStarted) {
          setError('Microphone access denied or audio recording failed.');
          setIsSupported(false);
        }
      }
    } else if (!nativeStarted) {
      setIsSupported(false);
      setError('Speech recognition and audio recording are not supported on this browser.');
    }
  }, [currentLanguage, enabled, enqueueAudioChunk, onTranscript]);

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
      stopListening();
    };
  }, [stopListening]);

  return {
    isSupported,
    isListening,
    usingFallback: !recognitionRef.current,
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


