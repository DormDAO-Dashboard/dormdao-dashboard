"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { Holding } from "@/lib/types";
import { formatNav } from "@/lib/utils";

const COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#fb7185",
  "#38bdf8", "#fb923c", "#4ade80", "#e879f9", "#facc15",
  "#f87171", "#818cf8", "#2dd4bf", "#c084fc", "#fdba74",
  "#86efac", "#67e8f9", "#fca5a5", "#a5b4fc", "#6ee7b7",
];

const RADIAN = Math.PI / 180;

interface SliceData {
  name: string;
  value: number;
  usdValue: number;
}

interface Props {
  holdings: Holding[];
  nav: number;
}

export function PortfolioDonut({ holdings, nav }: Props) {
  const { theme } = useTheme();
  const light = theme === "light";

  const ttBg    = light ? "#ffffff" : "#1f2937";
  const ttBord  = light ? "#e5e7eb" : "#374151";
  const lblClr  = light ? "#4b5563" : "#d1d5db";
  const lineClr = light ? "#9ca3af" : "#6b7280";

  const withPct = holdings.filter((h) => h.pctOfPortfolio > 0);
  if (withPct.length === 0) return null;

  const sorted: SliceData[] = [...withPct]
    .map((h) => ({
      name: h.ticker,
      value: parseFloat(h.pctOfPortfolio.toFixed(1)),
      usdValue: (h.pctOfPortfolio / 100) * nav,
    }))
    .sort((a, b) => b.value - a.value);

  // Group slices < 3% into "Other" to avoid crowded labels
  const large = sorted.filter((d) => d.value >= 3);
  const small = sorted.filter((d) => d.value < 3);
  const data: SliceData[] = [...large];
  if (small.length > 0) {
    data.push({
      name: "Other",
      value: parseFloat(small.reduce((s, d) => s + d.value, 0).toFixed(1)),
      usdValue: small.reduce((s, d) => s + d.usdValue, 0),
    });
  }

  function renderLabel(props: {
    cx?: number; cy?: number; midAngle?: number;
    outerRadius?: number; name?: string; value?: number;
  }) {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = "", value = 0 } = props;
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
        <tspan x={x} dy="-0.6em">{name}</tspan>
        <tspan x={x} dy="1.3em">{value}%</tspan>
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
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const { name, value, usdValue } = payload[0].payload as SliceData;
            return (
              <div style={{ background: ttBg, border: `1px solid ${ttBord}` }} className="rounded-lg p-2.5 text-sm">
                <p style={{ color: light ? "#111827" : "#ffffff" }} className="font-medium">
                  {name === "Other" ? "Other" : `$${name}`}
                </p>
                <p style={{ color: light ? "#6b7280" : "#d1d5db" }}>{value}% of portfolio</p>
                {usdValue > 0 && <p className="text-primary">{formatNav(usdValue)}</p>}
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
