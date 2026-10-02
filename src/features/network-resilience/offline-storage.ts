/**
 * IndexedDB Local Meeting State & Offline Storage
 *
 * Persists meeting state, offline chat messages, transcript segments,
 * and idempotency queue items without storing raw media streams.
 */

import { PendingSyncItem } from './types';

const DB_NAME = 'talk2me_resilience_v1';
const DB_VERSION = 1;

const STORES = {
  MEETINGS: 'meetings',
  SYNC_QUEUE: 'sync_queue',
  TRANSCRIPTS: 'transcripts',
} as const;

export interface PersistedMeetingState {
  roomCode: string;
  meetingId?: string;
  lastConnectedAt: number;
  participants: string[];
  lastConnectionState: string;
}

export interface PersistedTranscriptChunk {
  id: string;
  roomCode: string;
  speaker: string;
  text: string;
  timestamp: number;
}

export class OfflineStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback: {
    meetings: Map<string, PersistedMeetingState>;
    syncQueue: Map<string, PendingSyncItem>;
    transcripts: PersistedTranscriptChunk[];
  } = {
    meetings: new Map(),
    syncQueue: new Map(),
    transcripts: [],
  };

  private getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);

          req.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORES.MEETINGS)) {
              db.createObjectStore(STORES.MEETINGS, { keyPath: 'roomCode' });
            }
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
              const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
              queueStore.createIndex('status', 'status', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.TRANSCRIPTS)) {
              const transcriptStore = db.createObjectStore(STORES.TRANSCRIPTS, { keyPath: 'id' });
              transcriptStore.createIndex('roomCode', 'roomCode', { unique: false });
              transcriptStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
          };

          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            console.warn('[OfflineStorage] IndexedDB open error, using memory fallback');
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  // ── Meeting State ────────────────────────────────────────────────────────
  public async saveMeetingState(state: PersistedMeetingState): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      this.memoryFallback.meetings.set(state.roomCode, state);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.MEETINGS, 'readwrite');
        tx.objectStore(STORES.MEETINGS).put(state);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getMeetingState(roomCode: string): Promise<PersistedMeetingState | null> {
    const db = await this.getDB();
    if (!db) {
      return this.memoryFallback.meetings.get(roomCode) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.MEETINGS, 'readonly');
        const req = tx.objectStore(STORES.MEETINGS).get(roomCode);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  // ── Sync Queue (Idempotent Offline Actions) ──────────────────────────────
  public async enqueueSyncItem(item: PendingSyncItem): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      this.memoryFallback.syncQueue.set(item.id, item);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        tx.objectStore(STORES.SYNC_QUEUE).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getPendingSyncItems(): Promise<PendingSyncItem[]> {
    const db = await this.getDB();
    if (!db) {
      return Array.from(this.memoryFallback.syncQueue.values()).filter(
        i => i.status === 'pending' || i.status === 'failed'
      );
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.getAll();
        req.onsuccess = () => {
          const items: PendingSyncItem[] = req.result || [];
          resolve(items.filter(i => i.status === 'pending' || i.status === 'failed'));
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async updateSyncItem(id: string, updates: Partial<PendingSyncItem>): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      const existing = this.memoryFallback.syncQueue.get(id);
      if (existing) {
        this.memoryFallback.syncQueue.set(id, { ...existing, ...updates });
      }
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            store.put({ ...req.result, ...updates });
          }
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async removeSyncItem(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      this.memoryFallback.syncQueue.delete(id);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        tx.objectStore(STORES.SYNC_QUEUE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // ── Transcript / Caption Buffer ──────────────────────────────────────────
  public async saveTranscriptChunk(chunk: PersistedTranscriptChunk): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      this.memoryFallback.transcripts.push(chunk);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.TRANSCRIPTS, 'readwrite');
        tx.objectStore(STORES.TRANSCRIPTS).put(chunk);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getTranscriptsSince(
    roomCode: string,
    sinceTimestamp: number
  ): Promise<PersistedTranscriptChunk[]> {
    const db = await this.getDB();
    if (!db) {
      return this.memoryFallback.transcripts.filter(
        t => t.roomCode === roomCode && t.timestamp >= sinceTimestamp
      );
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.TRANSCRIPTS, 'readonly');
        const store = tx.objectStore(STORES.TRANSCRIPTS);
        const req = store.getAll();
        req.onsuccess = () => {
          const list: PersistedTranscriptChunk[] = req.result || [];
          resolve(list.filter(t => t.roomCode === roomCode && t.timestamp >= sinceTimestamp));
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
}
