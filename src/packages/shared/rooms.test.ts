import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateRoomCode, roomShareUrl } from './rooms';

describe('generateRoomCode', () => {
  it('returns a string matching the pattern S-NNN-XXX', () => {
    const code = generateRoomCode();
    // Format: S-<3 digits>-<3 alphanumeric chars>
    expect(code).toMatch(/^S-\d{3}-[A-Z2-9]{3}$/);
  });

  it('always starts with S-', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRoomCode().startsWith('S-')).toBe(true);
    }
  });

  it('numeric segment is between 100 and 999', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      const numericPart = parseInt(code.split('-')[1], 10);
      expect(numericPart).toBeGreaterThanOrEqual(100);
      expect(numericPart).toBeLessThanOrEqual(999);
    }
  });

  it('alpha segment only contains allowed characters (no ambiguous 0, O, 1, I, L)', () => {
    const allowed = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      const alphaPart = code.split('-')[2];
      for (const ch of alphaPart) {
        expect(allowed).toContain(ch);
      }
    }
  });

  it('generates unique codes across multiple invocations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    // With 30^3 * 900 = ~24M combinations, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

describe('roomShareUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback URL when window is undefined (SSR)', () => {
    // In jsdom, window is defined; we need to mock it as undefined
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulating SSR
    delete globalThis.window;

    const url = roomShareUrl('S-123-ABC');
    expect(url).toBe('https://talk2me.ai/room/S-123-ABC');

    // Restore
    globalThis.window = originalWindow;
  });

  it('returns window.location.origin-based URL when window is defined', () => {
    // jsdom provides window.location.origin as 'http://localhost'
    const url = roomShareUrl('S-456-XYZ');
    expect(url).toBe(`${window.location.origin}/room/S-456-XYZ`);
  });

  it('includes the room code in the path', () => {
    const code = 'S-789-DEF';
    const url = roomShareUrl(code);
    expect(url).toContain(`/room/${code}`);
  });
});
