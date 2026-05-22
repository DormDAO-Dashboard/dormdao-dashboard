"use client";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { SchoolRow } from "@/lib/types";
import { formatUSD } from "@/lib/utils";

export function DeploymentScatter({ schools }: { schools: SchoolRow[] }) {
  const data = schools.map((s) => ({
    name: s.name,
    x: s.pctDeployed,
    y: s.nav,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="x"
          name="% Deployed"
          type="number"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          label={{ value: "% Deployed", position: "insideBottom", offset: -5, fill: "#6b7280", fontSize: 12 }}
        />
        <YAxis
          dataKey="y"
          name="NAV"
          type="number"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v) => formatUSD(v, true)}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm">
                <p className="text-white font-medium">{d.name}</p>
                <p className="text-gray-400">Deployed: {d.x}%</p>
                <p className="text-primary">NAV: {formatUSD(d.y)}</p>
              </div>
            );
          }}
        />
        <Scatter data={data} fill="#1D9E75" fillOpacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
