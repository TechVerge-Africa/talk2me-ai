import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock livekit-server-sdk
const mockToJwt = vi.fn().mockResolvedValue('mock-jwt-token');
const mockAddGrant = vi.fn();
const mockConstructorArgs: unknown[][] = [];

vi.mock('livekit-server-sdk', () => {
  class MockAccessToken {
    addGrant: ReturnType<typeof vi.fn>;
    toJwt: ReturnType<typeof vi.fn>;
    constructor(...args: unknown[]) {
      mockConstructorArgs.push(args);
      this.addGrant = mockAddGrant;
      this.toJwt = mockToJwt;
    }
  }

  return {
    AccessToken: MockAccessToken,
  };
});

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: class {
    body: ReadableStream | null;
    private _json: unknown;
    constructor(url: string, init?: { method?: string; body?: string }) {
      this._json = init?.body ? JSON.parse(init.body) : {};
      this.body = null;
    }
    async json() {
      return this._json;
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/livekit/token', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConstructorArgs.length = 0;
    process.env.LIVEKIT_API_KEY = 'test-api-key';
    process.env.LIVEKIT_API_SECRET = 'test-api-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  it('returns a JWT token for valid input', async () => {
    const req = makeRequest({ roomName: 'room-1', participantName: 'Alice' });
    const response = await POST(req);
    const data = await response.json();

    expect(data).toHaveProperty('token', 'mock-jwt-token');
    expect(mockConstructorArgs[0]).toEqual([
      'test-api-key',
      'test-api-secret',
      { identity: 'Alice' },
    ]);
  });

  it('returns 400 when roomName is missing', async () => {
    const req = makeRequest({ participantName: 'Alice' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'Missing roomName or participantName');
  });

  it('returns 400 when participantName is missing', async () => {
    const req = makeRequest({ roomName: 'room-1' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'Missing roomName or participantName');
  });

  it('returns 500 when LIVEKIT_API_KEY is not set', async () => {
    delete process.env.LIVEKIT_API_KEY;

    const req = makeRequest({ roomName: 'room-1', participantName: 'Alice' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'LiveKit server misconfigured');
  });

  it('returns 500 when LIVEKIT_API_SECRET is not set', async () => {
    delete process.env.LIVEKIT_API_SECRET;

    const req = makeRequest({ roomName: 'room-1', participantName: 'Alice' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'LiveKit server misconfigured');
  });

  it('grants correct room permissions', async () => {
    const req = makeRequest({ roomName: 'room-1', participantName: 'Alice' });
    await POST(req);

    expect(mockAddGrant).toHaveBeenCalledWith({
      roomJoin: true,
      room: 'room-1',
      canPublish: true,
      canSubscribe: true,
    });
  });

  it('returns 500 when toJwt throws', async () => {
    mockToJwt.mockRejectedValueOnce(new Error('Unexpected error'));

    const req = makeRequest({ roomName: 'room-1', participantName: 'Alice' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to generate token');
  });
});
