'use client';

import React from 'react';
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Hash, Sparkles, ShieldCheck, Zap, Check } from "lucide-react";
import { AiWaveBackground } from "@/packages/ui/ai-effects";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-x-hidden">
      <section className="relative px-5 pt-12 pb-10 lg:pt-20 lg:pb-16 flex flex-col justify-center min-h-[70vh] lg:min-h-0">
        <AiWaveBackground className="opacity-50" />
        
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative max-w-5xl mx-auto flex flex-col items-center text-center"
        >


          <motion.h1 variants={fadeIn} className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[0.95]">
            Two voices meeting<br className="hidden sm:block" /> in <span className="text-bridge-indigo">mid-air</span>.
          </motion.h1>

          <motion.p variants={fadeIn} className="mt-6 max-w-[54ch] text-base sm:text-xl text-muted-foreground text-pretty">
            Talk2Me AI bridges sign and speech with zero-latency interpretation. 
            The inclusive standard for global collaboration starts here.
          </motion.p>

          <motion.div variants={fadeIn} className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
            <Link
              href="/create"
              className="group relative overflow-hidden bg-primary text-primary-foreground rounded-3xl p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-bridge"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Plus className="size-20 -mr-10 -mt-10" />
              </div>
              <div className="mb-4 size-10 rounded-xl bg-white/10 grid place-items-center">
                <Plus className="size-5" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="text-xl font-bold">Create Session</div>
                  <div className="text-xs text-white/70 mt-1">Start a new bridge instantly</div>
                </div>
                <ArrowRight className="size-5 opacity-60 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/join"
              className="group bg-card ring-1 ring-border rounded-3xl p-6 text-left shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-muted/50"
            >
              <div className="mb-4 size-10 rounded-xl bg-primary/5 text-primary grid place-items-center">
                <Hash className="size-5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">Join Session</div>
                  <div className="text-xs text-muted-foreground mt-1">Enter a code or scan a QR</div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-4xl text-left">
            {[
              { icon: Zap, t: "Real-time captions", d: "Speech becomes readable line by line with absolute precision using custom STT models." },
              { icon: Sparkles, t: "Sign to speech", d: "Our vision transformer interprets sign language into human-natural audio instantly." },
              { icon: ShieldCheck, t: "Inclusive Audit", d: "AI-generated insights that ensure every participant was heard and understood." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="glass-card rounded-2xl p-7 border-bridge-cyan/10 hover:border-bridge-cyan/30 transition-colors">
                <div className="size-10 rounded-xl bg-bridge-cyan/10 grid place-items-center mb-4">
                  <Icon className="size-5 text-bridge-cyan" />
                </div>
                <div className="font-bold text-lg">{t}</div>
                <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section id="features" className="px-5 py-32 bg-slate-50 dark:bg-slate-900/40 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
                Built for <span className="text-bridge-indigo">TechVerge Africa</span><br /> and beyond.
              </h2>
              <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
                We've combined state-of-the-art computer vision with low-latency WebRTC to create a communication plane that ignores physical barriers.
              </p>
              <div className="mt-10 space-y-5">
                {[
                   "60fps video processing for sign accuracy",
                   "Edge-distributed token orchestration",
                   "Multi-region inclusive AI summarization"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-4 text-sm font-bold tracking-tight">
                    <div className="size-6 rounded-full bg-bridge-cyan/10 text-bridge-cyan grid place-items-center text-[10px]">
                       <Check className="size-4" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
               className="relative aspect-[4/3] lg:aspect-square rounded-[48px] bg-gradient-to-tr from-bridge-indigo/15 via-bridge-cyan/10 to-transparent ring-1 ring-bridge-cyan/20 p-8 flex items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:24px_24px] bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1px)]" />
              <div className="relative w-full h-full glass-card rounded-3xl p-10 flex flex-col justify-center gap-6 shadow-2xl">
                 <div className="flex items-center justify-between">
                    <div className="text-sm font-black uppercase tracking-[0.2em] text-bridge-cyan">AI Matrix Layer</div>
                    <div className="flex gap-1">
                       <div className="size-2 rounded-full bg-bridge-indigo" />
                       <div className="size-2 rounded-full bg-bridge-cyan" />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="h-2 w-full bg-bridge-indigo/10 rounded-full overflow-hidden">
                       <motion.div 
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="h-full w-1/3 bg-gradient-to-r from-transparent via-bridge-indigo/40 to-transparent"
                       />
                    </div>
                    <div className="h-4 w-3/4 bg-foreground/5 rounded-lg" />
                    <div className="h-4 w-1/2 bg-foreground/5 rounded-lg" />
                 </div>
                 <div className="mt-6 p-6 rounded-2xl bg-primary/5 border border-primary/10 text-primary text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Transcription Active</div>
                    <div className="text-lg font-bold">"Welcome to the session."</div>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-16 px-5 relative bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3 font-bold text-xl text-foreground">
                 <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center text-xs">T2</div>
                 Talk2Me AI
              </div>
              <p className="text-sm text-muted-foreground max-w-xs text-center md:text-left leading-relaxed">
                 The world's most inclusive communication platform. Bridging the gap, one sign at a time.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 text-sm font-medium">
               <div className="flex flex-col gap-4">
                  <div className="text-foreground font-bold uppercase tracking-wider text-[11px]">Product</div>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">Features</a>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">Enterprise</a>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">Security</a>
               </div>
               <div className="flex flex-col gap-4">
                  <div className="text-foreground font-bold uppercase tracking-wider text-[11px]">Resources</div>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">Documentation</a>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">API Reference</a>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">Community</a>
               </div>
               <div className="flex flex-col gap-4">
                  <div className="text-foreground font-bold uppercase tracking-wider text-[11px]">Company</div>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">About</a>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">TechVerge</a>
                  <a href="#" className="text-muted-foreground hover:text-bridge-cyan transition-colors">Legal</a>
               </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/60 uppercase tracking-widest font-black">
             <span>© 2026 Talk2Me AI Organization</span>
             <div className="flex gap-6">
                <a href="#">Status: All Systems Nominal</a>
             </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
