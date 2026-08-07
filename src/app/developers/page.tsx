'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Code2, 
  Key, 
  Shield, 
  ArrowRight, 
  Check, 
  Copy, 
  Webhook, 
  Lock,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Tv,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { GradientBackground } from '@/components/ui/gradient-background';

type Tab = 'react' | 'javascript' | 'curl';

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('react');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    react: `// Install SDK: npm install @talk2me/react-sdk
import { Talk2MeProvider, VideoRoom } from '@talk2me/react-sdk';

function VirtualClassroom() {
  return (
    <Talk2MeProvider token="YOUR_SESSION_TOKEN">
      <VideoRoom 
        layout="educational"
        features={{
          realtimeCaptions: true,
          liveTranslation: true,
          interpreterPinning: true,
          interactiveChat: true
        }}
      />
    </Talk2MeProvider>
  );
}`,
    javascript: `// Install SDK: npm install @talk2me/client-sdk
import { Talk2MeClient } from '@talk2me/client-sdk';

const client = new Talk2MeClient({
  token: "YOUR_SESSION_TOKEN"
});

// Connect to room and subscribe to translation streams
await client.connect();

client.on('caption', (data) => {
  console.log(\`[\${data.speaker}]: \${data.text}\`);
});`,
    curl: `# Generate a secure room session token via Talk2Me REST API
curl -X POST https://api.talk2me.ai/v1/sessions \\
  -H "Authorization: Bearer YOUR_SECRET_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "roomCode": "math-101",
    "participantId": "student_993",
    "displayName": "Sulley Latif",
    "role": "participant"
  }'`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-indigo/10 text-indigo dark:text-cyan border border-indigo/20">
            <Code2 className="size-3.5" />
            Developer Platform
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
            Integrate Video & Audio in Minutes
          </motion.h1>
          <motion.p 
            variants={fadeInUp}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            Power meetings, virtual classrooms, medical consultations, and global streams directly within your platform using our high-level SDKs.
          </motion.p>
        </motion.div>

        {/* Quickstart & Interactive Tabs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-24">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 flex flex-col justify-between gap-6"
          >
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Easy to Embed and Use
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Connect your app to the Talk2Me secure network. Import our pre-built responsive React UI components or use the client SDKs to create completely customized video interfaces.
              </p>
              
              <div className="space-y-4">
                {[
                  'Embeddable pre-styled React video components',
                  'REST APIs to generate secure JWT session tokens',
                  'Real-time automated captions in 80+ languages',
                  'Global low-latency connection mesh networks'
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="size-5 rounded-full bg-cyan/20 text-cyan grid place-items-center flex-shrink-0">
                      <Check className="size-3" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row gap-4">
              <Link
                href="/docs"
                className="group flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo text-white font-bold text-sm rounded-xl hover:shadow-lg transition-all active:scale-95 text-center sm:flex-1"
              >
                Read API Reference
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://github.com/talk2me-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 border border-border bg-card/50 hover:bg-card text-foreground font-bold text-sm rounded-xl transition-all text-center sm:flex-1"
              >
                Explore SDKs on GitHub
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex flex-col rounded-3xl overflow-hidden border border-border/50 bg-slate-900 shadow-2xl min-h-[400px]"
          >
            {/* Code Block Header / Tab controls */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-white/5">
              <div className="flex gap-2">
                {[
                  { id: 'react', label: 'React Component' },
                  { id: 'javascript', label: 'Vanilla JS' },
                  { id: 'curl', label: 'REST API' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab.id 
                        ? 'bg-indigo text-white shadow-md' 
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all border border-white/10 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-cyan" />
                    <span className="text-cyan font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code pane */}
            <div className="flex-1 p-6 font-mono text-sm leading-relaxed overflow-x-auto text-slate-300 bg-slate-950/20 selection:bg-indigo/35">
              <pre className="whitespace-pre">{codeSnippets[activeTab]}</pre>
            </div>
          </motion.div>
        </div>

        {/* Integration Use-Cases Section */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center mb-4">
          Integrated Solutions Across Industries
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          Embed collaborative features directly inside your native web and mobile platforms with purpose-built UI layouts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {[
            {
              icon: GraduationCap,
              title: "Virtual Classrooms & Schools",
              desc: "Seamlessly integrate online lectures and group discussions into your LMS (Learning Management System). Enable auto-captioning and multi-language translations to ensure students study without barriers.",
              features: ['One-click LMS embedding', 'Speaker focuses & hand raising', 'Automated session transcription']
            },
            {
              icon: HeartPulse,
              title: "HIPAA-Compliant Telehealth",
              desc: "Provide secure consultation environments for patients and doctors. Talk2Me operates with strict privacy compliance standards, keeping video/audio data encrypted in memory.",
              features: ['End-to-end media encryption', 'Patient-doctor lobby routing', 'Automated clinical visit summaries']
            },
            {
              icon: Briefcase,
              title: "Corporate Portals & Workspaces",
              desc: "Embed corporate meetings directly in your enterprise CRM or intranet portals. Enhance internal team collaboration with custom vocabulary training.",
              features: ['Intranet Single Sign-On (SSO)', 'Custom jargon AI training', 'Collaborative interactive widgets']
            },
            {
              icon: Tv,
              title: "Global Webinars & Live Streams",
              desc: "Broadcast live streams to thousands of web viewers concurrently. Offer live translation options so users anywhere in the world can interact in real-time.",
              features: ['High-scale RTMP delivery networks', 'Live translated overlays', 'Interactive Q&A modules']
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-3xl p-8 border border-border/40 hover:border-cyan/30 transition-all flex flex-col justify-between group duration-300"
            >
              <div>
                <div className="size-12 rounded-2xl bg-indigo/15 text-indigo dark:text-cyan grid place-items-center mb-6 border border-indigo/20">
                  <item.icon className="size-6" />
                </div>
                <h3 className="font-bold text-2xl text-foreground mb-4">{item.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">{item.desc}</p>
              </div>

              <div className="border-t border-border/40 pt-6 space-y-3">
                {item.features.map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm font-semibold">
                    <Check className="size-4.5 text-cyan shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Developer Features Grid */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center mb-12">
          Engineered for Security and Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Key,
              title: "Access Credentials",
              desc: "Issue secure session tokens utilizing backend credentials. Sign JSON web signatures securely to validate and control participant roles."
            },
            {
              icon: Webhook,
              title: "Webhooks Architecture",
              desc: "Configure callbacks to be notified in real-time when online classes start, group sessions end, or AI summaries finish compiling."
            },
            {
              icon: Sparkles,
              title: "Dynamic AI Translations",
              desc: "Access instant translations for 80+ world languages. AI-driven context models guarantee vocabulary accuracy during technical presentations."
            },
            {
              icon: Lock,
              title: "Privacy First Policies",
              desc: "All captioning and translating processes run transiently in memory. No audio, video, or speech packets are ever saved or stored on our servers."
            },
            {
              icon: Smartphone,
              title: "Cross-Platform SDKs",
              desc: "Support for React, vanilla Javascript, and iOS/Android integrations. Build cross-platform video apps with a single backend architecture."
            },
            {
              icon: Shield,
              title: "Enterprise Resilience",
              desc: "High-capacity server instances and automatic backup paths guarantee 99.99% network uptime for major conferences."
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-2xl p-6 border border-border/40 hover:border-cyan/35 transition-all flex flex-col group hover:-translate-y-1 duration-300"
            >
              <div className="size-11 rounded-xl bg-indigo/20 dark:bg-indigo/10 grid place-items-center group-hover:bg-indigo/30 transition-colors mb-4 border border-indigo/20">
                <item.icon className="size-5 text-indigo dark:text-cyan" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
