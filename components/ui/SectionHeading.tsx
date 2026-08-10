import { cn } from "@/lib/utils";

export function SectionHeading({
  color,
  className,
  children,
}: {
  color: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className={cn("text-sm font-semibold text-gray-700 dark:text-gray-400 flex items-center gap-2", className)}>
      <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {children}
    </h2>
  );
}
