"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ResearchNote } from "@/lib/types";
import { SentimentBadge } from "@/components/ui/Badge";
import { X, Share2, Check, ThumbsUp, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function NoteColumn({
  note,
  currentPrice,
  showTokenLink,
}: {
  note: ResearchNote;
  currentPrice?: number;
  showTokenLink?: boolean;
}) {
  const pctToTarget =
    note.price_target != null && currentPrice
      ? ((note.price_target - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="flex flex-col gap-4 p-5 border border-gray-800 rounded-lg bg-gray-900/30 h-full">
      <div className="flex flex-wrap items-center gap-2">
        <SentimentBadge sentiment={note.sentiment} />
        {note.token_ticker &&
          (showTokenLink ? (
            <Link
              href={`/tokens/${note.token_ticker.toLowerCase()}`}
              className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded hover:text-white transition-colors"
            >
              ${note.token_ticker}
            </Link>
          ) : (
            <span className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
              ${note.token_ticker}
            </span>
          ))}
        {currentPrice != null && (
          <span className="text-xs text-gray-500 font-mono">
            ${currentPrice < 1
              ? currentPrice.toFixed(6)
              : currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {note.school && <p className="text-xs text-gray-500">{note.school}</p>}

      <div className="flex flex-wrap gap-1.5">
        {note.thesis_type && (
          <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded">
            {note.thesis_type}
          </span>
        )}
        {note.time_horizon && (
          <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded">
            {note.time_horizon}
          </span>
        )}
        {note.price_target != null && (
          <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded font-mono">
            Target: ${note.price_target}
          </span>
        )}
        {pctToTarget !== null && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded font-mono flex items-center gap-0.5",
              pctToTarget >= 0
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-danger/20 text-danger border border-danger/30"
            )}
          >
            {pctToTarget >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {pctToTarget >= 0 ? "+" : ""}
            {pctToTarget.toFixed(1)}% to target
          </span>
        )}
      </div>

      {note.content && (
        <p className="text-sm text-gray-200 leading-relaxed overflow-y-auto max-h-56 flex-1">
          {note.content}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-400">{note.author_name}</span>
          {" · "}
          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{note.upvotes}</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  notes: ResearchNote[];
  priceMap: Record<string, number>;
  onClose: () => void;
}

export function CompareModal({ notes, priceMap, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleShare() {
    const ids = notes.map((n) => n.id).join(",");
    const url = `${window.location.origin}/compare?ids=${ids}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]/98 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-white">
          Comparing {notes.length} Research Notes
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Share Comparison"}
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
