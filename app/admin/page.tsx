import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminConfig, isAdminUser } from "@/lib/admin-config";

export const metadata = { title: "Admin — DormDAO" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email  = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;

  if (!isAdminUser(email, wallet)) redirect("/");

  const admin = getAdminConfig();

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
                  {admin.wallet
                    ? `${admin.wallet.slice(0, 6)}…${admin.wallet.slice(-4)}`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
