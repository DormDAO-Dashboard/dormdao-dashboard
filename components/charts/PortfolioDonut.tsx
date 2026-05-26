"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { Holding } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

const COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#fb7185",
  "#34d399aa", "#60a5faaa", "#f59e0baa", "#a78bfaaa", "#fb7185aa",
];

interface Props {
  holdings: Holding[];
  nav: number;
}

export function PortfolioDonut({ holdings, nav }: Props) {
  const { theme } = useTheme();
  const light = theme === "light";

  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const legClr = light ? "#6b7280" : "#9ca3af";

  const withPct = holdings.filter((h) => h.pctOfPortfolio > 0);
  if (withPct.length === 0) return null;

  const THRESHOLD = 4;
  const main = withPct.filter((h) => h.pctOfPortfolio >= THRESHOLD);
  const other = withPct.filter((h) => h.pctOfPortfolio < THRESHOLD);
  const otherTotal = other.reduce((s, h) => s + h.pctOfPortfolio, 0);

  const data = [
    ...main.map((h) => ({
      name: h.ticker,
      value: parseFloat(h.pctOfPortfolio.toFixed(1)),
      usdValue: (h.pctOfPortfolio / 100) * nav,
    })),
    ...(otherTotal > 0
      ? [{ name: "Other", value: parseFloat(otherTotal.toFixed(1)), usdValue: (otherTotal / 100) * nav }]
      : []),
  ].sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const { name, value, usdValue } = payload[0].payload;
            const ticker = name === "Other" ? "Other" : `$${name}`;
            return (
              <div style={{ background: ttBg, border: `1px solid ${ttBord}` }} className="rounded-lg p-2.5 text-sm">
                <p style={{ color: light ? "#111827" : "#ffffff" }} className="font-medium">{ticker}</p>
                <p style={{ color: light ? "#6b7280" : "#d1d5db" }}>{value}% of portfolio</p>
                {usdValue > 0 && <p className="text-primary">{formatUSD(usdValue, true)}</p>}
              </div>
            );
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: legClr, fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
