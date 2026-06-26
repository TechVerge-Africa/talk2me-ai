import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/packages/ui/navbar";
import { PwaRegister } from "@/components/pwa-register";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0d0e12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Talk2Me — The AI-Powered Communication Platform",
  description:
    "Meet, stream, collaborate, and communicate without barriers. Real-time captions, live translation, AI meeting assistance, accessibility tools, and intelligent communication built into every conversation.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Talk2Me",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background selection:bg-bridge-cyan/30">
        <PwaRegister />
        <InstallAppPrompt />
        <Navbar />
        {children}
      </body>
    </html>
  );
}

