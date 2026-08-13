'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2, KeyRound, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';
import { AiWaveBackground } from "@/packages/ui/ai-effects";
import { supabase } from '@/services/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleClose = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-background">
      <AiWaveBackground className="opacity-30" />
      
      <div className="relative w-full max-w-xl my-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-14 rounded-3xl sm:rounded-[48px] shadow-2xl border-white/10 bg-card/40 backdrop-blur-2xl relative"
        >
          {/* Close button returning home or previous page */}
          <button
            onClick={handleClose}
            type="button"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 rounded-full bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer z-20"
            title="Close and return"
            aria-label="Close password reset screen"
          >
            <X className="size-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-10 pt-2 sm:pt-0 font-sans">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="size-12 sm:size-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm"
            >
              <KeyRound className="size-6 text-white" />
            </motion.div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Set New Password
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-normal px-2">
              Please enter your new security password below
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4 py-8 font-sans">
              <CheckCircle2 className="size-14 text-emerald-500 mx-auto" />
              <h2 className="font-heading text-xl sm:text-2xl font-bold">Password Updated!</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Redirecting you to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4 sm:space-y-6 font-sans">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider ml-1 text-slate-500">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 sm:h-13 pl-11 pr-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all outline-none text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider ml-1 text-slate-500">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 sm:h-13 pl-11 pr-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all outline-none text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                disabled={loading}
                className="group relative w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all disabled:opacity-50 text-sm"
              >
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Update Password"}
                  {!loading && <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />}
                </div>
              </button>
            </form>
          )}
        </motion.div>

        <div className="absolute -top-20 -right-20 size-[400px] bg-bridge-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[400px] bg-bridge-indigo/5 blur-[120px] rounded-full pointer-events-none" />
      </div>
    </main>
  );
}
