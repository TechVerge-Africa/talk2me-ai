import { useEffect, useRef } from "react";
import type { CaptionLine } from "@/lib/mock/transcript";

export function CaptionStream({ lines, size = "md" }: { lines: CaptionLine[]; size?: "sm" | "md" | "lg" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const textSize = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div ref={ref} className="flex-1 overflow-y-auto pr-1 space-y-5">
      {lines.map((line) => {
        const isAI = line.speaker === "AI";
        const isSign = line.modality === "sign";
        return (
          <div key={line.id} className="space-y-1 animate-caption-in">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>{line.ts}</span>
              <span>·</span>
              <span className={isAI ? "text-bridge-cyan" : isSign ? "text-bridge-indigo" : ""}>
                {line.speaker} {isSign ? "(signed)" : isAI ? "(assist)" : ""}
              </span>
              {line.translated && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-bridge-indigo/10 text-bridge-indigo text-[9px]">TRANSLATED</span>
              )}
            </div>
            <p
              className={`${textSize} leading-relaxed text-pretty ${
                isSign ? "font-medium text-foreground" : isAI ? "italic text-muted-foreground" : "text-foreground/90"
              }`}
            >
              {line.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
