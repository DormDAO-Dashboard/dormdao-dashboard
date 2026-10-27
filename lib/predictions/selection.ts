import type { Pitch, PitchRole, Round } from "@/lib/predictions/types";

// A pitch is "voting" until its round has a winner, then "executed" (the one
// trade the fund places) or "paper" (tracked for accuracy only).
export function pitchRole(pitch: Pick<Pitch, "id">, round: Round | undefined): PitchRole {
  if (!round?.selectedPitchId) return "voting";
  return round.selectedPitchId === pitch.id ? "executed" : "paper";
}

export function roundLookup(rounds: Round[]): (roundNumber: number) => Round | undefined {
  const byNumber = new Map(rounds.map((w) => [w.number, w]));
  return (n) => byNumber.get(n);
}
