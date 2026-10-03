'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type AutoPipConsent = 'prompt' | 'granted' | 'denied';

export interface UsePictureInPictureReturn {
  isDocumentPipSupported: boolean;
  isDesktop: boolean;
  isPipActive: boolean;
  pipWindow: Window | null;
  openPip: () => Promise<boolean>;
  closePip: () => void;
  togglePip: () => Promise<void>;
  returnToMeeting: () => void;
  isFloatingFallback: boolean;
  setIsFloatingFallback: (val: boolean) => void;
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
 * Includes smart progressive consent: only auto-opens on desktop when the user has
 * explicitly granted permission, preventing unexpected popups and prompt fatigue.
 */
export function usePictureInPicture(code: string): UsePictureInPictureReturn {
  const [isDocumentPipSupported, setIsDocumentPipSupported] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isFloatingFallback, setIsFloatingFallback] = useState(false);
  const [autoPipConsent, setAutoPipConsent] = useState<AutoPipConsent>('prompt');

  const pipWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDocPip = 'documentPictureInPicture' in window;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isDesktopEnvironment = isDocPip && !isMobileDevice;
      
      setIsDocumentPipSupported(isDocPip);
      setIsDesktop(isDesktopEnvironment);

      try {
        const storedConsent = localStorage.getItem('talk2me_auto_pip_consent') as AutoPipConsent | null;
        if (storedConsent === 'granted' || storedConsent === 'denied') {
          setAutoPipConsent(storedConsent);
        } else if (isMobileDevice) {
          // On mobile devices, default to denied (no Document PiP support)
          setAutoPipConsent('denied');
        } else {
          setAutoPipConsent('prompt');
        }
      } catch {
        setAutoPipConsent('prompt');
      }
    }
  }, []);

  const grantAutoPipConsent = useCallback(() => {
    setAutoPipConsent('granted');
    try {
      localStorage.setItem('talk2me_auto_pip_consent', 'granted');
    } catch {}
  }, []);

  const denyAutoPipConsent = useCallback(() => {
    setAutoPipConsent('denied');
    try {
      localStorage.setItem('talk2me_auto_pip_consent', 'denied');
    } catch {}
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

    targetWindow.document.body.className = `${document.body.className} bg-[#080a0f] text-white m-0 p-0 overflow-hidden font-sans select-none`;
    targetWindow.document.body.style.height = '100%';
    targetWindow.document.body.style.width = '100%';
    targetWindow.document.body.style.margin = '0';
    targetWindow.document.body.style.padding = '0';
    targetWindow.document.body.style.backgroundColor = '#080a0f';
    targetWindow.document.body.style.overflow = 'hidden';
    targetWindow.document.title = `Talk2Me Mini • #${code}`;
  }, [code]);

  const openPip = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    // A. Native Document Picture-in-Picture (Chromium: Chrome, Edge, Brave, Opera)
    if ('documentPictureInPicture' in window) {
      try {
        // Close existing window if any
        if (pipWindowRef.current) {
          pipWindowRef.current.close();
          pipWindowRef.current = null;
        }

        const win = await (window as any).documentPictureInPicture.requestWindow({
          width: 380,
          height: 240,
          disallowReturnToOpener: false,
        });

        copyStylesToPipWindow(win);

        win.addEventListener('pagehide', () => {
          setIsPipActive(false);
          setPipWindow(null);
          pipWindowRef.current = null;
        });

        pipWindowRef.current = win;
        setPipWindow(win);
        setIsPipActive(true);
        setIsFloatingFallback(false);
        return true;
      } catch (err) {
        console.warn('[Talk2Me] Document PiP failed or denied, using in-app floating mode:', err);
      }
    }

    // B. Fallback: In-app floating mini meeting tile
    setIsFloatingFallback(true);
    setIsPipActive(true);
    return true;
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
  }, []);

  const returnToMeeting = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.focus();
    }
    closePip();
  }, [closePip]);

  const togglePip = useCallback(async () => {
    if (isPipActive) {
      closePip();
    } else {
      await openPip();
    }
  }, [isPipActive, closePip, openPip]);

  const autoOpenedRef = useRef(false);

  // 1. Browser-native MediaSession automatic Picture-in-Picture trigger (Chrome 120+)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!isDesktop || autoPipConsent !== 'granted') return;

    try {
      navigator.mediaSession.setActionHandler('enterpictureinpicture' as any, async () => {
        autoOpenedRef.current = true;
        await openPip();
      });
    } catch {
      // not supported in all browsers
    }
  }, [openPip, isDesktop, autoPipConsent]);

  // 2. Automatic Picture-in-Picture on tab switch / window blur / backgrounding
  // Only activates on desktop when the user has explicitly granted permission
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Only automatically pop open Mini View if on Desktop and permission was explicitly granted
        if (isDesktop && autoPipConsent === 'granted' && !pipWindowRef.current) {
          autoOpenedRef.current = true;
          await openPip();
        }
      } else if (document.visibilityState === 'visible') {
        // User returned to the meeting tab
        // Automatically restore full room view and close the mini floating window!
        if (autoOpenedRef.current && pipWindowRef.current) {
          autoOpenedRef.current = false;
          closePip();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [openPip, closePip, isDesktop, autoPipConsent]);

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
    autoPipConsent,
    grantAutoPipConsent,
    denyAutoPipConsent,
  };
}
