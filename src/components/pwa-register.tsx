"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // ── 1. Global ChunkLoadError Auto-Recovery ──────────────────────────────
    const handleChunkError = (message?: string, errorName?: string) => {
      const isChunkOrFetchError =
        message?.includes("ChunkLoadError") ||
        message?.includes("Failed to load chunk") ||
        errorName === "ChunkLoadError";

      if (isChunkOrFetchError) {
        const now = Date.now();
        const lastReload = Number(sessionStorage.getItem("chunk_reload_ts") || 0);

        if (now - lastReload > 10000) {
          sessionStorage.setItem("chunk_reload_ts", String(now));
          console.warn("[PwaRegister] ChunkLoadError detected. Purging caches and reloading...");

          if ("caches" in window) {
            caches.keys().then((keys) => {
              keys.forEach((k) => caches.delete(k));
            }).catch(() => {});
          }

          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              regs.forEach((r) => r.unregister());
            }).catch(() => {});
          }

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

    // ── 2. Force Clean Obsolete Service Workers & CacheStorage ──────────────
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        for (const reg of registrations) {
          console.log("[PwaRegister] Cleaning obsolete Service Worker registration...");
          await reg.unregister();
        }
      }).catch((err) => {
        console.warn("[PwaRegister] Failed to unregister workers:", err);
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            console.log("[PwaRegister] Deleting obsolete cache:", key);
            caches.delete(key);
          });
        }).catch(() => {});
      }
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
