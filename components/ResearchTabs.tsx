"use client";
import { useState, useEffect, useMemo } from "react";
import { FileText, ExternalLink, Search, Lock, Play } from "lucide-react";
import { DocCompareModal } from "@/components/DocCompareModal";
import { VideoModal } from "@/components/VideoModal";
import { getLockReason, type TokenDocument } from "@/lib/documents";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_TABS = [
  { label: "All",            value: "" },
  { label: "Pitch Decks",    value: "pitch_deck" },
  { label: "Exec Summaries", value: "exec_summary" },
  { label: "Fund Reports",   value: "report" },
  { label: "Videos",         value: "video" },
] as const;

type SortOption = "newest" | "oldest" | "school" | "token";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "School A–Z",   value: "school" },
  { label: "Token A–Z",    value: "token" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDocType(type: string): string {
  if (type === "pitch_deck")   return "Pitch Deck";
  if (type === "exec_summary") return "Exec Summary";
  if (type === "report")       return "Fund Report";
  if (type === "thesis")       return "Investment Thesis";
  if (type === "video")        return "Video";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDocMonth(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function docTypeBadgeClass(type: string): string {
  if (type === "pitch_deck")
    return "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30";
  if (type === "exec_summary")
    return "bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30";
  if (type === "report")
    return "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30";
  if (type === "thesis")
    return "bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30";
  if (type === "video")
    return "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30";
  return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap text-xs px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary text-white border-primary"
          : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 bg-white dark:bg-transparent hover:border-gray-300 dark:hover:border-white/20"
      )}
    >
      {children}
    </button>
  );
}

function LockedDocumentCard({ doc }: { doc: TokenDocument }) {
  const reason = getLockReason(doc.visibility, doc.school);
  return (
    <div className="flex flex-col rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/30 p-3.5 opacity-60 h-full">
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
          {doc.title}
        </h3>
        <Lock className="w-3 h-3 text-gray-400 dark:text-gray-600 shrink-0 mt-0.5" />
      </div>
      <span className={cn(
        "inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5",
        docTypeBadgeClass(doc.document_type)
      )}>
        {formatDocType(doc.document_type)}
      </span>
      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{doc.school ?? "—"}</p>
      <p className="text-xs text-gray-400 dark:text-gray-600 mt-auto pt-2">{reason}</p>
    </div>
  );
}

function VideoDocumentCard({ doc, onPlay }: { doc: TokenDocument; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3.5 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all cursor-pointer h-full text-left w-full"
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {doc.title}
        </h3>
        <Play className="w-3 h-3 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />
      </div>
      <span className={cn(
        "inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5",
        docTypeBadgeClass(doc.document_type)
      )}>
        {formatDocType(doc.document_type)}
      </span>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.school ?? "—"}</p>
      <p className="text-xs text-gray-400 dark:text-gray-600 mt-auto pt-2">{formatDocMonth(doc.document_date)}</p>
    </button>
  );
}

function DocumentCard({ doc, compareMode, selected, onToggle, disabled }: {
  doc: TokenDocument;
  compareMode: boolean;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className={cn(
      "relative",
      compareMode && selected && "ring-2 ring-primary/50 rounded-xl",
      compareMode && disabled && "opacity-40"
    )}>
      {compareMode && (
        <>
          <div
            className={cn("absolute inset-0 z-10 rounded-xl", disabled ? "cursor-not-allowed" : "cursor-pointer")}
            onClick={disabled ? undefined : onToggle}
          />
          <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center",
              selected
                ? "bg-primary border-primary"
                : "border-gray-400 dark:border-gray-500 bg-white/80 dark:bg-gray-900/80"
            )}>
              {selected && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 10 8">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        </>
      )}
      <a
        href={doc.file_url!}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3.5 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all cursor-pointer h-full"
      >
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {doc.title}
          </h3>
          <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />
        </div>
        <span className={cn(
          "inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5",
          docTypeBadgeClass(doc.document_type)
        )}>
          {formatDocType(doc.document_type)}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.school ?? "—"}</p>
        {doc.token_ticker && !/^school$/i.test(doc.token_ticker) && (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">${doc.token_ticker}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-auto pt-2">{formatDocMonth(doc.document_date)}</p>
      </a>
    </div>
  );
}

// ── DormDocsGrid ──────────────────────────────────────────────────────────────

