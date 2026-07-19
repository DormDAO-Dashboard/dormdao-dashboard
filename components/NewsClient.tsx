"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ExternalLink, Newspaper, Plus, X,
  Medal, BarChart2, GraduationCap, ChevronDown,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface Contributor {
  author_name: string;
  school: string;
  count: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "",             label: "All" },
  { key: "news",         label: "News" },
  { key: "research",     label: "Research" },
  { key: "event",        label: "Event" },
  { key: "announcement", label: "Announcement" },
] as const;

const CATEGORY_BADGE: Record<string, string> = {
  news:         "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
  research:     "bg-green-50 dark:bg-primary/15 text-green-700 dark:text-primary border border-green-200 dark:border-primary/30",
  event:        "bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30",
  announcement: "bg-amber-50 dark:bg-yellow-500/15 text-amber-600 dark:text-yellow-400 border border-amber-200 dark:border-yellow-500/30",
};

const CATEGORY_BORDER_COLOR: Record<string, string> = {
  news:         "border-l-blue-500",
  research:     "border-l-primary",
  event:        "border-l-purple-500",
  announcement: "border-l-amber-500",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide",
      CATEGORY_BADGE[category] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
    )}>
      {category}
    </span>
  );
}

// ── Featured Card ─────────────────────────────────────────────────────────────

