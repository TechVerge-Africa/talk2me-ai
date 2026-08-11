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
              <span className="block text-foreground">Meetings end.</span>
              <span className="bg-gradient-to-r from-indigo via-indigo to-cyan bg-clip-text text-transparent">Communication doesn&apos;t.</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp} 
              className="text-lg sm:text-xl text-muted-foreground text-pretty leading-relaxed font-medium max-w-2xl"
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
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-indigo text-white font-bold text-base rounded-2xl hover:shadow-xl transition-all active:scale-95 sm:flex-1"
            >
              Try Talk2Me Free
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#product"
              className="group flex items-center justify-center gap-2 px-8 py-4 border-2 border-foreground/20 text-foreground font-bold text-base rounded-2xl hover:border-indigo/50 hover:bg-indigo/8 transition-all sm:flex-1"
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
                className="group flex flex-col items-center text-center gap-3 p-6 rounded-2xl border border-border/40 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:border-cyan/40 hover:bg-white/60 dark:hover:bg-white/12 transition-all duration-300 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo/20 grid place-items-center group-hover:bg-indigo/30 transition-colors mb-1">
                  <Icon className="size-6 text-indigo" />
                </div>
                <div>
                  <h3 className="font-bold text-base lg:text-lg text-foreground mb-1">{label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{desc}</p>
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
    <section className="px-5 py-24 lg:py-32 bg-gradient-to-br from-indigo via-indigo to-cyan relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:24px_24px] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-4xl mx-auto text-center flex flex-col items-center"
      >
        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 text-balance leading-[1.1]">
          Keep your conversations going.
        </h2>
        <p className="text-xl text-white/80 max-w-2xl mb-12">
          Join teams using Talk2Me to bring meetings, chat, and AI together without losing momentum.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-12">
          <Link
            href="/auth"
            className="group relative px-10 py-6 bg-white text-indigo rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl"
          >
            <span className="flex items-center gap-3">
              Try Talk2Me Free
              <ArrowRight className="size-6 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          
          <Link
            href="/auth"
            className="px-10 py-6 rounded-2xl font-bold text-lg text-white border-2 border-white/30 hover:border-white/60 transition-all"
          >
            See How It Works
          </Link>
        </div>

        <p className="text-sm text-white/70">
          No credit card required. Free tier includes up to 100 minutes/month.
        </p>
      </motion.div>
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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan"></div>
          <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-center">
      <HeroSection />
      <FinalCTASection />
    </main>
  );
}
