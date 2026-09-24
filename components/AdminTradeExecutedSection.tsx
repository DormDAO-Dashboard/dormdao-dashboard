"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ImageUp, Link2, Loader2, Pencil, RotateCcw, Send, X, AlertCircle, Zap } from "lucide-react";

interface PassedProposal {
  id: string;
  school: string;
  schoolLabel: string;
  token_ticker: string;
  token_name: string;
  title: string;
  recommended_size_eth: number | null;
}

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
  fields: TemplateField[];
  isOverridden: boolean;
}

const fieldClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50 w-full";

// The Trade Executed email is fundamentally different from every other row
// in AdminEmailFunctionsSection: those all fire automatically off a
// proposal's own lifecycle (posted, 12h left, result). This one NEVER
// fires on its own — it only ever goes out when triggered right here,
// which is exactly why it gets its own dedicated box instead of a plain
// View/Edit row: picking a filled position, attaching proof, and sending
// IS the trigger, not a side effect of something else happening.
export function AdminTradeExecutedSection() {
  const [proposals, setProposals] = useState<PassedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [target, setTarget] = useState<PassedProposal | null>(null);
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tradeOutput, setTradeOutput] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justFilled, setJustFilled] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Copy editing (subject/heading/message) — folded into this same box
  // rather than living in the generic template list, so this is genuinely
  // the one place for everything about this email.
  const [template, setTemplate] = useState<TemplateDef | null>(null);
  const [showCopyEditor, setShowCopyEditor] = useState(false);
  const [copyValues, setCopyValues] = useState<Record<string, string>>({});
  const [copySaving, setCopySaving] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => { load(); loadTemplate(); }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/proposals");
      const data = await res.json() as { proposals?: PassedProposal[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load proposals");
      setProposals(data.proposals ?? []);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplate() {
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json() as { templates?: TemplateDef[] };
      setTemplate(data.templates?.find((t) => t.key === "trade_executed") ?? null);
    } catch { /* copy editor just won't open — sending still works fine */ }
  }

  function openCopyEditor() {
    if (!template) return;
    setCopyValues(Object.fromEntries(template.fields.map((f) => [f.key, f.value])));
    setCopyError(null);
    setShowCopyEditor(true);
  }

  async function handleCopySave() {
    setCopySaving(true);
    setCopyError(null);
    try {
      const res = await fetch("/api/admin/email-templates/trade_executed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: copyValues }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setShowCopyEditor(false);
      await loadTemplate();
    } catch (err) {
      setCopyError((err as Error).message);
    } finally {
      setCopySaving(false);
    }
  }

  async function handleCopyReset() {
    setCopySaving(true);
    setCopyError(null);
    try {
      const res = await fetch("/api/admin/email-templates/trade_executed", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to reset");
      setShowCopyEditor(false);
      await loadTemplate();
    } catch (err) {
      setCopyError((err as Error).message);
    } finally {
      setCopySaving(false);
    }
  }

  function openSendModal(p: PassedProposal) {
    setTarget(p);
    setLink("");
    setImageFile(null);
    setImagePreview(null);
    setTradeOutput("");
    setNotes("");
    setSubmitError(null);
  }

  function closeSendModal() {
    if (submitting) return;
    setTarget(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }

  function handleFileChange(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSubmitError(null);

    if (!link.trim() && !imageFile) {
      setSubmitError("Fill in the Transaction Link/Image field first");
      return;
    }
    if (!tradeOutput.trim()) {
      setSubmitError("Trade output is required");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      if (link.trim()) fd.set("execution_tx", link.trim());
      if (imageFile) fd.set("image", imageFile);
      fd.set("trade_output", tradeOutput.trim());
      if (notes.trim()) fd.set("execution_notes", notes.trim());

      const res = await fetch(`/api/proposals/${target.id}/execute`, { method: "PATCH", body: fd });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send");

      setProposals((prev) => prev.filter((p) => p.id !== target.id));
      setJustFilled(`${target.token_ticker} — ${target.schoolLabel}`);
      setTimeout(() => setJustFilled(null), 4000);
      closeSendModal();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-white dark:bg-[#111] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Trade Executed
            <span className="ml-1 text-xs text-gray-700 dark:text-gray-400 font-normal">
              {proposals.length} passed, awaiting fill
            </span>
          </h2>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1 max-w-md">
            The only way this email goes out: pick a filled position below, fill in the Transaction Link/Image field, and click Send to Club Members.
          </p>
        </div>
        <button
          onClick={openCopyEditor}
          disabled={!template}
          title="Edit email copy"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-xs font-medium disabled:opacity-40"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit Copy
        </button>
      </div>

      {justFilled && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border-b border-primary/20 text-primary text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Sent — {justFilled} marked as executed.
        </div>
      )}

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-gray-700 dark:text-gray-400">Loading…</div>
      ) : loadError ? (
        <div className="px-5 py-6"><ErrorBanner>{loadError}</ErrorBanner></div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {proposals.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  <span className="font-mono">${p.token_ticker}</span>
                  <span className="text-gray-700 dark:text-gray-400 font-normal"> — {p.schoolLabel}</span>
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5 truncate">
                  {p.title}
                  {p.recommended_size_eth != null && ` · ${p.recommended_size_eth} ETH`}
                </p>
              </div>
              <button onClick={() => openSendModal(p)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-xs font-medium">
                <Send className="w-3.5 h-3.5" /> Fill This Proposal
              </button>
            </div>
          ))}
          {proposals.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-700 dark:text-gray-400">
              Nothing waiting — every passed proposal has been filled.
            </div>
          )}
        </div>
      )}

      {/* ── Send modal ───────────────────────────────────────────── */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeSendModal} />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">${target.token_ticker} — {target.schoolLabel}</h3>
              <button onClick={closeSendModal} disabled={submitting} className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-400 mb-4">{target.title}</p>

            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                  Transaction Link/Image <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700 dark:text-gray-400 pointer-events-none" />
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="Paste a transaction link (Etherscan, etc.)"
                      className={fieldClass + " font-mono text-xs pl-9"}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    <span className="text-[10px] text-gray-700 dark:text-gray-400 uppercase tracking-wide">or upload an image</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  </div>

                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not a served asset */}
                      <img src={imagePreview} alt="Selected screenshot" className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900" />
                      <button
                        type="button"
                        onClick={() => { handleFileChange(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 px-3 py-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary/50 cursor-pointer transition-colors text-xs text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      <ImageUp className="w-4 h-4" />
                      Click to upload a screenshot
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                  Trade Output <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tradeOutput}
                  onChange={(e) => setTradeOutput(e.target.value)}
                  placeholder="e.g. Bought 500 HYPE at $4.20 avg"
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                  Notes <span className="text-gray-700 dark:text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Any additional context…"
                  className={fieldClass + " resize-none"}
                />
              </div>

              {submitError && <ErrorBanner>{submitError}</ErrorBanner>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeSendModal} disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-black hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? "Sending…" : "Send to Club Members"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Copy editor ──────────────────────────────────────────── */}
      {showCopyEditor && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !copySaving && setShowCopyEditor(false)} />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Edit Copy: Trade Executed</h3>
              <button onClick={() => setShowCopyEditor(false)} disabled={copySaving} className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-400 mb-4">
              Available variables: {template.variables.map((v) => `{{${v}}}`).join(", ")}
            </p>

            <div className="flex flex-col gap-3">
              {template.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-medium uppercase tracking-wider">{f.label}</label>
                  {f.multiline ? (
                    <textarea rows={4} value={copyValues[f.key] ?? ""}
                      onChange={(e) => setCopyValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className={fieldClass} />
                  ) : (
                    <input value={copyValues[f.key] ?? ""}
                      onChange={(e) => setCopyValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className={fieldClass} />
                  )}
                </div>
              ))}
            </div>

            {copyError && <div className="mt-3"><ErrorBanner>{copyError}</ErrorBanner></div>}

            <div className="flex items-center justify-between gap-3 pt-5">
              <button type="button" onClick={handleCopyReset} disabled={copySaving || !template.isOverridden}
                className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-30">
                <RotateCcw className="w-3.5 h-3.5" /> Reset to default
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCopyEditor(false)} disabled={copySaving}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button type="button" onClick={handleCopySave} disabled={copySaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 text-sm font-medium disabled:opacity-50">
                  {copySaving && <Loader2 className="w-4 h-4 animate-spin" />}
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
