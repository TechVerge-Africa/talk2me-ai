import { AiWaveBackground } from "@/packages/ui/ai-effects";

type Props = {
  currentCaption?: string;
};

export function AiSignerView({ currentCaption }: Props) {
  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden rounded-[48px] shadow-[0_0_80px_-20px_rgba(6,182,212,0.3)] ring-1 ring-white/10 group">
      {/* Immersive Background */}
      <AiWaveBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/80 pointer-events-none" />

      {/* AI Avatar Container */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Dynamic Pulse behind Avatar */}
        {currentCaption && (
          <div className="absolute size-[600px] rounded-full bg-bridge-cyan/5 blur-[120px] animate-wave-pulse" />
        )}
        
        <div className="relative w-[120%] h-[120%] -mt-20">
          <img
            src="/assets/ai_signer.png"
            alt="AI Signer"
            className={`w-full h-full object-contain transition-all duration-1000 ${
              currentCaption ? "animate-float-slow saturate-100 scale-110" : "animate-float-extra-slow saturate-50 scale-100 opacity-60"
            }`}
          />
        </div>
      </div>

      {/* Interpreter Overlay Labels */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="size-3 rounded-full bg-bridge-cyan animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-bridge-cyan/90">ECHO Interpretation Engine // Active</span>
      </div>

      {/* Dynamic Caption Overlay */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-10">
        <div className="glass-card bg-black/40 border-white/10 p-8 rounded-[32px] shadow-2xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
           <p className="text-2xl sm:text-4xl font-medium tracking-tight text-white lg:text-balance text-center leading-relaxed">
             {currentCaption || "Ready for inclusion."}
           </p>
           <div className="mt-4 flex items-center justify-center gap-1.5 h-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-12 h-0.5 rounded-full transition-all duration-500 ${currentCaption ? "bg-bridge-cyan" : "bg-white/10"}`} />
              ))}
           </div>
        </div>
      </div>

      {/* Ambient Lighting FX */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-bridge-cyan/50 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-bridge-indigo/50 to-transparent" />
    </div>
  );
}
