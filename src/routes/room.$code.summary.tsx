import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Share2, Home } from "lucide-react";

export const Route = createFileRoute("/room/$code/summary")({
  head: ({ params }) => ({
    meta: [
      { title: `Summary · ${params.code} — SignBridge Live` },
      { name: "description", content: "Session transcript, key points, and saved notes." },
    ],
  }),
  component: SummaryPage,
});

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

function SummaryPage() {
  const { code } = Route.useParams();
  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-5 py-10 lg:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Session ended</div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Room {code}</h1>
        <p className="mt-2 text-muted-foreground">9 minutes · 2 participants · 38 captions</p>

        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          <button className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-card ring-1 ring-border hover:bg-muted text-sm font-medium"><Download className="size-4" />Save transcript</button>
          <button className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-card ring-1 ring-border hover:bg-muted text-sm font-medium"><Share2 className="size-4" />Share summary</button>
          <Link to="/" className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium"><Home className="size-4" />Home</Link>
        </div>

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
