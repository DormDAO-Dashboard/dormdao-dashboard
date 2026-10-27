"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Sector, Side, Venue } from "@/lib/predictions/types";
import { SECTOR_LABEL, SECTOR_ORDER, VENUE_LABEL } from "@/lib/predictions/types";
import type { LookupOutcome, LookupResult } from "@/lib/predictions/markets/lookup";
import { validatePitchDraft, type PitchDraft } from "@/lib/predictions/validatePitch";
import { returnPct, sidePrice } from "@/lib/predictions/math";
import { cents, cn, signedPct } from "@/lib/predictions/format";

const input = "w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40";
const card = "rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5";

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger mt-1">{error}</span>
        : hint ? <span className="block text-xs text-gray-500 dark:text-gray-500 mt-1">{hint}</span> : null}
    </label>
  );
}

const toCents = (price: number | null) => (price === null ? "" : String(Math.round(price * 100)));
const fromCents = (value: string) => (value.trim() && Number.isFinite(Number(value)) ? Number(value) / 100 : null);

export function SubmitPitchForm({ nextRound }: { nextRound: number }) {
  const [link, setLink] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<LookupOutcome | null>(null);
  const [venue, setVenue] = useState<Venue>("polymarket");
  const [showErrors, setShowErrors] = useState(false);
  const [draft, setDraft] = useState<PitchDraft>({
    analyst: "", sector: "economics", outcomeChosen: false, side: "YES",
    entryCents: "", impliedCents: "", sellLimitCents: "", stopCents: "", thesis: "",
  });
  const [sellLimitBefore, setSellLimitBefore] = useState("");
  const [exitBy, setExitBy] = useState("");

  const update = (patch: Partial<PitchDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const errors = useMemo(() => validatePitchDraft({ ...draft, outcomeChosen: outcome !== null }), [draft, outcome]);

  async function runLookup() {
    setLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/predictions/lookup?link=${encodeURIComponent(link)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lookup failed.");
      setLookup(body as LookupResult);
      setOutcome(null);
    } catch (err) {
      setLookup(null);
      setLookupError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  function chooseOutcome(o: LookupOutcome, side: Side) {
    setOutcome(o);
    setVenue(o.market.source === "kalshi" ? "kalshi" : "polymarket");
    update({ side, entryCents: toCents(o.yes === null ? null : sidePrice(o.yes, side)) });
  }

  const entry = fromCents(draft.entryCents);
  const ret = (target: string) => {
    const t = fromCents(target);
    return entry !== null && t !== null ? signedPct(returnPct(entry, t)) : "—";
  };
  const err = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className={card}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">1. Market</h2>
          <div className="flex gap-2">
            <input className={input} placeholder="Polymarket or Kalshi link (or Kalshi ticker)" value={link}
              onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runLookup()} />
            <button onClick={runLookup} disabled={!link.trim() || loading}
              className="inline-flex items-center gap-1.5 px-3 rounded-md bg-primary/20 text-primary border border-primary/40 text-sm disabled:opacity-50">
              <Search className="w-4 h-4" /> {loading ? "Looking…" : "Look up"}
            </button>
          </div>
          {lookupError && <p className="text-sm text-danger mt-2">{lookupError}</p>}
          {lookup && (
            <div className="mt-4">
              <div className="font-semibold text-gray-900 dark:text-white mb-2">{lookup.title}</div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                {lookup.outcomes.map((o) => (
                  <li key={JSON.stringify(o.market)} className="flex items-center gap-3 py-2">
                    <span className={cn("flex-1 text-sm", o.closed ? "text-gray-400" : "text-gray-800 dark:text-gray-200")}>
                      {o.label}{o.closed ? " (closed)" : ""}
                    </span>
                    {(["YES", "NO"] as Side[]).map((side) => {
                      const active = outcome === o && draft.side === side;
                      return (
                        <button key={side} onClick={() => chooseOutcome(o, side)} disabled={o.closed}
                          className={cn("font-mono text-xs px-2 py-1 rounded border disabled:opacity-40",
                            active ? "border-primary bg-primary/20 text-primary" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300")}>
                          {side} {cents(o.yes === null ? null : sidePrice(o.yes, side))}
                        </button>
                      );
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {err("outcome") && <p className="text-xs text-danger mt-2">{err("outcome")}</p>}
        </section>

        <section className={`${card} grid gap-4 sm:grid-cols-2`}>
          <h2 className="sm:col-span-2 text-sm font-semibold text-gray-900 dark:text-white">2. Trade plan</h2>
          <Field label="Analyst" error={err("analyst")}>
            <input className={input} value={draft.analyst} onChange={(e) => update({ analyst: e.target.value })} />
          </Field>
          <Field label="Sector">
            <select className={input} value={draft.sector} onChange={(e) => update({ sector: e.target.value as Sector })}>
              {SECTOR_ORDER.map((s) => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Venue" hint="Synthesis trades use the underlying market's odds.">
            <select className={input} value={venue} onChange={(e) => setVenue(e.target.value as Venue)}>
              {(Object.keys(VENUE_LABEL) as Venue[]).map((v) => <option key={v} value={v}>{VENUE_LABEL[v]}</option>)}
            </select>
          </Field>
          <Field label="Entry price (¢)" error={err("entryCents")} hint="Filled from the live price; edit to your fill.">
            <input className={input} inputMode="decimal" value={draft.entryCents} onChange={(e) => update({ entryCents: e.target.value })} />
          </Field>
          <Field label="Implied price (¢)" error={err("impliedCents")} hint={`Return ${ret(draft.impliedCents)}`}>
            <input className={input} inputMode="decimal" value={draft.impliedCents} onChange={(e) => update({ impliedCents: e.target.value })} />
          </Field>
          <Field label="Sell limit (¢, optional)" error={err("sellLimitCents")} hint={draft.sellLimitCents ? `Return ${ret(draft.sellLimitCents)}` : undefined}>
            <input className={input} inputMode="decimal" value={draft.sellLimitCents} onChange={(e) => update({ sellLimitCents: e.target.value })} />
          </Field>
          <Field label="Sell limit only before (optional)">
            <input type="date" className={input} value={sellLimitBefore} onChange={(e) => setSellLimitBefore(e.target.value)} />
          </Field>
          <Field label="Stop loss (¢, optional)" error={err("stopCents")} hint={draft.stopCents ? `Loss ${ret(draft.stopCents)}` : undefined}>
            <input className={input} inputMode="decimal" value={draft.stopCents} onChange={(e) => update({ stopCents: e.target.value })} />
          </Field>
          <Field label="Mandatory exit by (optional)">
            <input type="date" className={input} value={exitBy} onChange={(e) => setExitBy(e.target.value)} />
          </Field>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">3. Thesis</h2>
          <Field label="2–3 paragraphs: main thesis points and catalysts (blank line between paragraphs)" error={err("thesis")}>
            <textarea className={`${input} min-h-[180px]`} value={draft.thesis} onChange={(e) => update({ thesis: e.target.value })} />
          </Field>
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 h-fit space-y-4">
        <div className={card}>
          <div className="text-xs text-gray-500 dark:text-gray-400">Pitch #{nextRound} · {SECTOR_LABEL[draft.sector]} · {VENUE_LABEL[venue]}</div>
          <div className="font-semibold text-gray-900 dark:text-white mt-1">{lookup?.title ?? "Market"}</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Investment: <span className="font-mono">{draft.side}</span> on {outcome?.label ?? "—"}
          </div>
          <dl className="mt-3 space-y-1 text-sm font-mono">
            <div className="flex justify-between"><dt className="text-gray-500">Price</dt><dd>{draft.entryCents ? `${draft.entryCents}¢` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Implied</dt><dd>{draft.impliedCents ? `${draft.impliedCents}¢ (${ret(draft.impliedCents)})` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Sell limit</dt><dd>{draft.sellLimitCents ? `${draft.sellLimitCents}¢ (${ret(draft.sellLimitCents)})` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Stop</dt><dd>{draft.stopCents ? `${draft.stopCents}¢ (${ret(draft.stopCents)})` : "—"}</dd></div>
          </dl>
        </div>
        <button
          onClick={() => setShowErrors(true)}
          className="w-full py-2.5 rounded-md bg-primary text-gray-900 font-semibold text-sm disabled:opacity-50"
          disabled={showErrors && Object.keys(errors).length === 0}
        >
          {showErrors && Object.keys(errors).length === 0 ? "Ready to submit" : "Check pitch"}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Saving pitches turns on once the OBG database is connected. For now this checks the pitch and previews it.
        </p>
      </aside>
    </div>
  );
}
