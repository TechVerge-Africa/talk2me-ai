'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  isKnownHallucination,
  isPhysicallyImpossible,
  RepetitionDetector,
  MIN_AUDIBLE_BLOB_BYTES,
} from '@/lib/audio/stt-hallucination-filter';

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
 * Includes multi-layer hallucination suppression:
 *   • Known-artifact blocklist
 *   • Repetition / loop detector (Dice bigram similarity)
 *   • Physical word-count impossibility guard
 *   • Minimum blob size gate (8 KB)
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
  const audioQueueRef = useRef<{ blob: Blob; capturedAt: number }[]>([]);

  // ── Hallucination guards ──────────────────────────────────────────
  const repetitionDetector = useRef(new RepetitionDetector(6));

  /**
   * Central accept/reject decision for any final text.
   * Returns true if the text should be committed to the UI.
   */
  const shouldAccept = useCallback((
    text: string,
    durationMs: number = 3000,
  ): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    if (isKnownHallucination(trimmed)) {
      console.warn('[STT Filter] Blocked known hallucination:', JSON.stringify(trimmed));
      return false;
    }

    if (isPhysicallyImpossible(trimmed, durationMs)) {
      console.warn('[STT Filter] Physically impossible transcript (too many words for duration):', trimmed);
      return false;
    }

    if (repetitionDetector.current.isRepetitionLoop(trimmed)) {
      console.warn('[STT Filter] Repetition loop detected, discarding:', JSON.stringify(trimmed));
      return false;
    }

    return true;
  }, []);

  const commitText = useCallback((text: string) => {
    repetitionDetector.current.commit(text);
  }, []);

  // ── Stop ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    audioQueueRef.current = [];
    headerBlobRef.current = null;
    repetitionDetector.current.reset();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

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
  }, []);

  // ── Groq/Whisper queue processor ─────────────────────────────────
  const processAudioQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift();
      if (!item) continue;

      const { blob: audioBlob, capturedAt } = item;

      // ── Layer 2: min blob size gate ───────────────────────────────
      if (audioBlob.size < MIN_AUDIBLE_BLOB_BYTES) {
        console.debug('[STT Filter] Blob too small, skipping:', audioBlob.size, 'bytes');
        continue;
      }

      const requestStart = Date.now();
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
          const durationMs = Date.now() - capturedAt; // approx chunk duration

          if (trimmed.length > 0 && shouldAccept(trimmed, durationMs)) {
            commitText(trimmed);
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

      void requestStart; // suppress unused warning
    }

    isProcessingQueueRef.current = false;
  }, [currentLanguage, onError, onTranscript, shouldAccept, commitText]);

  const enqueueAudioChunk = useCallback((audioBlob: Blob) => {
    // ── Layer 2a: immediate blob size gate (saves bandwidth) ─────────
    if (!audioBlob || audioBlob.size < MIN_AUDIBLE_BLOB_BYTES) {
      console.debug('[STT Filter] Dropping under-size chunk:', audioBlob?.size ?? 0, 'bytes');
      return;
    }

    if (!headerBlobRef.current) {
      headerBlobRef.current = audioBlob;
      audioQueueRef.current.push({ blob: audioBlob, capturedAt: Date.now() });
    } else {
      // Prepend header so backend FFmpeg/Whisper can decode each chunk standalone
      const validWebmBlob = new Blob([headerBlobRef.current, audioBlob], {
        type: audioBlob.type || 'audio/webm',
      });
      audioQueueRef.current.push({ blob: validWebmBlob, capturedAt: Date.now() });
    }

    processAudioQueue();
  }, [processAudioQueue]);

  // ── Start ─────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    isIntentionalStopRef.current = false;
    setError(null);
    audioQueueRef.current = [];
    headerBlobRef.current = null;
    repetitionDetector.current.reset();

    const win = window as IWindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    let nativeStarted = false;

    // 1. Browser Native WebSpeech (instant, zero-latency streaming)
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
            // Interims are shown as-is (filtering only on finals)
            setInterimText(currentInterim.trim());
            onTranscript?.(currentInterim.trim(), false);
          }

          if (currentFinal.trim() && shouldAccept(currentFinal, 3000)) {
            commitText(currentFinal.trim());
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

    // 2. MediaRecorder High-Sensitivity Audio (Groq/Whisper API fallback / dual engine)
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Keep off — aggressive suppression can cause hallucination
            autoGainControl: true,
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
          if (e.data && e.data.size > 0) {
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

        // ── 3 seconds per chunk: more audio context → fewer incomplete-utterance artifacts ──
        recorder.start(3000);
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
  }, [currentLanguage, enabled, enqueueAudioChunk, onTranscript, shouldAccept, commitText]);

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
