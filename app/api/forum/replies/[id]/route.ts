import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canModerate } from "@/lib/auth-utils";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: reply } = await service
    .from("forum_replies")
    .select("user_id, school")
    .eq("id", id)
    .single();

  if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

  const isOwner = reply.user_id === user.id;
  if (!isOwner) {
    const { data: profile } = await service
      .from("profiles").select("role, school").eq("id", user.id).single();
    if (!canModerate(profile ?? {}, reply.school ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await service.from("forum_replies").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
