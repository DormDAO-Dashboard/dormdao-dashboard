"use client";
import { useState } from "react";
import { ResearchNote } from "@/lib/types";
import { SentimentBadge } from "@/components/ui/Badge";
import { ThumbsUp, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

      <p className="text-sm text-gray-200 leading-relaxed">{note.content}</p>

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
