'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room } from 'livekit-client';

export interface UseBackgroundResilienceOptions {
  room: Room | null;
  code: string;
  localCamOn: boolean;
  localMicOn: boolean;
  activeSpeakerName?: string;
  participantCount?: number;
  toggleMic: () => void;
  toggleCam: () => void;
  onLeave: () => void;
}

export interface UseBackgroundResilienceReturn {
  isBackgrounded: boolean;
  reentryToast: string | null;
  dismissReentryToast: () => void;
}

/**
 * useBackgroundResilience
 * 
 * Ensures real-time meeting continuity across Windows, macOS, Linux, iOS, and Android
 * when users switch tabs, minimize windows, or switch applications:
 * 
 * 1. MediaSession API: Registers meeting with iOS Control Center / Android Notification shade / macOS Now Playing
 * 2. Screen Wake Lock: Keeps display active during meetings and manages background transitions
 * 3. Web Audio Keep-Alive: Anchors audio thread so iOS/Android power managers do not suspend the call
 * 4. Adaptive Camera Suspension: Pauses camera encode on background to save battery and prevent mobile camera faults, then seamlessly restores upon return
 * 5. Dynamic Document Title: Gives ambient glanceable speaker and mic status in the browser tab bar
 */
export function useBackgroundResilience({
  room,
  code,
  localCamOn,
  localMicOn,
  activeSpeakerName,
  participantCount = 1,
  toggleMic,
  toggleCam,
  onLeave,
}: UseBackgroundResilienceOptions): UseBackgroundResilienceReturn {
  const [isBackgrounded, setIsBackgrounded] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false;
  });
  const [reentryToast, setReentryToast] = useState<string | null>(null);

  const wakeLockRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wasCamOnBeforeBackground = useRef(false);
  const originalTitleRef = useRef<string>('');

  const toggleMicRef = useRef(toggleMic);
  const toggleCamRef = useRef(toggleCam);
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    toggleMicRef.current = toggleMic;
    toggleCamRef.current = toggleCam;
    onLeaveRef.current = onLeave;
  });

  // 1. Screen Wake Lock Management
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake lock can fail if battery is low or system denies permission
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  // 2. Web Audio Keep-Alive Node (prevents iOS Safari & mobile Chrome audio suspension)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Generate a 1-second silent buffer looped continuously
        const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Gain at 0.00001 (inaudible sub-carrier to keep OS audio engine active)
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.00001;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();

        if (ctx.state === 'suspended') {
          const resumeAudio = () => {
            ctx.resume().catch(() => {});
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
          };
          window.addEventListener('click', resumeAudio, { once: true });
          window.addEventListener('touchstart', resumeAudio, { once: true });
        }
      }
    } catch {
      // ignore
    }

    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close().catch(() => {});
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }
    };
  }, []);

  // 3. MediaSession API integration (iOS Control Center / Android notifications)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Talk2Me Meeting #${code}`,
        artist: activeSpeakerName ? `Speaking: ${activeSpeakerName}` : `In meeting (${participantCount} participants)`,
        album: 'Talk2Me Workspace',
        artwork: [
          { src: '/icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      try {
        navigator.mediaSession.setActionHandler('togglemicrophone' as any, () => {
          toggleMicRef.current();
        });
      } catch {
        // ignore
      }

      try {
        navigator.mediaSession.setActionHandler('hangup' as any, () => {
          onLeaveRef.current();
        });
      } catch {
        // ignore
      }

      // Optional camera toggle if supported by browser
      try {
        navigator.mediaSession.setActionHandler('togglecamera' as any, () => {
          toggleCamRef.current();
        });
      } catch {
        // togglecamera not supported in all browsers
      }
    } catch {
      // ignore
    }
  }, [code, activeSpeakerName, participantCount]);

  // 4. Tab Visibility & Adaptive Camera Management
  useEffect(() => {
    if (typeof document === 'undefined') return;

    originalTitleRef.current = document.title;
    requestWakeLock();

    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      setIsBackgrounded(isHidden);

      if (isHidden) {
        // Backgrounding:
        releaseWakeLock();

        // Update document title for ambient background awareness
        const micIcon = localMicOn ? '🎙️' : '🔇';
        const speakerTag = activeSpeakerName ? `(${activeSpeakerName}) ` : '';
        document.title = `${micIcon} ${speakerTag}Talk2Me #${code}`;

        // Adaptive camera pause: if camera is active, temporarily pause capture
        // to prevent mobile camera hardware error and conserve battery/CPU
        if (localCamOn && room?.localParticipant) {
          wasCamOnBeforeBackground.current = true;
          room.localParticipant.setCameraEnabled(false).catch(() => {});
        }
      } else {
        // Foreground return:
        requestWakeLock();
        document.title = originalTitleRef.current || `Talk2Me #${code}`;

        // If camera was active before switching away, automatically restore it
        if (wasCamOnBeforeBackground.current && room?.localParticipant) {
          wasCamOnBeforeBackground.current = false;
          room.localParticipant.setCameraEnabled(true).catch(() => {});
          setReentryToast('Resumed camera • Audio stayed active while away');
        } else {
          setReentryToast('Audio stayed active while away');
        }

        // Auto-dismiss re-entry toast after 4.5 seconds
        const timer = setTimeout(() => {
          setReentryToast(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
      if (typeof document !== 'undefined' && originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [code, localCamOn, localMicOn, activeSpeakerName, room, requestWakeLock, releaseWakeLock]);

  const dismissReentryToast = useCallback(() => {
    setReentryToast(null);
  }, []);

  return {
    isBackgrounded,
    reentryToast,
    dismissReentryToast,
  };
}
