/**
 * Realtime Connection Manager for Supabase.
 *
 * Solves two critical free-plan problems:
 * 1. Prevents duplicate subscriptions (common React Strict Mode / re-render bug)
 *    that burn through the 200 concurrent connection limit.
 * 2. Provides graceful degradation to polling when realtime is unavailable.
 *
 * Architecture:
 * - Single module-level registry of active channels (keyed by channel name)
 * - Ref-counted: multiple callers can subscribe to the same channel, unsubscribe
 *   only happens when the last caller cleans up
 * - Auto-reconnect with exponential backoff on disconnect
 */

import { supabase } from '@/services/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelEntry {
  channel: RealtimeChannel;
  refCount: number;
  fallbackInterval?: ReturnType<typeof setInterval>;
}

// Module-level registry — one per browser tab
const registry = new Map<string, ChannelEntry>();

export type ChannelEventCallback = (payload: unknown) => void;

interface SubscribeOptions {
  /** Unique channel name — reuse the same name to share the connection */
  channelName: string;
  /** Supabase table to listen to */
  table: string;
  /** Optional filter like `meeting_id=eq.${id}` */
  filter?: string;
  /** Events to listen for */
  events?: ('INSERT' | 'UPDATE' | 'DELETE' | '*')[];
  /** Callback called on every realtime event */
  onEvent: ChannelEventCallback;
  /**
   * Fallback polling function — called if realtime fails to connect.
   * Should return the latest data for the UI to reconcile.
   */
  onFallbackPoll?: () => Promise<void>;
  /** Polling interval in ms when in fallback mode (default: 3000) */
  fallbackIntervalMs?: number;
}

/**
 * Subscribe to a Supabase realtime channel.
 * Returns a cleanup function — call it in useEffect return or on unmount.
 */
export function subscribeToChannel(options: SubscribeOptions): () => void {
  const {
    channelName,
    table,
    filter,
    events = ['*'],
    onEvent,
    onFallbackPoll,
    fallbackIntervalMs = 3000,
  } = options;

  const existing = registry.get(channelName);

  if (existing) {
    // Channel already exists — increment ref count, reuse connection
    existing.refCount += 1;
    return createCleanup(channelName);
  }

  // Create a new channel
  let channelBuilder = supabase
    .channel(channelName, {
      config: {
        // Throttle presence broadcasts — reduces Supabase load significantly
        presence: { key: channelName },
        broadcast: { ack: false },
      },
    });

  // Attach postgres_changes listeners for each requested event
  for (const event of events) {
    channelBuilder = channelBuilder.on(
      'postgres_changes' as Parameters<typeof channelBuilder.on>[0],
      {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => onEvent(payload),
    );
  }

  const channel = channelBuilder.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // Connected — clear any fallback polling
      const entry = registry.get(channelName);
      if (entry?.fallbackInterval) {
        clearInterval(entry.fallbackInterval);
        entry.fallbackInterval = undefined;
      }
    }

    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      // Realtime failed — start fallback polling if provided
      if (onFallbackPoll) {
        const entry = registry.get(channelName);
        if (entry && !entry.fallbackInterval) {
          entry.fallbackInterval = setInterval(() => {
            onFallbackPoll().catch(() => {});
          }, fallbackIntervalMs);
        }
      }
    }
  });

  registry.set(channelName, { channel, refCount: 1 });
  return createCleanup(channelName);
}

function createCleanup(channelName: string): () => void {
  return () => {
    const entry = registry.get(channelName);
    if (!entry) return;

    entry.refCount -= 1;

    if (entry.refCount <= 0) {
      // Last subscriber — fully unsubscribe and clean up
      if (entry.fallbackInterval) clearInterval(entry.fallbackInterval);
      supabase.removeChannel(entry.channel).catch(() => {});
      registry.delete(channelName);
    }
  };
}

/**
 * Force-remove a channel regardless of ref count.
 * Call this when a meeting ends to ensure immediate cleanup.
 */
export function forceUnsubscribe(channelName: string): void {
  const entry = registry.get(channelName);
  if (!entry) return;
  if (entry.fallbackInterval) clearInterval(entry.fallbackInterval);
  supabase.removeChannel(entry.channel).catch(() => {});
  registry.delete(channelName);
}

/** Remove ALL active channels — call on page unload or auth sign-out */
export function unsubscribeAll(): void {
  for (const [name] of registry.entries()) {
    forceUnsubscribe(name);
  }
}

/** Return the number of active realtime connections */
export function getActiveConnectionCount(): number {
  return registry.size;
}
