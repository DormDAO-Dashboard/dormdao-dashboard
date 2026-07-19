"use client";
import { useEffect, useState } from "react";
import { FileText, Download, Lock, Play } from "lucide-react";
import { getLockReason, type TokenDocument } from "@/lib/documents";
import { schoolDisplayName } from "@/lib/schoolData";
import { VideoModal } from "@/components/VideoModal";

function formatDocDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TypeBadge({ type }: { type: string }) {
  if (type === "pitch_deck")
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white border border-blue-700">Pitch Deck</span>;
  if (type === "report")
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-600 text-white border border-emerald-700">Fund Report</span>;
  if (type === "video")
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-600 text-white border border-amber-700">Video</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white border border-gray-600">Document</span>;
}

export function FundDocuments({ ticker, refreshKey = 0 }: { ticker: string; refreshKey?: number }) {
  const [docs, setDocs] = useState<TokenDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingDoc, setPlayingDoc] = useState<TokenDocument | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/documents?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker, refreshKey]);

  if (loading || docs.length === 0) return null;

  return (
    <>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Fund Documents</h2>
        </div>
        <ul className="divide-y divide-gray-800/60">
          {docs.map((doc) => {
            if (doc.locked) {
              return (
                <li key={doc.id} className="flex items-center gap-4 px-5 py-4 opacity-60">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-400 truncate">{doc.title}</div>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <TypeBadge type={doc.document_type} />
                      {doc.school && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700/60 text-gray-400">{schoolDisplayName(doc.school)}</span>
                      )}
                      {doc.document_date && (
                        <span className="text-xs text-gray-600">{formatDocDate(doc.document_date)}</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {getLockReason(doc.visibility, doc.school)}
                  </span>
                </li>
              );
            }

            if (doc.document_type === "video" && doc.file_url) {
              return (
                <li key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <Play className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</div>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <TypeBadge type={doc.document_type} />
                      {doc.school && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700/60 text-gray-300">{schoolDisplayName(doc.school)}</span>
                      )}
                      {doc.document_date && (
                        <span className="text-xs text-gray-500">{formatDocDate(doc.document_date)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setPlayingDoc(doc)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Watch
                  </button>
                </li>
              );
            }

            return (
              <li key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</div>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <TypeBadge type={doc.document_type} />
                    {doc.school && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700/60 text-gray-300">{schoolDisplayName(doc.school)}</span>
                    )}
                    {doc.document_date && (
                      <span className="text-xs text-gray-500">{formatDocDate(doc.document_date)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={doc.file_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Download className="w-3 h-3" />
                  View
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {playingDoc?.file_url && (
        <VideoModal
          url={playingDoc.file_url}
          title={playingDoc.title}
          onClose={() => setPlayingDoc(null)}
        />
      )}
    </>
  );
}
