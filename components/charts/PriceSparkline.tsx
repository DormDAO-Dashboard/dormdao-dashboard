"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { formatUSD } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface SparklineProps {
  geckoId: string;
  positive?: boolean;
}

export function PriceSparkline({ geckoId, positive }: SparklineProps) {
  const [data, setData] = useState<{ price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const light = theme === "light";

  const ttBg   = light ? "#ffffff" : "#1f2937";
  const ttBord = light ? "#e5e7eb" : "#374151";

  useEffect(() => {
    fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=7`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.prices) {
          setData(d.prices.map(([, price]: [number, number]) => ({ price })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [geckoId]);

  if (loading) return <div className="skeleton h-12 w-full" />;
  if (!data.length) return <div className="text-xs text-gray-500">No chart data</div>;

  const color = positive !== false ? "#1D9E75" : "#E24B4A";

  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="price" stroke={color} dot={false} strokeWidth={1.5} />
        <Tooltip
          formatter={(v) => [formatUSD(Number(v)), "Price"]}
          contentStyle={{ background: ttBg, border: `1px solid ${ttBord}`, borderRadius: 8, fontSize: 12 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
