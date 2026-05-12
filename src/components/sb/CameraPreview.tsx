import { AiOrb } from "./AiOrb";

export function CameraPreview({ detectedPhrase }: { detectedPhrase?: string }) {
  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Faux camera grain */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, rgba(255,255,255,.15), transparent 50%), radial-gradient(circle at 70% 60%, rgba(8,145,178,.25), transparent 55%)",
        }}
      />
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-medium text-white/90 ring-1 ring-white/10">
        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
        LIVE • Sarah
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-bold text-white/80 ring-1 ring-white/10">720P</div>

      {/* Sign detection bounding box */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] aspect-square">
        <div className="relative w-full h-full">
          {/* Corner markers */}
          {[
            "top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
            "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
            "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
            "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md",
          ].map((c, i) => (
            <span key={i} className={`absolute size-6 border-bridge-cyan ${c}`} />
          ))}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-bridge-cyan text-white text-[10px] font-bold uppercase tracking-wider shadow">
            ASL detected
          </div>
        </div>
      </div>

      {/* Translated phrase bubble */}
      {detectedPhrase && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-[80%]">
          <div className="bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-bridge ring-1 ring-black/5 animate-caption-in">
            <p className="text-base font-semibold text-bridge-indigo">"{detectedPhrase}"</p>
          </div>
        </div>
      )}

      {/* AI orb */}
      <div className="absolute bottom-4 right-4">
        <AiOrb size={44} />
      </div>
    </div>
  );
}
