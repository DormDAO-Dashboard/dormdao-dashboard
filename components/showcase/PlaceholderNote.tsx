import { PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

// Visually-unmistakable marker for content that hasn't been supplied yet —
// distinct amber styling (never used for real copy elsewhere on these pages)
// so nobody mistakes a placeholder for shipped content.
export function PlaceholderNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-dashed border-amber-300 dark:border-amber-700/50 rounded-lg px-3 py-2.5",
        className
      )}
    >
      <PenLine className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function PlaceholderBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded px-1.5 py-0.5">
      <PenLine className="w-2.5 h-2.5" /> Placeholder
    </span>
  );
}
