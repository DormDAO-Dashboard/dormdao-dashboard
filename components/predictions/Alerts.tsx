import { AlertTriangle, CheckCircle2, Clock, Target, XCircle } from "lucide-react";
import type { AlertKind, PitchAlert } from "@/lib/predictions/alerts";
import { cents, cn } from "@/lib/predictions/format";

const STYLE: Record<AlertKind, string> = {
  sell_limit: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  stop_loss: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  exit_due: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  exit_passed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  resolved_win: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  resolved_loss: "bg-gray-200 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300",
};

const ICON: Record<AlertKind, typeof Target> = {
  sell_limit: Target,
  stop_loss: AlertTriangle,
  exit_due: Clock,
  exit_passed: Clock,
  resolved_win: CheckCircle2,
  resolved_loss: XCircle,
};

function when(time: number | null): string {
  if (time === null) return "";
  return new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" });
}

function describe(a: PitchAlert): string {
  switch (a.kind) {
    case "sell_limit": return `Sell limit reached ${cents(a.price)} · ${when(a.time)}`;
    case "stop_loss": return `Stop hit ${cents(a.price)} · ${when(a.time)}`;
    case "exit_due": return "Exit date within 2 days";
    case "exit_passed": return "Past mandatory exit date";
    case "resolved_win": return "Resolved — won";
    case "resolved_loss": return "Resolved — lost";
  }
}

// Short labels for cards.
const SHORT: Record<AlertKind, string> = {
  sell_limit: "Limit hit",
  stop_loss: "Stop hit",
  exit_due: "Exit soon",
  exit_passed: "Exit passed",
  resolved_win: "Won",
  resolved_loss: "Lost",
};

export function AlertChips({ alerts }: { alerts: PitchAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {alerts.map((a) => {
        const Icon = ICON[a.kind];
        return (
          <span key={a.kind} title={describe(a)} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", STYLE[a.kind])}>
            <Icon className="w-3 h-3" /> {SHORT[a.kind]}
          </span>
        );
      })}
    </div>
  );
}

export function AlertList({ alerts }: { alerts: PitchAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {alerts.map((a) => {
        const Icon = ICON[a.kind];
        return (
          <li key={a.kind} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm", STYLE[a.kind])}>
            <Icon className="w-4 h-4 shrink-0" /> {describe(a)}
          </li>
        );
      })}
    </ul>
  );
}
