"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const RANGES = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
];

interface PriceLineChartProps {
  geckoId: string;
  positive?: boolean;
}

export function PriceLineChart({ geckoId, positive }: PriceLineChartProps) {
  const [days, setDays] = useState("7");
  const [data, setData] = useState<{ time: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const light = theme === "light";

  const tick   = light ? "#6b7280" : "#9ca3af";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl  = light ? "#111827" : "#f3f4f6";

  useEffect(() => {
    setLoading(true);
    setData([]);
    fetch(`/api/market-chart?id=${geckoId}&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.prices)) {
          const raw = d.prices.map(([time, price]: [number, number]) => ({ time, price }));
          // Keep last data point per calendar date to eliminate duplicate x-axis labels
          const dayMap = new Map<string, { time: number; price: number }>();
          for (const pt of raw) {
            dayMap.set(new Date(pt.time).toDateString(), pt);
          }
          setData(Array.from(dayMap.values()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [geckoId, days]);

  const color = positive !== false ? "#1D9E75" : "#E24B4A";

  function xInterval(len: number): number {
    const divisor = days === "7" ? 7 : days === "30" ? 8 : 9;
    return Math.max(1, Math.floor(len / divisor));
  }

  function yTickFormatter(v: number): string {
    if (data.length < 2) return formatUSD(v, true);
    const prices = data.map(d => d.price);
    const range = Math.max(...prices) - Math.min(...prices);
    if (range < 500) {
      return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    return formatUSD(v, true);
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setDays(r.value)}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-colors border",
              days === r.value
                ? "bg-primary/20 text-primary border-primary/40"
                : "text-gray-500 hover:text-gray-300 border-transparent"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="h-48 bg-gray-800/50 animate-pulse rounded-lg" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No chart data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={light ? "#f3f4f6" : "#ffffff0a"}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tickFormatter={(t) =>
                new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
              tick={{ fill: tick, fontSize: 10 }}
              interval={xInterval(data.length)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 10 }}
              tickFormatter={yTickFormatter}
              domain={["auto", "auto"]}
              width={70}
              tickCount={5}
            />
            <Tooltip
              formatter={(v) => [formatUSD(Number(v)), "Price"]}
              labelFormatter={(t) =>
                new Date(t).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })
              }
              contentStyle={{
                background: ttBg, border: `1px solid ${ttBord}`,
                borderRadius: 8, fontSize: 12,
              }}
              labelStyle={{ color: ttLbl }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
