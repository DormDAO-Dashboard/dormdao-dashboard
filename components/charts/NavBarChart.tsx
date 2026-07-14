"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { SchoolRow } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";
import { useEffect, useState } from "react";

export function NavBarChart({ schools }: { schools: SchoolRow[] }) {
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

  const sorted = [...schools]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => ({ ...s, name: schoolDisplayName(s.name) }));
  const minWidth = 600;

  const chart = (
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
        onClick={(data: any) => router.push(`/schools/${data.slug}`)}
      >
        {!isMobile && (
          <LabelList
            dataKey="nav"
            position="top"
            content={(props: any) => {
              const { x, y, width, value } = props;
              return (
                <text
                  x={Number(x) + Number(width) / 2}
                  y={Number(y) - 4}
                  fill={light ? "#111827" : "#ffffff"}
                  fontSize={11}
                  fontWeight={500}
                  textAnchor="middle"
                >
                  {formatUSD(Number(value), true)}
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
          <span className="text-gray-500 text-xs rotate-0">→</span>
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
