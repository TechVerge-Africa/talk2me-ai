import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/packages/ui/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talk2Me AI - Real-time Sign & Speech Interpretation",
  description: "Bridge sign and speech with zero-latency AI interpretation. The inclusive standard for global collaboration. Real-time captions, sign-to-speech, and accessible meetings.",
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
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
