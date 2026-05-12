import { useEffect, useState } from "react";

export type CaptionLine = {
  id: string;
  speaker: "Sarah" | "David" | "AI";
  modality: "voice" | "sign";
  text: string;
  translated?: boolean;
  ts: string;
};

const SCRIPT: Omit<CaptionLine, "id" | "ts">[] = [
  { speaker: "David", modality: "voice", text: "Hey Sarah, can you hear the captions on your end?" },
  { speaker: "Sarah", modality: "sign", text: "Yes, the translation feels instant today.", translated: true },
  { speaker: "David", modality: "voice", text: "Great. Let's go over the timeline for the launch." },
  { speaker: "Sarah", modality: "sign", text: "Tuesday works for me. I'll prepare the demo.", translated: true },
  { speaker: "AI", modality: "voice", text: "Suggested reply: \"Sounds perfect, see you Tuesday.\"" },
  { speaker: "David", modality: "voice", text: "Sounds perfect, see you Tuesday." },
  { speaker: "Sarah", modality: "sign", text: "Thank you for making this so easy.", translated: true },
];

function nowTs() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function useMockTranscript(intervalMs = 3200) {
  const [lines, setLines] = useState<CaptionLine[]>([
    { id: "seed", speaker: "AI", modality: "voice", text: "Bridge connected. Listening…", ts: nowTs() },
  ]);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      const item = SCRIPT[i % SCRIPT.length];
      setLines((prev) => [
        ...prev.slice(-12),
        { ...item, id: `${Date.now()}-${i}`, ts: nowTs() },
      ]);
      i++;
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return lines;
}
