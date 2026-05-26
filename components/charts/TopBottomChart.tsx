"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatPct, slugify } from "@/lib/utils";

export function TopBottomChart({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";

  const tick   = light ? "#6b7280" : "#9ca3af";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl  = light ? "#111827" : "#f3f4f6";
  const refStr = light ? "#d1d5db" : "#4b5563";

  if (schools.length < 3) return null;

  const sorted = [...schools].sort((a, b) => b.ethReturn - a.ethReturn);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3);

  const data = [
    ...top3.map((s) => ({ name: s.name, value: s.ethReturn })),
    ...bottom3.map((s) => ({ name: s.name, value: s.ethReturn })),
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 65, left: 90, bottom: 5 }}>
        <XAxis
          type="number"
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: tick, fontSize: 11 }}
          width={85}
        />
        <Tooltip
          formatter={(v) => [formatPct(Number(v)), "ETH Return"]}
          contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8 }}
          labelStyle={{ color: ttLbl }}
        />
        <ReferenceLine x={0} stroke={refStr} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          activeBar={{ fillOpacity: 0.7 }}
          onClick={(data: any) => router.push(`/schools/${slugify(data.name)}`)}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value >= 0 ? "#34d399" : "#f87171"} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            content={(props: any) => {
              const { x, y, width, height, value } = props;
              const n = Number(value);
              const color = n >= 0 ? "#6ee7b7" : "#fca5a5";
              return (
                <text
                  x={Number(x) + Number(width) + 4}
                  y={Number(y) + Number(height) / 2}
                  fill={color}
                  fontSize={9}
                  dominantBaseline="middle"
                >
                  {`${n >= 0 ? "+" : ""}${n.toFixed(0)}%`}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
