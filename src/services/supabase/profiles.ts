import { supabase } from './client';
import { AppError } from '@/services/errors';
import { NotificationPreferences } from '@/services/notifications/types';

export type UserRole = 'deaf_user' | 'hearing_user' | 'interpreter' | 'admin';

export interface UserProfile {
  id: string;
  email?: string | null;
  username?: string | null;
  contact?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  role: UserRole;
  is_interpreter: boolean;
  phone_number?: string | null;
  phone_verified?: boolean;
  notification_preferences?: NotificationPreferences;
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
  },

  /**
   * Fetches all user profiles (e.g. for messaging directory)
   */
  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new AppError(
        'Failed to load user profiles.',
        'PROFILE_FETCH_ALL_FAILED',
        { cause: error },
      );
    }

    return data || [];
  },

  /**
   * Updates phone number and multi-channel notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    params: {
      phoneNumber?: string;
      preferences?: Partial<NotificationPreferences>;
    }
  ): Promise<void> {
    const updatePayload: Record<string, any> = {};

    if (typeof params.phoneNumber === 'string') {
      const cleanPhone = params.phoneNumber.trim();
      updatePayload.phone_number = cleanPhone;
      updatePayload.contact = cleanPhone;
      updatePayload.phone_verified = cleanPhone.length >= 9;
    }

    if (params.preferences) {
      updatePayload.notification_preferences = params.preferences;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      throw new AppError(
        'Failed to update notification preferences.',
        'PROFILE_UPDATE_FAILED',
        { cause: error },
      );
    }
  }
};
