import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Share2, ArrowRight, Check, Loader2 } from "lucide-react";
import { AiWaveBackground } from "@/packages/ui/ai-effects";
import { QrBlock } from "@/packages/ui/qr-block";
import { generateRoomCode, roomShareUrl } from "@/packages/shared/rooms";
import { useAuth } from "@/features/auth/use-auth";
import { MeetingService } from "@/services/supabase/meetings";

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
        // Update the code if the service returned a different one (though unlikely here)
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
    <main className="min-h-screen px-5 py-10 lg:py-16 bg-background">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
        {/* QR card */}
        <div className="lg:col-span-7">
          <div className="relative aspect-square max-w-md mx-auto lg:mx-0">
            <AiWaveBackground />
            <div className="relative rounded-[32px] shadow-bridge ring-1 ring-border p-8 sm:p-10 bg-card/80 backdrop-blur-sm">
              <div className="flex justify-center mb-8">
                <QrBlock value={url} size={280} />
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Room code</div>
                <button
                  onClick={() => copy("code", code)}
                  className="text-3xl sm:text-4xl font-semibold tracking-tight text-bridge-indigo hover:opacity-80 transition"
                >
                  {code}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Share + waiting */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-bridge-cyan">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bridge-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-bridge-cyan" />
            </span>
            Waiting for participants
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Share this room — they'll join in seconds.
          </h1>

          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-3 p-3 pl-4 rounded-2xl bg-card ring-1 ring-border">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Invite link</div>
                <div className="text-sm font-medium truncate">{url}</div>
              </div>
              <button
                onClick={() => copy("link", url)}
                className="px-3 h-9 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 inline-flex items-center gap-1.5"
              >
                {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === "link" ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              onClick={share}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-card ring-1 ring-border font-medium hover:bg-muted transition"
            >
              <Share2 className="size-4" /> Share invite
            </button>

            <button
              onClick={handleCreateAndEnter}
              disabled={isCreating}
              className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-bridge hover:opacity-95 transition disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="size-5 animate-spin" /> : "Enter room"}
              {!isCreating && <ArrowRight className="size-4" />}
            </button>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-card ring-1 ring-border flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-tr from-bridge-cyan to-bridge-indigo grid place-items-center text-white text-xs font-semibold uppercase">
              {user?.email?.slice(0, 2) ?? "YOU"}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{user ? user.email : "Not signed in"}</div>
              <div className="text-xs text-muted-foreground">
                {user ? "Authenticated host" : "Sign in to start meeting"}
              </div>
            </div>
            <span className={`size-2 rounded-full ${user ? "bg-emerald-500" : "bg-red-500"}`} />
          </div>

          <div className="mt-6 text-sm text-muted-foreground">
            Or <Link href="/" className="text-foreground underline underline-offset-4">go back</Link>.
          </div>
        </div>
      </div>
    </main>
  );
}
