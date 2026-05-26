"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, LabelList,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatPct, slugify } from "@/lib/utils";

export function EthReturnChart({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";

  const tick   = light ? "#6b7280" : "#9ca3af";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl  = light ? "#111827" : "#f3f4f6";
  const refStr = light ? "#d1d5db" : "#4b5563";
  const refFil = light ? "#9ca3af" : "#6b7280";

  const sorted = [...schools].sort((a, b) => b.ethReturn - a.ethReturn);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: tick, fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          domain={[Math.min(-90, (Math.floor(Math.min(...sorted.map(s => s.ethReturn)) / 10) - 1) * 10), "auto"]}
        />
        <Tooltip
          formatter={(v) => [formatPct(Number(v)), "ETH Return"]}
          contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8 }}
          labelStyle={{ color: ttLbl }}
        />
        <ReferenceLine
          y={0}
          stroke={refStr}
          label={{ value: "0%", position: "insideTopRight", fill: refFil, fontSize: 10 }}
        />
        <Bar
          dataKey="ethReturn"
          radius={[4, 4, 0, 0]}
          cursor="pointer"
          activeBar={{ fillOpacity: 0.7 }}
          onClick={(data: any) => router.push(`/schools/${slugify(data.name)}`)}
        >
          {sorted.map((s, i) => (
            <Cell key={i} fill={s.ethReturn >= 0 ? "#34d399" : "#f87171"} />
          ))}
          <LabelList
            dataKey="ethReturn"
            position="top"
            content={(props: any) => {
              const { x, y, width, value } = props;
              const n = Number(value);
              const color = n >= 0 ? "#6ee7b7" : "#fca5a5";
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 3} fill={color} fontSize={9} textAnchor="middle">
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
