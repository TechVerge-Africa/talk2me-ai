/**
 * useNetworkResilience
 *
 * Primary React hook integrating:
 * - NetworkMonitor
 * - AdaptationController
 * - LiveKitAdapter
 * - OfflineQueue & Storage
 * - ContinuityService
 * - NetworkSimulator
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import {
  NetworkMetrics,
  NetworkQuality,
  MediaPolicy,
  MeetingContext,
  CurrentMediaState,
} from '../types';
import { NetworkMonitor } from '../network-monitor';
import { AdaptationController } from '../adaptation-controller';
import { LiveKitAdapter } from '../livekit-adapter';
import { OfflineQueue } from '../offline-queue';
import { OfflineStorage } from '../offline-storage';
import { ContinuityService } from '../continuity-service';
import { NetworkSimulator } from '../network-simulator';

export interface UseNetworkResilienceOptions {
  room: Room | null;
  roomCode: string;
  meetingId?: string;
  activeSpeakerId?: string;
  screenShareActive?: boolean;
  screenShareOwnerId?: string;
  visibleParticipantIds?: string[];
  totalParticipants?: number;
  meetingMode?: 'normal' | 'presentation' | 'onthego';
  currentMediaState?: Partial<CurrentMediaState>;
  onCaptionsRecommended?: (recommended: boolean) => void;
  onSendChatMessage?: (text: string) => Promise<boolean>;
}

export function useNetworkResilience({
  room,
  roomCode,
  meetingId,
  activeSpeakerId,
  screenShareActive = false,
  screenShareOwnerId,
  visibleParticipantIds = [],
  totalParticipants = 1,
  meetingMode = 'normal',
  currentMediaState,
  onCaptionsRecommended,
  onSendChatMessage,
}: UseNetworkResilienceOptions) {
  // Singletons per hook lifecycle
  const storage = useMemo(() => new OfflineStorage(), []);
  const queue = useMemo(() => new OfflineQueue(storage), [storage]);
  const monitor = useMemo(() => new NetworkMonitor(), []);
  const controller = useMemo(() => new AdaptationController(), []);
  const adapter = useMemo(() => new LiveKitAdapter(), []);
  const continuity = useMemo(() => new ContinuityService(roomCode, meetingId, storage), [roomCode, meetingId, storage]);
  const simulator = useMemo(() => new NetworkSimulator(monitor), [monitor]);

  const [metrics, setMetrics] = useState<NetworkMetrics>(() => monitor.getLatestMetrics());
  const [policy, setPolicy] = useState<MediaPolicy>(() =>
    controller.evaluate(
      monitor.getLatestMetrics(),
      {
        activeSpeakerId,
        screenShareActive,
        screenShareOwnerId,
        visibleParticipantIds,
        totalParticipants,
        meetingMode,
      },
      currentMediaState
    )
  );

  const [isBackgrounded, setIsBackgrounded] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false;
  });

  const [missedContextNotice, setMissedContextNotice] = useState<string | null>(null);
  const wasCriticalRef = useRef(false);
  const criticalTimestampRef = useRef<number | null>(null);

  const contextRef = useRef<MeetingContext>({
    activeSpeakerId,
    screenShareActive,
    screenShareOwnerId,
    visibleParticipantIds,
    totalParticipants,
    meetingMode,
    isBackgrounded,
  });
  const mediaStateRef = useRef<Partial<CurrentMediaState> | undefined>(currentMediaState);
  const captionsRecCallbackRef = useRef(onCaptionsRecommended);
  const onSendChatMessageRef = useRef(onSendChatMessage);

  // Listen to tab visibility changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      setIsBackgrounded(hidden);
      contextRef.current.isBackgrounded = hidden;
      const newPolicy = controller.evaluate(monitor.getLatestMetrics(), contextRef.current, mediaStateRef.current);
      setPolicy(newPolicy);
      adapter.applyPolicy(room, newPolicy);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [controller, monitor, adapter, room]);

  // Keep refs synchronized on every render without triggering effect loops
  useEffect(() => {
    contextRef.current = {
      activeSpeakerId,
      screenShareActive,
      screenShareOwnerId,
      visibleParticipantIds,
      totalParticipants,
      meetingMode,
      isBackgrounded,
    };
    mediaStateRef.current = currentMediaState;
    captionsRecCallbackRef.current = onCaptionsRecommended;
    onSendChatMessageRef.current = onSendChatMessage;
  });

  // Register chat sync handler on the offline queue
  useEffect(() => {
    queue.registerHandler('chat_message', async (item) => {
      const payload = item.payload as { text: string };
      if (payload?.text && onSendChatMessageRef.current) {
        return await onSendChatMessageRef.current(payload.text);
      }
      return true;
    });
  }, [queue]);

  // Attach LiveKit room to monitor
  useEffect(() => {
    monitor.attachRoom(room);
    monitor.start();

    return () => {
      monitor.stop();
      monitor.detachRoom();
    };
  }, [monitor, room]);

  // Sync meeting context whenever metrics update from network monitor
  useEffect(() => {
    const unsubscribe = monitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);

      const context = contextRef.current;
      const media = mediaStateRef.current;

      const newPolicy = controller.evaluate(newMetrics, context, media);
      setPolicy(newPolicy);

      // Apply to LiveKit SFU / local publishing
      adapter.applyPolicy(room, newPolicy);

      // Notify captions recommendation if changed
      if (captionsRecCallbackRef.current) {
        captionsRecCallbackRef.current(newPolicy.captionsRecommended);
      }

      // Handle Continuity state transitions
      const isCriticalOrOffline = newMetrics.quality === 'critical' || newMetrics.quality === 'offline';

      if (isCriticalOrOffline) {
        if (!wasCriticalRef.current) {
          wasCriticalRef.current = true;
          criticalTimestampRef.current = Date.now();
          continuity.onNetworkCritical();
        }
      } else if (wasCriticalRef.current) {
        // Recovered!
        wasCriticalRef.current = false;
        continuity.onNetworkRecovered();

        // Flush queued offline items
        queue.flush().catch(() => {});

        // Fetch missed context
        if (criticalTimestampRef.current) {
          const fromTime = criticalTimestampRef.current;
          criticalTimestampRef.current = null;
          continuity.getMissedMeetingContext(fromTime, Date.now()).then((res) => {
            if (res.summary) {
              setMissedContextNotice(res.summary);
            }
          }).catch(() => {});
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [monitor, controller, adapter, continuity, queue, room]);

  // Re-evaluate policy when key meeting context parameters change
  useEffect(() => {
    const currentMetrics = monitor.getLatestMetrics();
    const context = contextRef.current;
    const media = mediaStateRef.current;

    const newPolicy = controller.evaluate(currentMetrics, context, media);
    setPolicy(newPolicy);
    adapter.applyPolicy(room, newPolicy);
  }, [
    activeSpeakerId,
    screenShareActive,
    screenShareOwnerId,
    totalParticipants,
    meetingMode,
    controller,
    adapter,
    monitor,
    room,
  ]);

  // Native online / offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      monitor.tick('connected');
      queue.flush().catch(() => {});
    };

    const handleOffline = () => {
      monitor.tick('offline');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [monitor, queue]);

  const clearMissedContext = useCallback(() => {
    setMissedContextNotice(null);
  }, []);

  // Queue a message for offline sending if network drops
  const queueOfflineMessage = useCallback(async (text: string) => {
    return await queue.enqueue('chat_message', { text });
  }, [queue]);

  const effectiveQuality: NetworkQuality = metrics.quality;
  const isAudioPriority = effectiveQuality === 'critical' || effectiveQuality === 'poor';

  return {
    metrics,
    policy,
    effectiveQuality,
    isAudioPriority,
    captionsRecommended: policy.captionsRecommended,
    missedContextNotice,
    clearMissedContext,
    queueOfflineMessage,
    simulator,
  };
}
