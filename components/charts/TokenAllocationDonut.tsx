"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { formatUSD } from "@/lib/utils";
import { TOKEN_META } from "@/lib/tokens";
import { computePieLabelPositions } from "@/components/charts/pieLabelLayout";
import type { TokenInfo } from "@/components/TokensClient";

const COLORS = [
  "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#fb7185",
  "#38bdf8", "#fb923c", "#4ade80", "#e879f9", "#facc15",
];

const TOP_N = 9;
const LABEL_OFFSET = 40;
const LABEL_MIN_GAP = 15;

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

  // Positions are computed once per render pass, lazily, the first time
  // recharts calls renderLabel (which is when we first learn the real
  // cx/cy/outerRadius for this render — constant across all slices).
  let labelPositions: ReturnType<typeof computePieLabelPositions> | null = null;

  function renderLabel(props: {
    cx?: number; cy?: number; outerRadius?: number;
    name?: string; displayName?: string; pct?: number;
  }) {
    const { cx = 0, cy = 0, outerRadius = 0, name = "", displayName = "", pct = 0 } = props;
    if (!labelPositions) {
      labelPositions = computePieLabelPositions(
        data.map((d) => ({ key: d.name, pct: d.pct })),
        cx, cy, outerRadius, LABEL_OFFSET, LABEL_MIN_GAP
      );
    }
    const pos = labelPositions.get(name);
    if (!pos) return null;
    return (
      <g>
        <polyline
          points={`${pos.edgeX},${pos.edgeY} ${pos.bendX},${pos.bendY} ${pos.labelX},${pos.labelY}`}
          fill="none"
          stroke={lineClr}
          strokeWidth={1}
        />
        <text
          x={pos.labelX} y={pos.labelY}
          textAnchor={pos.anchor}
          dominantBaseline="central"
          fill={lblClr}
          fontSize={10}
        >
          {displayName} {pct.toFixed(1)}%
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
