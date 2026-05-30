export function AiWaveBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-bridge-cyan/40 blur-3xl animate-wave-pulse" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-bridge-indigo/30 blur-3xl animate-wave-pulse [animation-delay:1.2s]" />
    </div>
  );
}

export function AiOrb({ size = 48 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-gradient-to-tr from-bridge-cyan to-bridge-indigo animate-orb-pulse animate-float-soft grid place-items-center text-white shadow-bridge-sm"
      style={{ width: size, height: size }}
    >
      <div className="size-2 rounded-full bg-white" />
    </div>
  );
}
