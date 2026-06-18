"use client";
import { useEffect, useState } from "react";
import { ResearchNote } from "@/lib/types";
import { NoteColumn } from "@/components/notes/CompareModal";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ids: string;
}

export function ComparePageClient({ ids }: Props) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids) {
      setError("No notes selected.");
      setLoading(false);
      return;
    }
    const idList = ids.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
    if (idList.length < 2) {
      setError("Select at least 2 notes to compare.");
      setLoading(false);
      return;
    }

    fetch(`/api/notes?ids=${idList.join(",")}`)
      .then((r) => r.json())
      .then(async (d) => {
        const loaded: ResearchNote[] = d.notes ?? [];
        setNotes(loaded);
        const tickers = [
          ...new Set(loaded.map((n) => n.token_ticker).filter(Boolean) as string[]),
        ];
        if (tickers.length === 0) return;
        const pd = await fetch(`/api/prices?tickers=${tickers.join(",")}`).then((r) => r.json());
        const map: Record<string, number> = {};
        for (const t of tickers) {
          if (pd.prices?.[t]?.usd != null) map[t] = pd.prices[t].usd;
        }
        setPriceMap(map);
      })
      .catch(() => setError("Failed to load notes."))
      .finally(() => setLoading(false));
  }, [ids]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 bg-gray-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-gray-900/30 border border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || notes.length < 2) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-sm mb-4">{error ?? "Not enough notes to compare."}</p>
        <a href="/" className="text-xs text-primary hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <h1 className="text-sm font-semibold text-gray-300">
          Comparing {notes.length} Research Notes
        </h1>
      </div>
      <div
        className={cn(
          "grid gap-4",
          notes.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
        )}
      >
        {notes.map((note) => (
          <NoteColumn
            key={note.id}
            note={note}
            currentPrice={
              note.token_ticker ? priceMap[note.token_ticker.toUpperCase()] : undefined
            }
            showTokenLink
          />
        ))}
      </div>
    </div>
  );
}
