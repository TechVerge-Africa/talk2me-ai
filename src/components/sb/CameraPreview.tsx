import { useEffect, useRef, useState } from "react";
import { AiOrb } from "./AiOrb";
import { VideoOff } from "lucide-react";

export function CameraPreview({ 
  detectedPhrase, 
  camOn 
}: { 
  detectedPhrase?: string; 
  camOn: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        setError(null);
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "user",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 }
          } 
        });
        
        if (!active) {
          // Component unmounted while waiting for camera, clean up immediately
          newStream.getTracks().forEach(track => track.stop());
          return;
        }

        stream = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (active) {
          console.error("Camera access error:", err);
          setError("Camera access denied or unavailable");
        }
      }
    }

    if (camOn) {
      startCamera();
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
    };
  }, [camOn]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden ring-1 ring-border bg-neutral-900 shadow-bridge">
      {/* Real Video Stream */}
      {camOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] contrast-[1.1] saturate-[1.1] brightness-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-muted-foreground/40">
          <VideoOff className="size-16 mb-4 stroke-[1px]" />
          <p className="text-sm font-medium tracking-wide uppercase">Camera is off</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && camOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-6 text-center">
          <p className="text-white text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Futuristic UI Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Faux camera grain / overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 40%, rgba(255,255,255,.15), transparent 50%), radial-gradient(circle at 70% 60%, rgba(8,145,178,.25), transparent 55%)",
          }}
        />
        
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 text-[10px] font-bold text-white/90 ring-1 ring-white/10 tracking-wider uppercase">
          <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
          Live • Local
        </div>
        
        <div className="absolute top-4 right-4 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-[10px] font-bold text-white/80 ring-1 ring-white/10 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-bridge-cyan" />
          {error ? "---" : "FHD 1080P • 60FPS"}
        </div>

        {/* Sign detection bounding box */}
        {camOn && !error && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square max-w-[400px]">
            <div className="relative w-full h-full">
              {[
                "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
              ].map((c, i) => (
                <span key={i} className={`absolute size-10 border-bridge-cyan/60 ${c}`} />
              ))}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-bridge-cyan text-white text-[9px] font-bold uppercase tracking-[0.2em] shadow-lg">
                Scanning Signs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Translated phrase bubble */}
      {detectedPhrase && camOn && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[80%] z-20">
          <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-2xl shadow-bridge ring-1 ring-black/5 animate-caption-in text-center">
            <p className="text-lg font-bold text-bridge-indigo tracking-tight leading-tight">"{detectedPhrase}"</p>
          </div>
        </div>
      )}

      {/* AI orb indicator */}
      <div className="absolute bottom-6 right-6">
        <AiOrb size={48} />
      </div>
    </div>
  );
}
