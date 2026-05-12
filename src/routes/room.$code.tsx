import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CaptionStream } from "@/components/sb/CaptionStream";
import { CameraPreview } from "@/components/sb/CameraPreview";
import { ControlDock } from "@/components/sb/ControlDock";
import { useMockTranscript } from "@/lib/mock/transcript";
import { EMERGENCY_PHRASES, SMART_REPLIES } from "@/lib/mock/phrases";
import { Sparkles, AlertOctagon, X } from "lucide-react";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — SignBridge Live` },
      { name: "description", content: "Live AI translation room with captions and sign recognition." },
    ],
  }),
  component: RoomPage,
});

const SIZES = ["sm", "md", "lg"] as const;

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const lines = useMockTranscript(3000);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [aiOpen, setAiOpen] = useState(false);
  const [emOpen, setEmOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const lastSign = [...lines].reverse().find((l) => l.modality === "sign");

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="size-7 rounded-lg bg-primary grid place-items-center text-primary-foreground text-[10px] font-bold">SB</span>
          <div>
            <div className="text-xs text-muted-foreground leading-none">Room</div>
            <div className="text-sm font-semibold tracking-wider">{code}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">2 connected</span>
          <button onClick={() => navigate({ to: "/room/$code/summary", params: { code } })} className="ml-3 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground/80 text-xs font-medium">End → Summary</button>
        </div>
      </div>

      {/* Layout */}
      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto grid lg:grid-cols-12 gap-5 pb-32">
        {/* Camera */}
        <div className="lg:col-span-8 order-1">
          <div className="aspect-video lg:aspect-[16/10]">
            <CameraPreview detectedPhrase={camOn ? lastSign?.text : undefined} />
          </div>

          {/* Speaker cards */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-card ring-1 ring-border flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-tr from-bridge-cyan to-bridge-indigo grid place-items-center text-white text-xs font-semibold">SA</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Sarah</div>
                <div className="text-xs text-muted-foreground">Signing · ASL</div>
              </div>
              <span className="size-2 rounded-full bg-emerald-500" />
            </div>
            <div className="p-4 rounded-2xl bg-card ring-1 ring-border flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted grid place-items-center text-foreground text-xs font-semibold">DA</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">David (you)</div>
                <div className="text-xs text-muted-foreground">{micOn ? "Speaking" : "Muted"}</div>
              </div>
              <div className="flex items-end gap-0.5 h-4">
                {[3, 6, 4, 8, 5].map((h, i) => (
                  <span key={i} className="w-0.5 bg-bridge-cyan rounded-full animate-pulse" style={{ height: h * 2, animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Captions panel */}
        <aside className="lg:col-span-4 order-2 lg:h-[calc(100vh-9rem)] lg:sticky lg:top-20">
          <div className="h-full bg-card rounded-3xl ring-1 ring-border p-5 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Live transcript</div>
              <span className="px-2 py-0.5 rounded bg-bridge-cyan/10 text-bridge-cyan text-[10px] font-bold">REAL-TIME</span>
            </div>
            <div className="flex-1 min-h-[280px] flex flex-col">
              <CaptionStream lines={lines} size={SIZES[sizeIdx]} />
            </div>
          </div>
        </aside>
      </div>

      {/* Floating dock */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30">
        <ControlDock
          micOn={micOn}
          camOn={camOn}
          onToggleMic={() => setMicOn((v) => !v)}
          onToggleCam={() => setCamOn((v) => !v)}
          onAi={() => setAiOpen(true)}
          onEmergency={() => setEmOpen(true)}
          onCaptionSize={() => setSizeIdx((i) => (i + 1) % SIZES.length)}
          onLeave={() => setLeaveOpen(true)}
        />
      </div>

      {/* AI Sheet */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Sparkles className="size-4 text-bridge-cyan" /> AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Smart replies</div>
            {SMART_REPLIES.map((r) => (
              <button key={r} className="w-full text-left p-4 rounded-2xl bg-muted hover:bg-muted/70 transition">
                {r}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Emergency Sheet */}
      <Sheet open={emOpen} onOpenChange={setEmOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><AlertOctagon className="size-4 text-destructive" /> Emergency phrases</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-6 pb-6">
            {EMERGENCY_PHRASES.map((cat) => (
              <div key={cat.category}>
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">{cat.category}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((p) => (
                    <button key={p} className="text-left p-3 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive transition text-sm font-medium">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
