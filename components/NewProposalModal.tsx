"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { SchoolColors } from "@/lib/schoolColors";
import type { Proposal } from "@/lib/proposals";

interface Props {
  slug: string;
  colors: SchoolColors;
  onClose: () => void;
  onCreated: (proposal: Proposal) => void;
}

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 16);
}

export function NewProposalModal({ slug, colors, onClose, onCreated }: Props) {
  const [ticker, setTicker] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [title, setTitle] = useState("");
  const [titleManual, setTitleManual] = useState(false);
  const [description, setDescription] = useState("");
  const [sizeEth, setSizeEth] = useState("");
  const [priceTarget, setPriceTarget] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoTitle(t: string, n: string): string {
    if (!t && !n) return "";
    if (!n) return t ? `Buy $${t}` : "";
    return t ? `Buy $${t} — ${n}` : n;
  }

  function handleTickerChange(val: string) {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setTicker(upper);
    if (!titleManual) setTitle(autoTitle(upper, tokenName));
  }

  function handleTokenNameChange(val: string) {
    setTokenName(val);
    if (!titleManual) setTitle(autoTitle(ticker, val));
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    setTitleManual(true);
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
          token_name: tokenName,
          title,
          description,
          recommended_size_eth: sizeEth ? parseFloat(sizeEth) : undefined,
          price_target: priceTarget ? parseFloat(priceTarget) : undefined,
          voting_deadline: new Date(deadline).toISOString(),
        }),
      });
      const data = await res.json() as { proposal?: Proposal; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to submit proposal");
        return;
      }
      onCreated(data.proposal!);
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
                Token Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => handleTokenNameChange(e.target.value)}
                placeholder="e.g. Hyperliquid"
                required
                maxLength={80}
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Voting Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className={inputClass}
            />
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