function DormDocsGrid() {
  const [docs, setDocs] = useState<TokenDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [tokenSearch, setTokenSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<TokenDocument[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [playingDoc, setPlayingDoc] = useState<TokenDocument | null>(null);

  useEffect(() => {
    fetch("/api/documents?all=true")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const schools = useMemo(
    () => [...new Set(docs.map((d) => d.school).filter(Boolean) as string[])].sort(),
    [docs]
  );

  const years = useMemo(
    () => [...new Set(docs.map((d) => d.document_date?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(),
    [docs]
  );

  const filtered = useMemo(() => {
    const q = tokenSearch.toLowerCase().trim();
    const result = docs.filter((doc) => {
      if (typeFilter && doc.document_type !== typeFilter) return false;
      if (schoolFilter && doc.school?.toLowerCase() !== schoolFilter.toLowerCase()) return false;
      if (yearFilter && doc.document_date?.slice(0, 4) !== yearFilter) return false;
      if (q && !(doc.token_ticker ?? "").toLowerCase().includes(q) && !doc.title.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === "newest") return (b.document_date ?? "").localeCompare(a.document_date ?? "");
      if (sort === "oldest") return (a.document_date ?? "").localeCompare(b.document_date ?? "");
      if (sort === "school") return (a.school ?? "").localeCompare(b.school ?? "");
      return (a.token_ticker ?? "").localeCompare(b.token_ticker ?? "");
    });
  }, [docs, typeFilter, schoolFilter, yearFilter, tokenSearch, sort]);

  function toggleDoc(doc: TokenDocument) {
    setSelectedDocs((prev) =>
      prev.some((d) => d.id === doc.id) ? prev.filter((d) => d.id !== doc.id) : [...prev, doc]
    );
  }

  return (
    <div>
      {/* Type tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800 mb-3">
        {TYPE_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
              typeFilter === value
                ? "border-primary text-gray-900 dark:text-white font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Pill active={schoolFilter === ""} onClick={() => setSchoolFilter("")}>All Schools</Pill>
          {schools.map((s) => (
            <Pill key={s} active={schoolFilter === s} onClick={() => setSchoolFilter(s)}>{s}</Pill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <Pill active={yearFilter === ""} onClick={() => setYearFilter("")}>All Years</Pill>
            {years.map((y) => (
              <Pill key={y} active={yearFilter === y} onClick={() => setYearFilter(y)}>{y}</Pill>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder="Token or title…"
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-primary/50 w-36"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setCompareMode((m) => !m); setSelectedDocs([]); }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap",
                compareMode
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-600"
              )}
            >
              {compareMode ? "Exit Compare" : "Compare Docs"}
            </button>
          </div>
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {filtered.length} document{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Document grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-900/50 h-32 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
          {docs.length === 0 ? "No documents uploaded yet." : "No documents match your filters."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((doc) => {
            if (doc.locked) {
              return <LockedDocumentCard key={doc.id} doc={doc} />;
            }
            if (doc.document_type === "video" && doc.file_url) {
              return <VideoDocumentCard key={doc.id} doc={doc} onPlay={() => setPlayingDoc(doc)} />;
            }
            const isSelected = selectedDocs.some((d) => d.id === doc.id);
            const isDisabled = compareMode && !isSelected && selectedDocs.length >= 2;
            return (
              <DocumentCard
                key={doc.id}
                doc={doc}
                compareMode={compareMode}
                selected={isSelected}
                onToggle={() => toggleDoc(doc)}
                disabled={isDisabled}
              />
            );
          })}
        </div>
      )}

      {/* Compare action bar */}
      {compareMode && selectedDocs.length === 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur-sm">
          <span className="text-sm text-gray-600 dark:text-gray-300">2 documents selected</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedDocs([]); setCompareMode(false); }}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowCompare(true)}
              className="px-4 py-2 text-xs font-medium text-black bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Compare Documents
            </button>
          </div>
        </div>
      )}

      {showCompare && (
        <DocCompareModal docs={selectedDocs} onClose={() => setShowCompare(false)} />
      )}

      {playingDoc?.file_url && (
        <VideoModal
          url={playingDoc.file_url}
          title={playingDoc.title}
          onClose={() => setPlayingDoc(null)}
        />
      )}
    </div>
  );
}

// ── ResearchTabs (page wrapper) ───────────────────────────────────────────────

export function ResearchTabs({ initialTickers: _ }: { initialTickers: string[] }) {
  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">DormDocs</h1>
        </div>
        <p className="text-gray-500 text-sm ml-8">Investment pitches and research from the DormDAO ecosystem</p>
      </div>
      <DormDocsGrid />
    </div>
  );
}
