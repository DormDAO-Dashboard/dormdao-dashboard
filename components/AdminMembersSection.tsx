"use client";
import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Papa from "papaparse";
import { UserPlus, Upload, FilePlus, X, Trash2, Pencil, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";
import { SchoolLogo } from "@/components/SchoolLogo";
import { ROLE_OPTIONS, type MemberRole } from "@/lib/auth-utils";

interface Member {
  id: string;
  name: string;
  votingUnits: number;
  email: string;
  walletAddress: string;
  school: string | null;
  role: MemberRole;
  createdAt: string;
}

interface MemberDraft {
  name: string;
  votingUnits: number;
  email: string;
  walletAddress: string;
  school: string | null;
  role: string;
}

interface CSVRow {
  name?: string;
  units?: string;
  email?: string;
  walletAddress?: string;
  school?: string;
  role?: string;
  [key: string]: string | undefined;
}

const ROLE_BADGE: Record<string, string> = {
  president:  "bg-purple-900/40 text-purple-400 border border-purple-800",
  director:   "bg-blue-900/40 text-blue-400 border border-blue-800",
  club_admin: "bg-green-900/40 text-green-400 border border-green-800",
  dorm_admin: "bg-teal-900/40 text-teal-400 border border-teal-800",
  member:     "bg-gray-800 text-gray-500 border border-gray-700",
};

const EMPTY_DRAFT: MemberDraft = { name: "", votingUnits: 10, email: "", walletAddress: "", school: null, role: "member" };

export function AdminMembersSection({ initialMembers }: { initialMembers: Member[] }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "csv">("manual");

  const [draft, setDraft] = useState<MemberDraft>(EMPTY_DRAFT);
  const [manualErr, setManualErr] = useState<string | null>(null);

  const [csvRows, setCsvRows] = useState<MemberDraft[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ added: number; errors: string[] } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editDraft, setEditDraft] = useState<MemberDraft>(EMPTY_DRAFT);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function resetModal() {
    setMode("manual");
    setDraft(EMPTY_DRAFT);
    setManualErr(null);
    setCsvRows([]);
    setCsvErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openEdit(m: Member) {
    setEditTarget(m);
    setEditDraft({ name: m.name, votingUnits: m.votingUnits, email: m.email, walletAddress: m.walletAddress, school: m.school, role: m.role });
    setEditError(null);
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvErrors([]);
    setCsvRows([]);
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors: parseErrors }) => {
        if (parseErrors.length) { setCsvErrors(["Could not parse CSV."]); return; }
        const rows: MemberDraft[] = [];
        const errs: string[] = [];
        data.forEach((row, i) => {
          const name = row.name?.trim() ?? "";
          if (!name) { errs.push(`Row ${i + 2}: missing name`); return; }
          rows.push({
            name,
            votingUnits: parseInt(row.units ?? "10", 10) || 10,
            email: row.email?.trim() ?? "",
            walletAddress: row.walletAddress?.trim() ?? "",
            school: row.school?.trim() || null,
            role: row.role?.trim() || "member",
          });
        });
        setCsvRows(rows);
        setCsvErrors(errs);
      },
      error: () => setCsvErrors(["Failed to read file."]),
    });
  }

  async function handleSubmit() {
    const payload = mode === "manual" ? [draft] : csvRows;
    if (mode === "manual") {
      if (!draft.name.trim()) { setManualErr("Name is required."); return; }
      if (!draft.email.trim() && !draft.walletAddress.trim()) {
        setManualErr("Provide at least an email or wallet address."); return;
      }
      setManualErr(null);
    }
    if (payload.length === 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: payload }),
      });
      const data = await res.json() as { added: number; errors: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Server error");
      setResult({ added: data.added, errors: data.errors ?? [] });
      if (data.added > 0) {
        const listRes = await fetch("/api/admin/members");
        const listData = await listRes.json() as { members: Member[] };
        setMembers(listData.members ?? []);
        if (data.errors.length === 0) setTimeout(() => { setOpen(false); resetModal(); }, 1200);
      }
    } catch (err) {
      setResult({ added: 0, errors: [(err as Error).message] });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/members/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json() as { member?: Member; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update member");
      setMembers((prev) =>
        prev.map((m) => m.id === editTarget.id ? { ...m, ...editDraft, role: editDraft.role as MemberRole } : m)
      );
      setEditTarget(null);
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setEditSubmitting(false);
    }
  }

  const fieldClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 w-full";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Members
          <span className="ml-2 text-xs text-gray-500 font-normal">{members.length} total</span>
        </h2>

        <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetModal(); }}>
          <Dialog.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-xs font-medium">
              <UserPlus className="w-3.5 h-3.5" />
              Add Members
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-800 bg-[#111] shadow-2xl p-6 flex flex-col gap-5 focus:outline-none"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-base font-semibold text-white">Add Members</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </Dialog.Close>
              </div>

              <div className="flex gap-2">
                {(["manual", "csv"] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setResult(null); }}
                    className={cn(
                      "flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                      mode === m ? "border-primary/60 bg-primary/10 text-primary" : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                    )}
                  >
                    {m === "manual" ? <FilePlus className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {m === "manual" ? "Manual Entry" : "Upload CSV"}
                  </button>
                ))}
              </div>

              {mode === "manual" && (
                <div className="flex flex-col gap-3">
                  <Field label="Name *"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" className={fieldClass} /></Field>
                  <Field label="Voting Units"><input type="number" min={0} value={draft.votingUnits} onChange={(e) => setDraft({ ...draft, votingUnits: parseInt(e.target.value) || 10 })} className={fieldClass} /></Field>
                  <Field label="Email"><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="email@example.com" className={fieldClass} /></Field>
                  <Field label="Wallet Address"><input value={draft.walletAddress} onChange={(e) => setDraft({ ...draft, walletAddress: e.target.value })} placeholder="0x…" className={fieldClass + " font-mono text-xs"} /></Field>
                  <Field label="School *">
                    <select value={draft.school ?? ""} onChange={(e) => setDraft({ ...draft, school: e.target.value || null })} className={fieldClass}>
                      <option value="">— Select school —</option>
                      {SCHOOL_NAMES.map((s) => <option key={s} value={s}>{schoolDisplayName(s)}</option>)}
                    </select>
                  </Field>
                  <Field label="Role">
                    <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className={fieldClass}>
                      {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  {manualErr && <ErrorBanner>{manualErr}</ErrorBanner>}
                </div>
              )}

              {mode === "csv" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-500">
                    CSV headers: <code className="text-gray-300">name, units, email, walletAddress, school, role</code>
                  </p>
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4 shrink-0" />
                    {csvRows.length > 0 ? `${csvRows.length} rows loaded — click to replace` : "Click to select a .csv file"}
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCSVFile} />
                  </label>
                  {csvErrors.length > 0 && <div className="flex flex-col gap-1">{csvErrors.map((e, i) => <ErrorBanner key={i}>{e}</ErrorBanner>)}</div>}
                  {csvRows.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-gray-800 max-h-48">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500">
                            <th className="text-left px-3 py-2">Name</th>
                            <th className="text-right px-3 py-2">Units</th>
                            <th className="text-left px-3 py-2">Email</th>
                            <th className="text-left px-3 py-2">School</th>
                            <th className="text-left px-3 py-2">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.map((r, i) => (
                            <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                              <td className="px-3 py-1.5">{r.name}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{r.votingUnits}</td>
                              <td className="px-3 py-1.5 text-gray-400">{r.email || "—"}</td>
                              <td className="px-3 py-1.5 text-gray-400">{r.school ? schoolDisplayName(r.school) : "—"}</td>
                              <td className="px-3 py-1.5 text-gray-400">{r.role || "member"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-1.5">
                  {result.added > 0 && (
                    <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {result.added} member{result.added !== 1 ? "s" : ""} added.
                    </div>
                  )}
                  {result.errors.map((e, i) => <ErrorBanner key={i}>{e}</ErrorBanner>)}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                </Dialog.Close>
                <button onClick={handleSubmit} disabled={submitting || (mode === "csv" && csvRows.length === 0)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-sm font-medium disabled:opacity-50">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === "manual" ? "Add Member" : csvRows.length > 0 ? `Import ${csvRows.length} Member${csvRows.length !== 1 ? "s" : ""}` : "Import"}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">School</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-right px-5 py-3">Voting Units</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Wallet</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{m.name}</td>
                <td className="px-5 py-3">
                  {m.school ? (
                    <div className="flex items-center gap-1.5">
                      <SchoolLogo name={m.school} size={14} />
                      <span className="text-xs text-gray-300">{schoolDisplayName(m.school)}</span>
                    </div>
                  ) : <span className="text-xs text-gray-600">—</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", ROLE_BADGE[m.role] ?? ROLE_BADGE.member)}>
                    {ROLE_OPTIONS.find((o) => o.value === m.role)?.label ?? m.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-primary">{m.votingUnits}</td>
                <td className="px-5 py-3 text-gray-400">{m.email || "—"}</td>
                <td className="px-5 py-3 font-mono text-gray-500 text-xs">
                  {m.walletAddress ? `${m.walletAddress.slice(0, 6)}…${m.walletAddress.slice(-4)}` : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(m)} className="text-gray-600 hover:text-gray-300 transition-colors" title="Edit member">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id} className="text-gray-600 hover:text-danger transition-colors disabled:opacity-40" title="Remove member">
                      {deleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 dark:text-gray-600 text-sm">No members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-md bg-[#111] rounded-xl border border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Edit Member</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-3">
              <Field label="Name *"><input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} required className={fieldClass} /></Field>
              <Field label="Voting Units"><input type="number" min={0} value={editDraft.votingUnits} onChange={(e) => setEditDraft({ ...editDraft, votingUnits: parseInt(e.target.value) || 10 })} className={fieldClass} /></Field>
              <Field label="Email"><input type="email" value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} placeholder="email@example.com" className={fieldClass} /></Field>
              <Field label="Wallet Address"><input value={editDraft.walletAddress} onChange={(e) => setEditDraft({ ...editDraft, walletAddress: e.target.value })} placeholder="0x…" className={fieldClass + " font-mono text-xs"} /></Field>
              <Field label="School">
                <select value={editDraft.school ?? ""} onChange={(e) => setEditDraft({ ...editDraft, school: e.target.value || null })} className={fieldClass}>
                  <option value="">— No school —</option>
                  {SCHOOL_NAMES.map((s) => <option key={s} value={s}>{schoolDisplayName(s)}</option>)}
                </select>
              </Field>
              <Field label="Role">
                <select value={editDraft.role} onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value })} className={fieldClass}>
                  {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              {editError && <ErrorBanner>{editError}</ErrorBanner>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      {children}
    </div>
  );
}
