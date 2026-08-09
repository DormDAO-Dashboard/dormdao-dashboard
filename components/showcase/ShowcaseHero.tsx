import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ShowcaseHero({
  eyebrow,
  title,
  tagline,
  description,
  accentColor,
  stats,
}: {
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  accentColor: string;
  stats?: { label: string; value: string }[];
}) {
  return (
    <div className="text-center py-14">
      <Link
        href="/map"
        className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Map
      </Link>

      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-5"
        style={{ backgroundColor: `${accentColor}1A`, border: `1px solid ${accentColor}66`, color: accentColor }}
      >
        {eyebrow}
      </div>

      <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h1>
      <p className="text-lg mb-6" style={{ color: accentColor }}>{tagline}</p>
      <p className="text-gray-700 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">{description}</p>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-2xl mx-auto">
          {stats.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 text-center">
              <div className="text-xl font-semibold font-mono text-gray-900 dark:text-white mb-1">{value}</div>
              <div className="text-xs text-gray-700 dark:text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
