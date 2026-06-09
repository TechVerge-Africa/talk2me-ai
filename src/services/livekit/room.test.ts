import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock livekit-client
vi.mock('livekit-client', () => {
  class MockRoom {
    adaptiveStream: boolean;
    dynacast: boolean;
    constructor(opts: { adaptiveStream?: boolean; dynacast?: boolean } = {}) {
      this.adaptiveStream = opts.adaptiveStream ?? false;
      this.dynacast = opts.dynacast ?? false;
    }
  }
  return {
    Room: MockRoom,
    RoomEvent: {
      TranscriptionReceived: 'transcriptionReceived',
    },
    Track: {},
  };
});

import { createLiveKitRoom, generateToken, TranscriptionEvent } from './room';

describe('createLiveKitRoom', () => {
  it('returns a Room instance with adaptive stream and dynacast', () => {
    const room = createLiveKitRoom();
    expect(room).toBeDefined();
    expect(room.adaptiveStream).toBe(true);
    expect(room.dynacast).toBe(true);
  });

  it('returns a new Room instance each time', () => {
    const room1 = createLiveKitRoom();
    const room2 = createLiveKitRoom();
    expect(room1).not.toBe(room2);
  });
});

describe('generateToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the API endpoint with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-jwt-token' }),
    });
    globalThis.fetch = mockFetch;

    const token = await generateToken('room-1', 'Alice');

    expect(mockFetch).toHaveBeenCalledWith('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'room-1', participantName: 'Alice' }),
    });
    expect(token).toBe('test-jwt-token');
  });

  it('throws when the API response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'server error' }),
    });

    await expect(generateToken('room-1', 'Alice')).rejects.toThrow('Failed to fetch token');
  });

  it('throws when fetch itself fails (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(generateToken('room-1', 'Alice')).rejects.toThrow('Network error');
  });
});

describe('TranscriptionEvent interface', () => {
  it('satisfies the type contract', () => {
    const event: TranscriptionEvent = {
      participantId: 'p-1',
      text: 'Hello',
      timestamp: Date.now(),
      isFinal: true,
    };

    expect(event.participantId).toBe('p-1');
    expect(event.text).toBe('Hello');
    expect(event.isFinal).toBe(true);
    expect(typeof event.timestamp).toBe('number');
  });
});
