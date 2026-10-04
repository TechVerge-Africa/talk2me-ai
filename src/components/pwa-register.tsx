"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // ── 1. Global ChunkLoadError & Service Worker Auto-Recovery ─────────────
    // When a new deployment occurs or an older Service Worker rejects chunk/RSC
    // requests, this listener purges old caches, force-updates the worker, and
    // reloads the page to seamlessly recover the user session.
    const handleChunkError = async (message?: string, errorName?: string) => {
      const isChunkOrFetchError =
        message?.includes("ChunkLoadError") ||
        message?.includes("Failed to load chunk") ||
        message?.includes("Failed to fetch") ||
        errorName === "ChunkLoadError";

      if (isChunkOrFetchError) {
        const now = Date.now();
        const lastReload = Number(sessionStorage.getItem("chunk_reload_ts") || 0);

        // Throttle auto-reload to at most once per 10 seconds to avoid infinite loops
        if (now - lastReload > 10000) {
          sessionStorage.setItem("chunk_reload_ts", String(now));
          console.warn("[PwaRegister] Chunk / Fetch error detected. Purging old cache and refreshing...");

          try {
            // Delete old caches
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(
                keys.map((key) => {
                  if (key !== "talk2me-cache-v3") {
                    return caches.delete(key);
                  }
                })
              );
            }

            // Force update service workers
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.update().catch(() => {})));
            }
          } catch {
            // Ignore cleanup failures
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

    // ── 2. Service Worker Registration, Update & Cache Sanitization ─────────
    let cleanupLoadListener: (() => void) | undefined;

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const handleRegister = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          // Proactively check for service worker updates immediately
          await registration.update();
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      };

      // Clean obsolete caches on startup
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key === "talk2me-cache-v1" || key === "talk2me-cache-v2") {
              caches.delete(key).catch(() => {});
            }
          });
        }).catch(() => {});
      }

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
