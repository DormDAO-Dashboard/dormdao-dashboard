import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params;
  const { user_id } = await req.json();

  const supabase = createServiceClient();

  // Check for existing vote (by user_id if present, else session_id as a proxy)
  if (user_id) {
    const { data: existing } = await supabase
      .from("note_votes")
      .select("id")
      .eq("note_id", noteId)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }

    const { error: voteErr } = await supabase
      .from("note_votes")
      .insert({ note_id: noteId, user_id });
    if (voteErr) return NextResponse.json({ error: voteErr.message }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("increment_upvotes", {
    note_id: noteId,
  });

  if (error) {
    // Fallback: direct update
    const { error: updateErr } = await supabase.rpc("increment_note_upvotes", {
      p_note_id: noteId,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, data });
}
