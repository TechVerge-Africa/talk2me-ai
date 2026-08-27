/**
 * Clean architectural background structure (solid lines, zero gradients).
 */
export function GradientBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* Crisp architectural grid lines */}
      <div 
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
}

