'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Download, Share2, Home, Sparkles } from "lucide-react";

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

export default function SummaryPage() {
  const params = useParams();
  const code = params.code as string;

  return (
    <main className="min-h-screen px-5 py-10 lg:py-16 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Session ended</div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">Room {code}</h1>
        <p className="mt-2 text-muted-foreground">9 minutes · 2 participants · 38 captions</p>

        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <button className="inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-card ring-1 ring-border hover:bg-muted text-sm font-semibold transition-all"><Download className="size-4 text-bridge-cyan" />Save transcript</button>
          <button className="inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-card ring-1 ring-border hover:bg-muted text-sm font-semibold transition-all"><Share2 className="size-4 text-bridge-indigo" />Share summary</button>
          <Link href="/" className="inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-bridge-sm hover:opacity-90 transition-all"><Home className="size-4" />Return Home</Link>
        </div>

        <section className="mt-12 p-8 rounded-[32px] glass-card border-bridge-cyan/20">
           <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-bridge-cyan/10 grid place-items-center"><Sparkles className="size-5 text-bridge-cyan" /></div>
              <div>
                 <h2 className="text-lg font-bold">Inclusive AI Report</h2>
                 <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Diagnostic Insights</p>
              </div>
           </div>
           
           <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Sign Translation Quality</span>
                    <span className="font-bold text-bridge-indigo">98.2%</span>
                 </div>
                 <div className="h-1.5 w-full bg-bridge-indigo/10 rounded-full overflow-hidden">
                    <div className="h-full bg-bridge-indigo w-[98%]" />
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">AI successfully interpreted 12 unique ASL complex structures with high confidence.</p>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Caption Accuracy</span>
                    <span className="font-bold text-bridge-cyan">99.5%</span>
                 </div>
                 <div className="h-1.5 w-full bg-bridge-cyan/10 rounded-full overflow-hidden">
                    <div className="h-full bg-bridge-cyan w-[99%]" />
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">Audio noise cancellation maintained perfect fidelity despite background crosstalk.</p>
              </div>
           </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Key points</h2>
          <ul className="space-y-2">
            {KEY_POINTS.map((k) => (
              <li key={k} className="p-4 rounded-2xl bg-card ring-1 ring-border flex gap-3">
                <span className="mt-1 size-1.5 rounded-full bg-bridge-cyan shrink-0" />
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Transcript</h2>
          <div className="rounded-3xl bg-card ring-1 ring-border p-5 space-y-5">
            {TRANSCRIPT.map((l, i) => (
              <div key={i}>
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{l.who} {l.signed && <span className="text-bridge-indigo">· signed</span>}</div>
                <p className="mt-1 text-base leading-relaxed">{l.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
