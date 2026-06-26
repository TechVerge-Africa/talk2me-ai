"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  Check, 
  WifiOff, 
  Flame, 
  RefreshCw, 
  Smartphone
} from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

// Default localization texts
const defaultLocalization = {
  title: "Install Talk2Me",
  subtitle: "Experience Talk2Me as a native application",
  installFor: "Install this app for:",
  features: {
    speed: { 
      title: "Faster Loading", 
      desc: "Launches instantly from your desktop or home screen with minimized latency." 
    },
    offline: { 
      title: "Offline Access", 
      desc: "Access essential services and rooms even with limited or no internet connection." 
    },
    native: { 
      title: "Native Experience", 
      desc: "Standalone borderless window, dedicated taskbar icon, and optimized gestures." 
    },
    updates: { 
      title: "Automatic Updates", 
      desc: "Receive new accessibility tools and features immediately without page refreshes." 
    },
  },
  btnInstall: "Install App",
  btnContinue: "Continue in Browser",
  btnGotIt: "Got It, Thanks",
  btnMaybeLater: "Maybe Later",
  iosTitle: "Install Talk2Me on iOS",
  iosInstructions: "To install Talk2Me on your iPhone or iPad, follow these simple steps using the Safari browser:",
  iosStep1: "Tap the Share button in Safari's bottom toolbar.",
  iosStep2: "Scroll down the menu and select 'Add to Home Screen'.",
  iosStep3: "Tap 'Add' in the top-right corner to finish installation.",
  toastSuccess: "Talk2Me installed successfully!"
};

export interface InstallAppPromptProps {
  appName?: string;
  appIcon?: string;
  localization?: Partial<typeof defaultLocalization>;
  onAnalyticsEvent?: (event: string, metadata?: Record<string, unknown>) => void;
  autoPromptDelay?: number;
}

