"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { cn, formatPct, formatUSD } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const RANGES = [
  { label: "24H", value: "1" },
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
];

const UP_COLOR = "#1D9E75";
const DOWN_COLOR = "#E24B4A";
// CoinGecko returns ~288 points for 24H and ~2,000 for 90D; anything past a
// few hundred is invisible at this chart width and just slows hover.
const MAX_POINTS = 240;
const CHART_HEIGHT = 240;

interface PricePoint {
  time: number;
  price: number;
}

export interface ChartHover {
  price: number;
  time: number;
  changePct: number | null; // vs the first point in the selected range
  label: string;            // formatted date/time of the hovered point
}

interface PriceLineChartProps {
  geckoId: string;
  // Lets the page show the hovered price in its main header.
  onHoverChange?: (hover: ChartHover | null) => void;
}

function downsample(points: PricePoint[]): PricePoint[] {
  if (points.length <= MAX_POINTS) return points;
  const step = points.length / MAX_POINTS;
  const sampled = Array.from({ length: MAX_POINTS }, (_, i) => points[Math.floor(i * step)]);
  // Always end on the latest quote so the chart agrees with the header price.
  return [...sampled.slice(0, -1), points[points.length - 1]];
}

// Short axis labels that stay distinct for sub-dollar tokens ($0.0812, not "$0").
function formatAxisPrice(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return formatUSD(v, true);
  if (abs >= 1) return `$${v.toFixed(2)}`;
  return `$${Number(v.toPrecision(3))}`;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Spacing between x-axis ticks per range, so labels land on clean
// boundaries (midnight, every 4h) instead of repeating the same date.
const TICK_STEP_MS: Record<string, number> = {
  "1": 4 * HOUR_MS,
  "7": DAY_MS,
  "30": 5 * DAY_MS,
  "90": 15 * DAY_MS,
  "365": 60 * DAY_MS,
};

function axisTicks(start: number, end: number, days: string): number[] {
  const step = TICK_STEP_MS[days] ?? DAY_MS;
  const aligned = new Date(start);
  if (step >= DAY_MS) aligned.setHours(0, 0, 0, 0);
  else aligned.setMinutes(0, 0, 0);
  const ticks: number[] = [];
  for (let t = aligned.getTime() + step; t < end; t += step) ticks.push(t);
  return ticks;
}

// Hovered-point label: hourly ranges get a time of day, 1Y (daily points)
// gets the full date.
function hoverLabel(t: number, days: string): string {
  const d = new Date(t);
  if (days === "365") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTime(t: number, days: string): string {
  const d = new Date(t);
  if (days === "1") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(days === "365" ? { year: "2-digit" } : {}),
  });
}

export function PriceLineChart({ geckoId, onHoverChange }: PriceLineChartProps) {
  const [days, setDays] = useState("7");
  const [data, setData] = useState<PricePoint[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hover, setHover] = useState<PricePoint | null>(null);
  const { theme } = useTheme();
  const light = theme === "light";

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setHover(null);
    fetch(`/api/market-chart?id=${encodeURIComponent(geckoId)}&days=${days}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d.prices)) throw new Error(d.error ?? "No price data");
        const points = d.prices
          .map(([time, price]: [number, number]) => ({ time, price }))
          .filter((p: PricePoint) => Number.isFinite(p.price) && p.price > 0);
        setData(downsample(points));
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[PriceLineChart]", geckoId, days, err);
        setData([]);
        setStatus("error");
      });
    return () => controller.abort();
  }, [geckoId, days]);

  const first = data[0]?.price;
  const last = data[data.length - 1];
  const rangeChangePct = first && last ? ((last.price - first) / first) * 100 : null;
  const isUp = first && last ? last.price >= first : true;

  useEffect(() => {
    if (!onHoverChange) return;
    onHoverChange(hover ? {
      price: hover.price,
      time: hover.time,
      changePct: first ? ((hover.price - first) / first) * 100 : null,
      label: hoverLabel(hover.time, days),
    } : null);
  }, [hover, first, days, onHoverChange]);
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const gradientId = `price-fill-${geckoId}`;

  const yDomain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 1];
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.08 || max * 0.02;
    return [Math.max(0, min - pad), max + pad];
  }, [data]);

  const tick = light ? "#6b7280" : "#9ca3af";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div className="min-h-[1.25rem] text-sm font-mono">
          {status === "ready" && rangeChangePct !== null && (
            <>
              <span className={rangeChangePct >= 0 ? "text-primary" : "text-danger"}>{formatPct(rangeChangePct)}</span>
              <span className="ml-1.5 text-xs text-gray-700 dark:text-gray-400">
                past {RANGES.find((r) => r.value === days)?.label}
              </span>
            </>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors border",
                days === r.value
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? (
        <div className="h-60 bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-lg" />
      ) : status === "error" || data.length < 2 ? (
        <div className="h-60 flex items-center justify-center text-gray-700 dark:text-gray-400 text-sm">
          {status === "error" ? "Chart data unavailable right now" : "Not enough price history yet"}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            onMouseMove={(s) => {
              // Recharts 3 reports the index as a string ("12"), not a number.
              const idx = Number(s?.activeTooltipIndex);
              setHover(Number.isInteger(idx) ? data[idx] ?? null : null);
            }}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={light ? "#f3f4f6" : "#ffffff0a"} vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={axisTicks(data[0].time, data[data.length - 1].time, days)}
              tickFormatter={(t) => formatTime(t, days)}
              tick={{ fill: tick, fontSize: 10 }}
              minTickGap={20}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              orientation="right"
              domain={yDomain}
              tickFormatter={formatAxisPrice}
              tick={{ fill: tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickCount={5}
            />
            {/* Tooltip drives the crosshair + hover state; the readout lives in the header. */}
            <Tooltip content={() => null} cursor={{ stroke: tick, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: light ? "#fff" : "#111827", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
