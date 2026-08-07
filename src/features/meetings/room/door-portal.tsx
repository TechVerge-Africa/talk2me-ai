'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Sparkles, Clock } from 'lucide-react';

interface MeetingDoorPortalProps {
  isWaiting: boolean; // True when standing in lobby waiting for host admission
  isEntering: boolean; // True during the door opening / curtain swipe transition
  onCompleteOpening?: () => void;
  onCancel?: () => void;
  displayName?: string;
  roomCode?: string;
}

export function MeetingDoorPortal({
  isWaiting,
  isEntering,
  onCompleteOpening,
  onCancel,
  displayName = 'Communicator',
  roomCode
}: MeetingDoorPortalProps) {
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090b0e] overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo/10 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-cyan/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />
      </div>

      {/* ── CENTRAL DOORWAY STAGE ───────────────────────────────────── */}
      <div className="relative w-full max-w-4xl h-[80vh] flex flex-col items-center justify-center p-6">
        
        {/* Futuristic Grand Door Frame */}
        <div className="relative w-full max-w-lg h-[500px] rounded-[40px] border-4 border-slate-800 bg-slate-950/80 backdrop-blur-2xl shadow-[0_0_80px_rgba(79,70,229,0.15)] overflow-hidden flex items-center justify-center">
          
          {/* Neon Portal Arch Highlights */}
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-transparent via-cyan to-transparent opacity-80" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-transparent via-indigo to-transparent opacity-80" />

          {/* Left Door Curtain Panel */}
          <motion.div
            initial={{ x: '0%' }}
            animate={{ x: isEntering ? '-105%' : '0%' }}
            transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
            onAnimationComplete={() => {
              if (isEntering && onCompleteOpening) onCompleteOpening();
            }}
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#0f1218] via-[#161b24] to-[#1e2430] border-r border-cyan/20 z-20 flex flex-col items-end justify-center pr-4 shadow-2xl"
          >
            <div className="w-1.5 h-24 rounded-full bg-gradient-to-b from-cyan/40 to-indigo/40 shadow-[0_0_15px_rgba(6,182,212,0.5)] my-auto" />
            {/* Curtain Fold Texture Lines */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,#ffffff_20px,#ffffff_22px)]" />
          </motion.div>

          {/* Right Door Curtain Panel */}
          <motion.div
            initial={{ x: '0%' }}
            animate={{ x: isEntering ? '105%' : '0%' }}
            transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
            className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#0f1218] via-[#161b24] to-[#1e2430] border-l border-cyan/20 z-20 flex flex-col items-start justify-center pl-4 shadow-2xl"
          >
            <div className="w-1.5 h-24 rounded-full bg-gradient-to-b from-cyan/40 to-indigo/40 shadow-[0_0_15px_rgba(6,182,212,0.5)] my-auto" />
            {/* Curtain Fold Texture Lines */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,#ffffff_20px,#ffffff_22px)]" />
          </motion.div>

          {/* Central Emblem Lock on the Doors */}
          <AnimatePresence>
            {!isEntering && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.4, opacity: 0, rotate: 180 }}
                transition={{ duration: 0.5 }}
                className="absolute z-30 size-20 rounded-full bg-slate-900 border-2 border-cyan/40 shadow-[0_0_40px_rgba(6,182,212,0.4)] flex items-center justify-center"
              >
                {isWaiting ? (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  >
                    <Lock className="size-8 text-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  </motion.div>
                ) : (
                  <Unlock className="size-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interior Stage Light Leak Revealed When Opening */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 via-cyan-400/20 to-emerald-400/20 flex items-center justify-center z-10">
            <Sparkles className="size-16 text-cyan animate-spin" style={{ animationDuration: '12s' }} />
          </div>
        </div>

        {/* ── PERSON STANDING IN FRONT OF THE DOOR ───────────────────── */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative -mt-16 z-30 flex flex-col items-center gap-4"
        >
          {/* Standing Podium Ring */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -inset-4 rounded-full bg-gradient-to-r from-indigo via-cyan to-emerald-400 blur-md -z-10"
            />
            
            {/* Person Silhouette / Avatar Card */}
            <div className="size-24 rounded-full bg-gradient-to-tr from-indigo to-cyan p-1 shadow-2xl ring-4 ring-slate-900">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white font-black text-2xl relative overflow-hidden">
                {userInitials}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              </div>
            </div>
            
            {/* Small status indicator on person */}
            <div className={`absolute bottom-0 right-0 size-7 rounded-full border-2 border-slate-950 flex items-center justify-center ${
              isWaiting ? 'bg-amber-500 text-slate-950' : 'bg-emerald-400 text-slate-950 animate-bounce'
            }`}>
              {isWaiting ? <Clock className="size-3.5 stroke-[3]" /> : <Sparkles className="size-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Interactive Dynamic Speech Banner */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl text-center relative"
          >
            {/* Pointer notch to person */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-t border-l border-white/10 rotate-45" />

            {isWaiting ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                  Standing at the Door
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Please wait, the host will open the door for you soon...
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  You are standing outside room <span className="font-mono text-cyan font-bold">#{roomCode}</span>. The admin has been notified and will let you in shortly.
                </p>
                
                {onCancel && (
                  <div className="pt-2">
                    <button
                      onClick={onCancel}
                      className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel & Step Away
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1 py-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Access Granted!
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Welcome in! Opening the room doors now...
                </h3>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
