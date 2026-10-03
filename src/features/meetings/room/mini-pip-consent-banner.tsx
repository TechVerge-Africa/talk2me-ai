'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PictureInPicture2, Check, X } from 'lucide-react';

export interface MiniPipConsentBannerProps {
  isVisible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

/**
 * MiniPipConsentBanner
 * 
 * Elegant, non-intrusive progressive consent prompt for Desktop users.
 * Explains the multitasking benefit of automatic Picture-in-Picture when switching
 * tabs, and captures user gesture authorization to comply with browser security rules.
 */
export function MiniPipConsentBanner({
  isVisible,
  onEnable,
  onDismiss,
}: MiniPipConsentBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="region"
          aria-label="Picture in picture multitasking invitation"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto bg-[#161a22]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 shadow-2xl shadow-indigo-950/40 text-white"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
              <PictureInPicture2 className="size-5" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                Multitask with Mini View
              </h4>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Keep an eye on the speaker in a floating mini window when you switch tabs to take notes or work in other apps.
              </p>

              <div className="flex items-center gap-2 mt-3.5">
                <button
                  type="button"
                  onClick={onEnable}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium tracking-wide transition-all shadow-md shadow-indigo-600/30 cursor-pointer touch-manipulation"
                >
                  <Check className="size-3.5" />
                  Enable Auto-Mini
                </button>

                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white text-xs font-medium transition-colors cursor-pointer touch-manipulation"
                >
                  Not now
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss banner"
              className="text-white/40 hover:text-white/90 p-1 rounded-lg hover:bg-white/5 transition-colors -mr-1 -mt-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
