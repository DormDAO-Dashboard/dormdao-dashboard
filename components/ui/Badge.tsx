import { cn } from "@/lib/utils";
import type { Sentiment } from "@/lib/types";

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        sentiment === "bullish" && "bg-primary/20 text-primary",
        sentiment === "bearish" && "bg-danger/20 text-danger",
        sentiment === "neutral" && "bg-gray-700 text-gray-300"
      )}
    >
      {sentiment === "bullish" && "↑ "}
      {sentiment === "bearish" && "↓ "}
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "green" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variant === "default" && "bg-gray-700 text-gray-300",
        variant === "green" && "bg-primary/20 text-primary",
        variant === "red" && "bg-danger/20 text-danger"
      )}
    >
      {children}
    </span>
  );
}
