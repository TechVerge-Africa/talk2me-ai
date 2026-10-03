'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePictureInPictureReturn {
  isDocumentPipSupported: boolean;
  isPipActive: boolean;
  pipWindow: Window | null;
  openPip: () => Promise<boolean>;
  closePip: () => void;
  togglePip: () => Promise<void>;
  returnToMeeting: () => void;
  isFloatingFallback: boolean;
  setIsFloatingFallback: (val: boolean) => void;
}

/**
 * usePictureInPicture Hook
 * 
 * Manages native desktop Document Picture-in-Picture window for Chrome / Edge / Brave / Opera,
 * allowing users to multitask across Google Docs, VS Code, Slack, etc., while keeping the
 * Talk2Me Mini View always-on-top with active speaker video and interactive controls.
 * 
 * If Document PiP is unsupported (Safari, Firefox), gracefully falls back to an in-app
 * floating mini meeting tile.
 */
export function usePictureInPicture(code: string): UsePictureInPictureReturn {
  const [isDocumentPipSupported, setIsDocumentPipSupported] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isFloatingFallback, setIsFloatingFallback] = useState(false);

  const pipWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDocumentPipSupported('documentPictureInPicture' in window);
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

    // 2. Mirror document body classes for theme / dark mode
    targetWindow.document.body.className = `${document.body.className} bg-[#0a0c10] text-white m-0 p-0 overflow-hidden font-sans select-none`;
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
          width: 360,
          height: 250,
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
    isPipActive,
    pipWindow,
    openPip,
    closePip,
    togglePip,
    returnToMeeting,
    isFloatingFallback,
    setIsFloatingFallback,
  };
}
