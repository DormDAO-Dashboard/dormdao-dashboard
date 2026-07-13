import { createServiceClient } from "./supabase/server";

const BUCKET = "admin-data";
const FILE   = "members.json";

export interface Member {
  id: string;
  name: string;
  votingUnits: number;
  email: string;
  walletAddress: string;
  school: string | null;
  createdAt: string;
}

async function getStorage() {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !error.message.toLowerCase().includes("already")) {
    console.error("Storage bucket error:", error.message);
  }
  return supabase.storage.from(BUCKET);
}

export async function getMembers(): Promise<Member[]> {
  try {
    const storage = await getStorage();
    const { data, error } = await storage.download(FILE);
    if (error || !data) return [];
    const text = await data.text();
    const raw = JSON.parse(text) as Member[];
    // Backward compat: existing members without school get null
    return raw.map((m) => ({ ...m, school: m.school ?? null }));
  } catch {
    return [];
  }
}

export async function saveMembers(members: Member[]): Promise<void> {
  const storage = await getStorage();
  const { error } = await storage.upload(FILE, JSON.stringify(members, null, 2), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

export async function isRegisteredMember(
  email: string | undefined,
  wallet: string | undefined,
): Promise<boolean> {
  const members = await getMembers();
  return members.some((m) => {
    if (email  && m.email         && m.email.toLowerCase()         === email.toLowerCase())  return true;
    if (wallet && m.walletAddress && m.walletAddress.toLowerCase() === wallet.toLowerCase()) return true;
    return false;
  });
}

export async function getMemberForUser(
  email: string | undefined,
  wallet: string | undefined,
): Promise<Member | null> {
  const members = await getMembers();
  if (email) {
    const found = members.find(
      (m) => m.email && m.email.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
  }
  if (wallet) {
    const found = members.find(
      (m) => m.walletAddress && m.walletAddress.toLowerCase() === wallet.toLowerCase(),
    );
    if (found) return found;
  }
  return null;
}
