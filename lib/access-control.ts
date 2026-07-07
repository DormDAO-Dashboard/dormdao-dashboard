import { isAdminUser } from "./admin-config";
import { isRegisteredMember } from "./members-store";

/** Returns true when the email or wallet is either the registered admin or an approved member. */
export async function isRegisteredUser(
  email: string | undefined,
  wallet: string | undefined,
): Promise<boolean> {
  if (isAdminUser(email, wallet)) return true;
  return isRegisteredMember(email, wallet);
}
