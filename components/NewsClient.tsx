"use client";
import { useEffect, useState, useCallback } from "react";
import { SchoolLogo } from "@/components/SchoolLogo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ExternalLink, Newspaper, Plus, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface NewsPost {
  id: string;
  created_at: string;
  title: string;
  content: string | null;
  school: string;
  category: string;
  url: string | null;
  user_id: string | null;
  author_name: string | null;
}

const CATEGORIES = [
  { key: "",             label: "All" },
  { key: "news",         label: "News" },
  { key: "research",     label: "Research" },
  { key: "event",        label: "Event" },
  { key: "announcement", label: "Announcement" },
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  news:         "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  research:     "bg-primary/20 text-primary border border-primary/30",
  event:        "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  announcement: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide",
      CATEGORY_STYLES[category] ?? "bg-gray-800 text-gray-400 border border-gray-700"
    )}>
      {category}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PostCard({ post }: { post: NewsPost }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <CategoryBadge category={post.category} />
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Link
          </a>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-white text-sm leading-snug mb-1">{post.title}</h3>
        {post.content && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{post.content}</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2">
          <SchoolLogo name={post.school} size={18} />
          <span className="text-xs text-gray-400 font-medium">{post.school}</span>
        </div>
        <div className="text-xs text-gray-600">
          {post.author_name && <span className="text-gray-500">{post.author_name} · </span>}
          {timeAgo(post.created_at)}
        </div>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 animate-pulse flex flex-col gap-3">
      <div className="h-4 w-20 bg-gray-800 rounded" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-gray-800 rounded" />
        <div className="h-3 w-full bg-gray-800 rounded" />
        <div className="h-3 w-5/6 bg-gray-800 rounded" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-gray-800 rounded" />
        <div className="h-3 w-16 bg-gray-800 rounded" />
      </div>
    </div>
  );
}

interface ModalProps {
  userSchool: string;
  displayName: string;
  onClose: () => void;
  onSuccess: (post: NewsPost) => void;
}

function PostModal({ userSchool, displayName, onClose, onSuccess }: ModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("news");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, url }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to post"); return; }
      onSuccess(json.post);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#111] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Post Update</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">School</label>
            <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
              <SchoolLogo name={userSchool} size={16} />
              <span className="text-sm text-gray-300">{userSchool}</span>
              <span className="text-xs text-gray-600 ml-auto">as {displayName || "Anonymous"}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="news">News</option>
              <option value="research">Research</option>
              <option value="event">Event</option>
              <option value="announcement">Announcement</option>
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
              placeholder="What's the headline?"
              maxLength={200}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              Content <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add context, details, or a summary…"
              maxLength={2000}
              rows={4}
              className={cn(inputCls, "resize-none")}
            />
            <div className="text-right text-xs text-gray-700 mt-1">{content.length}/2000</div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              External Link <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 text-xs font-medium text-black bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting…" : "Post Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewsClient() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [userSchool, setUserSchool] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [knownSchools, setKnownSchools] = useState<string[]>([]);

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

  const fetchPosts = useCallback(async (
    schoolF: string,
    categoryF: string,
    newOffset: number,
    append: boolean
  ) => {
    const params = new URLSearchParams({ offset: String(newOffset) });
    if (schoolF) params.set("school", schoolF);
    if (categoryF) params.set("category", categoryF);
    try {
      const res = await fetch(`/api/news?${params}`);
      const json = await res.json();
      if (!res.ok) return;
      const fetched: NewsPost[] = json.posts ?? [];
      setPosts(prev => append ? [...prev, ...fetched] : fetched);
      setHasMore(json.hasMore ?? false);
      if (!append) {
        const incoming = [...new Set(fetched.map(p => p.school))].sort();
        setKnownSchools(prev => [...new Set([...prev, ...incoming])].sort());
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchPosts(schoolFilter, categoryFilter, 0, false);
  }, [schoolFilter, categoryFilter, fetchPosts]);

  function handleLoadMore() {
    const newOffset = offset + 20;
    setOffset(newOffset);
    setLoadingMore(true);
    fetchPosts(schoolFilter, categoryFilter, newOffset, true);
  }

  function handlePostSuccess(post: NewsPost) {
    setPosts(prev => [post, ...prev]);
    setShowModal(false);
  }

  return (
    <>
      {showModal && user && userSchool && (
        <PostModal
          userSchool={userSchool}
          displayName={displayName}
          onClose={() => setShowModal(false)}
          onSuccess={handlePostSuccess}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-white">DAO Headlines</h1>
          </div>
          <p className="text-sm text-gray-500">News and updates from across the DormDAO network</p>
        </div>
        {user && userSchool && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Post Update
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {knownSchools.length > 0 && (
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">All Schools</option>
            {knownSchools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                categoryFilter === key
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-transparent border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 py-20 text-center">
          <Newspaper className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No posts yet</p>
          <p className="text-gray-700 text-xs mt-1">
            {user && userSchool
              ? "Be the first to post an update from your school."
              : "Sign in to post the first update from your school."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-5 py-2 text-xs font-medium border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
