'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Users, 
  HelpCircle, 
  ExternalLink, 
  BookOpen, 
  ArrowRight, 
  FolderArchive, 
  ShieldAlert,
  MessageSquare,
  Newspaper
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { GradientBackground } from '@/components/ui/gradient-background';

export default function ResourcesPage() {
  return (
    <main className="min-h-screen w-full relative pt-24 pb-16 overflow-hidden">
      <GradientBackground />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full z-10">
        {/* Category Tag */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-4"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-cyan/10 text-cyan border border-cyan/20">
            <BookOpen className="size-3.5" />
            Resource Center
          </span>
        </motion.div>

        {/* Hero Header */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.h1 
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-foreground mb-6"
          >
            Guides, Assets & Community Tools
          </motion.h1>
          <motion.p 
            variants={fadeInUp}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            Explore guidelines for hosting Deaf-accessible meetings, download media kits, and connect with other creators building accessible products.
          </motion.p>
        </motion.div>

        {/* Section 1: Downloads Grid */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8">
          Downloadable Documentation & Assets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            {
              icon: FileText,
              title: "WCAG 3.0 Compliance Guide",
              size: "1.4 MB",
              format: "PDF",
              desc: "A detailed checklist on achieving AAA compliance in virtual meetings and audio/video streaming."
            },
            {
              icon: FolderArchive,
              title: "Talk2Me Brand Assets Kit",
              size: "12.8 MB",
              format: "ZIP",
              desc: "Talk2Me official logos, color codes, custom fonts, and presentation templates for partners."
            },
            {
              icon: ShieldAlert,
              title: "Deaf Inclusion Playbook",
              size: "2.1 MB",
              format: "PDF",
              desc: "An educational resource for enterprise teams on sign interpreter setup and keyboard-first layouts."
            },
            {
              icon: Newspaper,
              title: "Integration Case Studies",
              size: "3.5 MB",
              format: "PDF",
              desc: "Review real-world deployment reports from global educational systems and healthcare providers."
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-2xl p-6 border border-border/40 hover:border-cyan/35 transition-all flex flex-col group"
            >
              <div className="size-10 rounded-xl bg-indigo/15 grid place-items-center group-hover:bg-indigo/25 transition-colors mb-4 border border-indigo/20">
                <item.icon className="size-5 text-indigo dark:text-cyan" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-2 group-hover:text-indigo dark:group-hover:text-cyan transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-6">
                {item.desc}
              </p>
              <div className="flex items-center justify-between border-t border-border/40 pt-4">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                  {item.format} • {item.size}
                </span>
                <button className="flex items-center gap-1 text-xs font-bold text-indigo dark:text-cyan hover:underline cursor-pointer">
                  <Download className="size-3.5" />
                  Download
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Section 2: Educational Guides */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center gap-6"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              Best Practices for Creating Accessible Meetings
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Making remote collaboration accessible requires conscious planning. Check out our quick references below to ensure every participant has an equal voice in your next call.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "High Contrast Layouts",
                  desc: "Keep interfaces in dark mode or high-contrast styles to assist users with visual impairment."
                },
                {
                  title: "Optimized Camera Settings",
                  desc: "Ensure sign-language interpreters have at least 720p 30fps video feed to capture fast hand gestures."
                },
                {
                  title: "Clear Audio Inputs",
                  desc: "Reduce background noise to optimize the accuracy of real-time AI transcription models."
                }
              ].map((guide, i) => (
                <div key={guide.title} className="flex gap-4 p-4 rounded-xl border border-border bg-card/30 hover:bg-card/60 transition-colors">
                  <div className="size-8 rounded-lg bg-indigo/15 text-indigo dark:text-cyan grid place-items-center font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1">{guide.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{guide.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-border/50 bg-slate-900 shadow-2xl p-8 flex flex-col justify-between min-h-[400px]"
          >
            <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] bg-[length:20px_20px] bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)]" />
            
            <div className="relative space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-cyan/10 text-cyan border border-cyan/20">
                Interactive Checklist
              </span>
              <h3 className="text-2xl font-bold text-white leading-tight">
                Pre-Meeting Accessibility Audit
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Run through this list before hitting the live stream button to guarantee zero barriers.
              </p>

              <div className="space-y-3">
                {[
                  "Is the sign interpreter pinned and clearly visible?",
                  "Is the real-time AI captioner calibrated for current speaker inputs?",
                  "Did you share meeting links with shortcut cheat sheets?",
                  "Are custom vocabulary words saved in settings?"
                ].map((check, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-white/90">
                    <input 
                      type="checkbox" 
                      id={`check-${idx}`} 
                      className="rounded border-white/20 bg-white/5 text-cyan focus:ring-cyan size-4 cursor-pointer"
                    />
                    <label htmlFor={`check-${idx}`} className="cursor-pointer font-medium">{check}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative pt-6 border-t border-white/10 mt-8">
              <Link
                href="/docs"
                className="group inline-flex items-center gap-2 text-sm font-bold text-cyan hover:underline"
              >
                Go to complete user guide
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Section 3: Community & Support */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center mb-12">
          Connect & Support
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageSquare,
              title: "Community Forums",
              desc: "Join accessibility forums, ask questions, and share integrations built on top of the Talk2Me API.",
              action: "Visit Forums",
              href: "https://discord.gg/talk2me"
            },
            {
              icon: Users,
              title: "Partner Programs",
              desc: "Become a registered accessibility partner and provide certified interpretation services through the platform.",
              action: "Apply Now",
              href: "/resources/partner-program"
            },
            {
              icon: HelpCircle,
              title: "Help Center",
              desc: "Access user guides, video walkthroughs, and get direct assistance from our 24/7 technical support team.",
              action: "Open Help Desk",
              href: "/docs/help"
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-2xl p-6 border border-border/40 hover:border-cyan/30 transition-all flex flex-col group text-center items-center"
            >
              <div className="size-12 rounded-full bg-indigo/25 grid place-items-center group-hover:bg-indigo/35 transition-colors mb-4 border border-indigo/20 shadow-sm">
                <item.icon className="size-5 text-indigo dark:text-cyan" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">{item.desc}</p>
              
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo dark:text-cyan group-hover:underline"
              >
                {item.action}
                <ExternalLink className="size-3" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
