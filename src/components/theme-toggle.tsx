'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-bold ${
        isDark
          ? 'bg-slate-900/80 border-white/10 text-cyan-400 hover:bg-slate-800'
          : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 shadow-sm'
      } ${className}`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Theme"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1.5"
      >
        {isDark ? (
          <>
            <Moon className="size-4 text-cyan-400" />
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-300">Dark</span>
          </>
        ) : (
          <>
            <Sun className="size-4 text-amber-500" />
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-700">Light</span>
          </>
        )}
      </motion.div>
    </motion.button>
  );
}
