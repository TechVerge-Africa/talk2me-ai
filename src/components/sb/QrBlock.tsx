// Deterministic stylized QR-like block from a string seed.
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

export function QrBlock({ value, size = 192 }: { value: string; size?: number }) {
  const N = 11;
  const cell = size / N;
  const cells: boolean[] = [];
  let h = hash(value);
  for (let i = 0; i < N * N; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h & 1) === 1);
  }
  // mirror left/right for symmetry
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < Math.floor(N / 2); c++) {
      cells[r * N + (N - 1 - c)] = cells[r * N + c];
    }
  }
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 3 && c >= bc && c < bc + 3;
    return inBox(0, 0) || inBox(0, N - 3) || inBox(N - 3, 0);
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect width={size} height={size} fill="white" rx={12} />
      {cells.map((on, i) => {
        const r = Math.floor(i / N);
        const c = i % N;
        if (isFinder(r, c)) return null;
        if (!on) return null;
        return (
          <rect
            key={i}
            x={c * cell + 1}
            y={r * cell + 1}
            width={cell - 2}
            height={cell - 2}
            rx={2}
            fill="oklch(0.32 0.13 277)"
          />
        );
      })}
      {[
        [0, 0],
        [0, N - 3],
        [N - 3, 0],
      ].map(([r, c], idx) => (
        <g key={idx}>
          <rect x={c * cell} y={r * cell} width={cell * 3} height={cell * 3} rx={6} fill="oklch(0.32 0.13 277)" />
          <rect x={c * cell + cell * 0.6} y={r * cell + cell * 0.6} width={cell * 1.8} height={cell * 1.8} rx={4} fill="white" />
          <rect x={c * cell + cell} y={r * cell + cell} width={cell} height={cell} rx={2} fill="oklch(0.32 0.13 277)" />
        </g>
      ))}
    </svg>
  );
}
