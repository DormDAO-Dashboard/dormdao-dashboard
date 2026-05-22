"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { SchoolRow } from "@/lib/types";
import { formatPct } from "@/lib/utils";

export function EthReturnChart({ schools }: { schools: SchoolRow[] }) {
  const sorted = [...schools].sort((a, b) => b.ethReturn - a.ethReturn);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(v) => [formatPct(Number(v)), "ETH Return"]}
          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f3f4f6" }}
        />
        <ReferenceLine y={0} stroke="#4b5563" label={{ value: "0%", position: "insideTopRight", fill: "#6b7280", fontSize: 10 }} />
        <Bar dataKey="ethReturn" radius={[4, 4, 0, 0]}>
          {sorted.map((s, i) => (
            <Cell key={i} fill={s.ethReturn >= 0 ? "#1D9E75" : "#E24B4A"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
