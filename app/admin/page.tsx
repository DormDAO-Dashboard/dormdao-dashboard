import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";

export default async function AdminPage() {
  await requireAdmin();
  redirect("/admin/main-dao");
}
