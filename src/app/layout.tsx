import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Navbar } from "@/packages/ui/navbar";
import { PwaRegister } from "@/components/pwa-register";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Talk2Me — Connected Workspace for Meetings, Chat & AI",
  description:
    "Meet, chat, and work with AI in one connected workspace. Talk2Me keeps your team's conversations together so you can continue where you left off.",
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
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-indigo-600/30 transition-colors duration-200">
        <ThemeProvider>
          <PwaRegister />
          <InstallAppPrompt />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


