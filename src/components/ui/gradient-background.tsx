/**
 * Decorative blurred gradient circles used as page backgrounds.
 * Enhanced for both vibrant Light Mode and rich Dark Mode depth.
 */
export function GradientBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* Light Mode Glow Orbs */}
      <div className="dark:hidden absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan-400/15 rounded-full blur-3xl -mr-64 animate-pulse" />
      <div className="dark:hidden absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl -ml-48" />

      {/* Dark Mode Atmospheric Glowing Orbs */}
      <div className="hidden dark:block absolute top-1/4 right-0 w-[700px] h-[700px] bg-cyan-500/20 rounded-full blur-[140px] -mr-64 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="hidden dark:block absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/25 rounded-full blur-[150px]" />
      <div className="hidden dark:block absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[140px] -ml-48" />
    </div>
  );
}
