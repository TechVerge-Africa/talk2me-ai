import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client before importing the module under test
vi.mock('./client', () => {
  const mockChain = {
    from: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
  };

  // Build a fluent chain where every method returns the chain itself
  mockChain.from.mockReturnValue(mockChain);
  mockChain.insert.mockReturnValue(mockChain);
  mockChain.select.mockReturnValue(mockChain);
  mockChain.update.mockReturnValue(mockChain);
  mockChain.eq.mockReturnValue(mockChain);
  mockChain.single.mockResolvedValue({ data: null, error: null });

  return { supabase: mockChain };
});

vi.mock('@/packages/shared/rooms', () => ({
  generateRoomCode: vi.fn(() => 'S-123-ABC'),
}));

import { MeetingService } from './meetings';
import { supabase } from './client';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

describe('MeetingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain defaults
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  describe('createMeeting', () => {
    it('returns a Meeting object on success', async () => {
      const dbRow = {
        id: 'meeting-1',
        room_name: 'Standup',
        room_code: 'S-123-ABC',
        host_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValueOnce({ data: dbRow, error: null });

      const result = await MeetingService.createMeeting('Standup', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings');
      expect(result).toEqual({
        id: 'meeting-1',
        title: 'Standup',
        room_code: 'S-123-ABC',
        host_id: 'user-1',
        livekit_room_id: 'meeting-1',
        created_at: '2025-01-01T00:00:00Z',
        status: 'active',
      });
    });

    it('returns null when supabase returns an error', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'insert failed' },
      });

      const result = await MeetingService.createMeeting('Standup', 'user-1');
      expect(result).toBeNull();
    });

    it('inserts with correct fields including settings', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'meeting-2',
          room_name: 'Team Sync',
          room_code: 'S-123-ABC',
          host_id: 'user-2',
          created_at: '2025-06-01T00:00:00Z',
        },
        error: null,
      });

      await MeetingService.createMeeting('Team Sync', 'user-2');

      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          room_name: 'Team Sync',
          room_code: 'S-123-ABC',
          host_id: 'user-2',
          is_active: true,
          settings: {
            require_approval: false,
            sign_language_enabled: true,
          },
        }),
      ]);
    });
  });

  describe('getMeetingByCode', () => {
    it('returns meeting data when found', async () => {
      const dbRow = {
        id: 'meeting-3',
        room_name: 'Retro',
        room_code: 'S-456-XYZ',
        host_id: 'user-3',
        created_at: '2025-02-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValueOnce({ data: dbRow, error: null });

      const result = await MeetingService.getMeetingByCode('S-456-XYZ');

      expect(result).toEqual({
        id: 'meeting-3',
        title: 'Retro',
        room_code: 'S-456-XYZ',
        host_id: 'user-3',
        livekit_room_id: 'meeting-3',
        created_at: '2025-02-01T00:00:00Z',
        status: 'active',
      });
    });

    it('filters by room_code and is_active', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      await MeetingService.getMeetingByCode('S-999-ZZZ');

      // eq should have been called with both filters
      expect(mockSupabase.eq).toHaveBeenCalledWith('room_code', 'S-999-ZZZ');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('returns null when meeting not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' },
      });

      const result = await MeetingService.getMeetingByCode('INVALID');
      expect(result).toBeNull();
    });

    it('returns null when data is null even without error', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await MeetingService.getMeetingByCode('S-000-AAA');
      expect(result).toBeNull();
    });
  });

  describe('endMeeting', () => {
    it('updates meeting to inactive with ended_at timestamp', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await MeetingService.endMeeting('meeting-5');

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          ended_at: expect.any(String),
        }),
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'meeting-5');
    });

    it('logs error when update fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: 'update failed' },
      });

      await MeetingService.endMeeting('meeting-6');
      expect(consoleSpy).toHaveBeenCalledWith('Error ending meeting:', expect.any(Object));

      consoleSpy.mockRestore();
    });
  });
});
