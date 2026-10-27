import type { PitchRole, Sector, Side, Venue } from "@/lib/predictions/types";
import { SECTOR_LABEL, VENUE_LABEL } from "@/lib/predictions/types";
import { cn } from "@/lib/predictions/format";

const SECTOR_STYLE: Record<Sector, string> = {
  economics: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  ai_tech: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  politics: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
};

const ROLE_STYLE: Record<PitchRole, string> = {
  executed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  paper: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  voting: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
};

const ROLE_LABEL: Record<PitchRole, string> = {
  executed: "Executed",
  paper: "Not selected",
  voting: "Voting",
};

const pill = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";

export function SectorBadge({ sector }: { sector: Sector }) {
  return <span className={cn(pill, SECTOR_STYLE[sector])}>{SECTOR_LABEL[sector]}</span>;
}

// Executed = the round's vote winner (fund money); Not selected = paper pick.
export function RoleBadge({ role, closed }: { role: PitchRole; closed: boolean }) {
  return (
    <span className={cn(pill, ROLE_STYLE[role])}>
      {ROLE_LABEL[role]}{closed ? " · closed" : ""}
    </span>
  );
}

export function SideBadge({ side }: { side: Side }) {
  return (
    <span className={cn(pill, "font-mono", side === "YES" ? "bg-primary/15 text-emerald-700 dark:text-primary" : "bg-danger/15 text-red-700 dark:text-danger")}>
      {side}
    </span>
  );
}

export function VenueLabel({ venue }: { venue: Venue }) {
  return <span className="text-xs text-gray-500 dark:text-gray-400">{VENUE_LABEL[venue]}</span>;
}
