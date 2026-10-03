'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type AutoPipConsent = 'prompt' | 'granted' | 'denied';

export interface UsePictureInPictureOptions {
  isScreenSharing?: boolean;
}

export interface UsePictureInPictureReturn {
  isDocumentPipSupported: boolean;
  isDesktop: boolean;
  isPipActive: boolean;
  pipWindow: Window | null;
  openPip: (isManual?: boolean) => Promise<boolean>;
  closePip: () => void;
  togglePip: () => Promise<void>;
  returnToMeeting: () => void;
  isFloatingFallback: boolean;
  setIsFloatingFallback: (val: boolean) => void;
  autoPipEnabled: boolean;
  setAutoPipEnabled: (enabled: boolean) => void;
  toggleAutoPip: () => void;
  autoPipConsent: AutoPipConsent;
  grantAutoPipConsent: () => void;
  denyAutoPipConsent: () => void;
}

/**
 * usePictureInPicture Hook
 * 
 * Manages native desktop Document Picture-in-Picture window for Chrome / Edge / Brave / Opera,
 * allowing users to multitask across Google Docs, VS Code, Slack, etc., while keeping the
 * Talk2Me Mini View always-on-top with active speaker video and interactive controls.
 * 
 * HCI Principles:
 * 1. Zero-interruption departure: Automatically pops out on tab leave if auto-PiP is enabled.
 * 2. Ghosting return: Automatically closes itself when returning to the meeting tab.
 * 3. User freedom & control: Can be toggled on/off in the meeting dock at any time.
 */
