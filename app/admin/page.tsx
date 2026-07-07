import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — DormDAO" };

interface AdminMember {
  id: string;
  name: string;
  voting_units: number;
  email: string | null;
  wallet_address: string | null;
  created_at: string;
}

async function getAdminMembers(): Promise<AdminMember[]> {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("admin_members")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as AdminMember[]) ?? [];
}

export default async function AdminPage() {
  // Server-side auth + admin check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email;
  const walletAddress = user.user_metadata?.wallet_address as string | undefined;

  const serviceClient = createServiceClient();
  const filters: string[] = [];
  if (email) filters.push(`email.eq.${email}`);
  if (walletAddress) filters.push(`wallet_address.ilike.${walletAddress}`);

  const { data: adminRecord } = await serviceClient
    .from("admin_members")
    .select("id")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();

  if (!adminRecord) redirect("/");

  const members = await getAdminMembers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Registered DormDAO admin members and their voting units.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">
            Admin Members
            <span className="ml-2 text-xs text-gray-500 font-normal">{members.length} total</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-right px-5 py-3">Voting Units</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{m.name}</td>
                  <td className="px-5 py-3 text-right font-mono text-primary">{m.voting_units}</td>
                  <td className="px-5 py-3 text-gray-400">{m.email ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs">
                    {m.wallet_address
                      ? `${m.wallet_address.slice(0, 6)}…${m.wallet_address.slice(-4)}`
                      : "—"}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                    No admin members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
