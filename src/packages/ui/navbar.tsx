'use client';

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, ExternalLink, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { supabase } from "@/services/supabase/client";

const NAV_ITEMS = [
  { label: "Product",     href: "#product"     },
  { label: "Solutions",   href: "#solutions"   },
  { label: "Accessibility", href: "#accessibility" },
  { label: "Pricing",     href: "#pricing"     },
  { label: "Developers",  href: "#developers"  },
  { label: "Resources",   href: "#resources"   },
];

/* ─── Desktop Navbar ───────────────────────────────────────────── */
function DesktopNav({ scrolled }: { scrolled: boolean }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="hidden lg:flex items-center justify-between h-[72px] w-full">
      {/* Logo Section */}
      <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
        <motion.div
  whileHover={{ scale: 1.1, rotate: -5 }}
  whileTap={{ scale: 0.95 }}
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo to-cyan flex items-center justify-center shadow-lg group-hover:shadow-premium transition-all border border-white/20"
        >
          <span className="text-white font-black text-base tracking-tighter">T2</span>
        </motion.div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight text-foreground">Talk2Me</span>
        </div>
      </Link>

      {/* Navigation Links — Fixed in the center */}
      <div className="flex-1 flex justify-center">
        <nav className="flex items-center p-1.5 rounded-2xl bg-foreground/[0.03] border border-border/50 backdrop-blur-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 rounded-xl hover:bg-white dark:hover:bg-white/10 hover:shadow-sm group"
            >
              {item.label}
              <motion.span 
                 className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                 layoutId="nav-glow"
              />
            </Link>
          ))}
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {!loading && (
          <>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cyan opacity-70">Authenticated</span>
                  <button onClick={handleSignOut} className="text-[10px] font-bold text-muted-foreground hover:text-red-500 transition-colors uppercase mt-1">Sign Out</button>
                </div>
                <div className="size-10 rounded-xl bg-gradient-to-tr from-cyan to-indigo grid place-items-center text-white text-xs font-black ring-1 ring-white/20 shadow-lg">
                   {user.email?.slice(0, 2).toUpperCase()}
                </div>
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-foreground hover:bg-foreground/10 rounded-xl transition-all border border-border"
              >
                Log In
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Mobile Navbar ─────────────────────────────────────────────── */
function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, loading } = useAuth();
  
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={onClose}
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[85vw] max-w-[400px] bg-background shadow-2xl flex flex-col lg:hidden border-l border-border/50"
          >
            <div className="flex items-center justify-between p-7 border-b border-border/50">
            <Link href="/" onClick={onClose} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-cyan flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-sm">T2</span>
                </div>
                <span className="font-bold text-lg">Talk2Me</span>
              </Link>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-foreground/5">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-6 space-y-2">
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center justify-between p-5 text-lg font-bold rounded-2xl hover:bg-foreground/5 transition-all group"
                  >
                    {item.label}
                    <ArrowRight className="size-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="p-8 border-t border-border/50 space-y-4">
              {!loading && !user && (
                <Link
                  href="/auth"
                  onClick={onClose}
                  className="flex items-center justify-center gap-3 w-full py-5 text-lg font-bold rounded-3xl bg-card ring-1 ring-border shadow-sm"
                >
                  <LogIn className="size-5" />
                  Log In
                </Link>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Root Navbar ────────────────────────────────────────────────── */
export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // All hooks must run before any conditional return (React rules of hooks)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Hide completely inside meeting rooms — just like Google Meet / Zoom
  // This return must come AFTER all hooks above
  const isInRoom = pathname?.startsWith('/room/');
  if (isInRoom) return null;

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-500 px-4 sm:px-6 lg:px-8 py-3 lg:py-4 ${
          scrolled
            ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-border/50 shadow-2xl"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <DesktopNav scrolled={scrolled} />

          <div className="flex lg:hidden items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-cyan flex items-center justify-center shadow-md">
                <span className="text-white font-black text-sm">T2</span>
              </div>
              <span className="font-bold text-lg">Talk2Me</span>
            </Link>

            <button
              onClick={() => setMobileOpen(true)}
              className="p-2.5 rounded-xl bg-foreground/5"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="h-16 lg:h-[88px]" />
    </>
  );
}
