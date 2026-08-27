'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, X, CheckCircle2, Sparkles, Inbox, RefreshCw, ShieldCheck } from 'lucide-react';

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
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleResendEmail = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

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

  const handleClose = React.useCallback(() => {
    router.push('/');
  }, [router]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

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
        setSignUpSuccess(true);
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <AiWaveBackground className="opacity-20 pointer-events-none" />

      {/* Centering wrapper - allows scrolling on short screens */}
      <div className="flex min-h-full flex-col items-center justify-center p-4 sm:p-6 py-8 sm:py-12">
      <div className="relative w-full max-w-xl">

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass-card p-5 sm:p-8 md:p-10 rounded-3xl sm:rounded-[40px] shadow-2xl border-white/10 bg-card/95 backdrop-blur-2xl relative z-10"
        >
          {/* Close button returning home or previous page */}
          <button
            onClick={handleClose}
            type="button"
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 sm:p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer z-30"
            title="Close pop-up"
            aria-label="Close authentication pop-up"
          >
            <X className="size-5" />
          </button>

          {signUpSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="text-center py-4 sm:py-6 space-y-5"
            >
              {/* Glowing Icon Badge */}
              <div className="relative mx-auto size-20 sm:size-24 flex items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 p-0.5 shadow-2xl shadow-indigo-500/30">
                <div className="size-full rounded-[22px] bg-card/90 backdrop-blur-xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 animate-pulse" />
                  <Mail className="size-10 sm:size-12 text-indigo-400 relative z-10" />
                  <span className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-card">
                    <CheckCircle2 className="size-4" />
                  </span>
                </div>
              </div>

              {/* Title & Email Notice */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="size-3.5" /> Account Created Successfully
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Check Your Inbox! 🚀
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  We&apos;ve sent a confirmation email to:
                </p>
                <div className="inline-block max-w-full px-4 py-2 rounded-xl bg-foreground/5 border border-white/10 text-foreground font-mono text-xs sm:text-sm font-semibold truncate my-1">
                  {email || 'your email address'}
                </div>
              </div>

              {/* Checklist & Spam Box Reminder */}
              <div className="p-4 rounded-2xl bg-foreground/5 border border-white/5 space-y-3 text-left max-w-md mx-auto text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                    <Inbox className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Click the link in the email</p>
                    <p className="text-muted-foreground text-xs">Verify your address to activate your account and start chatting with AI.</p>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Can&apos;t find it? Check your Spam folder!</p>
                    <p className="text-muted-foreground text-xs">Email filters sometimes divert automated verification messages to your Junk/Spam box.</p>
                  </div>
                </div>
              </div>

              {/* Resend status alert */}
              <AnimatePresence>
                {resendSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold"
                  >
                    ✓ Fresh confirmation email dispatched! Please check again.
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSignUpSuccess(false);
                    setIsSignUp(false);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-white/10 text-muted-foreground hover:text-foreground font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  <span>Resend Email</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-5 sm:mb-8 pt-1 sm:pt-0">
                <Link href="/" className="inline-block mb-3 sm:mb-4">
                  <img
                    src="/assets/logo-light.png"
                    alt="Talk2Me Logo"
                    className="dark:hidden h-8 sm:h-10 w-auto object-contain mx-auto"
                  />
                  <img
                    src="/assets/logo-dark.png"
                    alt="Talk2Me Logo"
                    className="hidden dark:block h-8 sm:h-10 w-auto object-contain mx-auto"
                  />
                </Link>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-1.5 sm:mb-2">
                  {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Sign In"}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium opacity-60 px-2">
                  {isForgotPassword ? "Enter your email to receive a password reset link" : isSignUp ? "Join our inclusive community" : "Welcome back to the conversation"}
                </p>

                {/* Mode Switcher Tabs */}
                <div className="flex items-center justify-between gap-1 mt-4 sm:mt-6 p-1 rounded-2xl bg-foreground/5 w-full max-w-xs sm:max-w-sm mx-auto border border-white/5">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setIsForgotPassword(false); setError(null); setResetSuccess(false); setSignUpSuccess(false); }}
                    className={`flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl text-center truncate transition-all ${!isSignUp && !isForgotPassword ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setIsForgotPassword(false); setError(null); setResetSuccess(false); setSignUpSuccess(false); }}
                    className={`flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl text-center truncate transition-all ${isSignUp && !isForgotPassword ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setIsSignUp(false); setError(null); setResetSuccess(false); setSignUpSuccess(false); }}
                    className={`flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl text-center truncate transition-all ${isForgotPassword ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
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
                    className="group w-full h-12 sm:h-14 rounded-2xl flex items-center justify-center gap-3 bg-foreground/5 hover:bg-foreground/10 border border-white/10 hover:border-white/20 transition-all duration-200 font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {googleLoading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <GoogleIcon className="size-5" />
                    )}
                    <span>{isSignUp ? 'Sign up with Google' : 'Continue with Google'}</span>
                  </button>

                  <div className="flex items-center gap-3 mt-4 sm:mt-5">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">or with email</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-3.5 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest ml-3 sm:ml-4 opacity-70">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      placeholder="name@email.com"
                      className="w-full h-12 sm:h-14 pl-11 sm:pl-14 pr-4 sm:pr-6 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none text-base sm:text-base"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!isForgotPassword && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center px-3 sm:px-4">
                      <label className="text-[11px] font-bold uppercase tracking-widest opacity-70">Password</label>
                      {!isSignUp && (
                        <button 
                          type="button" 
                          onClick={() => { setIsForgotPassword(true); setError(null); setResetSuccess(false); setSignUpSuccess(false); }}
                          className="text-[10px] font-bold text-bridge-indigo uppercase hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        placeholder="••••••••"
                        className="w-full h-12 sm:h-14 pl-11 sm:pl-14 pr-11 sm:pr-14 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none text-base sm:text-base"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4 sm:size-5" /> : <Eye className="size-4 sm:size-5" />}
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
                      className="space-y-1.5 sm:space-y-2 overflow-hidden"
                    >
                      <label className="text-[11px] font-bold uppercase tracking-widest ml-3 sm:ml-4 opacity-70">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="w-full h-12 sm:h-14 pl-11 sm:pl-14 pr-4 sm:pr-6 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none text-base sm:text-base"
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
                      className="px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold text-center"
                    >
                      Password reset link sent! Please check your email inbox.
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  disabled={loading}
                  className="group relative w-full h-12 sm:h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 text-sm font-sans"
                >
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : (isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In")}
                    {!loading && <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />}
                  </div>
                </button>
              </form>

              {/* Footer toggle */}
              <div className="mt-6 sm:mt-8 text-center space-y-3">
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                      setResetSuccess(false);
                      setSignUpSuccess(false);
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
                        setSignUpSuccess(false);
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
                            setSignUpSuccess(false);
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
            </>
          )}

        </motion.div>
      </div>
      </div>
    </div>
  );
}
