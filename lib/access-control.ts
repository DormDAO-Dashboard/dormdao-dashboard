import { isAdminUser } from "./admin-config";
import { isRegisteredMember, getMemberForUser as _getMemberForUser, type Member } from "./members-store";

/** Returns true when the email or wallet is either the registered admin or an approved member. */
export async function isRegisteredUser(
  email: string | undefined,
  wallet: string | undefined,
): Promise<boolean> {
  if (isAdminUser(email, wallet)) return true;
  return isRegisteredMember(email, wallet);
}

/** Returns the approved-member record for the given email or wallet, or null if not found. */
export async function getMemberForUser(
  email: string | undefined,
  wallet: string | undefined,
): Promise<Member | null> {
  return _getMemberForUser(email, wallet);
}
