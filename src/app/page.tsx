'use client';

import React from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/use-auth';
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Phone, Users, Radio, Zap, Globe, BarChart3, Quote, Check } from "lucide-react";
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
    icon: Phone, 
    label: "1:1 Calls", 
    desc: "Direct sign language interpretation and real-time transcription" 
  },
  { 
    icon: Users, 
    label: "Team Meetings", 
    desc: "Collaborate with automatic captions and visual descriptions" 
  },
  { 
    icon: Radio, 
    label: "Live Broadcasting", 
    desc: "Stream to audiences globally with full accessibility features" 
  }
];

// ━━━ SECTION 1: Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden pt-16 pb-10 sm:pt-24 sm:pb-14 lg:pt-32 lg:pb-28">
      {/* Animated background elements */}
      <GradientBackground />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center"
        >
          {/* Left Column - Text Content */}
          <div className="flex flex-col gap-6">
            {/* Main heading and description */}
            <div className="flex flex-col gap-6">
              <motion.h1 
                variants={fadeInUp} 
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter text-balance leading-[1.02]"
              >
                <span className="block text-foreground">Communicate Better.</span>
                <span className="bg-gradient-to-r from-indigo via-indigo to-cyan bg-clip-text text-transparent">Together.</span>
              </motion.h1>

              <motion.p 
                variants={fadeInUp} 
                className="text-base sm:text-lg text-muted-foreground text-pretty leading-relaxed font-medium max-w-3xl"
              >
                A new way to meet, stream, and collaborate with AI assistance built in.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div 
              variants={fadeInUp} 
              className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl"
            >
              <Link
                href="/dashboard"
                className="group flex items-center justify-center gap-2 px-6 py-4 bg-indigo text-white font-bold text-base rounded-2xl hover:shadow-xl transition-all active:scale-95 sm:flex-1"
              >
                Get Started
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/join"
                className="group flex items-center justify-center gap-2 px-6 py-4 border-2 border-foreground/20 text-foreground font-bold text-base rounded-2xl hover:border-indigo/50 hover:bg-indigo/8 transition-all sm:flex-1"
              >
                Join a Session
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Feature cards grid (Desktop Only) */}
            <motion.div 
              variants={fadeInUp}
              className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-4"
            >
              {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
                <motion.div 
                  key={label}
                  variants={fadeInUp}
                  className="group flex flex-col gap-3 p-5 rounded-xl border border-border/40 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:border-cyan/40 hover:bg-white/60 dark:hover:bg-white/12 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo/20 grid place-items-center group-hover:bg-indigo/30 transition-colors">
                    <Icon className="size-5 text-indigo" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm lg:text-base text-foreground mb-1">{label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column - Hero Image */}
          <motion.div 
            variants={fadeInUp}
            className="flex-1 w-full hidden md:block md:-mt-6 lg:-mt-12"
          >
            <div className="relative">
              {/* Glow effect behind image */}
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo/20 to-cyan/20 rounded-3xl blur-2xl opacity-60" />
              
              {/* Image container */}
              <div className="relative rounded-3xl overflow-hidden border border-border/50 bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-2xl md:h-96 lg:h-auto">
                <img
                  src="/hero-interface.png"
                  alt="Talk2Me Communication Interface"
                  className="w-full h-full object-cover"
                />
                
                {/* Optional gradient overlay for visual enhancement */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 2: Communication Modes ━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function CommunicationModesSection() {
  return (
    <section id="product" className="px-5 py-24 lg:py-32 border-t border-border/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            All Communication Modes, One Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From one-on-one calls to large-scale broadcasts, Talk2Me AI handles every scenario with native accessibility built in.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {[
            {
              title: "Direct Calls",
              desc: "One-on-one video with real-time sign interpretation, speech-to-text, and ambient sound awareness.",
              features: ["Sub-100ms latency", "HD video + depth sensing", "Mood & emotion detection"]
            },
            {
              title: "Team Meetings",
              desc: "Support unlimited participants with automatic speaker detection, shared captions, and inclusive record-keeping.",
              features: ["Auto-transcription", "Speaker highlights", "Meeting summaries"]
            },
            {
              title: "Enterprise Conferences",
              desc: "Scale to hundreds of participants with real-time interpretation, multi-language support, and live translation.",
              features: ["Multi-region deployment", "24/7 resilience", "Compliance audit logs"]
            },
            {
              title: "Public Broadcasting",
              desc: "Stream to unlimited viewers globally with adaptive bitrate, regional CDN, and accessibility overlays.",
              features: ["Multi-platform delivery", "Instant captions", "Interactive engagement tools"]
            }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              className="glass-card rounded-3xl p-8 border-cyan/10 hover:border-cyan/30 transition-all hover:shadow-xl"
            >
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{item.desc}</p>
              <ul className="space-y-3">
                {item.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className="size-5 text-cyan flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 3: Built for Inclusion ━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AccessibilitySection() {
  return (
    <section id="accessibility" className="px-5 py-24 lg:py-32 bg-cream dark:bg-slate-950/50 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 text-balance leading-[1.2]">
              Accessibility Built In,
              <br />
              Not Bolted On
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Every feature of Talk2Me AI is designed from the ground up for users with diverse communication needs—Deaf, Hard of Hearing, non-verbal, and neurotypical users all benefit from the same platform.
            </p>
            <div className="space-y-5">
              {[
                "WCAG 3.0 AAA compliance verified",
                "Screen reader optimized for all modes",
                "Keyboard-first navigation throughout",
                "Color-blind friendly interfaces",
                "Haptic feedback for notifications",
                "Customizable text sizes and contrast"
              ].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <div className="size-6 rounded-full bg-cyan/20 text-cyan grid place-items-center flex-shrink-0">
                    <Check className="size-4" />
                  </div>
                  <span className="text-base font-medium">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-square rounded-3xl bg-gradient-to-br from-cyan/10 via-indigo/5 to-transparent border border-cyan/20 p-8 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:16px_16px] bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)]" />
            <div className="relative w-full h-full glass-card rounded-2xl p-8 flex flex-col justify-center gap-8 shadow-2xl">
              <div className="space-y-4">
                <div className="text-sm font-bold uppercase tracking-wide text-cyan opacity-70">Accessibility Metrics</div>
                {[
                  { label: "Sign Recognition Accuracy", value: "99.2%" },
                  { label: "Caption Latency", value: "<200ms" },
                  { label: "Platform Coverage", value: "145 countries" }
                ].map(m => (
                  <div key={m.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-bold text-cyan">{m.value}</span>
                    </div>
                    <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: m.value }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo to-cyan"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ━━━ SECTION 4: Powered by AI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AILayerSection() {
  return (
    <section className="px-5 py-24 lg:py-32 border-t border-border/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            AI That Understands Context
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our custom vision transformer and NLP models understand not just words, but intent, emotion, and cultural context.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: "🎯",
              title: "Vision Transformer",
              desc: "Recognizes 12,000+ ASL, BSL, and LSF signs with sub-frame latency and spatial awareness."
            },
            {
              icon: "���",
              title: "Natural Language Engine",
              desc: "Converts sign sequences into contextually accurate speech with tone, emphasis, and personality."
            },
            {
              icon: "🌍",
              title: "Cultural Intelligence",
              desc: "Understands regional dialects, idioms, and cultural references across 45+ languages."
            }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              className="glass-card rounded-2xl p-8 text-center group hover:border-cyan/40 hover:shadow-lg transition-all"
            >
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 5: Multi-Platform Broadcasting ━━━━━━━━━━━━━━━━━━
export function BroadcastSection() {
  return (
    <section className="px-5 py-24 lg:py-32 bg-cream dark:bg-slate-950/50 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-video rounded-3xl bg-gradient-to-br from-indigo/20 to-cyan/10 border border-cyan/20 p-6 flex items-center justify-center overflow-hidden order-2 lg:order-1"
          >
            <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:20px_20px] bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1px)]" />
            <div className="relative w-full h-full glass-card rounded-2xl flex items-center justify-center shadow-2xl">
              <div className="text-center">
                <div className="text-6xl mb-4">📡</div>
                <p className="text-sm font-bold text-cyan">Live Stream Ready</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8 text-balance">
              Broadcast to Any Platform
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Stream your Talk2Me sessions directly to YouTube, LinkedIn, Twitch, or custom streaming endpoints. Accessibility travels with your content.
            </p>
            <div className="space-y-5 mb-10">
              {[
                "Captions burned-in or overlay-based",
                "Sign language video track options",
                "Multi-bitrate adaptive streaming",
                "Real-time analytics & engagement"
              ].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <div className="size-6 rounded-full bg-indigo/20 text-indigo grid place-items-center flex-shrink-0">
                    <Check className="size-4" />
                  </div>
                  <span className="text-base font-medium">{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/docs/broadcast"
              className="inline-flex items-center gap-2 text-indigo font-semibold hover:text-cyan transition-colors"
            >
              View broadcast setup guide
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ━━━ SECTION 6: Why Talk2Me (Comparison) ━━━━━━━━━━━━━━━━━━━━━
export function ComparisonSection() {
  return (
    <section id="solutions" className="px-5 py-24 lg:py-32 border-t border-border/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            Why Talk2Me AI Leads
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compared to manual interpreters and other platforms, Talk2Me AI delivers speed, scale, and accuracy.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-4 px-4 font-bold">Feature</th>
                <th className="text-center py-4 px-4 font-bold text-indigo">Talk2Me</th>
                <th className="text-center py-4 px-4 font-bold text-muted-foreground">Traditional Interpreters</th>
                <th className="text-center py-4 px-4 font-bold text-muted-foreground">Other Platforms</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "24/7 Availability", talk2me: true, traditional: false, other: true },
                { feature: "Sub-100ms Latency", talk2me: true, traditional: false, other: false },
                { feature: "Unlimited Participants", talk2me: true, traditional: false, other: true },
                { feature: "Multi-language Support", talk2me: true, traditional: false, other: false },
                { feature: "Cost Per Session", talk2me: "Free-5$", traditional: "$150-300", other: "$0-50" },
                { feature: "Sign Context Recognition", talk2me: true, traditional: true, other: false }
              ].map((row, i) => (
                <tr key={row.feature} className="border-b border-border/20">
                  <td className="py-4 px-4 font-semibold">{row.feature}</td>
                  <td className="py-4 px-4 text-center">
                    {typeof row.talk2me === 'boolean' ? (
                      row.talk2me ? <Check className="size-5 text-indigo mx-auto" /> : <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="font-semibold text-indigo">{row.talk2me}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof row.traditional === 'boolean' ? (
                      row.traditional ? <Check className="size-5 text-cyan mx-auto" /> : <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="font-semibold text-cyan">{row.traditional}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof row.other === 'boolean' ? (
                      row.other ? <Check className="size-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-muted-foreground">{row.other}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 7: Use Cases ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function UseCasesSection() {
  return (
    <section className="px-5 py-24 lg:py-32 bg-cream dark:bg-slate-950/50 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            Industry Impact
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From education to enterprise, Talk2Me AI powers meaningful, accessible communication worldwide.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {[
            {
              title: "Remote Work",
              emoji: "💼",
              desc: "Inclusive team meetings with real-time captions for Deaf and neurodivergent team members."
            },
            {
              title: "Education",
              emoji: "🎓",
              desc: "Virtual classrooms with live interpretation so every student can participate fully."
            },
            {
              title: "Healthcare",
              emoji: "⚕️",
              desc: "Telehealth visits with accurate medical terminology interpretation in any language."
            },
            {
              title: "Broadcasting",
              emoji: "📺",
              desc: "Live events and conferences streamed globally with captions in 45+ languages."
            },
            {
              title: "Government",
              emoji: "🏛️",
              desc: "Accessible public services and city council meetings for all constituents."
            },
            {
              title: "Entertainment",
              emoji: "🎬",
              desc: "Concert streams, theater performances, and sports events with real-time captions."
            }
          ].map((item) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              className="glass-card rounded-2xl p-8 group hover:border-cyan/40 hover:shadow-lg transition-all text-center"
            >
              <div className="text-5xl mb-4">{item.emoji}</div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 8: Testimonials ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function TestimonialsSection() {
  return (
    <section className="px-5 py-24 lg:py-32 border-t border-border/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            Trusted by Leaders
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Organizations worldwide rely on Talk2Me AI for genuinely inclusive communication.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {[
            {
              quote: "Talk2Me transformed how we run team meetings. Every voice is heard, without exception.",
              author: "Sarah Chen",
              role: "Head of Engineering, Tech Company"
            },
            {
              quote: "For the first time in 20 years, I attended a live conference without hiring an interpreter myself. The captions were perfect.",
              author: "James Williams",
              role: "University Student"
            },
            {
              quote: "The accuracy is remarkable. Our compliance audits showed 99.2% caption accuracy across all sessions.",
              author: "Dr. Amara Okafor",
              role: "Chief Accessibility Officer, Healthcare Provider"
            }
          ].map((item) => (
            <motion.div
              key={item.author}
              variants={fadeInUp}
              className="glass-card rounded-2xl p-8 flex flex-col group hover:border-cyan/40 transition-all"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-lg">⭐</span>
                ))}
              </div>
              <Quote className="size-5 text-cyan/40 mb-4" />
              <p className="text-base leading-relaxed mb-6 flex-1 italic text-muted-foreground">{item.quote}</p>
              <div>
                <p className="font-bold text-sm">{item.author}</p>
                <p className="text-xs text-muted-foreground">{item.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ━━━ SECTION 9: Final CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
          Ready to Communicate Without Barriers?
        </h2>
        <p className="text-xl text-white/80 max-w-2xl mb-12">
          Join thousands of organizations building genuinely inclusive communication today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-12">
          <Link
            href="/dashboard"
            className="group relative px-10 py-6 bg-white text-indigo rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl"
          >
            <span className="flex items-center gap-3">
              Create Your First Session
              <ArrowRight className="size-6 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          
          <Link
            href="/docs"
            className="px-10 py-6 rounded-2xl font-bold text-lg text-white border-2 border-white/30 hover:border-white/60 transition-all"
          >
            View Documentation
          </Link>
        </div>

        <p className="text-sm text-white/70">
          No credit card required. Free tier includes up to 100 minutes/month.
        </p>
      </motion.div>
    </section>
  );
}

export function MobileFeaturesSection() {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    
    // If we've reached the maximum scroll limit, force the last card active
    const isAtEnd = scrollLeft + container.clientWidth >= container.scrollWidth - 15;
    if (isAtEnd) {
      setActiveIndex(HERO_FEATURES.length - 1);
      return;
    }
    
    // Calculate closest card based on horizontal offset
    const cards = container.children;
    let closestIndex = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      // 20px is the padding-left offset matching scroll-pl-5
      const diff = Math.abs(card.offsetLeft - scrollLeft - 20); 
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    setActiveIndex(closestIndex);
  };

  return (
    <div className="w-full pb-12 md:hidden">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-pl-5 no-scrollbar gap-4 w-full px-5"
      >
        {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
          <motion.div 
            key={label}
            variants={fadeInUp}
            className="group flex flex-col gap-3 p-5 rounded-xl border border-border/40 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:border-cyan/40 hover:bg-white/60 dark:hover:bg-white/12 transition-all duration-300 snap-start shrink-0 w-[82vw] max-w-[300px]"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo/20 grid place-items-center group-hover:bg-indigo/30 transition-colors">
              <Icon className="size-5 text-indigo" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground mb-1">{label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Interactive indicator dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {HERO_FEATURES.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === idx ? "w-6 bg-indigo" : "w-1.5 bg-foreground/20 dark:bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
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
    <main className="min-h-screen w-full">
      <HeroSection />
      <MobileFeaturesSection />
      <CommunicationModesSection />
      <AccessibilitySection />
      <AILayerSection />
      <BroadcastSection />
      <ComparisonSection />
      <UseCasesSection />
      <TestimonialsSection />
      <FinalCTASection />
    </main>
  );
}
