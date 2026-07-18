"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { Holding } from "@/lib/types";
import { formatNav } from "@/lib/utils";
import { computePieLabelPositions } from "@/components/charts/pieLabelLayout";

const COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#fb7185",
  "#38bdf8", "#fb923c", "#4ade80", "#e879f9", "#facc15",
  "#f87171", "#818cf8", "#2dd4bf", "#c084fc", "#fdba74",
  "#86efac", "#67e8f9", "#fca5a5", "#a5b4fc", "#6ee7b7",
];

const LABEL_OFFSET = 40;
const LABEL_MIN_GAP = 15;

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

  // Positions are computed once per render pass, lazily, the first time
  // recharts calls renderLabel (which is when we first learn the real
  // cx/cy/outerRadius for this render — constant across all slices).
  let labelPositions: ReturnType<typeof computePieLabelPositions> | null = null;

  function renderLabel(props: {
    cx?: number; cy?: number; outerRadius?: number; name?: string; value?: number;
  }) {
    const { cx = 0, cy = 0, outerRadius = 0, name = "", value = 0 } = props;
    if (!labelPositions) {
      labelPositions = computePieLabelPositions(
        data.map((d) => ({ key: d.name, pct: d.value })),
        cx, cy, outerRadius, LABEL_OFFSET, LABEL_MIN_GAP
      );
    }
    const pos = labelPositions.get(name);
    if (!pos) return null;
    return (
      <g>
        <line x1={pos.edgeX} y1={pos.edgeY} x2={pos.labelX} y2={pos.labelY} stroke={lineClr} strokeWidth={1} />
        <text
          x={pos.labelX} y={pos.labelY}
          textAnchor={pos.anchor}
          dominantBaseline="central"
          fill={lblClr}
          fontSize={10}
        >
          {name} {value}%
        </text>
      </g>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={90}
          paddingAngle={0}
          dataKey="value"
          label={renderLabel}
          labelLine={false}
          isAnimationActive={false}
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
