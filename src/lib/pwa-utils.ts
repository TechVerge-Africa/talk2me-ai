/**
 * Utility functions for detecting the user's operating system, browser,
 * and PWA installation state.
 */

export type OperatingSystem = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'chromeos' | 'unknown';
export type Browser = 'chrome' | 'edge' | 'brave' | 'firefox' | 'safari' | 'samsung' | 'unknown';

/**
 * Detects the user's operating system based on userAgent and platform data.
 */
export function detectOS(): OperatingSystem {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent || '';
  const platform = (window.navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform || window.navigator.platform || '';

  // Android
  if (/android/i.test(userAgent)) {
    return 'android';
  }

  // iOS (iPhone / iPad / iPod)
  // iPadOS 13+ on Safari desktop-class browsing reports as "Macintosh" but has touch points
  const isIOS = 
    /iPhone|iPad|iPod/i.test(userAgent) || 
    (userAgent.includes('Macintosh') && window.navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    return 'ios';
  }

  // ChromeOS
  if (/CrOS/i.test(userAgent)) {
    return 'chromeos';
  }

  // Windows
  if (/win/i.test(platform) || /windows/i.test(userAgent)) {
    return 'windows';
  }

  // macOS
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(userAgent)) {
    return 'mac';
  }

  // Linux
  if (/linux/i.test(platform) || /linux/i.test(userAgent)) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Detects the user's browser based on navigator features and userAgent.
 */
export function detectBrowser(): Browser {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent || '';

  // Brave
  // Brave hides itself in userAgent to prevent fingerprinting, but exposes navigator.brave
  const isBrave = (window.navigator as Navigator & { brave?: unknown }).brave !== undefined;
  if (isBrave) {
    return 'brave';
  }

  // Samsung Internet
  if (/SamsungBrowser/i.test(userAgent)) {
    return 'samsung';
  }

  // Edge
  if (/Edg/i.test(userAgent) || /Edge/i.test(userAgent)) {
    return 'edge';
  }

  // Firefox
  if (/Firefox|FxiOS/i.test(userAgent)) {
    return 'firefox';
  }

  // Chrome (Make sure it's not Edge, Brave, Samsung or others that contain "Chrome" in userAgent)
  if (/Chrome|CriOS/i.test(userAgent)) {
    return 'chrome';
  }

  // Safari (Safari userAgent contains "Safari" but not "Chrome", "CriOS", "Edg", etc.)
  if (/Safari/i.test(userAgent) && !/Chrome|CriOS|Edg|SamsungBrowser/i.test(userAgent)) {
    return 'safari';
  }

  return 'unknown';
}

/**
 * Checks if the application is currently running in standalone (installed) mode.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandaloneMode || isIOSStandalone;
}

/**
 * Helper to check if the user is on a mobile operating system (Android or iOS).
 */
export function isMobile(): boolean {
  const os = detectOS();
  return os === 'android' || os === 'ios';
}
