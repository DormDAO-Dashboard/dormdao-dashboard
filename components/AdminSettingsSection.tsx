"use client";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export function AdminSettingsSection({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !paused;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataCollectionPaused: next }),
      });
      const data = await res.json() as { dataCollectionPaused?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update setting");
      setPaused(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Data Collection</h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Pause Data Collection</p>
            <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5 max-w-md">
              When on, the site stops fetching new portfolio data from the Google Sheet entirely —
              every page keeps showing the last data pulled before this was turned on, and no
              requests to the sheet go out until it&apos;s turned back off.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={paused}
            disabled={saving}
            onClick={toggle}
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${paused ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${paused ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </label>

        {paused && (
          <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
            Data collection is paused. Portfolio stats across the site are frozen at their last known values.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {saving && (
          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Saving…
          </div>
        )}
      </div>
    </div>
  );
}
