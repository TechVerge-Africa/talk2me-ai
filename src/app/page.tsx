'use client';

import React from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/use-auth';
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Video, MessageSquare, Sparkles } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { GradientBackground } from "@/components/ui/gradient-background";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const HERO_FEATURES = [
  { 
    icon: Video, 
    label: "Meet", 
    desc: "Video meetings for your team." 
  },
  { 
    icon: MessageSquare, 
    label: "Chat", 
    desc: "Conversations that continue beyond meetings." 
  },
  { 
    icon: Sparkles, 
    label: "AI", 
    desc: "Ask questions and get context from your conversations." 
  }
];

// ━━━ SECTION 1: Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20">
      {/* Animated background elements */}
      <GradientBackground />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 w-full text-center flex flex-col items-center">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center gap-8 w-full"
        >
          {/* Main heading and description */}
          <div className="flex flex-col items-center gap-6 max-w-4xl">
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter text-balance leading-[1.02]"
            >
              <span className="block text-slate-900 dark:text-white">Meetings end.</span>
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 dark:from-indigo-400 dark:via-cyan-300 dark:to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                Communication doesn&apos;t.
              </span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp} 
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 text-pretty leading-relaxed font-medium max-w-2xl"
            >
              Talk2Me brings meetings, chat, and AI together so your conversations can continue wherever they need to go.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div 
            variants={fadeInUp} 
            className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center"
          >
            <Link
              href="/auth"
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95 sm:flex-1"
            >
              Try Talk2Me Free
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#product"
              className="group flex items-center justify-center gap-2 px-8 py-4 border-2 border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-bold text-base rounded-2xl hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-white/10 transition-all sm:flex-1"
            >
              See How It Works
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* 3 Core Pillar Feature Cards (Meet, Chat, AI) */}
          <motion.div 
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-8"
          >
            {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
              <motion.div 
                key={label}
                variants={fadeInUp}
                className="group flex flex-col items-center text-center gap-3 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-cyan-500/50 dark:hover:border-cyan-400/40 hover:bg-white dark:hover:bg-slate-900/90 transition-all duration-300 shadow-md dark:shadow-2xl"
              >
                <div className="size-13 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-cyan-400 grid place-items-center group-hover:scale-110 transition-transform mb-1 shadow-sm">
                  <Icon className="size-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1.5">{label}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
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
    <section className="px-5 py-20 lg:py-28 relative overflow-hidden max-w-6xl mx-auto w-full">
      <div className="relative rounded-3xl sm:rounded-[40px] p-8 sm:p-14 lg:p-20 bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 dark:from-indigo-950 dark:via-slate-900 dark:to-cyan-950 border border-white/10 shadow-2xl overflow-hidden text-center flex flex-col items-center">
        {/* Subtle dot pattern background */}
        <div className="absolute inset-0 opacity-15 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:24px_24px] bg-[radial-gradient(circle,rgba(255,255,255,0.2)_1px,transparent_1px)] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto flex flex-col items-center"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 text-balance leading-[1.1]">
            Keep your conversations going.
          </h2>
          <p className="text-base sm:text-xl text-white/80 max-w-2xl mb-10 font-medium leading-relaxed">
            Join teams using Talk2Me to bring meetings, chat, and AI together without losing momentum.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8 w-full max-w-md">
            <Link
              href="/auth"
              className="group relative w-full sm:flex-1 py-4 px-8 bg-white text-indigo-700 hover:bg-slate-100 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center gap-2"
            >
              <span>Try Talk2Me Free</span>
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="/auth"
              className="w-full sm:flex-1 py-4 px-8 rounded-2xl font-bold text-base text-white border-2 border-white/30 hover:border-white/60 hover:bg-white/10 transition-all flex items-center justify-center"
            >
              See How It Works
            </Link>
          </div>

          <p className="text-xs text-white/70 font-medium">
            No credit card required. Free tier includes full meeting & AI features.
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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
          <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Verifying Session...</p>
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
