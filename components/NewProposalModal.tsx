"use client";
import { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import type { SchoolColors } from "@/lib/schoolColors";
import type { Proposal } from "@/lib/proposals";

interface Props {
  slug: string;
  schoolName: string;
  colors: SchoolColors;
  onClose: () => void;
  onCreated: (proposal: Proposal, warning?: string) => void;
}

const VOTING_PERIOD_HOURS = 36;
const MAX_PITCH_FILES = 5;

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

export function NewProposalModal({ slug, schoolName, colors, onClose, onCreated }: Props) {
  const [ticker, setTicker] = useState("");
  const [title, setTitle] = useState("");
  const [titleManual, setTitleManual] = useState(false);
  const [description, setDescription] = useState("");
  const [sizeEth, setSizeEth] = useState("");
  const [deadline] = useState(votingDeadline);
  const [pitchFiles, setPitchFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const pdfsOnly = selected.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    const rejectedNonPdf = selected.length - pdfsOnly.length;

    setPitchFiles((prev) => {
      const combined = [...prev, ...pdfsOnly];
      if (combined.length > MAX_PITCH_FILES) {
        setFileError(`You can attach up to ${MAX_PITCH_FILES} pitch materials.`);
        return combined.slice(0, MAX_PITCH_FILES);
      }
      setFileError(rejectedNonPdf > 0 ? "Only PDF files are supported." : null);
      return combined;
    });
  }

  function removeFile(index: number) {
    setPitchFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length <= MAX_PITCH_FILES) setFileError(null);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: slug,
          token_ticker: ticker,
          title,
          description,
          recommended_size_eth: parseFloat(sizeEth),
          voting_deadline: deadline.toISOString(),
        }),
      });
      const data = await res.json() as { proposal?: Proposal; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to submit proposal");
        return;
      }

      const proposal = data.proposal!;
      let uploadFailures = 0;
      for (const file of pitchFiles) {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("ticker", ticker);
          form.append("title", file.name.replace(/\.pdf$/i, ""));
          form.append("school", schoolName);
          form.append("document_type", "pitch_deck");
          const uploadRes = await fetch("/api/documents/upload", { method: "POST", body: form });
          if (!uploadRes.ok) uploadFailures++;
        } catch {
          uploadFailures++;
        }
      }

      onCreated(
        proposal,
        uploadFailures > 0
          ? `Proposal submitted — ${uploadFailures} pitch material${uploadFailures > 1 ? "s" : ""} failed to upload`
          : undefined
      );
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40";

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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
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
                Recommended Size (ETH) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={sizeEth}
                onChange={(e) => setSizeEth(e.target.value)}
                placeholder="e.g. 4.0"
                required
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
              Pitch Materials <span className="text-gray-400 normal-case font-normal">(optional, PDF)</span>
            </label>
            <label
              htmlFor="pitch-materials-input"
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-primary/40 hover:text-primary cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              Click to upload PDFs
            </label>
            <input
              id="pitch-materials-input"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            {pitchFiles.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {pitchFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-xs text-gray-700 dark:text-gray-300">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fileError && <p className="text-xs text-red-500 mt-1.5">{fileError}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Voting Period <span className="text-gray-400 normal-case font-normal">(Fixed)</span>
            </label>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {VOTING_PERIOD_HOURS} Hours
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Ends {formatDeadline(deadline)}
              </span>
            </div>
          </div>

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
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? "Submitting…" : "Submit Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
