import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-800 bg-gray-900/50 p-5",
        className
      )}
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
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold font-mono text-white">{value}</span>
      {sub && (
        <span
          className={cn(
            "text-xs font-mono",
            positive === true && "text-primary",
            positive === false && "text-danger",
            positive === undefined && "text-gray-400"
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
