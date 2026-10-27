"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/predictions/format";

const LINKS = [
  { href: "/predictions", label: "Latest Pitch" },
  { href: "/predictions/portfolio", label: "Portfolio" },
  { href: "/predictions/leaderboard", label: "Leaderboard" },
  { href: "/predictions/archive", label: "Archive" },
  { href: "/predictions/submit", label: "Submit Pitch" },
];

export function PredictionsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-8">
      {LINKS.map((l) => {
        const active = l.href === "/predictions"
          ? pathname === l.href || pathname.startsWith("/predictions/pitches")
          : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
