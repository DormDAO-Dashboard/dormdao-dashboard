"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sentiment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { schoolDisplayName } from "@/lib/schoolData";
import { useToast } from "@/components/ui/Toaster";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SENTIMENTS: Sentiment[] = ["bullish", "neutral", "bearish"];
const THESIS_TYPES = ["Fundamental", "Technical", "Macro", "On-chain", "Trend"];
const TIME_HORIZONS = ["Short (< 1 month)", "Medium (1–6 months)", "Long (6+ months)"];

interface AddNoteFormProps {
  defaultTicker?: string;
  defaultSchool?: string;
  tickers?: string[];
  authorName?: string;
  userId?: string;
  onSuccess?: () => void;
}

export function AddNoteForm({
  defaultTicker,
  tickers: tickersProp,
  onSuccess,
}: AddNoteFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [availableTickers, setAvailableTickers] = useState<string[]>(tickersProp ?? []);

  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileSchool, setProfileSchool] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthLoading(false); return; }
      setIsLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, school")
        .eq("id", user.id)
        .single();
      setProfileName(profile?.display_name ?? null);
      setProfileSchool(profile?.school ?? null);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (tickersProp) {
      setAvailableTickers(tickersProp);
      return;
    }
    fetch("/api/sheets")
      .then((r) => r.json())
      .then((d) => {
        const seen = new Set<string>();
        for (const school of d.schools ?? []) {
          for (const h of school.holdings ?? []) {
            if (h.ticker) seen.add(h.ticker as string);
          }
        }
        setAvailableTickers(Array.from(seen).sort());
      })
      .catch(() => {});
  }, [tickersProp]);

  const [form, setForm] = useState({
    token_ticker: defaultTicker || "",
    sentiment: "neutral" as Sentiment,
    content: "",
    thesis_type: "",
    price_target: "",
    time_horizon: "",
    url: "",
  });
  const [urlPreview, setUrlPreview] = useState<{ title: string; description: string; siteName: string; image: string } | null>(null);
  const [urlPreviewLoading, setUrlPreviewLoading] = useState(false);
  const urlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = form.url.trim();
    if (!raw) { setUrlPreview(null); return; }
    try { new URL(raw); } catch { setUrlPreview(null); return; }
    if (urlDebounce.current) clearTimeout(urlDebounce.current);
    urlDebounce.current = setTimeout(async () => {
      setUrlPreviewLoading(true);
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(raw)}`);
        const data = await res.json();
        if (data.title || data.description) setUrlPreview(data);
        else setUrlPreview(null);
      } catch { setUrlPreview(null); }
      finally { setUrlPreviewLoading(false); }
    }, 600);
    return () => { if (urlDebounce.current) clearTimeout(urlDebounce.current); };
  }, [form.url]);

  const hasUrl = form.url.trim().length > 0;
  const minChars = hasUrl ? 10 : 100;
  const charCount = form.content.length;
  const valid = charCount >= minChars && charCount <= 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSubmitError("");
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price_target: form.price_target ? parseFloat(form.price_target) : null,
          url: form.url.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to post note");
      }
      toast("Note posted successfully!", "success");
      setForm((f) => ({ ...f, content: "", sentiment: "neutral", thesis_type: "", price_target: "", time_horizon: "", url: "" }));
      setUrlPreview(null);
      setOpen(false);
      setSubmitAttempted(false);
      setSubmitError("");
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post note";
      setSubmitError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    if (authLoading) {
      return <div className="w-full py-3 rounded-xl border border-dashed border-gray-800 animate-pulse h-12" />;
    }
    if (!isLoggedIn) {
      return (
        <div className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-center">
          <span className="text-sm text-gray-500">
            <Link href="/login" className="text-primary hover:underline">Sign in</Link> to post a research note
          </span>
        </div>
      );
    }
    if (!profileSchool) {
      return (
        <div className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-center">
          <span className="text-sm text-gray-500">
            <Link href="/profile" className="text-primary hover:underline">Set your school on your profile</Link> to post a research note
          </span>
        </div>
      );
    }
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm"
      >
        + Add Research Note
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New Research Note</h3>
        <div className="text-xs text-gray-500">
          Posting as <span className="text-gray-300">{profileName}</span> · <span className="text-gray-300">{schoolDisplayName(profileSchool)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Token</label>
          <select
            value={form.token_ticker}
            onChange={(e) => setForm((f) => ({ ...f, token_ticker: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">— Optional —</option>
            {availableTickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sentiment *</label>
          <div className="flex gap-1.5">
            {SENTIMENTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, sentiment: s }))}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium transition-colors border",
                  form.sentiment === s && s === "bullish" && "bg-primary/20 border-primary/50 text-primary",
                  form.sentiment === s && s === "bearish" && "bg-danger/20 border-danger/50 text-danger",
                  form.sentiment === s && s === "neutral" && "bg-gray-700 border-gray-600 text-white",
                  form.sentiment !== s && "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"
                )}
              >
                {s === "bullish" ? "↑" : s === "bearish" ? "↓" : "~"} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Thesis Type</label>
          <select
            value={form.thesis_type}
            onChange={(e) => setForm((f) => ({ ...f, thesis_type: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">— Optional —</option>
            {THESIS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Price Target (USD)</label>
          <input
            type="number"
            step="any"
            min="0"
            value={form.price_target}
            onChange={(e) => setForm((f) => ({ ...f, price_target: e.target.value }))}
            placeholder="Optional"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Time Horizon</label>
          <select
            value={form.time_horizon}
            onChange={(e) => setForm((f) => ({ ...f, time_horizon: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">— Optional —</option>
            {TIME_HORIZONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Article URL <span className="text-gray-600">(optional — paste a link to share)</span></label>
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
        />
        {urlPreviewLoading && (
          <p className="text-xs text-gray-500 mt-1">Fetching preview…</p>
        )}
        {urlPreview && !urlPreviewLoading && (
          <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/60 p-3 flex gap-3">
            {urlPreview.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlPreview.image} alt="" className="w-16 h-12 object-cover rounded shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
            <div className="min-w-0">
              <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />{urlPreview.siteName}
              </div>
              {urlPreview.title && <div className="text-xs font-semibold text-white truncate">{urlPreview.title}</div>}
              {urlPreview.description && <div className="text-xs text-gray-400 line-clamp-2 mt-0.5">{urlPreview.description}</div>}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Analysis {hasUrl ? <span className="text-gray-600">(optional comment)</span> : "*"}</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder={hasUrl ? "Add a comment (optional)…" : "Share your thesis (min 100 chars)..."}
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none"
        />
        <div className="flex items-start justify-between mt-1">
          {submitAttempted && charCount < minChars ? (
            <p className="text-xs text-red-400">At least {minChars} characters required ({minChars - charCount} more needed).</p>
          ) : <span />}
          <span className={cn(
            "text-xs",
            charCount < minChars ? "text-gray-500" : charCount > 2000 ? "text-danger" : "text-gray-400"
          )}>
            {charCount}/2000
          </span>
        </div>
        {submitError && (
          <p className="text-xs text-red-400 mt-1 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">{submitError}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 hover:bg-primary-dark transition-colors"
        >
          {loading ? "Posting…" : "Post Note"}
        </button>
      </div>
    </form>
  );
}
