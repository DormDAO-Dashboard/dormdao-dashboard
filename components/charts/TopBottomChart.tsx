"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatPct } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";

export function TopBottomChart({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";

  const tick   = light ? "#374151" : "#9ca3af";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl  = light ? "#111827" : "#f3f4f6";
  const refStr = light ? "#d1d5db" : "#4b5563";

  if (schools.length < 3) return null;

  const sorted = [...schools].sort((a, b) => b.ethReturn - a.ethReturn);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3);

  const data = [
    ...top3.map((s) => ({ name: schoolDisplayName(s.name), slug: s.slug, value: s.ethReturn })),
    ...bottom3.map((s) => ({ name: schoolDisplayName(s.name), slug: s.slug, value: s.ethReturn })),
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
          onClick={(data: any) => router.push(`/schools/${data.slug}`)}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value >= 0 ? "#34d399" : "#f87171"} />
          ))}
          <LabelList
            dataKey="value"
            content={(props: any) => {
              const { x, y, width, height, value } = props;
              const n = Number(value);
              if (n < 0) {
                // x is the 0% axis pixel; width is negative (extends left).
                // Place label just right of the 0% axis line.
                return (
                  <text
                    x={Number(x) + 5}
                    y={Number(y) + Number(height) / 2}
                    fill={light ? "#dc2626" : "#ef4444"}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight={500}
                  >
                    {`${n.toFixed(0)}%`}
                  </text>
                );
              }
              return (
                <text
                  x={Number(x) + Number(width) + 5}
                  y={Number(y) + Number(height) / 2}
                  fill={light ? "#111827" : "#ffffff"}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={500}
                >
                  {`+${n.toFixed(0)}%`}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
