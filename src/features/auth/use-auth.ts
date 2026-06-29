'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { ProfileService, UserProfile } from '@/services/supabase/profiles';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const p = await ProfileService.getProfile(userId);
    setProfile(p);
    setLoading(false);
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (updates: { full_name?: string }) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: updates.full_name,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      throw new Error(error.message);
    }
    await fetchProfile(user.id);
  };

  return {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

}
