import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Share2, ArrowRight, Check } from "lucide-react";
import { AiWaveBackground } from "@/components/sb/AiOrb";
import { QrBlock } from "@/components/sb/QrBlock";
import { generateRoomCode, roomShareUrl } from "@/lib/mock/rooms";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create Session — SignBridge Live" },
      { name: "description", content: "Start a new AI communication room and share via QR or code." },
      { property: "og:title", content: "Create a SignBridge session" },
      { property: "og:description", content: "Share a QR or code and start communicating." },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const code = useMemo(() => generateRoomCode(), []);
  const url = roomShareUrl(code);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const navigate = useNavigate();

  const copy = async (what: "link" | "code", text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Join my SignBridge room", url }); } catch {}
    } else {
      copy("link", url);
    }
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-5 py-10 lg:py-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
        {/* QR card */}
        <div className="lg:col-span-7">
          <div className="relative aspect-square max-w-md mx-auto lg:mx-0">
            <AiWaveBackground />
            <div className="relative bg-card rounded-[32px] shadow-bridge ring-1 ring-border p-6 sm:p-8">
              <div className="aspect-square bg-muted/60 rounded-2xl grid place-items-center mb-6 p-4">
                <QrBlock value={url} size={240} />
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
              onClick={() => navigate({ to: "/room/$code", params: { code } })}
              className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-bridge hover:opacity-95 transition"
            >
              Enter room <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-card ring-1 ring-border flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-tr from-bridge-cyan to-bridge-indigo grid place-items-center text-white text-xs font-semibold">YOU</div>
            <div className="flex-1">
              <div className="text-sm font-medium">You (host)</div>
              <div className="text-xs text-muted-foreground">Connected · ready</div>
            </div>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>

          <div className="mt-6 text-sm text-muted-foreground">
            Or <Link to="/" className="text-foreground underline underline-offset-4">go back</Link>.
          </div>
        </div>
      </div>
    </main>
  );
}
