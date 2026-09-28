'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/use-auth';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Mic,
  Wifi,
  Database,
  Server,
  GraduationCap,
  Building2,
  Landmark,
  Zap,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { GradientBackground } from '@/components/ui/gradient-background';

// ━━━ 1. HERO SECTION & LIVE PRODUCT PREVIEW ━━━━━━━━━━━━━━━━━━━━
export function HeroSection() {
  return (
    <section id="product" className="relative w-full pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <GradientBackground />

      <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center gap-6 w-full"
        >
          {/* Main Headline */}
          <motion.h1
            variants={fadeInUp}
            className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
          >
            Meetings end.<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
              Context doesn&apos;t.
            </span>
          </motion.h1>

          {/* Punchy 1-sentence Subtitle */}
          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed text-pretty"
          >
            The sovereign workspace built for African accents, 3G networks, and living team memory. No spammy email bots.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-sm justify-center pt-2"
          >
            <Link
              href="/auth"
              className="group flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-98 sm:flex-1"
            >
              Get Started Free
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/create"
              className="flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm rounded-xl transition-all sm:flex-1"
            >
              <Zap className="size-4 text-amber-500" />
              Instant Meeting
            </Link>
          </motion.div>

          {/* Interactive UI Mockup: Shows the whole value in 5 seconds */}
          <motion.div
            variants={fadeInUp}
            className="w-full mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-left"
          >
            {/* Window Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-400/80 inline-block" />
                <span className="size-3 rounded-full bg-amber-400/80 inline-block" />
                <span className="size-3 rounded-full bg-emerald-400/80 inline-block" />
                <span className="font-mono ml-2 font-medium text-slate-700 dark:text-slate-300">Talk2Me Room • Engineering Strategy</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Wifi className="size-3.5" />
                  3G Resilient
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <Lock className="size-3.5 text-blue-500" />
                  Sovereign Server
                </span>
              </div>
            </div>

            {/* Window Content: Live Meeting + Auto Memory */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 p-5 sm:p-6 gap-6 md:gap-0">
              {/* Left: Live Accent-Accurate Speech */}
              <div className="md:pr-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                      Live Meeting Transcript
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-medium">
                      African Accent Filter Active
                    </span>
                  </div>
                  <div className="space-y-3 font-sans text-sm">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Speaker 1 • Accra Campus</p>
                      <p className="text-slate-800 dark:text-slate-200">
                        &ldquo;We will deploy the sovereign server update on Friday evening right after student exams finish.&rdquo;
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Speaker 2 • Nairobi Hub</p>
                      <p className="text-slate-800 dark:text-slate-200">
                        &ldquo;Agreed. Let&apos;s keep all ministerial records inside our local data center with zero cloud leaks.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time voice capture • 0 dropped packets</span>
                </div>
              </div>

              {/* Right: Workspace Memory (NOT email spam) */}
              <div className="md:pl-6 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                      Organized Workspace Memory
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-medium">
                      Zero Email Spam
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                        <CheckCircle2 className="size-3.5" />
                        <span>Decision Extracted</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        Deploy server update Friday 6 PM to maintain continuous campus services.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400 mb-1">
                        <CheckCircle2 className="size-3.5" />
                        <span>Sovereign Security Spec</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        100% on-premise local data storage. External sync disabled.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Attached to team project board & chat. Never buried in email.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ 2. THE 4 PILLARS (SCANNABLE IN 10 SECONDS) ━━━━━━━━━━━━━━━
const PILLARS = [
  {
    icon: Mic,
    title: "African Accents",
    desc: "Tuned for natural cadence, regional vernacular, and ambient room noise.",
  },
  {
    icon: Wifi,
    title: "Low-Bandwidth 3G",
    desc: "Lightweight audio engine that stays connected on fluctuating data and weak Wi-Fi.",
  },
  {
    icon: Database,
    title: "Living Memory",
    desc: "Decisions and notes saved directly into your workspace. No unread email spam.",
  },
  {
    icon: Server,
    title: "Sovereign Hosting",
    desc: "Self-host on your own servers for full national data privacy and governance.",
  },
];

export function PillarsSection() {
  return (
    <section id="how-it-works" className="py-14 sm:py-16 border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 shadow-xs"
            >
              <div className="size-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Icon className="size-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ━━━ 3. WHO TALK2ME IS FOR (SCANNABLE IN 8 SECONDS) ━━━━━━━━━━━
const AUDIENCES = [
  {
    icon: GraduationCap,
    title: "Schools & Universities",
    desc: "Classroom lecture transcripts and student notes that work smoothly over congested campus Wi-Fi.",
  },
  {
    icon: Building2,
    title: "Enterprises & Organizations",
    desc: "Meetings turn straight into shared action boards and team chat without lost context.",
  },
  {
    icon: Landmark,
    title: "Governments & Ministries",
    desc: "Host on sovereign on-premise infrastructure. Sensitive policy deliberations never leave your borders.",
  },
];

export function AudienceSection() {
  return (
    <section id="use-cases" className="py-16 sm:py-20 max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
      <div className="text-center max-w-xl mx-auto mb-10">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Built for African Institutions
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-normal">
          From classrooms to cabinet meetings, Talk2Me powers communication that respects local infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {AUDIENCES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2.5 shadow-xs"
          >
            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
              <Icon className="size-5" />
            </div>
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ━━━ 4. FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function FinalCTASection() {
  return (
    <section id="pricing" className="px-5 py-14 lg:py-18 max-w-5xl mx-auto w-full">
      <div className="rounded-2xl p-8 sm:p-12 bg-slate-900 text-white border border-slate-800 shadow-xl text-center flex flex-col items-center">
        <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Built for Africa. Ready for your organization.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-6 font-normal">
          Cloud or self-hosted on your own servers. Accurate accents, resilient 3G, and zero email spam.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center mb-4">
          <Link
            href="/auth"
            className="py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            Start Free
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/create"
            className="py-3 px-6 rounded-xl font-semibold text-sm text-white border border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
          >
            <Zap className="size-4 text-amber-400" />
            Instant Meeting
          </Link>
        </div>

        <p className="text-xs text-slate-500 font-normal">
          No credit card required • Sovereign deployment available
        </p>
      </div>
    </section>
  );
}

// ━━━ 5. SIMPLE FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-medium text-slate-900 dark:text-slate-200">
          Talk2Me AI — Sovereign communication engineered in Africa.
        </p>
        <div className="flex items-center gap-5">
          <Link href="#product" className="hover:text-blue-600 transition-colors">Product</Link>
          <Link href="#how-it-works" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="#use-cases" className="hover:text-blue-600 transition-colors">Institutions</Link>
          <Link href="/auth" className="hover:text-blue-600 transition-colors">Sign In</Link>
        </div>
      </div>
    </footer>
  );
}

// ━━━ MAIN PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-start bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <HeroSection />
      <PillarsSection />
      <AudienceSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
