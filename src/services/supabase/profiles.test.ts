import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => {
  const mockChain = {
    from: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  mockChain.from.mockReturnValue(mockChain);
  mockChain.select.mockReturnValue(mockChain);
  mockChain.update.mockReturnValue(mockChain);
  mockChain.eq.mockReturnValue(mockChain);
  mockChain.single.mockResolvedValue({ data: null, error: null });

  return { supabase: mockChain };
});

import { ProfileService, UserProfile } from './profiles';
import { supabase } from './client';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

const sampleProfile: UserProfile = {
  id: 'user-1',
  full_name: 'Alice',
  avatar_url: 'https://example.com/avatar.png',
  preferred_language: 'en',
  role: 'deaf_user',
  is_interpreter: false,
  settings: {
    deaf_mode: true,
    auto_caption: true,
    high_contrast: false,
    sign_language_panel_position: 'right',
  },
};

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  describe('getProfile', () => {
    it('returns the profile when found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: sampleProfile, error: null });

      const result = await ProfileService.getProfile('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-1');
      expect(result).toEqual(sampleProfile);
    });

    it('returns null when there is an error', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      const result = await ProfileService.getProfile('unknown-user');
      expect(result).toBeNull();
    });

    it('queries with select(*)', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: sampleProfile, error: null });

      await ProfileService.getProfile('user-1');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
    });
  });

  describe('updateSettings', () => {
    it('updates settings for the given user', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await ProfileService.updateSettings('user-1', { deaf_mode: false });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        settings: { deaf_mode: false },
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('throws when supabase returns an error', async () => {
      const err = { message: 'update failed' };
      mockSupabase.eq.mockResolvedValueOnce({ error: err });

      await expect(
        ProfileService.updateSettings('user-1', { high_contrast: true }),
      ).rejects.toEqual(err);
    });
  });

  describe('setDeafMode', () => {
    it('delegates to updateSettings with deaf_mode flag', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await ProfileService.setDeafMode('user-1', true);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        settings: { deaf_mode: true },
      });
    });

    it('can disable deaf mode', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await ProfileService.setDeafMode('user-1', false);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        settings: { deaf_mode: false },
      });
    });
  });
});
