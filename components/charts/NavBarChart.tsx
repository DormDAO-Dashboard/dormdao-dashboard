"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatUSD, slugify } from "@/lib/utils";

export function NavBarChart({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";

  const tick   = light ? "#6b7280" : "#9ca3af";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl  = light ? "#111827" : "#f3f4f6";

  const sorted = [...schools].sort((a, b) => a.rank - b.rank);

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
          tickFormatter={(v) => formatUSD(v, true)}
        />
        <Tooltip
          formatter={(v) => [formatUSD(Number(v)), "NAV"]}
          contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8 }}
          labelStyle={{ color: ttLbl }}
        />
        <Bar
          dataKey="nav"
          radius={[4, 4, 0, 0]}
          fill="#34d399"
          cursor="pointer"
          activeBar={{ fillOpacity: 0.7 }}
          onClick={(data: any) => router.push(`/schools/${slugify(data.name)}`)}
        >
          <LabelList
            dataKey="nav"
            position="top"
            formatter={(v: unknown) => formatUSD(Number(v), true)}
            style={{ fill: "#6ee7b7", fontSize: 9 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
