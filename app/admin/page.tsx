import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminConfig, isAdminUser } from "@/lib/admin-config";
import { getMembers } from "@/lib/members-store";
import { AdminMembersSection } from "@/components/AdminMembersSection";
import { AdminProfilesSection } from "@/components/AdminProfilesSection";
import { SignupRequestsSection } from "@/components/SignupRequestsSection";

export const metadata = { title: "Admin — DormDAO" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email  = user.email;
  const wallet = user.user_metadata?.wallet_address as string | undefined;
  if (!isAdminUser(email, wallet)) {
    const service2 = createServiceClient();
    const { data: prof } = await service2.from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "dorm_admin") redirect("/");
  }

  const admin      = getAdminConfig();
  const allMembers = await getMembers();

  const serviceClient = createServiceClient();
  const { data: dormAdminProfiles } = await serviceClient
    .from("profiles")
    .select("id, display_name, school")
    .eq("role", "dorm_admin");

  // Resolve auth info for dorm_admin profiles; match against members.json by email OR wallet
  const dormAdminEmails = new Set<string>();
  const dormAdminWallets = new Set<string>();
  const dormAdminsWithEmail = await Promise.all(
    (dormAdminProfiles ?? []).map(async (da) => {
      const { data } = await serviceClient.auth.admin.getUserById(da.id);
      const authEmail = data?.user?.email ?? null;
      const authWallet = (data?.user?.user_metadata?.wallet_address as string | undefined)?.toLowerCase();
      if (authEmail) dormAdminEmails.add(authEmail.toLowerCase());
      if (authWallet) dormAdminWallets.add(authWallet);

      // Find matching members.json entry by email or wallet
      const memberEntry = allMembers.find((m) =>
        (authEmail && m.email.toLowerCase() === authEmail.toLowerCase()) ||
        (authWallet && m.walletAddress && m.walletAddress.toLowerCase() === authWallet)
      );
      if (memberEntry?.email) dormAdminEmails.add(memberEntry.email.toLowerCase());
      if (memberEntry?.walletAddress) dormAdminWallets.add(memberEntry.walletAddress.toLowerCase());

      return {
        ...da,
        email: memberEntry?.email ?? authEmail,
        walletAddress: memberEntry?.walletAddress ?? null,
        memberId: memberEntry?.id ?? null,
        votingUnits: memberEntry?.votingUnits ?? null,
      };
    })
  );

  // Exclude dorm_admins from Members list to avoid duplication
  const initialMembers = allMembers.filter(
    (m) =>
      !dormAdminEmails.has(m.email.toLowerCase()) &&
      !(m.walletAddress && dormAdminWallets.has(m.walletAddress.toLowerCase()))
  );

  const { data: recentFailedLogins } = await serviceClient
    .from("login_attempts")
    .select("id, email, wallet_address, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage DormDAO admin members and registered members.
        </p>
      </div>

      <AdminProfilesSection
        envAdmin={{
          name: admin.name,
          votingUnits: admin.votingUnits,
          email: admin.email ?? "",
          wallet: admin.wallet ?? "",
          memberId: allMembers.find((m) => m.email.toLowerCase() === (admin.email ?? "").toLowerCase())?.id ?? null,
        }}
        initialDormAdmins={dormAdminsWithEmail}
      />

      <SignupRequestsSection />

      <AdminMembersSection initialMembers={initialMembers} />

      {/* Recent failed logins */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Recent Failed Logins
            <span className="ml-2 text-xs text-gray-500 font-normal">last 10</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                <th className="text-left px-5 py-3">Time</th>
                <th className="text-left px-5 py-3">Email / Wallet</th>
                <th className="text-left px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(recentFailedLogins ?? []).map((row) => (
                <tr key={row.id} className="border-b border-gray-200/80 dark:border-gray-800/50">
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(row.created_at as string).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                    {row.email ?? row.wallet_address ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger">
                      {row.reason}
                    </span>
                  </td>
                </tr>
              ))}
              {(recentFailedLogins ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-gray-600 text-sm">
                    No failed login attempts on record.
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
