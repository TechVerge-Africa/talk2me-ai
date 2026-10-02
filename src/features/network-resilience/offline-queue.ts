/**
 * Offline Sync Queue
 *
 * Idempotent queue for non-real-time meeting data (chat messages,
 * meeting events, notes, metadata). Automatically drains when network returns.
 */

import { PendingSyncItem } from './types';
import { OfflineStorage } from './offline-storage';

export type SyncHandler = (item: PendingSyncItem) => Promise<boolean>;

export class OfflineQueue {
  private storage: OfflineStorage;
  private handlers: Map<string, SyncHandler> = new Map();
  private isFlushing = false;
  private maxRetries = 5;

  constructor(storage?: OfflineStorage) {
    this.storage = storage || new OfflineStorage();
  }

  public registerHandler(type: string, handler: SyncHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueues an item with an idempotency key.
   * If an item with the same idempotency key exists, it will not be duplicated.
   */
  public async enqueue(type: string, payload: unknown, idempotencyKey?: string): Promise<string> {
    const id = idempotencyKey || `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const item: PendingSyncItem = {
      id,
      type,
      createdAt: Date.now(),
      payload,
      retryCount: 0,
      status: 'pending',
      idempotencyKey: id,
    };

    await this.storage.enqueueSyncItem(item);
    return id;
  }

  /**
   * Drains pending items sequentially using registered handlers.
   */
  public async flush(): Promise<{ synced: number; failed: number }> {
    if (this.isFlushing) return { synced: 0, failed: 0 };
    this.isFlushing = true;

    let synced = 0;
    let failed = 0;

    try {
      const items = await this.storage.getPendingSyncItems();
      // Sort oldest first
      items.sort((a, b) => a.createdAt - b.createdAt);

      for (const item of items) {
        const handler = this.handlers.get(item.type);
        if (!handler) {
          console.warn(`[OfflineQueue] No handler registered for item type: ${item.type}`);
          continue;
        }

        await this.storage.updateSyncItem(item.id, { status: 'syncing' });

        try {
          const success = await handler(item);
          if (success) {
            await this.storage.removeSyncItem(item.id);
            synced++;
          } else {
            const nextRetries = item.retryCount + 1;
            const newStatus = nextRetries >= this.maxRetries ? 'failed' : 'pending';
            await this.storage.updateSyncItem(item.id, {
              retryCount: nextRetries,
              status: newStatus,
            });
            failed++;
          }
        } catch (e) {
          console.error(`[OfflineQueue] Error processing sync item ${item.id}:`, e);
          const nextRetries = item.retryCount + 1;
          const newStatus = nextRetries >= this.maxRetries ? 'failed' : 'pending';
          await this.storage.updateSyncItem(item.id, {
            retryCount: nextRetries,
            status: newStatus,
          });
          failed++;
        }
      }
    } finally {
      this.isFlushing = false;
    }

    return { synced, failed };
  }
}