export function InstallAppPrompt({
  appName = "Talk2Me",
  appIcon = "/assets/icon-192.png",
  localization = {},
  onAnalyticsEvent,
  autoPromptDelay = 2500
}: InstallAppPromptProps) {
  const {
    os,
    browser,
    isInstalled,
    isPromptOpen,
    showSuccessToast,
    install,
    dismissFor30Days,
    closePrompt,
    isMobile
  } = usePwaInstall({ onAnalyticsEvent, autoPromptDelay });

  const texts = { ...defaultLocalization, ...localization };
  const modalRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  // Focus Trapping and Escape Key handling
  useEffect(() => {
    if (!isPromptOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePrompt();
        return;
      }

      if (e.key !== "Tab") return;

      if (!modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex="0"]'
      );
      const focusable = Array.from(focusableElements).filter(
        (el) => !el.hasAttribute("disabled")
      ) as HTMLElement[];

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Trap focus to the primary CTA or first button
    if (modalRef.current) {
      const primaryBtn = modalRef.current.querySelector('[data-primary="true"]') as HTMLElement;
      if (primaryBtn) {
        primaryBtn.focus();
      } else {
        const firstBtn = modalRef.current.querySelector("button") as HTMLElement;
        firstBtn?.focus();
      }
    }

    // Lock body scroll
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isPromptOpen, closePrompt]);

  // If not open or already installed, render nothing (toast is handled independently)
  const shouldRenderModal = isPromptOpen && !isInstalled;

  const isIosSafari = os === "ios" && browser === "safari";

  return (
    <>
      {/* SUCCESS TOAST NOTIFICATION */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            style={{ zIndex: 9999 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-950 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 dark:border-zinc-200/80 w-[calc(100%-2rem)] max-w-md sm:w-auto"
            role="status"
            aria-live="polite"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-600">
              <Check className="h-4 w-4" strokeWidth={3} />
            </div>
            <p className="text-sm font-semibold tracking-wide">
              {texts.toastSuccess}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA INSTALLATION DIALOG MODAL */}
      <AnimatePresence>
        {shouldRenderModal && (
          <div 
            style={{ zIndex: 9999 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 sm:p-6"
          >
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePrompt}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm dark:bg-black/80"
              aria-hidden="true"
            />

            {/* Modal Card Content */}
            <motion.div
              ref={modalRef}
              initial={isMobile ? { y: "100%", opacity: 0 } : { scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={isMobile ? { y: "100%", opacity: 0 } : { scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col gap-5 sm:gap-6 max-h-[90vh] overflow-y-auto no-scrollbar"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-install-title"
              aria-describedby="pwa-install-description"
            >
              {/* Close Button */}
              <button
                onClick={closePrompt}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                aria-label="Close installation window"
              >
                <X className="h-5 w-5" />
              </button>

              {/* iOS Safari Layout */}
              {isIosSafari ? (
                <>
                  {/* Header */}
                  <div className="flex flex-col items-center text-center gap-3 mt-2">
                    {/* App Icon with aura */}
                    <div className="relative group mb-1">
                      <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 dark:bg-indigo-400/10 blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-xl">
                        {!imageError ? (
                          <Image
                            src={appIcon}
                            alt={`${appName} icon`}
                            width={64}
                            height={64}
                            className="h-full w-full rounded-[14px] bg-white object-cover"
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-indigo-600 text-white font-bold text-2xl">
                            {appName[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    <h2 
                      id="pwa-install-title" 
                      className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white"
                    >
                      {texts.iosTitle}
                    </h2>
                    <p 
                      id="pwa-install-description" 
                      className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm"
                    >
                      {texts.iosInstructions}
                    </p>
                  </div>

                  {/* Step Instructions Grid */}
                  <div className="flex flex-col gap-4 py-2">
                    {/* Step 1 */}
                    <div className="flex gap-4 items-start bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        1
                      </div>
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 flex-wrap">
                          {texts.iosStep1}
                        </p>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          Looking for the Share icon: <Share className="h-3.5 w-3.5 inline text-indigo-500" />
                        </span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 items-start bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        2
                      </div>
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {texts.iosStep2}
                        </p>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          Scroll down and tap: <PlusSquare className="h-3.5 w-3.5 inline text-indigo-500" />
                        </span>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 items-start bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        3
                      </div>
                      <div className="flex flex-col gap-1 pt-0.5">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {texts.iosStep3}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* iOS Actions */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    <button
                      onClick={dismissFor30Days}
                      data-primary="true"
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 text-sm cursor-pointer"
                    >
                      {texts.btnGotIt}
                    </button>
                    <button
                      onClick={dismissFor30Days}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors focus:outline-none"
                    >
                      {texts.btnContinue}
                    </button>
                  </div>
                </>
              ) : (
                /* Native PWA Installation Layout */
                <>
                  {/* Header info */}
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-4 mt-2">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                      {/* App Icon */}
                      <div className="relative group shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 dark:bg-indigo-400/10 blur-xl group-hover:blur-2xl transition-all duration-300" />
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-xl">
                          {!imageError ? (
                            <Image
                              src={appIcon}
                              alt={`${appName} icon`}
                              width={56}
                              height={56}
                              className="h-full w-full rounded-[14px] bg-white object-cover"
                              onError={() => setImageError(true)}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-indigo-600 text-white font-bold text-xl">
                              {appName[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Titles */}
                      <div className="flex flex-col gap-0.5">
                        <h2 
                          id="pwa-install-title" 
                          className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white"
                        >
                          {texts.title}
                        </h2>
                        <p 
                          id="pwa-install-description" 
                          className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          {texts.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Key Benefits List */}
                  <div className="flex flex-col gap-3 py-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                      {texts.installFor}
                    </span>

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Benefit 1 */}
                      <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/70 transition-colors">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {texts.features.speed.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {texts.features.speed.desc}
                          </p>
                        </div>
                      </div>

                      {/* Benefit 2 */}
                      <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/70 transition-colors">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <WifiOff className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {texts.features.offline.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {texts.features.offline.desc}
                          </p>
                        </div>
                      </div>

                      {/* Benefit 3 */}
                      <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/70 transition-colors">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {texts.features.native.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {texts.features.native.desc}
                          </p>
                        </div>
                      </div>

                      {/* Benefit 4 */}
                      <div className="flex gap-3 items-start p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/70 transition-colors">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        </div>
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {texts.features.updates.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {texts.features.updates.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={install}
                      data-primary="true"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 text-sm cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      {texts.btnInstall}
                    </motion.button>
                    <button
                      onClick={dismissFor30Days}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors focus:outline-none"
                    >
                      {texts.btnContinue}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
