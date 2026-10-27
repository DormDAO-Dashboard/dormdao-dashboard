import { describe, expect, test } from "vitest";
import { validatePitchDraft, type PitchDraft } from "@/lib/predictions/validatePitch";

const draft = (d: Partial<PitchDraft> = {}): PitchDraft => ({
  analyst: "Carsen Luna",
  sector: "economics",
  outcomeChosen: true,
  side: "YES",
  entryCents: "36",
  impliedCents: "52",
  sellLimitCents: "52",
  stopCents: "25",
  thesis: "GDPNow says 3.6%.",
  ...d,
});

describe("validatePitchDraft", () => {
  test("accepts a complete draft", () => {
    expect(validatePitchDraft(draft())).toEqual({});
  });

  test("allows optional sell limit and stop to be blank", () => {
    expect(validatePitchDraft(draft({ sellLimitCents: "", stopCents: "" }))).toEqual({});
  });

  test("requires analyst, outcome, and thesis", () => {
    const errors = validatePitchDraft(draft({ analyst: "  ", outcomeChosen: false, thesis: "" }));
    expect(Object.keys(errors).sort()).toEqual(["analyst", "outcome", "thesis"]);
  });

  test("rejects entry outside 1–99¢ and non-numbers", () => {
    expect(validatePitchDraft(draft({ entryCents: "0" })).entryCents).toBeDefined();
    expect(validatePitchDraft(draft({ entryCents: "100" })).entryCents).toBeDefined();
    expect(validatePitchDraft(draft({ entryCents: "abc" })).entryCents).toBeDefined();
  });

  test("requires sell limit above entry and stop below entry", () => {
    const errors = validatePitchDraft(draft({ sellLimitCents: "30", stopCents: "40" }));
    expect(errors.sellLimitCents).toMatch(/above entry/);
    expect(errors.stopCents).toMatch(/below entry/);
  });

  test("requires implied price above entry", () => {
    expect(validatePitchDraft(draft({ impliedCents: "20" })).impliedCents).toMatch(/above entry/);
  });
});
