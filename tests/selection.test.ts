import { describe, expect, test } from "vitest";
import { pitchRole } from "@/lib/predictions/selection";
import type { Round } from "@/lib/predictions/types";

const round = (selectedPitchId: string | null): Round => ({
  number: 6, publishedAt: "2026-10-14", mediumUrl: null, summary: null, selectedPitchId,
});

describe("pitchRole", () => {
  test("is voting while the round has no winner", () => {
    expect(pitchRole({ id: "a" }, round(null))).toBe("voting");
  });

  test("is executed for the vote winner", () => {
    expect(pitchRole({ id: "a" }, round("a"))).toBe("executed");
  });

  test("is paper for the pitches that lost the vote", () => {
    expect(pitchRole({ id: "b" }, round("a"))).toBe("paper");
  });

  test("is voting when the round is unknown", () => {
    expect(pitchRole({ id: "a" }, undefined)).toBe("voting");
  });
});
