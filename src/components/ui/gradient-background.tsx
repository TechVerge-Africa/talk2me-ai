/**
 * Decorative blurred gradient circles used as page backgrounds.
 */
export function GradientBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan/8 rounded-full blur-3xl -mr-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo/8 rounded-full blur-3xl -ml-48" />
    </div>
  );
}
