"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, GraduationCap, MessageSquare, FileText, X, DollarSign,
  Clock, ArrowRight, Trophy, BarChart2, Activity, Newspaper,
  MessagesSquare, BookOpen,
} from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { getSchoolColors } from "@/lib/schoolColors";
import { createClient } from "@/lib/supabase/client";
import { SchoolLogo } from "@/components/SchoolLogo";

// ── Static data ───────────────────────────────────────────────────────────────

const SCHOOLS = [
  { name: "Vanderbilt",     slug: "vanderbilt" },
  { name: "Villanova",      slug: "villanova" },
  { name: "Boston College", slug: "boston-college" },
  { name: "Purdue",         slug: "purdue" },
  { name: "Oregon",         slug: "oregon" },
  { name: "Michigan",       slug: "michigan" },
  { name: "Columbia",       slug: "columbia" },
  { name: "USC",            slug: "usc" },
  { name: "Penn",           slug: "penn" },
  { name: "Cornell",        slug: "cornell" },
  { name: "St. Andrews",    slug: "st-andrews" },
  { name: "Waterloo",       slug: "waterloo" },
  { name: "NYU",            slug: "nyu" },
  { name: "Berkeley",       slug: "berkeley" },
  { name: "Dartmouth",      slug: "dartmouth" },
  { name: "Texas",          slug: "texas" },
  { name: "Cambridge",      slug: "cambridge" },
];

const TOKENS = [
  { ticker: "BTC",    name: "Bitcoin" },
  { ticker: "ETH",    name: "Ethereum" },
  { ticker: "SOL",    name: "Solana" },
  { ticker: "ARB",    name: "Arbitrum" },
  { ticker: "OP",     name: "Optimism" },
  { ticker: "LINK",   name: "Chainlink" },
  { ticker: "UNI",    name: "Uniswap" },
  { ticker: "AAVE",   name: "Aave" },
  { ticker: "GMX",    name: "GMX" },
  { ticker: "MKR",    name: "Maker" },
  { ticker: "CRV",    name: "Curve" },
  { ticker: "WLD",    name: "Worldcoin" },
  { ticker: "PENDLE", name: "Pendle" },
  { ticker: "ENA",    name: "Ethena" },
  { ticker: "JTO",    name: "Jito" },
  { ticker: "PYTH",   name: "Pyth Network" },
  { ticker: "EIGEN",  name: "EigenLayer" },
  { ticker: "TIA",    name: "Celestia" },
  { ticker: "ZK",     name: "ZKsync" },
  { ticker: "W",      name: "Wormhole" },
];

const QUICK_LINKS = [
  { href: "/",          label: "Leaderboard", icon: Trophy },
  { href: "/schools",   label: "Schools",     icon: GraduationCap },
  { href: "/analytics", label: "Analytics",   icon: BarChart2 },
  { href: "/activity",  label: "Activity",    icon: Activity },
  { href: "/news",      label: "News",        icon: Newspaper },
  { href: "/forum",     label: "Forum",       icon: MessagesSquare },
  { href: "/research",  label: "DormDocs",    icon: BookOpen },
] as const;

const RECENT_KEY = "search-recent";
const MAX_RECENT = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  type: "token" | "school" | "document" | "thread";
  label: string;
  subtitle?: string;
  href: string;
  external?: boolean;
  docType?: string;
}

interface GroupedResults {
  tokens:    SearchResult[];
  schools:   SearchResult[];
  documents: SearchResult[];
  threads:   SearchResult[];
}

interface RecentItem {
  label:    string;
  href:     string;
  type:     SearchResult["type"];
  external?: boolean;
}

interface ApiThreadResult {
  id: string;
  title: string;
  category?: string;
  school?: string;
}

interface ApiDocResult {
  file_url:      string;
  title:         string;
  document_type?: string;
  token_ticker?:  string;
  school?:        string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 mx-1">
      <div className="w-7 h-7 rounded-full skeleton shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 skeleton rounded" />
        <div className="h-2.5 w-1/3 skeleton rounded" />
      </div>
    </div>
  );
}

function CategoryHeader({ label, seeAllHref, onClose }: { label: string; seeAllHref: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <a
        href={seeAllHref}
        onClick={onClose}
        className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500 hover:text-primary transition-colors"
      >
        See all <ArrowRight className="w-2.5 h-2.5" />
      </a>
    </div>
  );
}

