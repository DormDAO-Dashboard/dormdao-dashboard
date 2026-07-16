import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canModerate } from "@/lib/auth-utils";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = createServiceClient();

  // Admin path: bearer token
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) {
    const { error } = await service.from("research_notes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // User path: proper auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: note } = await service
    .from("research_notes")
    .select("user_id, school")
    .eq("id", id)
    .single();

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const isOwner = note.user_id === user.id;
  if (!isOwner) {
    const { data: profile } = await service
      .from("profiles").select("role, school").eq("id", user.id).single();
    if (!canModerate(profile ?? { role: null, school: null }, note.school ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await service.from("research_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
