"use client";
import { useRef, useState } from "react";
import { X, Paperclip, Loader2 } from "lucide-react";
import type { SchoolColors } from "@/lib/schoolColors";
import type { Proposal } from "@/lib/proposals";

interface Props {
  slug: string;
  schoolName: string;
  colors: SchoolColors;
  onClose: () => void;
  onCreated: (proposal: Proposal, warning?: string) => void;
}

interface DocSlot {
  label: string;
  type: string;
}

const VOTING_PERIOD_HOURS = 36;

const DOC_SLOTS: DocSlot[] = [
  { label: "Pitch Deck", type: "pitch_deck" },
  { label: "Executive Summary", type: "exec_summary" },
  { label: "Fund Report", type: "fund_report" },
];

function votingDeadline(): Date {
  const d = new Date();
  d.setHours(d.getHours() + VOTING_PERIOD_HOURS);
  return d;
}

function formatDeadline(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function uploadDoc(file: File, ticker: string, schoolName: string, slot: DocSlot): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("ticker", ticker || "SCHOOL");
  fd.append("title", `${ticker ? `$${ticker} ` : ""}${slot.label}`);
  fd.append("school", schoolName);
  fd.append("document_type", slot.type);
  fd.append("document_date", new Date().toISOString().slice(0, 10));

  const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
  const data = await res.json() as { document?: { id: string }; error?: string };
  if (!res.ok || !data.document?.id) throw new Error(data.error ?? `Failed to upload ${slot.label}`);
  return data.document.id;
}

export function NewProposalModal({ slug, schoolName, colors, onClose, onCreated }: Props) {
  const [ticker, setTicker] = useState("");
  const [title, setTitle] = useState("");
  const [titleManual, setTitleManual] = useState(false);
  const [description, setDescription] = useState("");
  const [sizeEth, setSizeEth] = useState("");
  const [priceTarget, setPriceTarget] = useState("");
  const [deadline] = useState(votingDeadline);
  const [docFiles, setDocFiles] = useState<(File | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function autoTitle(t: string): string {
    return t ? `Buy $${t}` : "";
  }

  function handleTickerChange(val: string) {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setTicker(upper);
    if (!titleManual) setTitle(autoTitle(upper));
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    setTitleManual(true);
  }

  function setDoc(idx: number, file: File | null) {
    setDocFiles((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const documentIds: string[] = [];
      for (let i = 0; i < DOC_SLOTS.length; i++) {
        const file = docFiles[i];
        if (!file) continue;
        setUploadStatus(`Uploading ${DOC_SLOTS[i].label}…`);
        const docId = await uploadDoc(file, ticker, schoolName, DOC_SLOTS[i]);
        documentIds.push(docId);
      }
      setUploadStatus(null);

      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: slug,
          token_ticker: ticker,
          title,
          description,
          recommended_size_eth: sizeEth ? parseFloat(sizeEth) : undefined,
          price_target: priceTarget ? parseFloat(priceTarget) : undefined,
          document_ids: documentIds.length > 0 ? documentIds : undefined,
        }),
      });
      const data = await res.json() as { proposal?: Proposal; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to submit proposal");
        return;
      }
      onCreated(data.proposal!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: colors.primary }} />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Investment Proposal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Token Ticker <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => handleTickerChange(e.target.value)}
                placeholder="e.g. HYPE"
                required
                maxLength={20}
                className={inputClass + " font-mono"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Recommended Size (ETH)
              </label>
              <input
                type="number"
                value={sizeEth}
                onChange={(e) => setSizeEth(e.target.value)}
                placeholder="e.g. 4.0"
                min="0"
                step="0.1"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Proposal Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              maxLength={200}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Pitch Summary / Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              maxLength={5000}
              placeholder="Explain the investment thesis, catalysts, risks..."
              className={inputClass + " resize-none"}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/5000</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Price Target (USD)
            </label>
            <input
              type="number"
              value={priceTarget}
              onChange={(e) => setPriceTarget(e.target.value)}
              placeholder="e.g. 25.00"
              min="0"
              step="0.01"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {VOTING_PERIOD_HOURS} Hours
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Ends {formatDeadline(deadline)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Supporting Documents <span className="text-gray-400 font-normal">(optional PDFs)</span>
            </label>
            <div className="space-y-2">
              {DOC_SLOTS.map((slot, i) => (
                <div key={slot.type} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary/50 cursor-pointer transition-colors text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate min-w-0">
                      {docFiles[i] ? docFiles[i]!.name : slot.label}
                    </span>
                    <input
                      ref={fileRefs[i]}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={(e) => setDoc(i, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {docFiles[i] && (
                    <button
                      type="button"
                      onClick={() => {
                        setDoc(i, null);
                        if (fileRefs[i].current) fileRefs[i].current!.value = "";
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {uploadStatus && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {uploadStatus}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: colors.primary, color: colors.text }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? (uploadStatus ? "Uploading…" : "Submitting…") : "Submit Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
