import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Plus, Hash, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { AiWaveBackground } from "@/components/sb/AiOrb";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignBridge Live — Real-time AI communication rooms" },
      { name: "description", content: "Create or join an instant AI translation room. Speech to captions, signs to speech." },
      { property: "og:title", content: "SignBridge Live" },
      { property: "og:description", content: "Real-time AI communication rooms for deaf and hearing users." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] relative">
      <section className="relative px-5 pt-12 pb-16 lg:pt-24 lg:pb-28">
        <AiWaveBackground className="opacity-50" />
        <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="mb-8 flex items-center gap-2 px-3 py-1 rounded-full ring-1 ring-border bg-card/70 backdrop-blur text-[11px] font-medium tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bridge-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-bridge-cyan" />
            </span>
            Signal active
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-semibold tracking-tight text-balance leading-[1.02]">
            Two voices meeting<br className="hidden sm:block" /> in <span className="text-bridge-indigo">mid-air</span>.
          </h1>
          <p className="mt-6 max-w-[58ch] text-base sm:text-lg text-muted-foreground text-pretty">
            Instant AI rooms that bridge sign and speech in real time. Create a session, share a code, and just communicate.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            <Link
              to="/create"
              className="group relative overflow-hidden bg-primary text-primary-foreground rounded-3xl p-7 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99] shadow-bridge"
            >
              <div className="mb-5 size-11 rounded-2xl bg-white/10 grid place-items-center">
                <Plus className="size-5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">Create Session</div>
                  <div className="text-sm text-white/70 mt-0.5">Start a new bridge instantly</div>
                </div>
                <ArrowRight className="size-5 opacity-60 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link
              to="/join"
              className="group bg-card ring-1 ring-border rounded-3xl p-7 text-left shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <div className="mb-5 size-11 rounded-2xl bg-primary/5 text-primary grid place-items-center">
                <Hash className="size-5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">Join Session</div>
                  <div className="text-sm text-muted-foreground mt-0.5">Enter a code or scan a QR</div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
            {[
              { icon: Zap, t: "Real-time captions", d: "Speech becomes readable, word by word." },
              { icon: Sparkles, t: "Sign to speech", d: "AI watches signs and speaks for you." },
              { icon: ShieldCheck, t: "Private by design", d: "Rooms close when the call ends." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl bg-card/70 ring-1 ring-border p-5">
                <Icon className="size-5 text-bridge-cyan" />
                <div className="mt-3 font-semibold">{t}</div>
                <div className="text-sm text-muted-foreground mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>© SignBridge Live</span>
          <span>Built for everyone.</span>
        </div>
      </footer>
    </main>
  );
}
