"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/predictions/format";

const TABS = [
  { href: "/predictions", label: "Leaderboard" },
  { href: "/predictions/schools", label: "Schools" },
];

// The two top-level Predictions tabs. A school's own page sits under
// Schools, so that tab stays active there.
export function PredictionsTopNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-6">
      {TABS.map((t) => {
        const active = t.href === "/predictions" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
