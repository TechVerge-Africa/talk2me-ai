'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Share2, Home, Sparkles, Clock, Users, MessageSquare } from "lucide-react";

const KEY_POINTS = [
  "Launch demo confirmed for next Tuesday",
  "Sarah will prepare the visual assets",
  "David to send timeline by EOD",
];

const TRANSCRIPT = [
  { who: "David", text: "Hey Sarah, can you hear the captions on your end?" },
  { who: "Sarah", text: "Yes, the translation feels instant today.", signed: true },
  { who: "David", text: "Great. Let's go over the timeline for the launch." },
  { who: "Sarah", text: "Tuesday works for me. I'll prepare the demo.", signed: true },
  { who: "David", text: "Sounds perfect, see you Tuesday." },
];

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } }
};

export default function SummaryPage() {
  const params = useParams();
  const code = params.code as string;

  return (
    <main className="min-h-screen px-5 py-12 lg:py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.04),transparent_50%)]" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative max-w-3xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-4">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Session Complete
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Room <span className="text-bridge-indigo">{code}</span></h1>

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-bridge-cyan" />
              <span className="font-semibold">9 min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-bridge-cyan" />
              <span className="font-semibold">2 participants</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-bridge-cyan" />
              <span className="font-semibold">38 captions generated</span>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div variants={item} className="mt-8 grid sm:grid-cols-3 gap-3">
          <button className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-card ring-1 ring-border hover:bg-muted text-sm font-bold transition-all active:scale-[0.98]">
            <Download className="size-4 text-bridge-cyan" />
            Save transcript
          </button>
          <button className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-card ring-1 ring-border hover:bg-muted text-sm font-bold transition-all active:scale-[0.98]">
            <Share2 className="size-4 text-bridge-indigo" />
            Share summary
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-13 py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-bridge hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Home className="size-4" />
            Return Home
          </Link>
        </motion.div>

        {/* AI Report */}
        <motion.section variants={item} className="mt-12 p-8 rounded-[36px] glass-card border-bridge-cyan/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-12 rounded-2xl bg-bridge-cyan/10 grid place-items-center">
              <Sparkles className="size-6 text-bridge-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Inclusive AI Report</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Diagnostic Insights</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {[
              { label: "Sign Translation Quality", value: 98.2, color: "bridge-indigo", note: "AI interpreted 12 unique ASL complex structures with high confidence." },
              { label: "Caption Accuracy", value: 99.5, color: "bridge-cyan", note: "Audio noise cancellation maintained perfect fidelity despite background crosstalk." },
            ].map(({ label, value, color, note }) => (
              <div key={label} className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{label}</span>
                  <span className={`font-black text-${color}`}>{value}%</span>
                </div>
                <div className={`h-2 w-full bg-${color}/10 rounded-full overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
                    className={`h-full bg-${color} rounded-full`}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Key points */}
        <motion.section variants={item} className="mt-10">
          <h2 className="text-xl font-bold mb-4">Key Points</h2>
          <ul className="space-y-3">
            {KEY_POINTS.map((k, i) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-5 rounded-2xl bg-card ring-1 ring-border flex items-start gap-4 hover:ring-bridge-cyan/30 transition-all"
              >
                <div className="mt-1.5 size-2 rounded-full bg-bridge-cyan shrink-0" />
                <span className="font-medium leading-relaxed">{k}</span>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* Transcript */}
        <motion.section variants={item} className="mt-10 mb-20">
          <h2 className="text-xl font-bold mb-4">Transcript</h2>
          <div className="rounded-[32px] bg-card ring-1 ring-border p-6 space-y-6">
            {TRANSCRIPT.map((l, i) => (
              <div key={i} className="flex gap-4">
                <div className="size-8 rounded-xl bg-foreground/5 grid place-items-center text-[10px] font-black text-muted-foreground shrink-0 mt-1">
                  {l.who.charAt(0)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground mb-1">
                    {l.who} {l.signed && <span className="text-bridge-indigo">· ASL</span>}
                  </div>
                  <p className="text-sm leading-relaxed font-medium">{l.text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
