"use client";
import { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";

export function DeploymentScatter({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const tick   = light ? "#374151" : "#9ca3af";
  const grid   = light ? "#e5e7eb" : "#374151";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const axLbl  = light ? "#374151" : "#9ca3af";

  const data = schools.map((s) => ({ name: schoolDisplayName(s.name), slug: s.slug, x: s.pctDeployed, y: s.nav }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis
          dataKey="x"
          name="% Deployed"
          type="number"
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          label={{ value: "% Deployed", position: "insideBottom", offset: -5, fill: axLbl, fontSize: 12 }}
        />
        <YAxis
          dataKey="y"
          name="NAV"
          type="number"
          tick={{ fill: tick, fontSize: 11 }}
          tickFormatter={(v) => formatUSD(v, true)}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: ttBg, border: `1px solid ${ttBord}` }} className="rounded-lg p-2.5 text-sm">
                <p style={{ color: light ? "#111827" : "#ffffff" }} className="font-medium">{d.name}</p>
                <p style={{ color: tick }}>Deployed: {d.x}%</p>
                <p className="text-primary">NAV: {formatUSD(d.y)}</p>
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          fill="#34d399"
          cursor="pointer"
          onClick={(point: any) => router.push(`/schools/${point.slug}`)}
          onMouseEnter={(point: any) => setHoveredName(point.name)}
          onMouseLeave={() => setHoveredName(null)}
          shape={(props: any) => {
            const { cx, cy, fill, payload } = props;
            const isHovered = hoveredName === payload.name;
            return (
              <circle cx={cx} cy={cy} r={isHovered ? 8 : 5} fill={fill} fillOpacity={isHovered ? 1 : 0.8} />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
