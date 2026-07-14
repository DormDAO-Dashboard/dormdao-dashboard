"use client";
import { useEffect, useState } from "react";
import { FileText, Download, Lock, Play } from "lucide-react";
import { SchoolLogo } from "@/components/SchoolLogo";
import { VideoModal } from "@/components/VideoModal";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import { getLockReason, type TokenDocument } from "@/lib/documents";
import { schoolDisplayName } from "@/lib/schoolData";

function formatDocDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TypeBadge({ type }: { type: string }) {
  if (type === "pitch_deck") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white border border-blue-700">Pitch Deck</span>
  );
  if (type === "report") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-600 text-white border border-emerald-700">Fund Report</span>
  );
  if (type === "thesis") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white border border-purple-700">Investment Thesis</span>
  );
  if (type === "video") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-600 text-white border border-amber-700">Video</span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white border border-gray-600">Document</span>
  );
}

export function AllSchoolDocuments() {
  const [docs, setDocs] = useState<TokenDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingDoc, setPlayingDoc] = useState<TokenDocument | null>(null);

  useEffect(() => {
    fetch("/api/documents?all=true")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/30 h-24 animate-pulse" />
      ))}
    </div>
  );

  if (docs.length === 0) return (
    <div className="text-center py-20 text-gray-500">No documents uploaded yet.</div>
  );

  const bySchool = new Map<string, TokenDocument[]>();
  for (const doc of docs) {
    const key = doc.school ?? "Other";
    if (!bySchool.has(key)) bySchool.set(key, []);
    bySchool.get(key)!.push(doc);
  }

  return (
    <>
      <div className="space-y-6">
        {[...bySchool.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([school, schoolDocs]) => (
          <div key={school} className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
              <SchoolLogo name={school} size={24} />
              <Link href={`/schools/${slugify(school)}`} className="text-sm font-semibold text-white hover:text-primary transition-colors">
                {schoolDisplayName(school)}
              </Link>
              <span className="text-xs text-gray-600">{schoolDocs.length} document{schoolDocs.length !== 1 ? "s" : ""}</span>
            </div>
            <ul className="divide-y divide-gray-800/60">
              {schoolDocs.map((doc) => {
                if (doc.locked) {
                  return (
                    <li key={doc.id} className="flex items-center gap-4 px-5 py-4 opacity-60">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-400 truncate">{doc.title}</div>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <TypeBadge type={doc.document_type} />
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
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                        <Play className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{doc.title}</div>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <TypeBadge type={doc.document_type} />
                          {doc.document_date && (
                            <span className="text-xs text-gray-500">{formatDocDate(doc.document_date)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setPlayingDoc(doc)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Watch
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{doc.title}</div>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        <TypeBadge type={doc.document_type} />
                        {doc.document_date && (
                          <span className="text-xs text-gray-500">{formatDocDate(doc.document_date)}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.file_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      View
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
