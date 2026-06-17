export interface ForumThread {
  id: string;
  created_at: string;
  title: string;
  content: string | null;
  school: string;
  author_name: string | null;
  category: string;
  token_ticker: string | null;
  upvotes: number;
  reply_count: number;
  is_pinned: boolean;
}

export interface ForumReply {
  id: string;
  created_at: string;
  content: string;
  school: string;
  author_name: string | null;
  upvotes: number;
}

export const CATEGORY_STYLES: Record<string, string> = {
  general:       "bg-gray-800 text-gray-400 border border-gray-700",
  token_research:"bg-blue-500/20 text-blue-400 border border-blue-500/30",
  strategy:      "bg-primary/20 text-primary border border-primary/30",
  questions:     "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  announcements: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

export const CATEGORY_LABELS: Record<string, string> = {
  general:       "General",
  token_research:"Token Research",
  strategy:      "Strategy",
  questions:     "Questions",
  announcements: "Announcements",
};

export function timeAgo(dateStr: string): string {
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
