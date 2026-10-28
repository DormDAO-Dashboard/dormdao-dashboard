"use client";
import { useState } from "react";
import { Eye, X, Loader2, AlertCircle, CalendarClock, ExternalLink } from "lucide-react";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";

type ReportType = "portfolio" | "leaderboard";

const SCHOOL_OPTIONS = SCHOOL_NAMES
  .map((name) => ({ slug: slugify(name), label: schoolDisplayName(name) }))
  .sort((a, b) => a.label.localeCompare(b.label));

function previewUrl(type: ReportType, school: string): string {
  return type === "portfolio"
    ? `/api/admin/report-emails/preview?type=portfolio&school=${encodeURIComponent(school)}`
    : "/api/admin/report-emails/preview?type=leaderboard";
}

// The two monthly report emails, previewed with today's live data (see
// lib/report-emails.ts). Neither is scheduled to send yet — this box is how
// they get reviewed before that's turned on.
export function AdminMonthlyReportsSection() {
  const [school, setSchool] = useState(SCHOOL_OPTIONS[0]?.slug ?? "");
  const [viewing, setViewing] = useState<{ title: string; subtitle?: string; url: string } | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetched and shown via srcDoc rather than pointing the iframe at the
  // route: the site sends X-Frame-Options: DENY on every response
  // (next.config.mjs), which blocks even same-origin framing.
  async function open(type: ReportType, title: string) {
    const url = previewUrl(type, school);
    const subtitle = type === "portfolio" ? SCHOOL_OPTIONS.find((s) => s.slug === school)?.label : undefined;
    setViewing({ title, subtitle, url });
    setHtml(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        let message = `Failed to load preview (${res.status})`;
        try { message = (JSON.parse(text) as { error?: string }).error ?? message; } catch {}
        throw new Error(message);
      }
      // Links inside the email open in a new tab instead of inside the frame.
      setHtml(text.replace("<head>", '<head><base target="_blank">'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const rows: Array<{ type: ReportType; title: string; description: string }> = [
    {
      type: "portfolio",
      title: "Monthly Portfolio Report",
      description: "One per school — NAV, Month-to-Date / Season / Since Inception returns, every position, and portfolio insights.",
    },
    {
      type: "leaderboard",
      title: "Monthly Leaderboard Digest",
      description: "DormDAO-wide — totals, the full leaderboard, a cross-school performance chart, and every buy in the past 30 days.",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Monthly Reports
          <span className="ml-2 text-xs text-gray-700 dark:text-gray-400 font-normal">2 emails</span>
        </h2>
        <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">
          Previews use today&apos;s live data, exactly as the email would look if it sent right now.
        </p>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {rows.map((r) => (
          <div key={r.type} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4">
            <CalendarClock className="hidden sm:block w-4 h-4 text-gray-700 dark:text-gray-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.title}</p>
              <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">{r.description}</p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-2">Not scheduled — preview only, nothing sends automatically yet</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.type === "portfolio" && (
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  aria-label="School to preview"
                  className="max-w-[12rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
                >
                  {SCHOOL_OPTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                </select>
              )}
              <button onClick={() => open(r.type, r.title)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-xs font-medium">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewing(null)} />
          <div className="relative w-full max-w-3xl h-[90vh] flex flex-col bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {viewing.title}
                {viewing.subtitle && (
                  <span className="ml-2 text-xs font-normal text-gray-700 dark:text-gray-400">{viewing.subtitle}</span>
                )}
              </h3>
              <div className="flex items-center gap-3 shrink-0">
                <a href={viewing.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                </a>
                <button onClick={() => setViewing(null)} aria-label="Close"
                  className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-900">
              {loading && (
                <div className="h-full flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Building preview from live data…
                </div>
              )}
              {error && (
                <div className="m-5 flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                </div>
              )}
              {html && (
                <iframe
                  title={`${viewing.title} preview`}
                  srcDoc={html}
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  className="w-full h-full border-0 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