export function usePictureInPicture(
  code: string,
  options?: UsePictureInPictureOptions
): UsePictureInPictureReturn {
  const [isDocumentPipSupported, setIsDocumentPipSupported] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isFloatingFallback, setIsFloatingFallback] = useState(false);

  // Preference: auto-open on tab switch (Enabled by default on desktop)
  const [autoPipEnabled, setAutoPipEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('talk2me_auto_pip_enabled');
      if (stored !== null) return stored === 'true';
      const consent = localStorage.getItem('talk2me_auto_pip_consent');
      if (consent === 'denied') return false;
      return true;
    } catch {
      return true;
    }
  });

  const [autoPipConsent, setAutoPipConsent] = useState<AutoPipConsent>(() => {
    return autoPipEnabled ? 'granted' : 'denied';
  });

  const setAutoPipEnabled = useCallback((enabled: boolean) => {
    setAutoPipEnabledState(enabled);
    setAutoPipConsent(enabled ? 'granted' : 'denied');
    try {
      localStorage.setItem('talk2me_auto_pip_enabled', enabled ? 'true' : 'false');
      localStorage.setItem('talk2me_auto_pip_consent', enabled ? 'granted' : 'denied');
    } catch {}
  }, []);

  const toggleAutoPip = useCallback(() => {
    setAutoPipEnabledState((prev) => {
      const next = !prev;
      setAutoPipConsent(next ? 'granted' : 'denied');
      try {
        localStorage.setItem('talk2me_auto_pip_enabled', next ? 'true' : 'false');
        localStorage.setItem('talk2me_auto_pip_consent', next ? 'granted' : 'denied');
      } catch {}
      return next;
    });
  }, []);

  const grantAutoPipConsent = useCallback(() => {
    setAutoPipEnabled(true);
  }, [setAutoPipEnabled]);

  const denyAutoPipConsent = useCallback(() => {
    setAutoPipEnabled(false);
  }, [setAutoPipEnabled]);

  const pipWindowRef = useRef<Window | null>(null);
  const autoOpenedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDocPip = 'documentPictureInPicture' in window;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isDesktopEnvironment = isDocPip && !isMobileDevice;
      
      setIsDocumentPipSupported(isDocPip);
      setIsDesktop(isDesktopEnvironment);
    }
  }, []);

  const copyStylesToPipWindow = useCallback((targetWindow: Window) => {
    // 1. Copy all stylesheets and inline style blocks
    Array.from(document.styleSheets).forEach((styleSheet) => {
      try {
        if (styleSheet.cssRules) {
          const newStyle = targetWindow.document.createElement('style');
          Array.from(styleSheet.cssRules).forEach((rule) => {
            newStyle.appendChild(targetWindow.document.createTextNode(rule.cssText));
          });
          targetWindow.document.head.appendChild(newStyle);
        }
      } catch {
        // Cross-origin stylesheet: copy as link element
        if (styleSheet.href) {
          const link = targetWindow.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          targetWindow.document.head.appendChild(link);
        }
      }
    });

    // 2. Inject global PiP viewport resets to guarantee dark mode and prevent white background gaps
    const resetStyle = targetWindow.document.createElement('style');
    resetStyle.textContent = `
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        height: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #080a0f !important;
        overflow: hidden !important;
        color: #ffffff;
      }
    `;
    targetWindow.document.head.appendChild(resetStyle);

    // 3. Mirror document body classes and configure dark theme on html & body
    targetWindow.document.documentElement.classList.add('dark');
    targetWindow.document.documentElement.style.height = '100%';
    targetWindow.document.documentElement.style.width = '100%';
    targetWindow.document.documentElement.style.backgroundColor = '#080a0f';
    targetWindow.document.documentElement.style.overflow = 'hidden';

    targetWindow.document.body.className = 'dark bg-[#080a0f] text-white m-0 p-0 overflow-hidden font-sans select-none w-full h-full';
    targetWindow.document.body.style.height = '100%';
    targetWindow.document.body.style.width = '100%';
    targetWindow.document.body.style.margin = '0';
    targetWindow.document.body.style.padding = '0';
    targetWindow.document.body.style.backgroundColor = '#080a0f';
    targetWindow.document.body.style.overflow = 'hidden';
    targetWindow.document.title = `Talk2Me Mini • #${code}`;
  }, [code]);

  const openPip = useCallback(async (isManual = false): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    if (isManual) {
      autoOpenedRef.current = false;
    }

    // A. Native Document Picture-in-Picture (Chromium: Chrome, Edge, Brave, Opera)
    if ('documentPictureInPicture' in window) {
      try {
        // If window already exists and is not closed, bring to front
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.focus();
          return true;
        }

        const win = await (window as any).documentPictureInPicture.requestWindow({
          width: 380,
          height: 240,
          disallowReturnToOpener: false,
        });

        // Set state immediately so React portal mounts without delay
        pipWindowRef.current = win;
        setPipWindow(win);
        setIsPipActive(true);
        setIsFloatingFallback(false);

        const handleClose = () => {
          setIsPipActive(false);
          setPipWindow(null);
          pipWindowRef.current = null;
          setIsFloatingFallback(false);
          autoOpenedRef.current = false;
        };

        win.addEventListener('pagehide', handleClose);
        win.addEventListener('unload', handleClose);
        win.addEventListener('beforeunload', handleClose);

        try {
          copyStylesToPipWindow(win);
        } catch (styleErr) {
          console.warn('[Talk2Me] Failed copying styles to PiP window:', styleErr);
        }

        return true;
      } catch (err) {
        console.warn('[Talk2Me] Document PiP request failed:', err);
      }
    }

    // B. Fallback: Only open in-app floating mini meeting tile if document is visible
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      setIsFloatingFallback(true);
      setIsPipActive(true);
      return true;
    }

    return false;
  }, [copyStylesToPipWindow]);

  const closePip = useCallback(() => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch {}
      pipWindowRef.current = null;
    }
    setPipWindow(null);
    setIsPipActive(false);
    setIsFloatingFallback(false);
    autoOpenedRef.current = false;
  }, []);

  const returnToMeeting = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.focus();
    }
    closePip();
  }, [closePip]);

  const togglePip = useCallback(async () => {
    if (isPipActive) {
      // If window was closed externally by the user, pipWindowRef.current.closed might be true
      if (pipWindowRef.current && pipWindowRef.current.closed) {
        closePip();
        await openPip(true);
      } else {
        closePip();
      }
    } else {
      await openPip(true);
    }
  }, [isPipActive, closePip, openPip]);

  // 1. Browser-native MediaSession automatic Picture-in-Picture trigger (Chrome 120+)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!isDesktop || !autoPipEnabled || options?.isScreenSharing) return;

    try {
      navigator.mediaSession.setActionHandler('enterpictureinpicture' as any, async () => {
        console.info('[Talk2Me] MediaSession auto PiP triggered by browser');
        autoOpenedRef.current = true;
        await openPip(false);
      });
      return () => {
        try {
          navigator.mediaSession.setActionHandler('enterpictureinpicture' as any, null);
        } catch {}
      };
    } catch {
      // not supported in all browsers
    }
  }, [openPip, isDesktop, autoPipEnabled, options?.isScreenSharing]);

  // 2. Automatic Picture-in-Picture on tab switch / window blur / backgrounding
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Attempt auto PiP if on Desktop, enabled, not screen sharing, and not already open
        if (isDesktop && autoPipEnabled && !options?.isScreenSharing && !pipWindowRef.current) {
          autoOpenedRef.current = true;
          try {
            await openPip(false);
          } catch {
            // Ignored if browser blocks background requestWindow without gesture
          }
        }
      } else if (document.visibilityState === 'visible') {
        // User returned to the meeting tab
        // If it was opened automatically upon tab departure, cleanly restore full meeting!
        if (autoOpenedRef.current && pipWindowRef.current) {
          autoOpenedRef.current = false;
          closePip();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [openPip, closePip, isDesktop, autoPipEnabled, options?.isScreenSharing]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        try {
          pipWindowRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    isDocumentPipSupported,
    isDesktop,
    isPipActive,
    pipWindow,
    openPip,
    closePip,
    togglePip,
    returnToMeeting,
    isFloatingFallback,
    setIsFloatingFallback,
    autoPipEnabled,
    setAutoPipEnabled,
    toggleAutoPip,
    autoPipConsent,
    grantAutoPipConsent,
    denyAutoPipConsent,
  };
}
