'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, Sparkles, LogIn, Eye, EyeOff } from 'lucide-react';
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
    <main className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-background">
      <AiWaveBackground className="opacity-30" />
      
      <div className="relative w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-10 sm:p-14 rounded-[48px] shadow-2xl border-white/10 bg-card/40 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="size-16 rounded-[24px] bg-gradient-to-br from-bridge-indigo to-bridge-cyan flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <LogIn className="size-8 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {isSignUp ? "Create Account" : "Sign In"}
            </h1>
            <p className="text-muted-foreground text-sm font-medium opacity-60">
              {isSignUp ? "Join our inclusive community" : "Welcome back to the conversation"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest ml-4 opacity-70">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  className="w-full h-16 pl-14 pr-6 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-4">
                <label className="text-[11px] font-bold uppercase tracking-widest opacity-70">Password</label>
                {!isSignUp && (
                  <button type="button" className="text-[10px] font-bold text-bridge-indigo uppercase hover:underline">
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
                  className="w-full h-16 pl-14 pr-14 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none"
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

            <AnimatePresence>
              {isSignUp && (
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
                      className="w-full h-16 pl-14 pr-6 rounded-2xl bg-foreground/5 border-transparent focus:bg-background focus:ring-2 focus:ring-bridge-cyan transition-all outline-none"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
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
              className="group relative w-full h-16 rounded-3xl bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 overflow-hidden"
              style={{ background: isSignUp ? "linear-gradient(135deg, var(--color-bridge-indigo) 0%, var(--color-bridge-cyan) 100%)" : undefined }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-center gap-3 relative z-10">
                {loading ? <Loader2 className="size-5 animate-spin" /> : (isSignUp ? "Sign Up" : "Sign In")}
                {!loading && <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />}
              </div>
            </button>
          </form>

          {/* Footer toggle */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm font-medium text-muted-foreground"
            >
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
              <span className="text-bridge-indigo font-bold ml-2 uppercase text-[11px] tracking-wider hover:underline">
                {isSignUp ? "Sign In" : "Sign Up"}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 size-[400px] bg-bridge-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[400px] bg-bridge-indigo/5 blur-[120px] rounded-full pointer-events-none" />
      </div>
    </main>
  );
}
