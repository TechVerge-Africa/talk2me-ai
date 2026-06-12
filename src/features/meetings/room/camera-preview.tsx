'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import { VideoOff, RefreshCw, ShieldAlert } from "lucide-react";
import { AiOrb } from "@/packages/ui/ai-effects";

interface CameraPreviewProps {
  detectedPhrase?: string;
  camOn: boolean;
}

// Constraint cascade: try high quality first, fall back to lower, then bare minimum
const CONSTRAINT_CASCADE = [
  // 1. Ideal: FHD portrait-friendly
  {
    video: {
      facingMode: "user",
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, min: 15 },
    },
  },
  // 2. Standard: 640×480
  {
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  },
  // 3. Bare minimum: just ask for any video
  { video: true },
];

type PermState = "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error";

export function CameraPreview({
  detectedPhrase,
  camOn,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permState, setPermState] = useState<PermState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { t.stop(); t.enabled = false; });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    // Guard: mediaDevices API missing (HTTP context, old Android WebView)
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermState("unavailable");
      setErrorMsg("Camera API not available. Please use HTTPS and a modern browser.");
      return;
    }

    setPermState("requesting");
    setErrorMsg(null);

    // Try constraint levels from strictest to most permissive
    for (const constraints of CONSTRAINT_CASCADE) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Needed for iOS Safari: play() must be called after srcObject set
          videoRef.current.play().catch(() => {});
        }
        setPermState("granted");
        setErrorMsg(null);
        return; // success — stop cascade
      } catch (err: any) {
        const name = err?.name ?? "";
        // Hard stops — no point retrying with looser constraints
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPermState("denied");
          setErrorMsg("Camera permission was denied. Please allow camera access in your browser or device settings.");
          return;
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setPermState("unavailable");
          setErrorMsg("No camera found on this device.");
          return;
        }
        if (name === "NotReadableError" || name === "TrackStartError") {
          // Camera in use by another app — stop cascade immediately
          setPermState("error");
          setErrorMsg("Camera is in use by another application. Please close it and try again.");
          return;
        }
        // OverconstrainedError or unknown — try next constraint level
        console.warn(`[CameraPreview] Constraint level failed (${name}), trying next…`);
      }
    }

    // All cascades failed
    setPermState("error");
    setErrorMsg("Could not start camera. Try using a different browser or check your device settings.");
  }, []);

  useEffect(() => {
    let active = true;
    if (camOn) {
      startCamera().then(() => {
        if (!active) stopStream();
      });
    } else {
      stopStream();
      setPermState("idle");
      setErrorMsg(null);
    }
    return () => {
      active = false;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn]);

  // ─── Render helpers ───────────────────────────────────────────────
  const isBlocked = permState === "denied" || permState === "unavailable" || permState === "error";
  const isLoading = permState === "requesting";

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden ring-1 ring-border bg-neutral-900 shadow-bridge">

      {/* Real Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] contrast-[1.05] saturate-[1.05] transition-opacity duration-300 ${
          camOn && permState === "granted" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Off state */}
      {(!camOn || permState === "idle") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-muted-foreground/40">
          <VideoOff className="size-14 mb-4 stroke-[1px]" />
          <p className="text-sm font-medium tracking-wide uppercase">Camera is off</p>
        </div>
      )}

      {/* Loading / requesting permission */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 backdrop-blur-sm gap-4">
          <div className="size-10 rounded-full border-2 border-t-transparent border-bridge-cyan animate-spin" />
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Requesting camera…</p>
          <p className="text-white/40 text-[11px] text-center max-w-[200px]">
            A browser permission prompt may appear — please click <strong className="text-white/60">Allow</strong>
          </p>
        </div>
      )}

      {/* Permission denied / error */}
      {isBlocked && camOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 backdrop-blur-sm gap-4 px-6 text-center">
          <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="size-7 text-amber-400" />
          </div>
          <p className="text-white/80 text-sm font-semibold leading-snug">{errorMsg}</p>
          {permState === "error" && (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-bridge-cyan/10 border border-bridge-cyan/20 text-bridge-cyan text-xs font-bold hover:bg-bridge-cyan/20 transition-colors touch-manipulation"
            >
              <RefreshCw className="size-3.5" />
              Try Again
            </button>
          )}
          {permState === "denied" && (
            <div className="mt-1 text-white/35 text-[10px] leading-relaxed max-w-[240px]">
              <p className="font-bold text-white/50 mb-1">How to fix:</p>
              <p>🔒 Click the padlock/camera icon in your browser's address bar and allow camera access, then refresh.</p>
            </div>
          )}
        </div>
      )}

      {/* Decorative overlay (only when camera is live) */}
      {camOn && permState === "granted" && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-15 mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 40%, rgba(255,255,255,.15), transparent 50%), radial-gradient(circle at 70% 60%, rgba(8,145,178,.25), transparent 55%)",
            }}
          />

          {/* Scan corners */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] aspect-square max-w-[340px]">
            <div className="relative w-full h-full">
              {[
                "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
              ].map((c, i) => (
                <span key={i} className={`absolute size-8 border-bridge-cyan/50 ${c}`} />
              ))}
            </div>
          </div>

          {/* Live badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 text-[10px] font-bold text-white/90 ring-1 ring-white/10 tracking-wider uppercase">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
            Live Preview
          </div>
        </div>
      )}

      {/* Translated phrase bubble */}
      {detectedPhrase && camOn && permState === "granted" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[80%] z-20">
          <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-2xl shadow-bridge ring-1 ring-black/5 animate-caption-in text-center">
            <p className="text-lg font-bold text-bridge-indigo tracking-tight leading-tight">"{detectedPhrase}"</p>
          </div>
        </div>
      )}

      {/* AI orb indicator */}
      <div className="absolute bottom-5 right-5">
        <AiOrb size={44} />
      </div>
    </div>
  );
}
