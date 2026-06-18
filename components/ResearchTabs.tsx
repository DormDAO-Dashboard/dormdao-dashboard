"use client";
import { useState, useEffect, useMemo } from "react";
import { FileText, Search, ExternalLink } from "lucide-react";
import { DocCompareModal } from "@/components/DocCompareModal";
import { cn } from "@/lib/utils";

interface SchoolDocument {
  id: string;
  token_ticker: string;
  title: string;
  school: string | null;
  document_date: string | null;
  file_url: string;
  document_type: string;
}

const DOC_TYPE_OPTIONS = [
  { value: "", label: "All Documents" },
  { value: "pitch_deck", label: "Pitch Deck" },
  { value: "report", label: "Fund Report" },
  { value: "thesis", label: "Investment Thesis" },
];

const SCHOOLS = [
  "Vanderbilt", "Villanova", "Boston College", "Purdue", "Oregon",
  "Michigan", "Columbia", "USC", "Penn", "Cornell",
  "St. Andrews", "Waterloo", "NYU", "Berkeley", "Dartmouth",
  "Texas", "Cambridge",
];

function formatDocType(type: string): string {
  if (type === "pitch_deck") return "Pitch Deck";
  if (type === "report") return "Fund Report";
  if (type === "thesis") return "Investment Thesis";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDocMonth(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function docTypeBadgeClass(type: string): string {
  if (type === "pitch_deck") return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  if (type === "report") return "bg-green-500/15 text-green-400 border border-green-500/30";
  if (type === "thesis") return "bg-purple-500/15 text-purple-400 border border-purple-500/30";
  return "bg-gray-800 text-gray-400 border border-gray-700";
}

function DocumentCard({ doc }: { doc: SchoolDocument }) {
  return (
    <a
      href={doc.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 p-5 hover:border-gray-600 hover:bg-gray-800/40 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-white leading-snug group-hover:text-primary transition-colors">
          {doc.title}
        </h3>
        <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
          docTypeBadgeClass(doc.document_type)
        )}>
          {formatDocType(doc.document_type)}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-1">{doc.school ?? "—"}</p>
      {doc.token_ticker && !/^school$/i.test(doc.token_ticker) && (
        <p className="text-xs text-gray-500 mb-1 font-mono">${doc.token_ticker}</p>
      )}
      <p className="text-xs text-gray-600 mt-auto pt-3">{formatDocMonth(doc.document_date)}</p>
    </a>
  );
}

function DormDocsGrid({ initialTickers }: { initialTickers: string[] }) {
  const [docs, setDocs] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<SchoolDocument[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetch("/api/documents?all=true")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter((doc) => {
      if (schoolFilter && doc.school?.toLowerCase() !== schoolFilter.toLowerCase()) return false;
      if (typeFilter && doc.document_type !== typeFilter) return false;
      if (q && !doc.title.toLowerCase().includes(q) && !(doc.school ?? "").toLowerCase().includes(q) && !(doc.token_ticker ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docs, search, schoolFilter, typeFilter]);

  const schoolsWithDocs = useMemo(() => {
    const names = [...new Set(docs.map((d) => d.school).filter(Boolean) as string[])].sort();
    return names;
  }, [docs]);

  return (
    <div>
      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="w-full sm:w-auto bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 sm:min-w-[140px]"
        >
          <option value="">All Schools</option>
          {schoolsWithDocs.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-auto bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 sm:min-w-[150px]"
        >
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={() => { setCompareMode((m) => !m); setSelectedDocs([]); }}
          className={cn(
            "w-full sm:w-auto shrink-0 text-xs px-3 py-2.5 rounded-lg border transition-colors whitespace-nowrap",
            compareMode
              ? "bg-primary/20 border-primary/50 text-primary"
              : "border-primary/50 text-primary bg-transparent sm:border-gray-700 sm:text-gray-400 sm:hover:text-white sm:hover:border-gray-600 sm:bg-gray-900"
          )}
        >
          {compareMode ? "Exit Compare" : "Compare Docs"}
        </button>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-sm">
          {docs.length === 0 ? "No documents uploaded yet." : "No documents match your filters."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {filtered.map((doc) => {
              const isSelected = selectedDocs.some((d) => d.id === doc.id);
              const isDisabled = compareMode && !isSelected && selectedDocs.length >= 2;
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "relative",
                    compareMode && isSelected && "ring-2 ring-primary/50 rounded-xl",
                    compareMode && isDisabled && "opacity-40"
                  )}
                >
                  {compareMode && (
                    <>
                      <div
                        className={cn(
                          "absolute inset-0 z-10 rounded-xl",
                          isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                        onClick={
                          !isDisabled
                            ? () => {
                                setSelectedDocs((prev) =>
                                  isSelected
                                    ? prev.filter((d) => d.id !== doc.id)
                                    : [...prev, doc]
                                );
                              }
                            : undefined
                        }
                      />
                      <div className="absolute top-3 left-3 z-20 pointer-events-none">
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center",
                          isSelected ? "bg-primary border-primary" : "border-gray-500 bg-gray-900/80"
                        )}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 10 8">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  <DocumentCard doc={doc} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-center">
            <div className="rounded-xl border border-gray-800 bg-gray-900/30 px-8 py-4 text-sm text-gray-500">
              More documents coming soon
            </div>
          </div>
        </>
      )}

      {compareMode && selectedDocs.length === 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm">
          <span className="text-sm text-gray-300">2 documents selected</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedDocs([]); setCompareMode(false); }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
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
        <DocCompareModal
          docs={selectedDocs}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

export function ResearchTabs({ initialTickers }: { initialTickers: string[] }) {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-semibold text-white">DormDocs</h1>
        </div>
        <p className="text-gray-500 text-sm ml-10">Investment pitches and research from the DormDAO ecosystem</p>
      </div>
      <DormDocsGrid initialTickers={initialTickers} />
    </div>
  );
}
