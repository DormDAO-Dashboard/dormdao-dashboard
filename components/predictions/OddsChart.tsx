"use client";
import { useId, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/predictions/types";
import { useTheme } from "@/components/ThemeProvider";
import { cents } from "@/lib/predictions/format";

const LINE_COLOR = { up: "#1D9E75", down: "#E24B4A" };
const LEVEL_COLOR = { entry: "#9ca3af", implied: "#60a5fa", sellLimit: "#34d399", stopLoss: "#f87171" };
const LEVEL_LABEL = { entry: "Entry", implied: "Implied", sellLimit: "Sell limit", stopLoss: "Stop" };

export interface ChartLevels {
  entry: number;
  implied: number | null;
  sellLimit: number | null;
  stopLoss: number | null;
}

interface OddsChartProps {
  points: PricePoint[];
  levels: ChartLevels;
  height?: number;
  compact?: boolean;
  // When provided, the parent shows the hovered point (e.g. in a page
  // headline) and the chart skips its own price readout.
  onHoverChange?: (point: PricePoint | null) => void;
  markerTime?: number; // draws a vertical "Pitched" line
}

function formatTick(t: number, spanDays: number): string {
  const d = new Date(t);
  return spanDays <= 2
    ? d.toLocaleTimeString("en-US", { hour: "numeric" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ZOOM_PAD = 0.03;

function zoomedDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [Math.max(0, min - ZOOM_PAD), Math.min(1, max + ZOOM_PAD)];
}

function LevelLegend({ levels, small }: { levels: { key: keyof ChartLevels; value: number }[]; small: boolean }) {
  return (
    <div className={small ? "flex flex-wrap gap-3 text-[11px] mt-1" : "flex flex-wrap gap-3 text-xs"}>
      {levels.map((l) => (
        <span key={l.key} className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="w-3 border-t-2 border-dashed" style={{ borderColor: LEVEL_COLOR[l.key] }} />
          {LEVEL_LABEL[l.key]}{small ? "" : ` ${cents(l.value)}`}
        </span>
      ))}
    </div>
  );
}

export function OddsChart({ points, levels, height = 220, compact = false, onHoverChange, markerTime }: OddsChartProps) {
  const { theme } = useTheme();
  const light = theme === "light";
  const [hover, setHoverState] = useState<PricePoint | null>(null);
  const setHover = (point: PricePoint | null) => {
    setHoverState(point);
    onHoverChange?.(point);
  };
  const gradientId = `odds-${useId().replace(/:/g, "")}`;

  // Only draw a level when it's a real target inside the chart (1.0 = "hold
  // to resolution", which is the top edge anyway).
  const shownLevels = (Object.keys(LEVEL_LABEL) as (keyof ChartLevels)[])
    .map((key) => ({ key, value: levels[key] }))
    .filter((l): l is { key: keyof ChartLevels; value: number } => l.value !== null && l.value > 0 && l.value < 1);

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400" style={{ height }}>
        No price history available
      </div>
    );
  }

  const last = points[points.length - 1];
  const color = last.price >= levels.entry ? LINE_COLOR.up : LINE_COLOR.down;
  const spanDays = (last.time - points[0].time) / 86_400_000;
  const tick = light ? "#6b7280" : "#9ca3af";
  const shown = hover ?? last;
  // Full charts show the whole 0–100% scale; compact card charts zoom to the
  // price range plus the drawn levels so small moves stay visible.
  const yDomain: [number, number] = compact
    ? zoomedDomain([...points.map((p) => p.price), ...shownLevels.map((l) => l.value)])
    : [0, 1];

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          {onHoverChange ? <span /> : (
            <div className="font-mono">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{cents(shown.price)}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                {new Date(shown.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          )}
          <LevelLegend levels={shownLevels} small={false} />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={points}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          onMouseMove={(s) => {
            // Recharts 3 reports the index as a string ("12"), not a number.
            const idx = Number(s?.activeTooltipIndex);
            setHover(Number.isInteger(idx) ? points[idx] ?? null : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {!compact && <CartesianGrid stroke={light ? "#f3f4f6" : "#ffffff0a"} vertical={false} />}
          <XAxis
            dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]}
            hide={compact} tickFormatter={(t) => formatTick(t, spanDays)}
            tick={{ fill: tick, fontSize: 10 }} minTickGap={40} axisLine={false} tickLine={false}
          />
          <YAxis
            domain={yDomain} hide={compact} orientation="right" width={40}
            ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false}
          />
          <Tooltip content={() => null} cursor={{ stroke: tick, strokeDasharray: "3 3" }} />
          {shownLevels.map((l) => (
            <ReferenceLine key={l.key} y={l.value} stroke={LEVEL_COLOR[l.key]} strokeDasharray="4 4" strokeWidth={1} />
          ))}
          {markerTime !== undefined && markerTime >= points[0].time && markerTime <= last.time && (
            <ReferenceLine
              x={markerTime} stroke={tick} strokeDasharray="2 3"
              label={compact ? undefined : { value: "Pitched", position: "insideTopLeft", fill: tick, fontSize: 10 }}
            />
          )}
          <Area
            type="monotone" dataKey="price" stroke={color} strokeWidth={2}
            fill={`url(#${gradientId})`} dot={false} isAnimationActive={false}
            activeDot={compact ? false : { r: 4, fill: color, stroke: light ? "#fff" : "#111827", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {compact && <LevelLegend levels={shownLevels} small />}
    </div>
  );
}
