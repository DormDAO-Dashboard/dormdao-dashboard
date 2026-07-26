export const MAIN_DAO_SLUG = "main-dao";
export const MAIN_DAO_NAME = "Main DAO";

// A member can be assigned this in place of a real school (via the admin
// Members dropdown) to grant view/vote access to Main DAO proposals only —
// no school-exclusive features (their own school's portfolio, members list,
// forum, proposal creation, etc.) come with it.
export const MAIN_DAO_VOTER = "Main DAO Voter";

// Main DAO access is DormDAO-admin-wide (env-configured admin or anyone with
// profiles.role === "dorm_admin"), or anyone assigned the Main DAO Voter
// designation in place of a school.
export function isMainDaoAuthorized(
  isEnvAdmin: boolean,
  role: string | null | undefined,
  school?: string | null,
): boolean {
  return isEnvAdmin || role === "dorm_admin" || school === MAIN_DAO_VOTER;
}
