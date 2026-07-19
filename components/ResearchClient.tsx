"use client";
import { useEffect, useState, useCallback } from "react";
import { ResearchNote } from "@/lib/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { Skeleton } from "@/components/ui/Card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_SECRET } from "@/lib/admin";
import { schoolDisplayName } from "@/lib/schoolData";

const SENTIMENTS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "↑ Bullish", value: "bullish" },
  { label: "↓ Bearish", value: "bearish" },
  { label: "~ Neutral", value: "neutral" },
];

const SORT_OPTIONS = [
  { label: "Most Recent", value: "recent" },
  { label: "Most Upvoted", value: "upvotes" },
];

const SCHOOLS = [
  "Vanderbilt", "Villanova", "Boston College", "Purdue", "Oregon",
  "Michigan", "Columbia", "USC", "Penn", "Cornell",
  "St. Andrews", "Waterloo", "NYU", "Berkeley", "Dartmouth",
  "Texas", "Cambridge",
];

export function ResearchClient({ initialTickers, hideHeader }: { initialTickers: string[]; hideHeader?: boolean }) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sentiment, setSentiment] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [tokenFilter, setTokenFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [adminSecret, setAdminSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("admin")) setAdminSecret(ADMIN_SECRET);
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, page: String(page) });
      if (sentiment) params.set("sentiment", sentiment);
      if (tokenFilter) params.set("token", tokenFilter);
      if (schoolFilter) params.set("school", schoolFilter);
      const res = await fetch(`/api/notes?${params}`);
      const data = await res.json();
      setNotes(data.notes ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [sentiment, sort, page, tokenFilter, schoolFilter]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Community Research</h1>
        </div>
      )}
      <p className="text-gray-400 mb-4 text-sm">
        {loading ? "Loading…" : `${total} note${total !== 1 ? "s" : ""} from DormDAO analysts`}
      </p>
      <AddNoteForm onSuccess={fetchNotes} />

      <div className="flex flex-col sm:flex-row gap-3 my-6 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => { setSentiment(s.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                sentiment === s.value
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-transparent border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 sm:ml-auto flex-wrap">
          <select
            value={tokenFilter}
            onChange={(e) => { setTokenFilter(e.target.value); setPage(1); }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Tokens</option>
            {initialTickers.map((t) => (
              <option key={t} value={t}>${t}</option>
            ))}
          </select>
          <select
            value={schoolFilter}
            onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>{schoolDisplayName(s)}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-16 w-full mb-3" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))
          : notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                adminSecret={adminSecret}
                onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              />
            ))}
      </div>

      {!loading && notes.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No notes found. Add the first one above!
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
