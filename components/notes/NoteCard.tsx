"use client";
import { useState, useEffect } from "react";
import { ResearchNote } from "@/lib/types";
import { SentimentBadge } from "@/components/ui/Badge";
import { ThumbsUp, Trash2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

const ogCache = new Map<string, object>();

function LinkPreviewCard({ url }: { url: string }) {
  const [data, setData] = useState<{ title?: string; description?: string; siteName?: string; image?: string } | null>(null);

  useEffect(() => {
    if (ogCache.has(url)) { setData(ogCache.get(url) as typeof data); return; }
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => { if (d.title || d.description) { ogCache.set(url, d); setData(d); } })
      .catch(() => {});
  }, [url]);

  if (!data) return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 break-all">
      <ExternalLink className="w-3 h-3 shrink-0" />{url}
    </a>
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-gray-700 bg-gray-800/60 p-3 hover:border-gray-600 transition-colors">
      <div className="flex gap-3">
        {data.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.image} alt="" className="w-16 h-12 object-cover rounded shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
        )}
        <div className="min-w-0">
          <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />{data.siteName}
          </div>
          {data.title && <div className="text-xs font-semibold text-white truncate">{data.title}</div>}
          {data.description && <div className="text-xs text-gray-400 line-clamp-2 mt-0.5">{data.description}</div>}
        </div>
      </div>
    </a>
  );
}

interface NoteCardProps {
  note: ResearchNote;
  currentUserId?: string;
  adminSecret?: string;
  onDelete?: (id: string) => void;
  onUpvote?: (id: string) => void;
}

export function NoteCard({ note, currentUserId, adminSecret, onDelete, onUpvote }: NoteCardProps) {
  const [upvotes, setUpvotes] = useState(note.upvotes);
  const [voted, setVoted] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpvote = async () => {
    if (voted || upvoting) return;
    setUpvoting(true);
    try {
      const res = await fetch(`/api/notes/${note.id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUserId }),
      });
      if (res.ok) {
        setUpvotes((u) => u + 1);
        setVoted(true);
        onUpvote?.(note.id);
      }
    } finally {
      setUpvoting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let body: string | undefined;
      if (adminSecret) {
        headers["Authorization"] = `Bearer ${adminSecret}`;
      } else if (currentUserId) {
        body = JSON.stringify({ user_id: currentUserId });
      } else {
        return;
      }
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE", headers, body });
      if (res.ok) onDelete?.(note.id);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = adminSecret || (currentUserId && note.user_id === currentUserId);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SentimentBadge sentiment={note.sentiment} />
          {note.token_ticker && (
            <Link
              href={`/tokens/${note.token_ticker.toLowerCase()}`}
              className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded hover:text-white transition-colors"
            >
              ${note.token_ticker}
            </Link>
          )}
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
          {note.school && (
            <span className="text-xs text-gray-500">{note.school}</span>
          )}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-600 hover:text-danger transition-colors p-1 disabled:opacity-40"
            aria-label="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {note.content && <p className="text-sm text-gray-200 leading-relaxed">{note.content}</p>}
      {note.url && <LinkPreviewCard url={note.url} />}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-400">{note.author_name}</span>
          {" · "}
          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
        </div>
        <button
          onClick={handleUpvote}
          disabled={voted || upvoting}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors",
            voted
              ? "text-primary bg-primary/10"
              : "text-gray-400 hover:text-primary hover:bg-primary/10"
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="font-mono">{upvotes}</span>
        </button>
      </div>
    </div>
  );
}
