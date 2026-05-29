"use client";
import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { SchoolLogo } from "@/components/SchoolLogo";
import Link from "next/link";
import { slugify } from "@/lib/utils";

interface SchoolDocument {
  id: string;
  token_ticker: string;
  title: string;
  school: string | null;
  document_date: string | null;
  file_url: string;
  document_type: string;
}

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
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white border border-gray-600">Document</span>
  );
}

export function AllSchoolDocuments() {
  const [docs, setDocs] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 h-24 animate-pulse" />
      ))}
    </div>
  );

  if (docs.length === 0) return (
    <div className="text-center py-20 text-gray-500">No documents uploaded yet.</div>
  );

  // Group by school
  const bySchool = new Map<string, SchoolDocument[]>();
  for (const doc of docs) {
    const key = doc.school ?? "Other";
    if (!bySchool.has(key)) bySchool.set(key, []);
    bySchool.get(key)!.push(doc);
  }

  return (
    <div className="space-y-6">
      {[...bySchool.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([school, schoolDocs]) => (
        <div key={school} className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
            <SchoolLogo name={school} size={24} />
            <Link href={`/schools/${slugify(school)}`} className="text-sm font-semibold text-white hover:text-primary transition-colors">
              {school}
            </Link>
            <span className="text-xs text-gray-600">{schoolDocs.length} document{schoolDocs.length !== 1 ? "s" : ""}</span>
          </div>
          <ul className="divide-y divide-gray-800/60">
            {schoolDocs.map((doc) => (
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
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                >
                  <Download className="w-3 h-3" />
                  View
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
