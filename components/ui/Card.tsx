import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  accentColor,
}: {
  className?: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4",
        className
      )}
      style={accentColor ? { borderColor: accentColor } : undefined}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  positive,
  accentColor,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  accentColor?: string;
}) {
  return (
    <Card className="flex flex-col gap-1.5" accentColor={accentColor}>
      <span className="text-xs text-gray-700 dark:text-gray-400 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-lg font-semibold font-mono text-gray-900 dark:text-white">{value}</span>
      {sub && (
        <span
          className={cn(
            "text-xs font-mono",
            positive === true && "text-primary",
            positive === false && "text-danger",
            positive === undefined && "text-gray-700 dark:text-gray-400"
          )}
        >
          {sub}
        </span>
      )}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
