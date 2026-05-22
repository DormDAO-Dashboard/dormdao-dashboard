"use client";
import { useState, useEffect } from "react";
import { Sentiment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toaster";

const SENTIMENTS: Sentiment[] = ["bullish", "neutral", "bearish"];
const SCHOOLS = [
  "Vanderbilt", "Villanova", "Boston College", "Purdue", "Oregon",
  "Michigan", "Columbia", "USC", "Penn", "Cornell",
  "St. Andrews", "Waterloo", "NYU", "Berkeley", "Dartmouth",
  "Texas", "Cambridge",
];

interface AddNoteFormProps {
  defaultTicker?: string;
  defaultSchool?: string;
  tickers?: string[];
  authorName?: string;
  userId?: string;
  onSuccess?: () => void;
}

export function AddNoteForm({
  defaultTicker,
  defaultSchool,
  tickers: tickersProp,
  authorName: initialName,
  userId,
  onSuccess,
}: AddNoteFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTickers, setAvailableTickers] = useState<string[]>(tickersProp ?? []);

  useEffect(() => {
    if (tickersProp) {
      setAvailableTickers(tickersProp);
      return;
    }
    fetch("/api/sheets")
      .then((r) => r.json())
      .then((d) => {
        const seen = new Set<string>();
        for (const school of d.schools ?? []) {
          for (const h of school.holdings ?? []) {
            if (h.ticker) seen.add(h.ticker as string);
          }
        }
        setAvailableTickers(Array.from(seen).sort());
      })
      .catch(() => {});
  }, [tickersProp]);
  const [form, setForm] = useState({
    author_name: initialName || "",
    school: defaultSchool || "",
    token_ticker: defaultTicker || "",
    sentiment: "neutral" as Sentiment,
    content: "",
  });

  const charCount = form.content.length;
  const valid =
    form.author_name.trim().length > 0 &&
    charCount >= 20 &&
    charCount <= 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, user_id: userId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      toast("Note posted successfully!", "success");
      setForm((f) => ({ ...f, content: "", sentiment: "neutral" }));
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to post note", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm"
      >
        + Add Research Note
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 flex flex-col gap-3"
    >
      <h3 className="text-sm font-semibold text-white">New Research Note</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Your Name *</label>
          <input
            value={form.author_name}
            onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
            placeholder="Anonymous"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">School</label>
          <select
            value={form.school}
            onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">— Select school —</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Token</label>
          <select
            value={form.token_ticker}
            onChange={(e) => setForm((f) => ({ ...f, token_ticker: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">— Select token —</option>
            {availableTickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sentiment *</label>
          <div className="flex gap-1.5">
            {SENTIMENTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, sentiment: s }))}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium transition-colors border",
                  form.sentiment === s && s === "bullish" && "bg-primary/20 border-primary/50 text-primary",
                  form.sentiment === s && s === "bearish" && "bg-danger/20 border-danger/50 text-danger",
                  form.sentiment === s && s === "neutral" && "bg-gray-700 border-gray-600 text-white",
                  form.sentiment !== s && "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"
                )}
              >
                {s === "bullish" ? "↑" : s === "bearish" ? "↓" : "~"} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Analysis *</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="Share your thesis (min 20 chars)..."
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none"
        />
        <div
          className={cn(
            "text-xs mt-1 text-right",
            charCount < 20 ? "text-gray-500" : charCount > 2000 ? "text-danger" : "text-gray-400"
          )}
        >
          {charCount}/2000
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || loading}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          {loading ? "Posting…" : "Post Note"}
        </button>
      </div>
    </form>
  );
}
