"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, GraduationCap, MessageSquare, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SearchResult {
  type: "school" | "thread" | "document";
  label: string;
  sublabel?: string;
  href: string;
  external?: boolean;
}

interface ThreadResult {
  id: string;
  title: string;
  category?: string;
}

interface DocResult {
  file_url: string;
  title: string;
  document_type?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const RESULT_ICONS = {
  school:   GraduationCap,
  thread:   MessageSquare,
  document: FileText,
} as const;

export function GlobalSearch() {
  const [query, setQuery]         = useState("");
  const [open, setOpen]           = useState(false);
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const dq       = useDebounce(query, 300);

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
    if (dq.length < 2) { setResults([]); return; }

    const schoolResults: SearchResult[] = SCHOOLS
      .filter(s => s.name.toLowerCase().includes(dq.toLowerCase()))
      .slice(0, 3)
      .map(s => ({ type: "school", label: s.name, href: `/schools/${s.slug}` }));

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(dq)}`)
      .then(r => r.json())
      .then(data => {
        const threadResults: SearchResult[] = (data.threads ?? []).map((t: ThreadResult) => ({
          type: "thread" as const,
          label: t.title,
          sublabel: t.category?.replace(/_/g, " "),
          href: `/forum/${t.id}`,
        }));
        const docResults: SearchResult[] = (data.documents ?? []).map((d: DocResult) => ({
          type: "document" as const,
          label: d.title,
          sublabel: d.document_type?.replace(/_/g, " "),
          href: d.file_url,
          external: true,
        }));
        setResults([...schoolResults, ...threadResults, ...docResults]);
        setActiveIdx(-1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dq]);

  function navigate(r: SearchResult) {
    if (r.external) {
      window.open(r.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(r.href);
    }
    setOpen(false);
    setQuery("");
    setResults([]);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      navigate(results[activeIdx]);
    }
  }

  const showDropdown = open && (results.length > 0 || (loading && dq.length >= 2));

  return (
    <div className="relative w-full max-w-xs">
      <div className={cn(
        "flex items-center gap-2 h-8 px-3 rounded-lg border transition-colors",
        open
          ? "border-primary/40 bg-gray-800/60"
          : "border-gray-700/50 bg-gray-900/60 hover:border-gray-600/70"
      )}>
        <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search schools, threads…"
          className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none min-w-0"
        />
        {query ? (
          <button
            onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center text-[10px] text-gray-600 border border-gray-700/60 rounded px-1 py-0.5 leading-none">
            ⌘K
          </kbd>
        )}
      </div>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-10 left-0 right-0 z-50 min-w-[280px] bg-[#111] border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden">
            {results.map((r, i) => {
              const Icon = RESULT_ICONS[r.type];
              return (
                <button
                  key={`${r.type}-${i}`}
                  onMouseDown={e => { e.preventDefault(); navigate(r); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    activeIdx === i
                      ? "bg-gray-800/70 text-white"
                      : "text-gray-300 hover:bg-gray-800/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate flex-1 text-sm">{r.label}</span>
                  {r.sublabel && (
                    <span className="text-[10px] text-gray-600 uppercase tracking-wide shrink-0">
                      {r.sublabel}
                    </span>
                  )}
                </button>
              );
            })}
            {loading && results.length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-600 text-center">Searching…</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
