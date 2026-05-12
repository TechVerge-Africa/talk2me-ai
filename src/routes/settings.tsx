import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Accessibility settings — SignBridge Live" },
      { name: "description", content: "Control caption size, contrast, motion, and translation language." },
    ],
  }),
  component: SettingsPage,
});

const LANGS = ["English", "Twi", "French", "ASL", "GSL"];

function SettingsPage() {
  const [size, setSize] = useState(2);
  const [contrast, setContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [lang, setLang] = useState("English");

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-5 py-10 lg:py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Adjust accessibility and translation preferences.</p>

        <div className="mt-8 space-y-3">
          <Row title="Caption size" hint={["Small", "Medium", "Large"][size - 1]}>
            <input type="range" min={1} max={3} value={size} onChange={(e) => setSize(+e.target.value)} className="w-40 accent-bridge-cyan" />
          </Row>
          <Row title="High contrast" hint={contrast ? "On" : "Off"}>
            <Toggle on={contrast} onChange={setContrast} />
          </Row>
          <Row title="Reduce motion" hint={reduceMotion ? "On" : "Off"}>
            <Toggle on={reduceMotion} onChange={setReduceMotion} />
          </Row>

          <div className="rounded-2xl bg-card ring-1 ring-border p-5">
            <div className="text-sm font-semibold mb-3">Translation language</div>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 h-9 rounded-full text-sm font-medium transition ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-5 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-12 h-7 rounded-full p-0.5 transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span className={`block size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}
