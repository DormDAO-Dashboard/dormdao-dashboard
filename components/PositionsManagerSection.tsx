"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Trash2, Pencil, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Position {
  id: string;
  school: string;
  ticker: string;
  blockchain: string;
  tokens: number;
  cost_basis_eth: number;
  purchase_price_usd: number | null;
  investment_date: string;
}

interface Draft {
  ticker: string;
  blockchain: string;
  tokens: string;
  costBasisEth: string;
  purchasePriceUsd: string;
  investmentDate: string;
}

const EMPTY_DRAFT: Draft = { ticker: "", blockchain: "", tokens: "", costBasisEth: "", purchasePriceUsd: "", investmentDate: "" };

const fieldClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 w-full";

function toPayload(d: Draft) {
  return {
    ticker: d.ticker.trim(),
    blockchain: d.blockchain.trim(),
    tokens: parseFloat(d.tokens) || 0,
    costBasisEth: parseFloat(d.costBasisEth) || 0,
    purchasePriceUsd: d.purchasePriceUsd.trim() ? parseFloat(d.purchasePriceUsd) : null,
    investmentDate: d.investmentDate,
  };
}

export function PositionsManagerSection({ schoolSlug }: { schoolSlug: string }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Position | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/schools/${schoolSlug}/positions`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setLoadError(d.error); return; }
        setPositions(d.positions ?? []);
      })
      .catch(() => setLoadError("Failed to load positions"))
      .finally(() => setLoading(false));
  }, [schoolSlug]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTarget(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(p: Position) {
    setEditTarget(p);
    setDraft({
      ticker: p.ticker,
      blockchain: p.blockchain,
      tokens: String(p.tokens),
      costBasisEth: String(p.cost_basis_eth),
      purchasePriceUsd: p.purchase_price_usd != null ? String(p.purchase_price_usd) : "",
      investmentDate: p.investment_date,
    });
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!draft.ticker.trim()) { setFormError("Token is required."); return; }
    if (!draft.investmentDate) { setFormError("Date is required."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const url = editTarget
        ? `/api/schools/${schoolSlug}/positions/${editTarget.id}`
        : `/api/schools/${schoolSlug}/positions`;
      const res = await fetch(url, {
        method: editTarget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft)),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save position");
      setOpen(false);
      load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/schools/${schoolSlug}/positions/${id}`, { method: "DELETE" });
      setPositions((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Manage Positions</h2>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">
            NAV, USD/ETH return, and % deployed on the leaderboard are computed live from these
            positions + current market prices — no spreadsheet involved.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-xs font-medium shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Position
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-400">
              <th className="text-left px-5 py-3">Token</th>
              <th className="text-left px-3 py-3">Chain</th>
              <th className="text-right px-3 py-3">Tokens</th>
              <th className="text-right px-3 py-3">Cost (ETH)</th>
              <th className="text-right px-3 py-3">Purchase Price</th>
              <th className="text-left px-3 py-3">Date</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{p.ticker}</td>
                <td className="px-3 py-3 text-gray-700 dark:text-gray-400">{p.blockchain || "—"}</td>
                <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{p.tokens}</td>
                <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{p.cost_basis_eth > 0 ? p.cost_basis_eth : "—"}</td>
                <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                  {p.purchase_price_usd != null ? `$${p.purchase_price_usd}` : <span className="text-gray-700 dark:text-gray-400">auto</span>}
                </td>
                <td className="px-3 py-3 text-gray-700 dark:text-gray-400">{p.investment_date}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="text-gray-700 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Edit position">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-gray-700 dark:text-gray-400 hover:text-danger transition-colors disabled:opacity-40" title="Remove position">
                      {deleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && positions.length === 0 && !loadError && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-700 dark:text-gray-400 text-sm">
                  No positions entered yet — add one to start computing this school's stats internally.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-700 dark:text-gray-400 text-sm">
                  Loading…
                </td>
              </tr>
            )}
            {loadError && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-danger text-sm">{loadError}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {editTarget ? "Edit Position" : "Add Position"}
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Token *">
                <input value={draft.ticker} onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })} placeholder="SOL" className={fieldClass} />
              </Field>
              <Field label="Chain">
                <input value={draft.blockchain} onChange={(e) => setDraft({ ...draft, blockchain: e.target.value })} placeholder="Solana" className={fieldClass} />
              </Field>
              <Field label="Tokens">
                <input type="number" value={draft.tokens} onChange={(e) => setDraft({ ...draft, tokens: e.target.value })} placeholder="0" className={fieldClass} />
              </Field>
              <Field label="Cost (ETH)">
                <input type="number" value={draft.costBasisEth} onChange={(e) => setDraft({ ...draft, costBasisEth: e.target.value })} placeholder="0" className={fieldClass} />
              </Field>
              <Field label="Purchase Price (USD)" hint="Leave blank to calculate from Cost (ETH) + Date using the historical ETH price">
                <input type="number" value={draft.purchasePriceUsd} onChange={(e) => setDraft({ ...draft, purchasePriceUsd: e.target.value })} placeholder="auto" className={fieldClass} />
              </Field>
              <Field label="Date *">
                <input type="date" value={draft.investmentDate} onChange={(e) => setDraft({ ...draft, investmentDate: e.target.value })} className={fieldClass} />
              </Field>
              {formError && (
                <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? "Save Changes" : "Add Position"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-700 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-700 dark:text-gray-400">{hint}</p>}
    </div>
  );
}
