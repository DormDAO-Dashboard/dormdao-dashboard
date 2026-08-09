import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Wraps each map-linked showcase page (Dorm Builders/Summit/Catalyst).
// These pages render with no sidebar/top bar (see AppShell's noShell check)
// so they read as standalone, one-page offshoots of the map rather than
// dashboard pages — the only navigation back is this corner link.
export function ShowcasePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <Link
        href="/map"
        className="fixed top-4 left-4 z-20 inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-white/90 dark:bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Map
      </Link>
      <main className="px-4 sm:px-6 lg:px-8 py-16 max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  );
}
