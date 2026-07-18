export const MAIN_DAO_SLUG = "main-dao";
export const MAIN_DAO_NAME = "Main DAO";

// Main DAO has no real school-membership concept — access is DormDAO-admin-wide:
// the env-configured admin (isAdminUser) or anyone with profiles.role === "dorm_admin".
export function isMainDaoAuthorized(isEnvAdmin: boolean, role: string | null | undefined): boolean {
  return isEnvAdmin || role === "dorm_admin";
}
