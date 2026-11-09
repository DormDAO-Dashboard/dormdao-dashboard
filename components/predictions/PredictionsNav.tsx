"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/predictions/format";
import { predictionSchoolPath } from "@/lib/predictions/schools";

const TABS = [
  { path: "", label: "Latest Pitch" },
  { path: "/portfolio", label: "Portfolio" },
  { path: "/performance", label: "Performance" },
  { path: "/archive", label: "Archive" },
  { path: "/submit", label: "Submit Pitch" },
];

// Sub-tabs of one school's prediction page (/predictions/schools/[slug]).
export function PredictionsNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = predictionSchoolPath(slug);
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-8">
      {TABS.map((t) => {
        const href = `${base}${t.path}`;
        const active = t.path === ""
          ? pathname === href || pathname.startsWith(`${base}/pitches`)
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
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