function TypeBadge({ type, docType }: { type: SearchResult["type"]; docType?: string }) {
  let label = type === "thread" ? "Thread" : type === "school" ? "School" : type === "token" ? "Token" : "Doc";
  let cls   = "bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400";

  if (type === "token") {
    cls = "bg-amber-50 dark:bg-amber-500/[0.12] text-amber-600 dark:text-amber-400";
  } else if (type === "document") {
    if (docType === "pitch_deck") {
      label = "Pitch"; cls = "bg-blue-50 dark:bg-blue-500/[0.12] text-blue-600 dark:text-blue-400";
    } else if (docType === "report" || docType === "exec_summary") {
      label = "Report"; cls = "bg-green-50 dark:bg-green-500/[0.12] text-green-600 dark:text-green-400";
    } else if (docType === "thesis") {
      label = "Thesis"; cls = "bg-purple-50 dark:bg-purple-500/[0.12] text-purple-600 dark:text-purple-400";
    }
  }

  return (
    <span className={cn("text-[10px] font-medium uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.type === "school") {
    return (
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
        <SchoolLogo name={result.label} size={28} />
      </div>
    );
  }
  const Icon = result.type === "token" ? DollarSign : result.type === "thread" ? MessageSquare : FileText;
  const cls  = result.type === "token"
    ? "bg-amber-50 dark:bg-amber-500/[0.12] text-amber-500 dark:text-amber-400"
    : "bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400";
  return (
    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", cls)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

function ResultRow({
  result, active, onMouseDown,
}: {
  result: SearchResult;
  active: boolean;
  onMouseDown: () => void;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onMouseDown(); }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg transition-colors text-left",
        "min-h-[44px]",
        active
          ? "bg-gray-100 dark:bg-white/[0.10]"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.05]"
      )}
      style={{ width: "calc(100% - 8px)" }}
    >
      <ResultIcon result={result} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">
          {result.label}
        </div>
        {result.subtitle && (
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate leading-snug">
            {result.subtitle}
          </div>
        )}
      </div>
      <TypeBadge type={result.type} docType={result.docType} />
    </button>
  );
}

