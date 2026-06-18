import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/Toaster";
import { PushNotificationManager } from "@/components/PushNotificationManager";

export const metadata: Metadata = {
  title: "DormDAO Portfolio Dashboard",
  description: "Crypto investment portfolio tracker for the DormDAO student investment DAO across 17 universities",
  openGraph: {
    title: "DormDAO Portfolio Dashboard",
    description: "Track DormDAO crypto portfolio performance across 17 universities",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark overflow-x-hidden" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.className=t;}catch(e){document.documentElement.className='dark';}})();` }} />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='12' fill='%231D9E75'/><text x='50' y='68' font-family='Arial' font-size='44' font-weight='bold' text-anchor='middle' fill='white'>DD</text></svg>"
        />
      </head>
      <body className="min-h-screen bg-[#0a0a0a] text-gray-100 antialiased overflow-x-hidden font-sans">
        <ThemeProvider>
          <PushNotificationManager>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
          </PushNotificationManager>
        </ThemeProvider>
      </body>
    </html>
  );
}
