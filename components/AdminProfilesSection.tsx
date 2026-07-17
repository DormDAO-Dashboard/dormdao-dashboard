"use client";
import { useState } from "react";
import { Pencil, X, Loader2, AlertCircle } from "lucide-react";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";

interface AdminProfile {
  id: string;
  display_name: string | null;
  school: string | null;
  email: string | null;
  walletAddress: string | null;
  memberId: string | null;
  votingUnits: number | null;
}

interface Draft {
  name: string;
  email: string;
  walletAddress: string;
  school: string;
  votingUnits: number;
}

const fieldClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 w-full";

export function AdminProfilesSection({
  envAdmin,
  initialDormAdmins,
}: {
  envAdmin: { name: string; votingUnits: number; email: string; wallet: string };
  initialDormAdmins: AdminProfile[];
}) {
  const [dormAdmins, setDormAdmins] = useState<AdminProfile[]>(initialDormAdmins);
  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", email: "", walletAddress: "", school: "", votingUnits: 10 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(da: AdminProfile) {
    setEditTarget(da);
    setDraft({
      name: da.display_name ?? "",
      email: da.email ?? "",
      walletAddress: da.walletAddress ?? "",
      school: da.school ?? "",
      votingUnits: da.votingUnits ?? 10,
    });
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editTarget.memberId) {
        // Reuse member PATCH — syncs members.json + profile
        const res = await fetch(`/api/admin/members/${editTarget.memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name || undefined,
            email: draft.email || undefined,
            walletAddress: draft.walletAddress || undefined,
            school: draft.school || null,
            votingUnits: draft.votingUnits,
          }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to update");
      } else {
        // Profile-only update (no members.json entry)
        const res = await fetch(`/api/admin/profiles/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: draft.name || null,
            school: draft.school || null,
          }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to update");
      }

      setDormAdmins((prev) =>
        prev.map((da) =>
          da.id === editTarget.id
            ? {
                ...da,
                display_name: draft.name || null,
                email: draft.email || da.email,
                walletAddress: draft.walletAddress || da.walletAddress,
                school: draft.school || null,
                votingUnits: draft.votingUnits,
              }
            : da
        )
      );
      setEditTarget(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Admins
            <span className="ml-2 text-xs text-gray-500 font-normal">{1 + dormAdmins.length} total</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">School</th>
                <th className="text-right px-5 py-3">Voting Units</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Wallet</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200/80 dark:border-gray-800/50">
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{envAdmin.name}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">—</td>
                <td className="px-5 py-3 text-right font-mono text-primary">{envAdmin.votingUnits}</td>
                <td className="px-5 py-3 text-gray-400">{envAdmin.email || "—"}</td>
                <td className="px-5 py-3 font-mono text-gray-400 text-xs">
                  {envAdmin.wallet ? `${envAdmin.wallet.slice(0, 6)}…${envAdmin.wallet.slice(-4)}` : "—"}
                </td>
                <td className="px-5 py-3" />
              </tr>
              {dormAdmins.map((da) => (
                <tr key={da.id} className="border-b border-gray-200/80 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{da.display_name || "—"}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{da.school ? schoolDisplayName(da.school) : "—"}</td>
                  <td className="px-5 py-3 text-right font-mono text-primary">{da.votingUnits ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-400">{da.email || "—"}</td>
                  <td className="px-5 py-3 font-mono text-gray-500 text-xs">
                    {da.walletAddress ? `${da.walletAddress.slice(0, 6)}…${da.walletAddress.slice(-4)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(da)} className="text-gray-600 hover:text-gray-300 transition-colors" title="Edit admin">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-md bg-[#111] rounded-xl border border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Edit Admin</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Name</label>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Full name" className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Voting Units</label>
                <input type="number" min={0} value={draft.votingUnits}
                  onChange={(e) => setDraft({ ...draft, votingUnits: parseInt(e.target.value) || 0 })}
                  className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email</label>
                <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="email@example.com" className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Wallet Address</label>
                <input value={draft.walletAddress} onChange={(e) => setDraft({ ...draft, walletAddress: e.target.value })}
                  placeholder="0x…" className={fieldClass + " font-mono text-xs"} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">School</label>
                <select value={draft.school} onChange={(e) => setDraft({ ...draft, school: e.target.value })} className={fieldClass}>
                  <option value="">— No school —</option>
                  {SCHOOL_NAMES.map((s) => (
                    <option key={s} value={s}>{schoolDisplayName(s)}</option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
