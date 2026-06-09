import { supabase } from './client';
import { AppError } from '@/services/errors';

export type UserRole = 'deaf_user' | 'hearing_user' | 'interpreter' | 'admin';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  role: UserRole;
  is_interpreter: boolean;
  settings: {
    deaf_mode: boolean;
    auto_caption: boolean;
    high_contrast: boolean;
    sign_language_panel_position: 'left' | 'right' | 'pip';
  };
}

export const ProfileService = {
  /**
   * Fetches a user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows found, normal for new users without a profile yet
      if (error.code === 'PGRST116') return null;
      throw new AppError(
        'Failed to load user profile.',
        'PROFILE_FETCH_FAILED',
        { cause: error },
      );
    }

    return data;
  },

  /**
   * Updates user accessibility settings
   */
  async updateSettings(userId: string, settings: Partial<UserProfile['settings']>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        settings: settings
      })
      .eq('id', userId);

    if (error) {
      throw new AppError(
        'Failed to update settings.',
        'PROFILE_UPDATE_FAILED',
        { cause: error },
      );
    }
  },

  /**
   * Toggles Deaf Mode (Crucial for Talk2Me AI UX)
   */
  async setDeafMode(userId: string, enabled: boolean) {
    return this.updateSettings(userId, { deaf_mode: enabled });
  }
};
