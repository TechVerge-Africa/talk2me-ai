export function AiWaveBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-blue-500/5" />
    </div>
  );
}

export function AiOrb({ size = 48 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-blue-600 grid place-items-center text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <div className="size-2 rounded-full bg-white" />
    </div>
  );
}

