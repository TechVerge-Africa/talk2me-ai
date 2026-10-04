"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // ── 1. Global ChunkLoadError Auto-Recovery ──────────────────────────────
    // When a new deployment occurs, older browser tabs may request chunk hashes
    // that no longer exist on the server. Auto-reloading once seamlessly upgrades
    // the tab to the latest deployment.
    const handleChunkError = (message?: string, errorName?: string) => {
      const isChunkError =
        message?.includes("ChunkLoadError") ||
        message?.includes("Failed to load chunk") ||
        errorName === "ChunkLoadError";

      if (isChunkError) {
        const now = Date.now();
        const lastReload = Number(sessionStorage.getItem("chunk_reload_ts") || 0);
        // Throttle auto-reload to at most once per 15 seconds to prevent loops
        if (now - lastReload > 15000) {
          sessionStorage.setItem("chunk_reload_ts", String(now));
          console.warn("[PwaRegister] ChunkLoadError detected. Reloading page to load latest version...");
          window.location.reload();
        }
      }
    };

    const onError = (event: ErrorEvent) => {
      handleChunkError(event.message, event.error?.name);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const errorName = reason instanceof Error ? reason.name : undefined;
      handleChunkError(message, errorName);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    // ── 2. Service Worker Registration & Auto-Update ────────────────────────
    let cleanupLoadListener: (() => void) | undefined;

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const handleRegister = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          // Proactively check for service worker updates
          registration.update().catch(() => {});
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      };

      if (document.readyState === "complete") {
        handleRegister();
      } else {
        window.addEventListener("load", handleRegister);
        cleanupLoadListener = () => window.removeEventListener("load", handleRegister);
      }
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      if (cleanupLoadListener) cleanupLoadListener();
    };
  }, []);

  return null;
}
