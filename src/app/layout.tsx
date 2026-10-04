import type { Metadata, Viewport } from "next";
import { Navbar } from "@/packages/ui/navbar";
import { PwaRegister } from "@/components/pwa-register";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Talk2Me — Sovereign Communication for African Schools, Governments & Organizations",
  description:
    "Built for African accents, resilient on low networks, and self-hosted on your own servers for total data sovereignty. Engineered for schools, governments, and organizations.",
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
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function reloadOnce() {
                  var last = sessionStorage.getItem('chunk_reload_ts');
                  var now = Date.now();
                  if (!last || now - Number(last) > 10000) {
                    sessionStorage.setItem('chunk_reload_ts', String(now));
                    window.location.reload();
                  }
                }
                window.addEventListener('error', function(e) {
                  var msg = (e && e.message) || '';
                  if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Failed to load chunk') !== -1) {
                    reloadOnce();
                  }
                });
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = (e && e.reason && (e.reason.message || e.reason.stack || String(e.reason))) || '';
                  if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Failed to load chunk') !== -1) {
                    reloadOnce();
                  }
                });
              })();
            `,
          }}
        />
      </head>
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
