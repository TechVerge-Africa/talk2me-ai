import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => {
  const mockChain = {
    from: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  mockChain.from.mockReturnValue(mockChain);
  mockChain.insert.mockReturnValue(mockChain);
  mockChain.select.mockReturnValue(mockChain);
  mockChain.eq.mockReturnValue(mockChain);
  mockChain.order.mockResolvedValue({ data: [], error: null });

  return { supabase: mockChain };
});

import { TranscriptService, TranscriptEntry } from './transcripts';
import { supabase } from './client';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

const sampleEntry: TranscriptEntry = {
  meeting_id: 'meeting-1',
  user_id: 'user-1',
  content: 'Hello everyone',
  start_time: 0,
  end_time: 5,
  language: 'en',
};

describe('TranscriptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  describe('saveTranscript', () => {
    it('inserts the entry into the transcripts table', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      await TranscriptService.saveTranscript(sampleEntry);

      expect(mockSupabase.from).toHaveBeenCalledWith('transcripts');
      expect(mockSupabase.insert).toHaveBeenCalledWith([sampleEntry]);
    });

    it('logs error when insert fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabase.insert.mockResolvedValueOnce({
        error: { message: 'insert failed' },
      });

      await TranscriptService.saveTranscript(sampleEntry);
      expect(consoleSpy).toHaveBeenCalledWith('Error saving transcript:', expect.any(Object));

      consoleSpy.mockRestore();
    });

    it('handles entry without optional language field', async () => {
      const entryNoLang: TranscriptEntry = {
        meeting_id: 'meeting-2',
        user_id: 'user-2',
        content: 'Hi',
        start_time: 10,
        end_time: 12,
      };

      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      await TranscriptService.saveTranscript(entryNoLang);
      expect(mockSupabase.insert).toHaveBeenCalledWith([entryNoLang]);
    });
  });

  describe('getMeetingTranscripts', () => {
    it('returns transcript data ordered by start_time ascending', async () => {
      const transcripts = [
        { ...sampleEntry, id: 't-1', profiles: { full_name: 'Alice', avatar_url: null } },
        { ...sampleEntry, id: 't-2', content: 'Thanks', start_time: 6, end_time: 8, profiles: { full_name: 'Bob', avatar_url: null } },
      ];

      mockSupabase.order.mockResolvedValueOnce({ data: transcripts, error: null });

      const result = await TranscriptService.getMeetingTranscripts('meeting-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('transcripts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*, profiles(full_name, avatar_url)');
      expect(mockSupabase.eq).toHaveBeenCalledWith('meeting_id', 'meeting-1');
      expect(mockSupabase.order).toHaveBeenCalledWith('start_time', { ascending: true });
      expect(result).toEqual(transcripts);
    });

    it('returns empty array on error', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'fetch failed' },
      });

      const result = await TranscriptService.getMeetingTranscripts('meeting-1');
      expect(result).toEqual([]);
    });
  });
});
