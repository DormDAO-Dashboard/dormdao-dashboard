// Who may use OBG Prediction Markets — client-safe so the sidebar can use
// the same rule the server gate (lib/predictions/access.ts) enforces.
export const PREDICTIONS_SCHOOL = "Oregon";

export function canUsePredictions(school: string | null | undefined, isAlumni: boolean | null | undefined, isAdmin: boolean): boolean {
  return isAdmin || (school === PREDICTIONS_SCHOOL && !isAlumni);
}
