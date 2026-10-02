'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { ProfileService, UserProfile } from '@/services/supabase/profiles';

const AUTH_CACHE_KEY = 't2_cached_auth_user_v1';
const PROFILE_CACHE_KEY = 't2_cached_auth_profile_v1';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Immediately hydrate from localStorage cache on client mount (safe from SSR hydration mismatch)
    try {
      const rawUser = localStorage.getItem(AUTH_CACHE_KEY);
      if (rawUser) {
        setUser(JSON.parse(rawUser));
        setLoading(false);
      }
      const rawProfile = localStorage.getItem(PROFILE_CACHE_KEY);
      if (rawProfile) {
        setProfile(JSON.parse(rawProfile));
      }
    } catch {}

    // 2. Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        try {
          localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(currentUser));
        } catch {}
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
          localStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {}
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        try {
          localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(currentUser));
        } catch {}
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        try {
          localStorage.removeItem(AUTH_CACHE_KEY);
          localStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {}
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const p = await ProfileService.getProfile(userId);
      setProfile(p);
      if (p) {
        try {
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
        } catch {}
      }
    } catch (err) {
      console.warn('[useAuth] Profile fetch notice:', err);
    } finally {
      setLoading(false);
    }
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
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
      localStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem('t2_cached_workspaces_v2');
      localStorage.removeItem('t2_active_workspace_v1');
    } catch {}
    setUser(null);
    setProfile(null);
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
    
    // 1. Update Supabase auth user_metadata
    if (updates.full_name !== undefined) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: updates.full_name },
      });
      if (authError) {
        console.warn('[updateProfile] Auth metadata update notice:', authError.message);
      }
    }

    // 2. Upsert into public.profiles table
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
