"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { detectOS, detectBrowser, isStandalone, isMobile, OperatingSystem, Browser } from '@/lib/pwa-utils';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface UsePwaInstallOptions {
  onAnalyticsEvent?: (event: string, metadata?: Record<string, unknown>) => void;
  autoPromptDelay?: number; // Time in ms before showing prompt
}

export function usePwaInstall(options: UsePwaInstallOptions = {}) {
  const { onAnalyticsEvent, autoPromptDelay = 2500 } = options;

  const [os, setOs] = useState<OperatingSystem>('unknown');
  const [browser, setBrowser] = useState<Browser>('unknown');
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isPromptOpen, setIsPromptOpen] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local storage and Session storage keys for suppression
  const STORAGE_KEY = 'pwa-install-prompt-dismissed-at';
  const SESSION_STORAGE_KEY = 'pwa-install-prompt-session-dismissed';

  const logAnalytics = useCallback((event: string, metadata?: Record<string, unknown>) => {
    if (onAnalyticsEvent) {
      onAnalyticsEvent(event, metadata);
    } else {
      console.log(`[PWA Analytics] Event: "${event}"`, metadata || {});
    }
  }, [onAnalyticsEvent]);

  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const triggerSuccessToast = useCallback(() => {
    setShowSuccessToast(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  }, []);

  // Save 30-day dismissal to localStorage
  const dismissFor30Days = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setIsPromptOpen(false);
      logAnalytics('Continue in Browser clicked', { os, browser });
    } catch (e) {
      console.error('Failed to save PWA dismissal to localStorage:', e);
    }
  }, [os, browser, logAnalytics]);

  // Save session-only dismissal
  const dismissForSession = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
      setIsPromptOpen(false);
      logAnalytics('Install dismissed', { os, browser });
    } catch (e) {
      console.error('Failed to save PWA dismissal to sessionStorage:', e);
    }
  }, [os, browser, logAnalytics]);

  const closePrompt = useCallback(() => {
    setIsPromptOpen(false);
    logAnalytics('Prompt closed', { os, browser });
  }, [os, browser, logAnalytics]);

  // Check if we are within the 30-day cooldown or session suppression
  const checkDismissalCooldown = useCallback((): boolean => {
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const diff = Date.now() - parseInt(dismissedAt, 10);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (diff < thirtyDays) {
          return true; // Still in cooldown
        }
      }

      const sessionDismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionDismissed === 'true') {
        return true; // Still in session cooldown
      }
    } catch (e) {
      console.error('Failed to check PWA dismissal status:', e);
    }
    return false;
  }, []);

  // Reset the dismissal preference (useful for testing/debugging)
  const resetDismissal = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      // Re-evaluate eligibility
      const installed = isStandalone();
      setIsInstalled(installed);
      if (!installed) {
        const detectedOs = detectOS();
        const detectedBrowser = detectBrowser();
        const iosSafari = detectedOs === 'ios' && detectedBrowser === 'safari';
        setIsInstallable(deferredPromptRef.current !== null || iosSafari);
      }
    } catch (e) {
      console.error('Failed to reset PWA dismissal:', e);
    }
  }, []);

  const install = useCallback(async () => {
    logAnalytics('Install clicked', { os, browser });

    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      // For iOS Safari or other platforms where prompt is manually guided
      if (os === 'ios' && browser === 'safari') {
        // iOS installation is manual, guided in UI.
        return;
      }
      console.warn('Install called but beforeinstallprompt deferredPrompt is not available');
      return;
    }

    try {
      // Trigger native browser prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        logAnalytics('Install accepted', { os, browser });
        setIsInstalled(true);
        setIsPromptOpen(false);
        triggerSuccessToast();
      } else {
        logAnalytics('Install dismissed', { os, browser });
        // Cooldown for session if native prompt dismissed
        dismissForSession();
      }
    } catch (error) {
      console.error('PWA installation error:', error);
    } finally {
      // Clear deferred prompt since it can only be used once
      deferredPromptRef.current = null;
      setIsInstallable(false);
    }
  }, [os, browser, logAnalytics, dismissForSession, triggerSuccessToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect system info
    const detectedOs = detectOS();
    const detectedBrowser = detectBrowser();
    const installed = isStandalone();

    // Defer setting state to prevent synchronous execution warning
    const frameId = requestAnimationFrame(() => {
      setOs(detectedOs);
      setBrowser(detectedBrowser);
      setIsInstalled(installed);
    });

    if (installed) {
      return () => cancelAnimationFrame(frameId);
    }

    // Check if dismissed before
    const hasCooldown = checkDismissalCooldown();
    let autoPromptTimer: NodeJS.Timeout | null = null;

    // Event listener for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);

      // Automatically open the prompt if no cooldown exists
      if (!hasCooldown) {
        autoPromptTimer = setTimeout(() => {
          setIsPromptOpen(true);
          logAnalytics('Prompt shown', { os: detectedOs, browser: detectedBrowser, type: 'native' });
        }, autoPromptDelay);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Event listener for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsPromptOpen(false);
      triggerSuccessToast();
      logAnalytics('Install accepted', { os: detectedOs, browser: detectedBrowser, type: 'appinstalled' });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Special logic for iOS Safari (does not support beforeinstallprompt)
    let iosTimer: NodeJS.Timeout | null = null;
    if (detectedOs === 'ios' && detectedBrowser === 'safari' && !installed && !hasCooldown) {
      setIsInstallable(true);
      iosTimer = setTimeout(() => {
        setIsPromptOpen(true);
        logAnalytics('Prompt shown', { os: detectedOs, browser: detectedBrowser, type: 'ios-safari' });
      }, autoPromptDelay);
    }

    return () => {
      cancelAnimationFrame(frameId);
      if (autoPromptTimer) clearTimeout(autoPromptTimer);
      if (iosTimer) clearTimeout(iosTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkDismissalCooldown, autoPromptDelay, logAnalytics, triggerSuccessToast]);

  return {
    os,
    browser,
    isInstalled,
    isInstallable,
    isPromptOpen,
    showSuccessToast,
    setIsPromptOpen,
    install,
    dismissFor30Days,
    dismissForSession,
    closePrompt,
    resetDismissal,
    isMobile: isMobile()
  };
}
