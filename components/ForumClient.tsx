"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronUp, MessageSquare, MessagesSquare, Pin, Plus, X } from "lucide-react";
import { ForumThread, CATEGORY_STYLES, CATEGORY_LABELS, timeAgo } from "@/lib/forum";
import type { User } from "@supabase/supabase-js";

const CATEGORY_TABS = [
  { key: "",              label: "All" },
  { key: "general",       label: "General" },
  { key: "token_research",label: "Token Research" },
  { key: "strategy",      label: "Strategy" },
  { key: "questions",     label: "Questions" },
  { key: "announcements", label: "Announcements" },
] as const;

const SORT_TABS = [
  { key: "hot", label: "Hot" },
  { key: "new", label: "New" },
  { key: "top", label: "Top" },
] as const;

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      CATEGORY_STYLES[category] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
    )}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

function ThreadCard({
  thread,
  onUpvote,
  isUpvoted,
}: {
  thread: ForumThread;
  onUpvote: (id: string) => void;
  isUpvoted: boolean;
}) {
  const router = useRouter();
  return (
    <Link
      href={`/forum/${thread.id}`}
      className="block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-150 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpvote(thread.id); }}
          className={cn(
            "flex flex-col items-center gap-0.5 pt-0.5 shrink-0 transition-colors",
            isUpvoted ? "text-primary" : "text-gray-600 hover:text-gray-400"
          )}
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-xs font-medium tabular-nums">{thread.upvotes}</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {thread.is_pinned && <Pin className="w-3 h-3 text-yellow-500 shrink-0" />}
            <CategoryBadge category={thread.category} />
            {thread.token_ticker && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/tokens/${thread.token_ticker}`); }}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
              >
                ${thread.token_ticker}
              </button>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug mb-1 group-hover:text-primary transition-colors">
            {thread.title}
          </h3>

          {thread.content && (
            <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-3">{thread.content}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <SchoolLogo name={thread.school} size={16} />
              <span className="text-xs text-gray-400">{schoolDisplayName(thread.school)}</span>
              {thread.author_name && <span className="text-xs text-gray-600">· {thread.author_name}</span>}
              <span className="text-xs text-gray-700">· {timeAgo(thread.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{thread.reply_count}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ThreadSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 animate-pulse flex gap-3">
      <div className="w-8 flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <div className="h-4 w-4 bg-gray-800 rounded" />
        <div className="h-3 w-4 bg-gray-800 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex gap-2"><div className="h-4 w-24 bg-gray-800 rounded" /></div>
        <div className="h-4 w-3/4 bg-gray-800 rounded" />
        <div className="h-3 w-full bg-gray-800 rounded" />
        <div className="flex justify-between">
          <div className="h-3 w-32 bg-gray-800 rounded" />
          <div className="h-3 w-10 bg-gray-800 rounded" />
        </div>
      </div>
    </div>
  );
}

interface NewThreadModalProps {
  userSchool: string;
  displayName: string;
  onClose: () => void;
  onSuccess: (thread: ForumThread) => void;
}

function NewThreadModal({ userSchool, displayName, onClose, onSuccess }: NewThreadModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, token_ticker: ticker || null }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to post"); return; }
      onSuccess(json.thread);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#111] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Thread</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">School</label>
            <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
              <SchoolLogo name={userSchool} size={16} />
              <span className="text-sm text-gray-300">{schoolDisplayName(userSchool)}</span>
              <span className="text-xs text-gray-600 ml-auto">as {displayName || "Anonymous"}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="general">General</option>
              <option value="token_research">Token Research</option>
              <option value="strategy">Strategy</option>
              <option value="questions">Questions</option>
              <option value="announcements">Announcements</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's your thread about?"
              maxLength={200}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Content <span className="text-danger">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share your thoughts, analysis, or question…"
              maxLength={5000}
              rows={5}
              required
              className={cn(inputCls, "resize-none")}
            />
            <div className="text-right text-xs text-gray-700 mt-1">{content.length}/5000</div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Token <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. ETH, SOL, HYPE"
              maxLength={12}
              className={inputCls}
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="px-4 py-2 text-xs font-medium text-black bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting…" : "Post Thread"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface Props {
  school?: string;
  ticker?: string;
}

export function ForumClient({ school, ticker }: Props) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [userSchool, setUserSchool] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        supabase
          .from("profiles")
          .select("school, display_name")
          .eq("id", u.id)
          .single()
          .then(({ data: profile }) => {
            setUserSchool(profile?.school ?? "");
            setDisplayName(profile?.display_name ?? "");
          });
      }
    });
  }, []);

  const fetchThreads = useCallback(async (
    cat: string,
    s: string,
    newOffset: number,
    append: boolean
  ) => {
    const params = new URLSearchParams({ sort: s, offset: String(newOffset) });
    if (cat) params.set("category", cat);
    if (school) params.set("school", school);
    if (ticker) params.set("ticker", ticker);
    try {
      const res = await fetch(`/api/forum/threads?${params}`);
      const json = await res.json();
      if (!res.ok) return;
      const fetched: ForumThread[] = json.threads ?? [];
      setThreads(prev => append ? [...prev, ...fetched] : fetched);
      setHasMore(json.hasMore ?? false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [school, ticker]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchThreads(category, sort, 0, false);
  }, [category, sort, fetchThreads]);

  function handleUpvote(id: string) {
    if (!user) return;
    const wasUpvoted = upvotedIds.has(id);
    setUpvotedIds(prev => {
      const next = new Set(prev);
      wasUpvoted ? next.delete(id) : next.add(id);
      return next;
    });
    setThreads(prev => prev.map(t =>
      t.id === id ? { ...t, upvotes: t.upvotes + (wasUpvoted ? -1 : 1) } : t
    ));
    fetch(`/api/forum/threads/${id}/upvote`, { method: "POST" }).catch(() => {
      setUpvotedIds(prev => {
        const next = new Set(prev);
        wasUpvoted ? next.add(id) : next.delete(id);
        return next;
      });
      setThreads(prev => prev.map(t =>
        t.id === id ? { ...t, upvotes: t.upvotes + (wasUpvoted ? 1 : -1) } : t
      ));
    });
  }

  function handleLoadMore() {
    const newOffset = offset + 25;
    setOffset(newOffset);
    setLoadingMore(true);
    fetchThreads(category, sort, newOffset, true);
  }

  function handleNewThread(thread: ForumThread) {
    setThreads(prev => [thread, ...prev]);
    setShowModal(false);
  }

  const isEmbedded = !!(school || ticker);

  return (
    <>
      {showModal && user && userSchool && (
        <NewThreadModal
          userSchool={userSchool}
          displayName={displayName}
          onClose={() => setShowModal(false)}
          onSuccess={handleNewThread}
        />
      )}

      {!isEmbedded ? (
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessagesSquare className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">DAO Forum</h1>
            </div>
            <p className="text-sm text-gray-500">Discuss pitches, strategies, and ideas across the DormDAO network</p>
          </div>
          {user && userSchool && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Thread
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Forum Discussions</h3>
          {user && userSchool && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Start Discussion
            </button>
          )}
        </div>
      )}

      {!isEmbedded && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORY_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  "shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  category === key
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-transparent border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {SORT_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  sort === key
                    ? "bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    : "bg-transparent border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: isEmbedded ? 3 : 5 }).map((_, i) => <ThreadSkeleton key={i} />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 py-12 text-center">
          <MessagesSquare className="w-7 h-7 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No threads yet</p>
          {user && userSchool && (
            <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-primary hover:underline">
              Start the first thread
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {threads.map(thread => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onUpvote={handleUpvote}
              isUpvoted={upvotedIds.has(thread.id)}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-5 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-5 py-2 text-xs font-medium border border-gray-700 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
