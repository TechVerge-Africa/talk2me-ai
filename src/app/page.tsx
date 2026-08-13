'use client';

import React from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/use-auth';
import { motion } from "framer-motion";
import { ArrowRight, Video, MessageSquare, Sparkles } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { GradientBackground } from "@/components/ui/gradient-background";

const HERO_FEATURES = [
  { 
    icon: Video, 
    label: "Meeting", 
    desc: "HD video meetings with live accessibility captions and automated action tracking." 
  },
  { 
    icon: MessageSquare, 
    label: "Chat", 
    desc: "Persistent team messaging that keeps meeting decisions attached to your workspace." 
  },
  { 
    icon: Sparkles, 
    label: "AI Context", 
    desc: "Query your workspace AI for instant answers derived from your real team conversations." 
  }
];

// ━━━ SECTION 1: Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function HeroSection() {
  return (
    <section id="product" className="relative w-full overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
      <GradientBackground />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 w-full text-center flex flex-col items-center">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center gap-10 w-full"
        >
          {/* Main heading and description */}
          <div className="flex flex-col items-center gap-6 max-w-4xl">
            <motion.h1 
              variants={fadeInUp} 
              className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.08] text-slate-900 dark:text-white"
            >
              Meetings end.<br />
              Conversations don't.
            </motion.h1>

            <motion.p 
              variants={fadeInUp} 
              className="font-sans text-lg sm:text-xl text-slate-600 dark:text-slate-300 text-pretty leading-relaxed font-normal max-w-2xl"
            >
              Meet, chat, and work with AI in one connected workspace. Talk2Me keeps your team's conversations together so you can continue where you left off.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div 
            variants={fadeInUp} 
            className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center font-sans"
          >
            <Link
              href="/auth"
              className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base rounded-xl transition-all shadow-sm active:scale-98 sm:flex-1"
            >
              Get Started
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#how-it-works"
              className="group flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-base rounded-xl transition-all sm:flex-1"
            >
              See How It Works
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* 3 Core Pillar Feature Cards (Meet, Chat, AI) */}
          <motion.div 
            id="how-it-works"
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-8 font-sans"
          >
            {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
              <motion.div 
                key={label}
                variants={fadeInUp}
                className="group flex flex-col items-start text-left gap-3 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-all duration-200 shadow-sm"
              >
                <div className="size-11 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg text-slate-900 dark:text-white mb-1">{label}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 2: Final CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function FinalCTASection() {
  return (
    <section id="pricing" className="px-5 py-16 lg:py-24 relative overflow-hidden max-w-6xl mx-auto w-full font-sans">
      <div className="relative rounded-2xl p-8 sm:p-12 lg:p-16 bg-slate-900 text-white border border-slate-800 shadow-lg text-center flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto flex flex-col items-center"
        >
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-5 leading-tight">
            Keep your conversations going.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-8 font-normal leading-relaxed">
            Join teams using Talk2Me to bring meetings, chat, and AI together in one connected workspace.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6 w-full max-w-md">
            <Link
              href="/auth"
              className="group w-full sm:flex-1 py-3.5 px-7 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-medium text-base transition-all flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="#how-it-works"
              className="w-full sm:flex-1 py-3.5 px-7 rounded-xl font-medium text-base text-white border border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center"
            >
              See How It Works
            </Link>
          </div>

          <p className="text-xs text-slate-400 font-normal">
            No credit card required. Built for modern team communication.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ MAIN PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <HeroSection />
      <FinalCTASection />
    </main>
  );
}

