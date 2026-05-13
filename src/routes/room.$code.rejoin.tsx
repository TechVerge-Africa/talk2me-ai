import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/room/$code/rejoin")({
  head: ({ params }) => ({
    meta: [
      { title: `Left Room · ${params.code} — SignBridge Live` },
      { name: "description", content: "You have left the conversation. Rejoin or return home." },
    ],
  }),
  component: RejoinPage,
});

function RejoinPage() {
  const { code } = Route.useParams();

  return (
    <main className="min-h-screen flex items-center justify-center px-5 bg-background">
      <div className="max-w-md w-full text-center slide-in">
        <div className="mx-auto size-20 rounded-full bg-muted grid place-items-center mb-8">
           <span className="text-3xl font-bold text-muted-foreground/50">!</span>
        </div>
        
        <h1 className="text-3xl font-semibold tracking-tight">You left the meeting</h1>
        <p className="mt-4 text-muted-foreground text-pretty">
          You've been disconnected from room <span className="font-mono text-foreground font-medium">{code}</span>.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/room/$code"
            params={{ code }}
            className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-bridge transition hover:opacity-90 active:scale-[0.98]"
          >
            <RefreshCcw className="size-4" /> Rejoin session
          </Link>
          
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-card ring-1 ring-border font-semibold hover:bg-muted transition active:scale-[0.98]"
          >
            <Home className="size-4" /> Return to home screen
          </Link>
        </div>

        <div className="mt-16 text-sm text-muted-foreground">
          Want to see what you missed? <Link to="/room/$code/summary" params={{ code }} className="text-bridge-cyan font-medium hover:underline">View session summary</Link>
        </div>
      </div>
    </main>
  );
}
