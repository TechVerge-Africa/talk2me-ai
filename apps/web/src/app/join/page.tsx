'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, ArrowRight } from "lucide-react";
import { QrScanner } from "@/packages/ui/qr-scanner";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();
  const valid = code.trim().length >= 4;

  const handleScan = (scannedText: string) => {
    let extractedCode = scannedText;
    if (scannedText.includes("/room/")) {
      extractedCode = scannedText.split("/room/").pop() || scannedText;
    } else if (scannedText.includes("code=")) {
      extractedCode = scannedText.split("code=").pop() || scannedText;
    }
    
    setShowScanner(false);
    router.push(`/room/${extractedCode.trim().toUpperCase()}`);
  };

  return (
    <main className="min-h-screen px-5 py-12 lg:py-20 bg-background">
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center text-balance">
          Join a room
        </h1>
        <p className="mt-3 text-muted-foreground text-center">
          Enter the code your host shared, or scan their QR.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) router.push(`/room/${code.trim().toUpperCase()}`);
          }}
          className="mt-10 space-y-4"
        >
          <div className="bg-card ring-1 ring-border rounded-2xl p-2">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="S-722-B1X"
              className="w-full bg-transparent text-center font-semibold tracking-[0.3em] text-xl sm:text-2xl py-4 outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            type="submit"
            disabled={!valid}
            className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-bridge transition disabled:opacity-40"
          >
            Join room <ArrowRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-card ring-1 ring-border font-medium hover:bg-muted transition"
          >
            <QrCode className="size-4" /> Scan QR code
          </button>
        </form>

        <div className="mt-12">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Recent</div>
          <div className="space-y-2">
            {["S-201-K4M", "S-883-XQA"].map((c) => (
              <button
                key={c}
                onClick={() => router.push(`/room/${c}`)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-card ring-1 ring-border hover:bg-muted transition text-left"
              >
                <div>
                  <div className="font-medium tracking-wider">{c}</div>
                  <div className="text-xs text-muted-foreground">Yesterday · with Sarah</div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
