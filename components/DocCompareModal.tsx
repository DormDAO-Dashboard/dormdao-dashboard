"use client";
import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";

export interface SchoolDocument {
  id: string;
  token_ticker: string;
  title: string;
  school: string | null;
  document_date: string | null;
  file_url: string | null;
  document_type: string;
}

function formatDocType(type: string): string {
  if (type === "pitch_deck") return "Pitch Deck";
  if (type === "report") return "Fund Report";
  if (type === "thesis") return "Investment Thesis";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  docs: SchoolDocument[];
  onClose: () => void;
}

export function DocCompareModal({ docs, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Comparing {docs.length} Documents
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        {docs.map((doc, i) => (
          <div
            key={doc.id}
            className={cn("flex flex-col min-h-0", i === 0 && "md:border-r border-gray-800")}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-900/60 shrink-0 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{doc.title}</p>
                <p className="text-xs text-gray-500">
                  {doc.school ? schoolDisplayName(doc.school) : "—"} · {formatDocType(doc.document_type)}
                </p>
              </div>
              <a
                href={doc.file_url ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <iframe
              src={doc.file_url ?? ""}
              className="flex-1 w-full border-0"
              title={doc.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
