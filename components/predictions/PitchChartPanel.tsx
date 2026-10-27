"use client";
import { useEffect, useState } from "react";
import type { PricePoint } from "@/lib/predictions/types";
import { returnPct } from "@/lib/predictions/math";
import { cents, cn, signedPct, toneClass } from "@/lib/predictions/format";
import { OddsChart, type ChartLevels } from "@/components/predictions/OddsChart";

const RANGES = [
  { key: "since", label: "Since pitch" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "all", label: "All" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

interface PitchChartPanelProps {
  pitchId: string;
  initialPoints: PricePoint[]; // "since pitch" history, rendered server-side
  levels: ChartLevels;
  livePrice: number | null;    // current (or resolved) price of the chosen side
  liveLabel: string;           // "Now" / "Resolved"
  pitchedAt: number;
}

function hoverLabel(t: number): string {
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Headline price + range buttons + chart. Hovering the chart swaps the
// headline to that point's price and its return vs the pitched entry.
export function PitchChartPanel({ pitchId, initialPoints, levels, livePrice, liveLabel, pitchedAt }: PitchChartPanelProps) {
  const [range, setRange] = useState<RangeKey>("since");
  const [points, setPoints] = useState<PricePoint[]>(initialPoints);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const [hover, setHover] = useState<PricePoint | null>(null);

  useEffect(() => {
    if (range === "since") {
      setPoints(initialPoints);
      setStatus("ready");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/predictions/history?id=${encodeURIComponent(pitchId)}&range=${range}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { points?: PricePoint[] }) => {
        setPoints(d.points ?? []);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[PitchChartPanel]", pitchId, range, err);
        setStatus("error");
      });
    return () => controller.abort();
  }, [range, pitchId, initialPoints]);

  const price = hover ? hover.price : livePrice;
  const ret = price === null ? null : returnPct(levels.entry, price);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {hover ? hoverLabel(hover.time) : liveLabel}
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{cents(price)}</span>
            <span className={cn("text-sm", toneClass(ret))}>{signedPct(ret)} vs entry</span>
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors border",
                range === r.key
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? (
        <div className="h-[260px] rounded-lg bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
      ) : status === "error" ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Price history unavailable right now
        </div>
      ) : (
        <OddsChart points={points} levels={levels} height={260} onHoverChange={setHover} markerTime={pitchedAt} />
      )}
    </div>
  );
}
