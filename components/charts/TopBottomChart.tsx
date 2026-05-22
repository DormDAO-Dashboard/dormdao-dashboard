"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { SchoolRow } from "@/lib/types";
import { formatPct } from "@/lib/utils";

export function TopBottomChart({ schools }: { schools: SchoolRow[] }) {
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
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 55, left: 90, bottom: 5 }}>
        <XAxis
          type="number"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          width={85}
        />
        <Tooltip
          formatter={(v) => [formatPct(Number(v)), "ETH Return"]}
          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f3f4f6" }}
        />
        <ReferenceLine x={0} stroke="#4b5563" />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value >= 0 ? "#1D9E75" : "#E24B4A"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
