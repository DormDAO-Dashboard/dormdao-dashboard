import type { Sector, Side } from "@/lib/predictions/types";

// Raw form state. Prices are typed in cents ("36" = 36¢), the way the team
// writes them in pitch docs.
export interface PitchDraft {
  analyst: string;
  sector: Sector;
  outcomeChosen: boolean;
  side: Side;
  entryCents: string;
  impliedCents: string;
  sellLimitCents: string; // optional
  stopCents: string;      // optional
  thesis: string;
}

export type PitchDraftErrors = Partial<Record<"analyst" | "outcome" | "thesis" | "entryCents" | "impliedCents" | "sellLimitCents" | "stopCents", string>>;

const MIN_CENTS = 1;
const MAX_ENTRY_CENTS = 99;
const MAX_TARGET_CENTS = 100;

function parseCents(value: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(value.trim())) return null;
  return Number(value.trim());
}

export function validatePitchDraft(d: PitchDraft): PitchDraftErrors {
  const errors: PitchDraftErrors = {};
  if (!d.analyst.trim()) errors.analyst = "Who's pitching?";
  if (!d.outcomeChosen) errors.outcome = "Pick the outcome you're trading.";
  if (!d.thesis.trim()) errors.thesis = "Add the thesis.";

  const entry = parseCents(d.entryCents);
  if (entry === null || entry < MIN_CENTS || entry > MAX_ENTRY_CENTS) {
    errors.entryCents = `Entry must be ${MIN_CENTS}–${MAX_ENTRY_CENTS}¢.`;
  }

  const implied = parseCents(d.impliedCents);
  if (implied === null || implied < MIN_CENTS || implied > MAX_TARGET_CENTS) {
    errors.impliedCents = `Implied must be ${MIN_CENTS}–${MAX_TARGET_CENTS}¢.`;
  } else if (entry !== null && implied <= entry) {
    errors.impliedCents = "Implied price should be above entry.";
  }

  if (d.sellLimitCents.trim()) {
    const limit = parseCents(d.sellLimitCents);
    if (limit === null || limit > MAX_TARGET_CENTS) errors.sellLimitCents = `Sell limit must be up to ${MAX_TARGET_CENTS}¢.`;
    else if (entry !== null && limit <= entry) errors.sellLimitCents = "Sell limit should be above entry.";
  }

  if (d.stopCents.trim()) {
    const stop = parseCents(d.stopCents);
    if (stop === null || stop < 0) errors.stopCents = "Stop must be a price in cents.";
    else if (entry !== null && stop >= entry) errors.stopCents = "Stop should be below entry.";
  }

  return errors;
}
