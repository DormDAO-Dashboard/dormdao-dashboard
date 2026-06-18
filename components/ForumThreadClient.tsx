"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SchoolLogo } from "@/components/SchoolLogo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronUp, MessageSquare, Pin } from "lucide-react";
import { ForumThread, ForumReply, CATEGORY_STYLES, CATEGORY_LABELS, timeAgo } from "@/lib/forum";
import type { User } from "@supabase/supabase-js";

function ReplyCard({ reply }: { reply: ForumReply }) {
  return (
    <div className="flex gap-4 py-4 border-b border-gray-800 last:border-0">
      <SchoolLogo name={reply.school} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-medium text-gray-300">{reply.school}</span>
          {reply.author_name && <span className="text-xs text-gray-600">· {reply.author_name}</span>}
          <span className="text-xs text-gray-700">· {timeAgo(reply.created_at)}</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
      </div>
    </div>
  );
}

export function ForumThreadClient({ threadId }: { threadId: string }) {
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    fetch(`/api/forum/threads/${threadId}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then(json => {
        if (!json) return;
        setThread(json.thread);
        setReplies(json.replies ?? []);
      })
      .finally(() => setLoading(false));
  }, [threadId]);

  function handleUpvote() {
    if (!user || !thread) return;
    const wasUpvoted = upvoted;
    setUpvoted(!wasUpvoted);
    setThread(t => t ? { ...t, upvotes: t.upvotes + (wasUpvoted ? -1 : 1) } : t);
    fetch(`/api/forum/threads/${threadId}/upvote`, { method: "POST" }).catch(() => {
      setUpvoted(wasUpvoted);
      setThread(t => t ? { ...t, upvotes: t.upvotes + (wasUpvoted ? 1 : -1) } : t);
    });
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      const json = await res.json();
      if (!res.ok) { setReplyError(json.error ?? "Failed to post"); return; }
      setReplies(prev => [...prev, json.reply]);
      setThread(t => t ? { ...t, reply_count: t.reply_count + 1 } : t);
      setReplyContent("");
    } catch {
      setReplyError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-3 w-20 bg-gray-800 rounded" />
        <div className="h-7 w-2/3 bg-gray-800 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-800 rounded" />
          <div className="h-4 w-5/6 bg-gray-800 rounded" />
          <div className="h-4 w-4/6 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (notFound || !thread) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-sm mb-2">Thread not found.</p>
        <Link href="/forum" className="text-xs text-primary hover:underline">← Back to Forum</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Forum
      </Link>

      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {thread.is_pinned && <Pin className="w-3.5 h-3.5 text-yellow-500" />}
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            CATEGORY_STYLES[thread.category] ?? "bg-gray-800 text-gray-400"
          )}>
            {CATEGORY_LABELS[thread.category] ?? thread.category}
          </span>
          {thread.token_ticker && (
            <Link
              href={`/tokens/${thread.token_ticker}`}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
            >
              ${thread.token_ticker}
            </Link>
          )}
        </div>

        <h1 className="text-lg font-bold text-white mb-4">{thread.title}</h1>

        {thread.content && (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-6">{thread.content}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SchoolLogo name={thread.school} size={18} />
            <span className="text-xs text-gray-400 font-medium">{thread.school}</span>
            {thread.author_name && <span className="text-xs text-gray-600">· {thread.author_name}</span>}
            <span className="text-xs text-gray-700">· {timeAgo(thread.created_at)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="w-3.5 h-3.5" />
              {thread.reply_count}
            </span>
            <button
              onClick={handleUpvote}
              disabled={!user}
              className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors",
                upvoted ? "text-primary" : "text-gray-500 hover:text-gray-300",
                !user && "opacity-50 cursor-default"
              )}
            >
              <ChevronUp className="w-4 h-4" />
              {thread.upvotes}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/30 mb-4">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            {replies.length === 0
              ? "No replies yet"
              : `${replies.length} ${replies.length === 1 ? "Reply" : "Replies"}`}
          </h2>
        </div>
        {replies.length > 0 && (
          <div className="px-5">
            {replies.map(reply => <ReplyCard key={reply.id} reply={reply} />)}
          </div>
        )}
      </div>

      {user ? (
        <form onSubmit={handleReply} className="flex flex-col gap-3">
          <textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder="Write a reply…"
            maxLength={2000}
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-700">{replyContent.length}/2000</span>
            <div className="flex items-center gap-3">
              {replyError && <span className="text-xs text-danger">{replyError}</span>}
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="px-4 py-2 text-xs font-medium text-black bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Posting…" : "Post Reply"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center py-6 text-xs text-gray-500">
          <Link href="/login" className="text-primary hover:underline">Sign in</Link> to reply
        </div>
      )}

    </div>
  );
}
