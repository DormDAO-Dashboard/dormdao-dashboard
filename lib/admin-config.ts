export interface AdminMember {
  name: string;
  votingUnits: number;
  email: string;
  wallet: string;
}

// Admin config is driven by server-only env vars set in Vercel.
// This module must only be imported in server components / API routes.
export function getAdminConfig(): AdminMember {
  return {
    name:         process.env.ADMIN_NAME         ?? "Jack Schlosser",
    email:        process.env.ADMIN_EMAIL         ?? "jack@dormdao.io",
    wallet:      (process.env.ADMIN_WALLET        ?? "0x8a6e5f901dd621648f41a5f40c5dec322be9cfaa").toLowerCase(),
    votingUnits:  parseInt(process.env.ADMIN_VOTING_UNITS ?? "10", 10),
  };
}

/** Returns true if the provided email or wallet belongs to the registered admin. */
export function isAdminUser(email: string | undefined, wallet: string | undefined): boolean {
  const cfg = getAdminConfig();
  if (email  && cfg.email  && email.toLowerCase()  === cfg.email.toLowerCase())  return true;
  if (wallet && cfg.wallet && wallet.toLowerCase() === cfg.wallet.toLowerCase()) return true;
  return false;
}
