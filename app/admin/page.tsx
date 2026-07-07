import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminConfig, isAdminUser } from "@/lib/admin-config";
import { getMembers } from "@/lib/members-store";
import { AdminMembersSection } from "@/components/AdminMembersSection";

export const metadata = { title: "Admin — DormDAO" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email  = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;
  if (!isAdminUser(email, wallet)) redirect("/");

  const admin          = getAdminConfig();
  const initialMembers = await getMembers();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage DormDAO admin members and registered members.
        </p>
      </div>

      {/* Admin members (hardcoded from config) */}
      <div className="rounded-xl border border-gray-800 bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">
            Admins
            <span className="ml-2 text-xs text-gray-500 font-normal">1 total</span>
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
              <tr className="border-b border-gray-800/50">
                <td className="px-5 py-3 font-medium text-white">{admin.name}</td>
                <td className="px-5 py-3 text-right font-mono text-primary">{admin.votingUnits}</td>
                <td className="px-5 py-3 text-gray-400">{admin.email || "—"}</td>
                <td className="px-5 py-3 font-mono text-gray-400 text-xs">
                  {admin.wallet ? `${admin.wallet.slice(0, 6)}…${admin.wallet.slice(-4)}` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Registered members (dynamic, managed by admin) */}
      <AdminMembersSection initialMembers={initialMembers} />
    </div>
  );
}