function FeaturedCard({ post }: { post: NewsPost }) {
  function handleClick() {
    if (post.url) window.open(post.url, "_blank", "noopener,noreferrer");
  }
  return (
    <div
      onClick={post.url ? handleClick : undefined}
      className={cn(
        "rounded-xl border p-6 mb-4 transition-all duration-150",
        "bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/60 dark:to-gray-900/20",
        "border-gray-200 dark:border-gray-700",
        post.url ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm" : ""
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Featured</span>
        <span className="text-gray-300 dark:text-gray-700">·</span>
        <CategoryBadge category={post.category} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mb-3">
        {post.title}
      </h2>
      {post.content && (
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-4 mb-5">
          {post.content}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SchoolLogo name={post.school} size={20} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{schoolDisplayName(post.school)}</span>
          {post.author_name && (
            <span className="text-sm text-gray-400 dark:text-gray-500">· {post.author_name}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.created_at)}</span>
          {post.url && <ExternalLink className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
        </div>
      </div>
    </div>
  );
}

// ── Regular Card ──────────────────────────────────────────────────────────────

function RegularCard({ post }: { post: NewsPost }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (post.content?.length ?? 0) > 120;

  function handleClick() {
    if (post.url) window.open(post.url, "_blank", "noopener,noreferrer");
    else setExpanded(e => !e);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "rounded-lg border border-l-[3px] p-4 transition-all duration-150 cursor-pointer",
        "bg-white dark:bg-gray-900/30",
        "border-gray-200 dark:border-gray-800",
        "hover:bg-gray-50/60 dark:hover:bg-gray-800/30 hover:-translate-y-px hover:shadow-sm",
        CATEGORY_BORDER_COLOR[post.category] ?? "border-l-gray-400"
      )}
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug mb-1.5">
        {post.title}
      </h3>
      {post.content && (
        <p className={cn(
          "text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3",
          expanded ? "" : "line-clamp-2"
        )}>
          {post.content}
        </p>
      )}
      {!post.url && isLong && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mb-3 transition-colors"
        >
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-150", expanded && "rotate-180")} />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SchoolLogo name={post.school} size={16} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{schoolDisplayName(post.school)}</span>
          {post.author_name && (
            <span className="text-xs text-gray-400 dark:text-gray-500">· {post.author_name}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.created_at)}</span>
          {post.url && <ExternalLink className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
        </div>
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function FeaturedSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6 mb-4 animate-pulse">
      <div className="h-3 w-20 skeleton rounded mb-3" />
      <div className="h-7 w-3/4 skeleton rounded mb-2" />
      <div className="h-7 w-1/2 skeleton rounded mb-4" />
      <div className="space-y-2 mb-5">
        <div className="h-4 skeleton rounded" />
        <div className="h-4 skeleton rounded" />
        <div className="h-4 w-2/3 skeleton rounded" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="h-4 w-16 skeleton rounded" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-l-[3px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 animate-pulse">
      <div className="h-5 w-3/4 skeleton rounded mb-2" />
      <div className="space-y-1.5 mb-3">
        <div className="h-3.5 skeleton rounded" />
        <div className="h-3.5 w-5/6 skeleton rounded" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-24 skeleton rounded" />
        <div className="h-3 w-16 skeleton rounded" />
      </div>
    </div>
  );
}

// ── Sidebar Widgets ───────────────────────────────────────────────────────────

function SidebarSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SchoolFilterWidget({ schools, selected, onSelect }: {
  schools: string[];
  selected: string;
  onSelect: (s: string) => void;
}) {
  if (schools.length === 0) return null;
  return (
    <SidebarSection title="Filter by School" icon={GraduationCap}>
      <div className="flex flex-wrap gap-1.5">
        {["", ...schools].map(s => (
          <button
            key={s || "__all__"}
            onClick={() => onSelect(s)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              selected === s
                ? "bg-primary text-white border-primary"
                : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
            )}
          >
            {s ? schoolDisplayName(s) : "All Schools"}
          </button>
        ))}
      </div>
    </SidebarSection>
  );
}

function TopContributors({ contributors }: { contributors: Contributor[] }) {
  if (contributors.length === 0) return null;
  return (
    <SidebarSection title="Top Contributors" icon={Medal}>
      <div className="space-y-3">
        {contributors.slice(0, 5).map(c => (
          <div key={`${c.author_name}::${c.school}`} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
              {initials(c.author_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.author_name}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{schoolDisplayName(c.school)}</div>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
              {c.count}
            </span>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}

function ActiveSchoolsWidget({ posts }: { posts: NewsPost[] }) {
  const schoolCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) map.set(p.school, (map.get(p.school) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

  if (schoolCounts.length === 0) return null;
  const max = schoolCounts[0][1];

  return (
    <SidebarSection title="Most Active Schools" icon={BarChart2}>
      <div className="space-y-3">
        {schoolCounts.map(([school, count]) => (
          <div key={school}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{schoolDisplayName(school)}</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums ml-2 shrink-0">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}

// ── Post Modal ────────────────────────────────────────────────────────────────

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

  const inputCls = "w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-primary/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#111] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Post Update</h2>
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
              className="px-4 py-2 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-700 rounded-lg transition-colors"
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

// ── Main Component ────────────────────────────────────────────────────────────

export function NewsClient() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [user, setUser] = useState<User | null>(null);
  const [userSchool, setUserSchool] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [knownSchools, setKnownSchools] = useState<string[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (!u) return;
      supabase.from("profiles").select("school, display_name").eq("id", u.id).single()
        .then(({ data: p }) => {
          setUserSchool(p?.school ?? "");
          setDisplayName(p?.display_name ?? "");
        });
    });
  }, []);

  useEffect(() => {
    fetch("/api/news/contributors")
      .then(r => r.json())
      .then(d => setContributors(d.contributors ?? []))
      .catch(() => {});
  }, []);

  const fetchPosts = useCallback(async (
    schoolF: string, categoryF: string, newOffset: number, append: boolean
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

  function handleSchoolFilter(s: string) {
    setSchoolFilter(s);
    setOffset(0);
  }

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

  const [featured, ...rest] = posts;

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      <SchoolFilterWidget schools={knownSchools} selected={schoolFilter} onSelect={handleSchoolFilter} />
      <TopContributors contributors={contributors} />
      <ActiveSchoolsWidget posts={posts} />
    </div>
  );

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

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">DAO Headlines</h1>
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

      {/* Two-column layout */}
      <div className="flex gap-8 items-start">

        {/* Main column */}
        <div className="flex-1 min-w-0">

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-4">
            {CATEGORIES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={cn(
                  "shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  categoryFilter === key
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Post count + sort */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {!loading && `${posts.length}${hasMore ? "+" : ""} posts`}
            </span>
            <div className="flex items-center gap-0.5">
              {(["latest", "popular"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg transition-colors",
                    sort === s
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  {s === "latest" ? "Latest" : "Popular"}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <>
              <FeaturedSkeleton />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            </>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 py-20 text-center">
              <Newspaper className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No posts yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                {user && userSchool
                  ? "Be the first to post an update from your school."
                  : "Sign in to post the first update."}
              </p>
            </div>
          ) : (
            <>
              {featured && <FeaturedCard post={featured} />}
              <div className="flex flex-col gap-3">
                {rest.map(post => <RegularCard key={post.id} post={post} />)}
              </div>
            </>
          )}

          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <aside className="w-72 shrink-0 hidden lg:block">
          {sidebarContent}
        </aside>
      </div>

      {/* Mobile: widgets below feed */}
      <div className="lg:hidden mt-8">
        {sidebarContent}
      </div>
    </>
  );
}
