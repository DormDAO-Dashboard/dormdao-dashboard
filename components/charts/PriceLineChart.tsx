"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    setLoading(true);
    setData([]);
    fetch(`/api/market-chart?id=${geckoId}&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.prices)) {
          setData(d.prices.map(([time, price]: [number, number]) => ({ time, price })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [geckoId, days]);

  const color = positive !== false ? "#1D9E75" : "#E24B4A";

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
            <XAxis
              dataKey="time"
              tickFormatter={(t) =>
                new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval="preserveStartEnd"
              tickCount={5}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickFormatter={(v) => formatUSD(v, true)}
              domain={["auto", "auto"]}
              width={60}
            />
            <Tooltip
              formatter={(v) => [formatUSD(Number(v)), "Price"]}
              labelFormatter={(t) =>
                new Date(t).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })
              }
              contentStyle={{
                background: "#1f2937", border: "1px solid #374151",
                borderRadius: 8, fontSize: 12,
              }}
              labelStyle={{ color: "#f3f4f6" }}
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
