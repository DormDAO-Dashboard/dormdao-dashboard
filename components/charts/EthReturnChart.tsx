"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, LabelList,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatPct } from "@/lib/utils";
import { schoolDisplayName, schoolShortName } from "@/lib/schoolData";
import { useEffect, useState } from "react";

export function EthReturnChart({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const light = theme === "light";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const tick   = light ? "#374151" : "#9ca3af";
  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";
  const ttLbl  = light ? "#111827" : "#f3f4f6";
  const refStr = light ? "#d1d5db" : "#4b5563";
  const refFil = light ? "#9ca3af" : "#6b7280";

  const sorted = [...schools]
    .sort((a, b) => b.ethReturn - a.ethReturn)
    .map((s) => ({ ...s, displayName: schoolDisplayName(s.name) }));
  const minWidth = 600;

  const chart = (
    <BarChart data={sorted} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
      <XAxis
        dataKey="name"
        tick={{ fill: tick, fontSize: 11 }}
        angle={-40}
        textAnchor="end"
        interval={0}
        tickFormatter={(v) => schoolShortName(v)}
      />
      <YAxis
        tick={{ fill: tick, fontSize: 11 }}
        tickFormatter={(v) => `${v}%`}
        domain={[Math.min(-90, (Math.floor(Math.min(...sorted.map(s => s.ethReturn)) / 10) - 1) * 10), "auto"]}
      />
      <Tooltip
        formatter={(v) => [formatPct(Number(v)), "ETH Return"]}
        labelFormatter={(v) => schoolDisplayName(v as string)}
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
        onClick={(data: any) => router.push(`/schools/${data.slug}`)}
      >
        {sorted.map((s, i) => (
          <Cell key={i} fill={s.ethReturn >= 0 ? "#34d399" : "#f87171"} />
        ))}
        {!isMobile && (
          <LabelList
            dataKey="ethReturn"
            content={(props: any) => {
              const { x, y, width, height, value } = props;
              const n = Number(value);
              if (n < 0) {
                return (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) + Number(height) - 5}
                    fill={light ? "#dc2626" : "#ef4444"}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={500}
                  >
                    {`${n.toFixed(0)}%`}
                  </text>
                );
              }
              return (
                <text
                  x={Number(x) + Number(width) / 2}
                  y={Number(y) - 5}
                  fill={light ? "#111827" : "#ffffff"}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={500}
                >
                  {`+${n.toFixed(0)}%`}
                </text>
              );
            }}
          />
        )}
      </Bar>
    </BarChart>
  );

  if (isMobile) {
    return (
      <div className="relative">
        <div className="overflow-x-auto">
          <div style={{ minWidth, height: 280 }}>
            <ResponsiveContainer width="100%" height={280}>
              {chart}
            </ResponsiveContainer>
          </div>
        </div>
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-gray-900/80 to-transparent flex items-center justify-end pr-1">
          <span className="text-gray-500 text-xs">→</span>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      {chart}
    </ResponsiveContainer>
  );
}
