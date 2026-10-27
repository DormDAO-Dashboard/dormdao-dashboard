interface StatProps {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  large?: boolean;
}

export function Stat({ label, value, sub, subClass, large = false }: StatProps) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`font-mono text-gray-900 dark:text-white ${large ? "text-2xl font-semibold mt-1" : ""}`}>{value}</div>
      {sub && <div className={`font-mono text-xs ${subClass ?? "text-gray-500 dark:text-gray-400"}`}>{sub}</div>}
    </div>
  );
}
