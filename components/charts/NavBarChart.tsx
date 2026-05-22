"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SchoolRow } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

export function NavBarChart({ schools }: { schools: SchoolRow[] }) {
  const sorted = [...schools].sort((a, b) => a.rank - b.rank);

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
          tickFormatter={(v) => formatUSD(v, true)}
        />
        <Tooltip
          formatter={(v) => [formatUSD(Number(v)), "NAV"]}
          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f3f4f6" }}
        />
        <Bar dataKey="nav" radius={[4, 4, 0, 0]} fill="#1D9E75" />
      </BarChart>
    </ResponsiveContainer>
  );
}