function SectionDivider() {
  return <div className="mx-3 mt-2 border-t border-gray-100 dark:border-white/[0.06]" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const [query, setQuery]         = useState("");
  const [open, setOpen]           = useState(false);
  const [grouped, setGrouped]     = useState<GroupedResults>({ tokens: [], schools: [], documents: [], threads: [] });
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading]     = useState(false);
  const [recentNav, setRecentNav] = useState<RecentItem[]>([]);
  const [userSchool, setUserSchool] = useState<{ name: string; slug: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const dq       = useDebounce(query, 300);

  useEffect(() => {
    try { setRecentNav(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")); } catch {}
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("profiles").select("school").eq("id", data.user.id).single();
      if (p?.school) setUserSchool({ name: p.school, slug: slugify(p.school) });
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (dq.length < 2) {
      setGrouped({ tokens: [], schools: [], documents: [], threads: [] });
      setLoading(false);
      return;
    }
    const q = dq.toLowerCase();

    const tokens: SearchResult[] = TOKENS
      .filter(t => t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(t => ({ type: "token", label: t.name, subtitle: `$${t.ticker}`, href: `/tokens/${t.ticker.toLowerCase()}` }));

    const schools: SearchResult[] = SCHOOLS
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(s => ({ type: "school", label: s.name, href: `/schools/${s.slug}` }));

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(dq)}`)
      .then(r => r.json())
      .then(data => {
        const documents: SearchResult[] = (data.documents ?? []).map((d: ApiDocResult) => ({
          type: "document" as const,
          label: d.title,
          subtitle: d.school ?? (d.token_ticker ? `$${d.token_ticker}` : undefined),
          href: d.file_url,
          external: true,
          docType: d.document_type,
        }));
        const threads: SearchResult[] = (data.threads ?? []).map((t: ApiThreadResult) => ({
          type: "thread" as const,
          label: t.title,
          subtitle: t.school ?? t.category?.replace(/_/g, " "),
          href: `/forum/${t.id}`,
        }));
        setGrouped({ tokens, schools, documents, threads });
        setActiveIdx(-1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dq]);

  function saveRecent(r: SearchResult) {
    try {
      const item: RecentItem = { label: r.label, href: r.href, type: r.type, external: r.external };
      const prev: RecentItem[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      const deduped = prev.filter(x => x.href !== item.href);
      const next = [item, ...deduped].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecentNav(next);
    } catch {}
  }

  function navigate(r: SearchResult) {
    saveRecent(r);
    if (r.external) window.open(r.href, "_blank", "noopener,noreferrer");
    else router.push(r.href);
    close();
  }

  function close() {
    setOpen(false);
    setQuery("");
    setGrouped({ tokens: [], schools: [], documents: [], threads: [] });
    inputRef.current?.blur();
  }

  // Flatten results in display order for keyboard nav
  const flat: SearchResult[] = [
    ...grouped.tokens,
    ...grouped.schools,
    ...grouped.documents,
    ...grouped.threads,
  ];

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && activeIdx >= 0) navigate(flat[activeIdx]);
  }

  const hasQuery   = dq.length >= 2;
  const hasResults = flat.length > 0;
  const showIdle   = open && !hasQuery;
  const showPanel  = open;

  // Flat index offset per group for keyboard highlight
  const tokenOffset = 0;
  const schoolOffset = grouped.tokens.length;
  const docOffset    = schoolOffset + grouped.schools.length;
  const threadOffset = docOffset    + grouped.documents.length;

  return (
    <div className="relative w-full">
      {/* ── Input bar ── */}
      <div className={cn(
        "flex items-center gap-2 h-9 px-3 rounded-full transition-all duration-150",
        open
          ? "bg-white dark:bg-white/[0.12] ring-2 ring-primary/20 border border-primary/50"
          : "bg-gray-100 dark:bg-white/[0.08] border border-transparent hover:bg-gray-200/70 dark:hover:bg-white/[0.12]"
      )}>
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          data-search-input
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search tokens, schools, research..."
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none min-w-0"
        />
        {query ? (
          <button
            onClick={() => { setQuery(""); setGrouped({ tokens: [], schools: [], documents: [], threads: [] }); inputRef.current?.focus(); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className={cn(
            "hidden sm:inline-flex items-center text-[10px] rounded px-1.5 py-0.5 leading-none shrink-0 transition-opacity duration-100",
            "bg-gray-200/80 dark:bg-white/[0.10] text-gray-400",
            open ? "opacity-0 pointer-events-none" : "opacity-100"
          )}>
            ⌘K
          </kbd>
        )}
      </div>

      {/* ── Backdrop ── */}
      {showPanel && (
        <div className="fixed inset-0 z-40" onClick={close} />
      )}

      {/* ── Dropdown ── */}
      {showPanel && (
        <div className={cn(
          "absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-xl shadow-xl overflow-hidden",
          "bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.10]",
          "max-h-[480px] overflow-y-auto scrollbar-hide",
          "animate-search-in"
        )}>

          {/* ── Idle: recent + quick links ── */}
          {showIdle && (
            <div className="py-2">
              {userSchool && (() => {
                const colors = getSchoolColors(userSchool.slug);
                return (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Your School</span>
                    </div>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); router.push(`/schools/${userSchool.slug}`); close(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
                      style={{ width: "calc(100% - 8px)", borderLeft: `3px solid ${colors.primary}` }}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                        <SchoolLogo name={userSchool.name} size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{userSchool.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">Your school</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </button>
                    <SectionDivider />
                  </>
                );
              })()}

              {recentNav.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Recent</span>
                  </div>
                  {recentNav.map((item, i) => {
                    const r: SearchResult = { type: item.type, label: item.label, href: item.href, external: item.external };
                    return (
                      <button
                        key={i}
                        onMouseDown={e => { e.preventDefault(); navigate(r); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
                        <TypeBadge type={item.type} />
                      </button>
                    );
                  })}
                  <SectionDivider />
                </>
              )}

              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Jump to</span>
              </div>
              {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onMouseDown={e => { e.preventDefault(); router.push(href); close(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </button>
              ))}
              <div className="h-2" />
            </div>
          )}

          {/* ── Loading: skeletons ── */}
          {hasQuery && loading && (
            <div className="py-2">
              {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* ── Results ── */}
          {hasQuery && !loading && hasResults && (
            <div className="py-2">
              {userSchool && userSchool.name.toLowerCase().includes(dq.toLowerCase()) && (() => {
                const colors = getSchoolColors(userSchool.slug);
                return (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">Your School</span>
                    </div>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); router.push(`/schools/${userSchool.slug}`); close(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
                      style={{ width: "calc(100% - 8px)", borderLeft: `3px solid ${colors.primary}` }}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                        <SchoolLogo name={userSchool.name} size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{userSchool.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">Your school</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </button>
                    <SectionDivider />
                  </>
                );
              })()}

              {grouped.tokens.length > 0 && (
                <>
                  <CategoryHeader label="Tokens" seeAllHref="/tokens" onClose={close} />
                  {grouped.tokens.map((r, i) => (
                    <ResultRow key={i} result={r} active={activeIdx === tokenOffset + i} onMouseDown={() => navigate(r)} />
                  ))}
                </>
              )}

              {grouped.schools.length > 0 && (
                <>
                  {grouped.tokens.length > 0 && <SectionDivider />}
                  <CategoryHeader label="Schools" seeAllHref="/schools" onClose={close} />
                  {grouped.schools.map((r, i) => (
                    <ResultRow key={i} result={r} active={activeIdx === schoolOffset + i} onMouseDown={() => navigate(r)} />
                  ))}
                </>
              )}

              {grouped.documents.length > 0 && (
                <>
                  {(grouped.tokens.length > 0 || grouped.schools.length > 0) && <SectionDivider />}
                  <CategoryHeader label="Documents" seeAllHref="/research" onClose={close} />
                  {grouped.documents.map((r, i) => (
                    <ResultRow key={i} result={r} active={activeIdx === docOffset + i} onMouseDown={() => navigate(r)} />
                  ))}
                </>
              )}

              {grouped.threads.length > 0 && (
                <>
                  {(grouped.tokens.length > 0 || grouped.schools.length > 0 || grouped.documents.length > 0) && <SectionDivider />}
                  <CategoryHeader label="Forum Threads" seeAllHref="/forum" onClose={close} />
                  {grouped.threads.map((r, i) => (
                    <ResultRow key={i} result={r} active={activeIdx === threadOffset + i} onMouseDown={() => navigate(r)} />
                  ))}
                </>
              )}
              <div className="h-2" />
            </div>
          )}

          {/* ── Empty state ── */}
          {hasQuery && !loading && !hasResults && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No results for &ldquo;{dq}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
