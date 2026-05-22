import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: "DormDAO Portfolio Dashboard",
  description: "Crypto investment portfolio tracker for the DormDAO student investment DAO across 17 universities",
  openGraph: {
    title: "DormDAO Portfolio Dashboard",
    description: "Track DormDAO crypto portfolio performance across 17 universities",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='12' fill='%231D9E75'/><text x='50' y='68' font-family='Arial' font-size='44' font-weight='bold' text-anchor='middle' fill='white'>DD</text></svg>"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#0f1117] text-gray-100 antialiased">
        <ThemeProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
