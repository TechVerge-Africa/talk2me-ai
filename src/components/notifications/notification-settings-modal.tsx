'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Mail, MessageSquare, Phone, ShieldCheck, Check, Loader2, X, AlertTriangle, Sparkles } from 'lucide-react';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/services/notifications/types';
import { ProfileService } from '@/services/supabase/profiles';
import { useAuth } from '@/features/auth/use-auth';

export interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: NotificationSettingsModalProps) {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load preferences
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    ProfileService.getProfile(user.id)
      .then((profile) => {
        if (!isMounted) return;
        if (profile) {
          setPhoneNumber(profile.phone_number || '');
          setPhoneVerified(profile.phone_verified ?? false);
          if (profile.notification_preferences) {
            setPreferences({
              ...DEFAULT_NOTIFICATION_PREFERENCES,
              ...profile.notification_preferences,
              channels: {
                ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
                ...(profile.notification_preferences.channels || {}),
              },
              events: {
                ...DEFAULT_NOTIFICATION_PREFERENCES.events,
                ...(profile.notification_preferences.events || {}),
              },
            });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load profile notification settings:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      await ProfileService.updateNotificationPreferences(user.id, {
        phoneNumber: phoneNumber.trim(),
        preferences,
      });

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Bell className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Notification Channels & SMS
                </h3>
                <p className="text-xs text-slate-400">
                  Choose how Talk2Me alerts you for meetings & urgent updates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-indigo-500" />
              <p className="text-sm">Loading your preferences...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-6">
              {/* Phone Number Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Phone className="size-3.5 text-indigo-400" />
                  Mobile Phone Number (for SMS)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +233 24 123 4567 or 0244123456"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  {phoneNumber.trim().length >= 9 && (
                    <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="size-3.5" />
                      Valid format
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Used for instant SMS meeting reminders and urgent team alerts.
                </p>
              </div>

              {/* Channel Selector Matrix */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Delivery Channels
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Email Channel */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      preferences.channels.email
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.channels.email}
                      onChange={(e) =>
                        setPreferences((prev: NotificationPreferences) => ({
                          ...prev,
                          channels: { ...prev.channels, email: e.target.checked },
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <Mail className="size-4 text-indigo-400" /> Email Alerts
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Includes 1-click meeting join links and agenda updates
                      </p>
                    </div>
                  </label>

                  {/* SMS Channel */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      preferences.channels.sms
                        ? 'border-amber-500/50 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.channels.sms}
                      onChange={(e) =>
                        setPreferences((prev: NotificationPreferences) => ({
                          ...prev,
                          channels: { ...prev.channels, sms: e.target.checked },
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <Phone className="size-4 text-amber-400" /> SMS Text
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Direct text message to phone (recommended for deaf mode)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Event Triggers */}
              <div className="space-y-3 pt-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Notify Me When:
                </label>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Scheduled Meeting Reminders</div>
                        <p className="text-[11px] text-slate-400">15 minutes before session & when meeting starts</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.events.meeting_reminders}
                      onChange={(e) =>
                        setPreferences((prev: NotificationPreferences) => ({
                          ...prev,
                          events: { ...prev.events, meeting_reminders: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-850 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-red-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Urgent Channel Messages</div>
                        <p className="text-[11px] text-slate-400">When someone marks an announcement as important</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.events.urgent_messages}
                      onChange={(e) =>
                        setPreferences((prev: NotificationPreferences) => ({
                          ...prev,
                          events: { ...prev.events, urgent_messages: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              {/* Warning / Notice */}
              {preferences.channels.sms && !phoneNumber.trim() && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>Please provide your mobile phone number above to receive SMS notifications.</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="size-4 text-emerald-300" />
                      Saved!
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default NotificationSettingsModal;

