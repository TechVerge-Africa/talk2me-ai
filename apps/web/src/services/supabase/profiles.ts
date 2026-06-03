import { supabase } from './client';

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
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  /**
   * Updates user accessibility settings
   */
  async updateSettings(userId: string, settings: Partial<UserProfile['settings']>) {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        settings: settings // Note: Assuming the settings column is JSONB and we merge or replace
      })
      .eq('id', userId);

    if (error) {
       console.error('Error updating settings:', error);
       throw error;
    }
  },

  /**
   * Toggles Deaf Mode (Crucial for Talk2Me AI UX)
   */
  async setDeafMode(userId: string, enabled: boolean) {
    return this.updateSettings(userId, { deaf_mode: enabled });
  }
};
