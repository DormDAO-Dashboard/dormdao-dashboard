"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SchoolDocument {
  id: string;
  token_ticker: string;
  title: string;
  school: string | null;
  document_date: string | null;
  file_url: string;
  document_type: string;
  created_at: string;
}

function formatDocDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TypeBadge({ type }: { type: string }) {
  if (type === "pitch_deck") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white border border-blue-700">
        Pitch Deck
      </span>
    );
  }
  if (type === "report") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-600 text-white border border-emerald-700">
        Fund Report
      </span>
    );
  }
  if (type === "thesis") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white border border-purple-700">
        Investment Thesis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500 text-white border border-gray-600">
      Document
    </span>
  );
}

function UploadForm({ schoolName, onUploaded }: { schoolName: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("pitch_deck");
  const [docDate, setDocDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("school", schoolName);
      fd.append("document_type", docType);
      if (docDate) fd.append("document_date", docDate);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Upload failed");
      } else {
        setTitle("");
        setFile(null);
        setDocDate("");
        onUploaded();
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-800 px-5 py-4 space-y-3">
      <p className="text-xs font-medium text-gray-400">Upload Document</p>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
        />
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-primary"
        >
          <option value="pitch_deck">Pitch Deck</option>
          <option value="thesis">Investment Thesis</option>
          <option value="report">Fund Report</option>
          <option value="document">Other Document</option>
        </select>
        <input
          type="date"
          value={docDate}
          onChange={(e) => setDocDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-primary"
        />
        <label className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors">
          <Upload className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-400 truncate">{file ? file.name : "Choose file…"}</span>
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={uploading || !file || !title}
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

export function SchoolDocuments({ schoolName }: { schoolName: string }) {
  const [docs, setDocs] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [canUpload, setCanUpload] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthLoading(false); return; }
      setIsLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("school")
        .eq("id", user.id)
        .single();
      if (profile?.school?.toLowerCase() === schoolName.toLowerCase()) {
        setCanUpload(true);
      }
      setAuthLoading(false);
    });
  }, [schoolName]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/documents?school=${encodeURIComponent(schoolName)}`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolName, refreshKey]);

  if (loading || authLoading) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Documents</h2>
      </div>

      {docs.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-gray-800/60">
          {docs.map((doc) => (
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
      )}

      {canUpload && (
        <UploadForm schoolName={schoolName} onUploaded={() => setRefreshKey((k) => k + 1)} />
      )}

      {!canUpload && (
        <div className="border-t border-gray-800 px-5 py-4 text-xs text-gray-600">
          {!isLoggedIn ? (
            <><Link href="/login" className="text-primary hover:underline">Sign in</Link> and set your school to upload documents.</>
          ) : (
            <>Members of {schoolName} can <Link href="/profile" className="text-primary hover:underline">set their school on their profile</Link> to upload documents.</>
          )}
        </div>
      )}
    </div>
  );
}
