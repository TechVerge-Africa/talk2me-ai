'use client';

import { useState, useEffect } from 'react';

/**
 * HCI Debounced Loading Hook
 * 
 * Prevents "flicker of death" on fast network transitions (<200ms).
 * Only transitions to true if isLoading remains true after debounceMs.
 * Once triggered, ensures the loader remains visible for a minimum duration
 * (minDisplayMs = 300ms) to avoid high-frequency visual stuttering.
 */
export function useDebouncedLoader(
  isLoading: boolean,
  debounceMs = 200,
  minDisplayMs = 300
): boolean {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let minDisplayTimer: ReturnType<typeof setTimeout> | undefined;

    if (isLoading) {
      debounceTimer = setTimeout(() => {
        setShowLoader(true);
      }, debounceMs);
    } else {
      if (!showLoader) {
        clearTimeout(debounceTimer);
      } else {
        minDisplayTimer = setTimeout(() => {
          setShowLoader(false);
        }, minDisplayMs);
      }
    }

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(minDisplayTimer);
    };
  }, [isLoading, debounceMs, minDisplayMs, showLoader]);

  return showLoader;
}
