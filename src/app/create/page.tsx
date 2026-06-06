'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Share2, ArrowRight, Check, Loader2, Phone, Users, Radio, Video } from "lucide-react";
import { AiWaveBackground } from "@/packages/ui/ai-effects";
import { QrBlock } from "@/packages/ui/qr-block";
import { generateRoomCode, roomShareUrl } from "@/packages/shared/rooms";
import { useAuth } from "@/features/auth/use-auth";
import { MeetingService } from "@/services/supabase/meetings";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

export default function CreatePage() {
  const code = useMemo(() => generateRoomCode(), []);
  const url = roomShareUrl(code);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const handleCreateAndEnter = async () => {
    if (!user) {
      alert("Please sign in to host a meeting");
      return;
    }

    setIsCreating(true);
    try {
      const meeting = await MeetingService.createMeeting("New Meeting", user.id);
      if (meeting) {
        router.push(`/room/${meeting.room_code}`);
      }
    } catch (error) {
      console.error("Failed to create meeting:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const copy = async (what: "link" | "code", text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Join my Talk2Me room", url }); } catch {}
    } else {
      copy("link", url);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full pt-20 pb-20 lg:pt-32 lg:pb-32 bg-background">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan/8 rounded-full blur-3xl -mr-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo/8 rounded-full blur-3xl -ml-48" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start"
        >
          {/* Left Column - QR and Room Code */}
          <motion.div variants={fadeInUp} className="flex flex-col gap-8">
            <div className="relative aspect-square max-w-sm">
              <AiWaveBackground />
              <div className="relative rounded-3xl overflow-hidden border border-border/50 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-2xl p-8 sm:p-10">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo/20 to-cyan/20 rounded-3xl blur-2xl opacity-60 -z-10" />
                
                <div className="flex flex-col items-center gap-8">
                  <div className="flex justify-center w-full">
                    <QrBlock value={url} size={240} />
                  </div>
                  
                  <div className="text-center w-full">
                    <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3">Room Code</div>
                    <button
                      onClick={() => copy("code", code)}
                      className="text-4xl sm:text-5xl font-black tracking-tighter text-indigo hover:opacity-80 transition cursor-pointer"
                    >
                      {code}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick features */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-3">
              {[
                { icon: Phone, label: "1:1 Calls" },
                { icon: Users, label: "Team Meetings" },
                { icon: Video, label: "HD Video" },
                { icon: Radio, label: "Broadcasting" }
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 p-3 rounded-lg border border-border/40 bg-white/30 dark:bg-white/5 backdrop-blur-sm">
                  <Icon className="size-4 text-indigo flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column - Share and Action */}
          <motion.div variants={fadeInUp} className="flex flex-col gap-8">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan/10 border border-cyan/30 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
              </span>
              <span className="text-xs font-semibold text-foreground">Room Ready</span>
            </div>

            {/* Main Heading */}
            <div className="flex flex-col gap-4">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-balance leading-[1.0]">
                Share &{" "}
                <span className="bg-gradient-to-r from-indigo to-cyan bg-clip-text text-transparent">
                  Connect
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Invite participants instantly with your unique room code or share the link. Everyone connects with full accessibility features.
              </p>
            </div>

            {/* Share Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:border-cyan/40 transition-all duration-300">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Invite Link</div>
                  <div className="text-sm font-medium text-foreground truncate">{url}</div>
                </div>
                <button
                  onClick={() => copy("link", url)}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-indigo hover:bg-indigo/10 transition-colors inline-flex items-center gap-2"
                >
                  {copied === "link" ? (
                    <>
                      <Check className="size-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={share}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-foreground/20 text-foreground font-semibold hover:border-indigo/50 hover:bg-indigo/8 transition-all"
              >
                <Share2 className="size-4" />
                Share Invite
              </button>

              <button
                onClick={handleCreateAndEnter}
                disabled={isCreating}
                className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-indigo text-white font-bold text-lg hover:shadow-lg hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Entering...
                  </>
                ) : (
                  <>
                    Enter Room
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </div>

            {/* User Status Card */}
            <div className="p-5 rounded-2xl border border-border/40 bg-white/40 dark:bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-gradient-to-br from-indigo to-cyan grid place-items-center text-white text-sm font-black flex-shrink-0">
                  {user?.email?.slice(0, 2).toUpperCase() ?? "YOU"}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{user?.email ?? "Not signed in"}</div>
                  <div className="text-xs text-muted-foreground">
                    {user ? "Host — Ready to start" : "Sign in to host"}
                  </div>
                </div>
                <div className={`size-3 rounded-full ${user ? "bg-emerald-500" : "bg-red-500"}`} />
              </div>
            </div>

            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
