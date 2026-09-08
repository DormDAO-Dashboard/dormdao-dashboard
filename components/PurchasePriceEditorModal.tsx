"use client";
import { useState } from "react";
import { X, Loader2, AlertCircle, Check } from "lucide-react";

export interface EditablePositionRow {
  positionId: string;
  ticker: string;
  investmentDate: string;
  purchasePriceUsd: number | null | undefined;
}

interface RowState {
  value: string;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

function initialRowState(row: EditablePositionRow): RowState {
  return {
    value: row.purchasePriceUsd != null ? String(row.purchasePriceUsd) : "",
    saving: false,
    error: null,
    saved: false,
  };
}

export function PurchasePriceEditorModal({
  schoolSlug,
  rows,
  onClose,
  onSaved,
}: {
  schoolSlug: string;
  rows: EditablePositionRow[];
  onClose: () => void;
  onSaved: (positionId: string, newPrice: number | null) => void;
}) {
  const [rowState, setRowState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(rows.map((r) => [r.positionId, initialRowState(r)]))
  );

  function setValue(positionId: string, value: string) {
    setRowState((s) => ({ ...s, [positionId]: { ...s[positionId], value, saved: false, error: null } }));
  }

  async function handleSave(row: EditablePositionRow) {
    const state = rowState[row.positionId];
    const trimmed = state.value.trim();
    const parsed = trimmed === "" ? null : parseFloat(trimmed);
    if (trimmed !== "" && (parsed === null || isNaN(parsed) || parsed < 0)) {
      setRowState((s) => ({ ...s, [row.positionId]: { ...s[row.positionId], error: "Enter a valid, non-negative price (or leave blank to clear it)" } }));
      return;
    }

    setRowState((s) => ({ ...s, [row.positionId]: { ...s[row.positionId], saving: true, error: null } }));
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/positions/${row.positionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchasePriceUsd: parsed }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save purchase price");
      setRowState((s) => ({ ...s, [row.positionId]: { ...s[row.positionId], saving: false, saved: true } }));
      onSaved(row.positionId, parsed);
    } catch (err) {
      setRowState((s) => ({ ...s, [row.positionId]: { ...s[row.positionId], saving: false, error: (err as Error).message } }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Edit Purchase Prices</h3>
            <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
              Sets a fixed price per token — used instead of deriving it from a historical ETH price lookup.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-400 py-6 text-center">
              No admin-managed positions to edit here — this school&apos;s holdings come from the shared spreadsheet, not the positions table.
            </p>
          ) : (
            rows.map((row) => {
              const state = rowState[row.positionId];
              return (
                <div key={row.positionId} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">${row.ticker}</div>
                    <div className="text-xs text-gray-700 dark:text-gray-400">{row.investmentDate || "—"}</div>
                  </div>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-700 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="auto"
                      value={state.value}
                      onChange={(e) => setValue(row.positionId, e.target.value)}
                      className="w-full pl-6 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(row)}
                    disabled={state.saving}
                    className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {state.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : state.saved ? <Check className="w-3.5 h-3.5" /> : null}
                    {state.saving ? "Saving…" : state.saved ? "Saved" : "Save"}
                  </button>
                </div>
              );
            })
          )}
          {rows.some((r) => rowState[r.positionId]?.error) && (
            <div className="flex flex-col gap-1.5">
              {rows.filter((r) => rowState[r.positionId]?.error).map((r) => (
                <div key={r.positionId} className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>${r.ticker}: {rowState[r.positionId].error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
