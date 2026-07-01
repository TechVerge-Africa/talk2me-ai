'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, Sparkles, LogIn, Eye, EyeOff, X } from 'lucide-react';

// Google icon SVG as a component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
import { AiWaveBackground } from "@/packages/ui/ai-effects";
import { supabase } from '@/services/supabase/client';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSuccess(false);

    if (isForgotPassword) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setResetSuccess(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        alert('Registration successful! Please check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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
            aria-label="Close authentication modal"
          >
            <X className="size-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-10 pt-2 sm:pt-0">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="size-12 sm:size-16 rounded-2xl sm:rounded-[24px] bg-gradient-to-br from-bridge-indigo to-bridge-cyan flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"
            >
              <LogIn className="size-6 sm:size-8 text-white" />
            </motion.div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2">
              {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Sign In"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium opacity-60 px-2">
              {isForgotPassword ? "Enter your email to receive a password reset link" : isSignUp ? "Join our inclusive community" : "Welcome back to the conversation"}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-center gap-1 mt-5 sm:mt-6 p-1 sm:p-1.5 rounded-2xl bg-foreground/5 max-w-xs sm:max-w-sm mx-auto border border-white/5">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setIsForgotPassword(false); setError(null); setResetSuccess(false); }}
                className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${!isSignUp && !isForgotPassword ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setIsForgotPassword(false); setError(null); setResetSuccess(false); }}
                className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${isSignUp && !isForgotPassword ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setIsForgotPassword(true); setIsSignUp(false); setError(null); setResetSuccess(false); }}
                className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${isForgotPassword ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Forgot
              </button>
            </div>
          </div>

          {/* Google Sign-In */}
          {!isForgotPassword && (
            <div className="mb-4 sm:mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="group w-full h-14 sm:h-16 rounded-2xl flex items-center justify-center gap-3 bg-foreground/5 hover:bg-foreground/10 border border-white/10 hover:border-white/20 transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <GoogleIcon className="size-5" />
                )}
                <span>{isSignUp ? 'Sign up with Google' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-3 mt-4 sm:mt-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">or with email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest ml-4 opacity-70">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  className="w-full h-14 sm:h-16 pl-14 pr-6 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none text-sm sm:text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[11px] font-bold uppercase tracking-widest opacity-70">Password</label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(null); setResetSuccess(false); }}
                      className="text-[10px] font-bold text-bridge-indigo uppercase hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full h-14 sm:h-16 pl-14 pr-14 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none text-sm sm:text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {isSignUp && !isForgotPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[11px] font-bold uppercase tracking-widest ml-4 opacity-70">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="w-full h-14 sm:h-16 pl-14 pr-6 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none text-sm sm:text-base"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {resetSuccess && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold text-center"
                >
                  Password reset link sent! Please check your email inbox.
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              className="group relative w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 overflow-hidden text-xs sm:text-sm"
              style={{ background: (isSignUp || isForgotPassword) ? "linear-gradient(135deg, var(--color-bridge-indigo) 0%, var(--color-bridge-cyan) 100%)" : undefined }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-center gap-3 relative z-10">
                {loading ? <Loader2 className="size-5 animate-spin" /> : (isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In")}
                {!loading && <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />}
              </div>
            </button>
          </form>

          {/* Footer toggle */}
          <div className="mt-8 text-center space-y-3">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                  setResetSuccess(false);
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                ← Back to <span className="text-bridge-indigo font-bold uppercase text-[11px] tracking-wider hover:underline ml-1">Sign In</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm font-medium text-muted-foreground">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setResetSuccess(false);
                  }}
                >
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                  <span className="text-bridge-indigo font-bold ml-2 uppercase text-[11px] tracking-wider hover:underline">
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </span>
                </button>
                {!isSignUp && (
                  <>
                    <span className="hidden sm:inline opacity-30">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setResetSuccess(false);
                      }}
                      className="text-bridge-indigo font-bold uppercase text-[11px] tracking-wider hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </>
                )}
              </div>
            )}
          </div>


        </motion.div>

        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 size-[400px] bg-bridge-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[400px] bg-bridge-indigo/5 blur-[120px] rounded-full pointer-events-none" />
      </div>
    </main>
  );
}
