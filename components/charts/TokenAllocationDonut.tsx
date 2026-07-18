"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { formatUSD } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import type { TokenInfo } from "@/components/TokensClient";

const COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#fb7185",
  "#38bdf8", "#fb923c", "#4ade80", "#e879f9", "#facc15",
];

const RADIAN = Math.PI / 180;
const TOP_N = 9;

interface SliceData {
  name: string;
  displayName: string;
  value: number;
  pct: number;
}

interface Props {
  tokens: TokenInfo[];
  prices: Record<string, { usd: number; usd_24h_change: number }>;
}

export function TokenAllocationDonut({ tokens, prices }: Props) {
  const { theme } = useTheme();
  const light = theme === "light";

  const ttBg    = light ? "#ffffff" : "#1f2937";
  const ttBord  = light ? "#e5e7eb" : "#374151";
  const lblClr  = light ? "#4b5563" : "#d1d5db";
  const lineClr = light ? "#9ca3af" : "#6b7280";

  const valued = tokens
    .map((t) => ({ ticker: t.ticker, usdValue: (prices[t.ticker]?.usd ?? 0) * t.totalTokens }))
    .filter((t) => t.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue);

  if (valued.length === 0) return null;

  const total = valued.reduce((s, t) => s + t.usdValue, 0);
  const top = valued.slice(0, TOP_N);
  const rest = valued.slice(TOP_N);

  const data: SliceData[] = top.map((t) => ({
    name: t.ticker,
    displayName: TOKEN_META[t.ticker]?.displayTicker ?? t.ticker,
    value: t.usdValue,
    pct: (t.usdValue / total) * 100,
  }));

  if (rest.length > 0) {
    const restValue = rest.reduce((s, t) => s + t.usdValue, 0);
    data.push({
      name: "Other",
      displayName: "Other",
      value: restValue,
      pct: (restValue / total) * 100,
    });
  }

  function renderLabel(props: {
    cx?: number; cy?: number; midAngle?: number;
    outerRadius?: number; displayName?: string; pct?: number;
  }) {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, displayName = "", pct = 0 } = props;
    const radius = outerRadius + 36;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x} y={y}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fill={lblClr}
        fontSize={10}
      >
        <tspan x={x} dy="-0.6em">{displayName}</tspan>
        <tspan x={x} dy="1.3em">{pct.toFixed(1)}%</tspan>
      </text>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={90}
          paddingAngle={1}
          dataKey="value"
          label={renderLabel}
          labelLine={{ stroke: lineClr, strokeWidth: 1 }}
          isAnimationActive={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const { name, displayName, value, pct } = payload[0].payload as SliceData;
            return (
              <div style={{ background: ttBg, border: `1px solid ${ttBord}` }} className="rounded-lg p-2.5 text-sm">
                <p style={{ color: light ? "#111827" : "#ffffff" }} className="font-medium">
                  {name === "Other" ? "Other" : `$${displayName}`}
                </p>
                <p style={{ color: light ? "#6b7280" : "#d1d5db" }}>{pct.toFixed(1)}% of aggregate portfolio</p>
                <p className="text-primary">{formatUSD(value)}</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
