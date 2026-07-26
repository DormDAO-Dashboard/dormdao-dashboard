"use client";
import { useEffect, useState } from "react";
import { Eye, Pencil, X, Loader2, AlertCircle, RotateCcw, Mail } from "lucide-react";

interface TemplateField {
  key: string;
  label: string;
  multiline: boolean;
  default: string;
  value: string;
}

interface TemplateDef {
  key: string;
  label: string;
  trigger: string;
  variables: string[];
  sampleVars: Record<string, string>;
  fields: TemplateField[];
  isOverridden: boolean;
}

function fillSample(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

function fieldValue(t: TemplateDef, key: string): string {
  return t.fields.find((f) => f.key === key)?.value ?? "";
}

const fieldClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 w-full";

export function AdminEmailFunctionsSection() {
  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewTarget, setViewTarget] = useState<TemplateDef | null>(null);

  const [editTarget, setEditTarget] = useState<TemplateDef | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json() as { templates?: TemplateDef[] };
      setTemplates(data.templates ?? []);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(t: TemplateDef) {
    setEditTarget(t);
    setEditValues(Object.fromEntries(t.fields.map((f) => [f.key, f.value])));
    setError(null);
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${editTarget.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: editValues }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setEditTarget(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!editTarget) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${editTarget.key}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to reset");
      setEditTarget(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const viewExtraFields = viewTarget?.fields.filter((f) => f.key !== "subject" && f.key !== "heading") ?? [];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Email Functions
          <span className="ml-2 text-xs text-gray-500 font-normal">{templates.length} automated email{templates.length !== 1 ? "s" : ""}</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">Every automated email DormDAO sends, and when it fires.</p>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-600">Loading…</div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {templates.map((t) => (
            <div key={t.key} className="flex items-center gap-4 px-5 py-4">
              <Mail className="w-4 h-4 text-gray-400 dark:text-gray-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.trigger}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setViewTarget(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-xs font-medium">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={() => openEdit(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-xs font-medium">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-600">No email types found.</div>
          )}
        </div>
      )}

      {/* ── View ─────────────────────────────────────────────────── */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewTarget(null)} />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{viewTarget.label}</h3>
              <button onClick={() => setViewTarget(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{viewTarget.trigger}</p>

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gray-900 px-5 py-3">
                <span className="text-sm font-bold text-white">DormDAO</span>
              </div>
              <div className="bg-white px-5 py-5">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-3">
                  Subject:{" "}
                  <span className="normal-case text-gray-700 font-medium">
                    {fillSample(fieldValue(viewTarget, "subject"), viewTarget.sampleVars)}
                  </span>
                </p>
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  {fillSample(fieldValue(viewTarget, "heading"), viewTarget.sampleVars)}
                </h2>
                {viewExtraFields.map((f) => {
                  const text = fillSample(f.value, viewTarget.sampleVars);
                  if (!text.trim()) return null;
                  return (
                    <div key={f.key} className="mb-3">
                      {viewExtraFields.length > 1 && (
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{f.label}</p>
                      )}
                      {text.split(/\n{2,}/).map((p, i) => (
                        <p key={i} className="text-sm text-gray-700 leading-relaxed mt-1 first:mt-0">{p}</p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
              Preview uses sample data — real emails fill in the actual name, school, and proposal details. The header, data tables, and buttons around this text are fixed and can't be edited here.
            </p>
          </div>
        </div>
      )}

      {/* ── Edit ─────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !saving && setEditTarget(null)} />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Edit: {editTarget.label}</h3>
              <button onClick={() => setEditTarget(null)} disabled={saving} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{editTarget.trigger}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Available variables: {editTarget.variables.map((v) => `{{${v}}}`).join(", ")}
            </p>

            <div className="flex flex-col gap-3">
              {editTarget.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">{f.label}</label>
                  {f.multiline ? (
                    <textarea rows={4} value={editValues[f.key] ?? ""}
                      onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className={fieldClass} />
                  ) : (
                    <input value={editValues[f.key] ?? ""}
                      onChange={(e) => setEditValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className={fieldClass} />
                  )}
                </div>
              ))}
            </div>

            {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}

            <div className="flex items-center justify-between gap-3 pt-5">
              <button type="button" onClick={handleReset} disabled={saving || !editTarget.isOverridden}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-30">
                <RotateCcw className="w-3.5 h-3.5" /> Reset to default
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditTarget(null)} disabled={saving}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-sm font-medium disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
