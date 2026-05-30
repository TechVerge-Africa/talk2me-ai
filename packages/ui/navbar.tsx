'use client';

import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 inset-x-0 z-[100] px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-card px-6 py-3 rounded-full border-white/20 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-xl bg-primary text-primary-foreground grid place-items-center text-xs font-bold shadow-bridge-sm transition-transform group-hover:scale-110">
            T2
          </div>
          <span className="font-bold tracking-tight text-foreground/90">Talk2Me <span className="text-bridge-cyan">AI</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Inclusive Tech", "Pricing", "About"].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/join" 
            className="hidden sm:block text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-muted transition-colors"
          >
            Join Room
          </Link>
          <Link 
            href="/create" 
            className="text-sm font-bold bg-primary text-primary-foreground px-6 py-2.5 rounded-full shadow-bridge-sm hover:opacity-90 transition-all active:scale-95"
          >
            Start Free
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
