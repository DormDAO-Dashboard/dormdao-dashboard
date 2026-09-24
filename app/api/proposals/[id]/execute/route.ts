import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-config";
import { canModerate } from "@/lib/auth-utils";
import { sendExecutionEmail } from "@/lib/email";
import { MAIN_DAO_SLUG } from "@/lib/main-dao";
import type { Proposal } from "@/lib/proposals";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: proposal } = await service
    .from("proposals")
    .select("school, status")
    .eq("id", id)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if (proposal.status !== "passed") {
    return NextResponse.json({ error: "Only passed proposals can be marked as executed" }, { status: 400 });
  }

  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);
  if (!isAdmin) {
    const { data: profile } = await service
      .from("profiles")
      .select("role, school")
      .eq("id", user.id)
      .single();

    if (!canModerate(profile ?? { role: null, school: null }, proposal.school)) {
      return NextResponse.json({ error: "Only club leadership can mark proposals as executed" }, { status: 403 });
    }
  }

  // FormData rather than JSON — lets a caller (the admin "Mark Filled" panel)
  // attach an actual screenshot file alongside/instead of a pasted link, in
  // the same request as everything else. A text-only submission (the
  // existing per-proposal "Mark as Executed" modal) still works fine as
  // FormData with no file field present.
  const formData = await req.formData();
  const skipEmail = formData.get("skip_email") === "1";

  // "Mark Filled (No Email)" — a bare status change with no proof/notes
  // required at all, since none of it will ever be shown to anyone. Kept in
  // this same endpoint (rather than a separate route) because the actual
  // state transition — passed -> executed — is identical either way; only
  // the validation and the email side-effect differ.
  if (skipEmail) {
    const { data: updated, error } = await service
      .from("proposals")
      .update({ status: "executed", executed_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ proposal: updated });
  }

  // "Trade Executed" is a per-school notification (proposalSchoolLabel,
  // school-scoped recipients, etc. all assume a real school) — Main DAO
  // proposals must never trigger it. Enforced here regardless of which UI
  // is calling this (the admin panel already hides Main DAO from its
  // lists, and ProposalCard hides its own "Mark as Executed" button for
  // Main DAO too, but this is the one place that actually matters).
  if (proposal.school === MAIN_DAO_SLUG) {
    return NextResponse.json({ error: "Main DAO proposals can't send a Trade Executed email — only school proposals can." }, { status: 400 });
  }

  const executionLink = (formData.get("execution_tx") as string | null)?.trim() || "";
  const tradeOutput = (formData.get("trade_output") as string | null)?.trim() || "";
  const executionNotes = (formData.get("execution_notes") as string | null)?.trim() || "";
  const image = formData.get("image") as File | null;

  if (!executionLink && !image) {
    return NextResponse.json({ error: "Provide a transaction link or a screenshot" }, { status: 400 });
  }
  if (!tradeOutput) {
    return NextResponse.json({ error: "trade_output is required" }, { status: 400 });
  }

  // Proof is a single URL either way — a pasted link, or the public Storage
  // URL of an uploaded screenshot. Stored in the same execution_tx column
  // either way (see lib/email.ts's sendExecutionEmail, which renders it as
  // an inline image when the URL looks like one, else as a plain link) —
  // deliberately not a separate column, so this needs no schema migration.
  // (This also means a filled proposal with a non-null execution_tx can
  // only have come through this emailed path, never the skip_email one
  // above — the "View Filled Proposals" list uses exactly that to label
  // each row Emailed vs. Marked Filled, again with no new column needed.)
  let executionProofUrl = executionLink;
  if (image && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Screenshot must be an image file" }, { status: 400 });
    }
    const ext = image.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const storagePath = `execution-proofs/${id}-${Date.now()}.${ext}`;
    const bytes = await image.arrayBuffer();
    const { error: uploadError } = await service.storage
      .from("token-documents")
      .upload(storagePath, bytes, { contentType: image.type, upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: `Screenshot upload failed: ${uploadError.message}` }, { status: 500 });
    }
    const { data: urlData } = service.storage.from("token-documents").getPublicUrl(storagePath);
    executionProofUrl = urlData.publicUrl;
  }

  const notes = [tradeOutput, executionNotes].filter(Boolean).join("\n\n");

  const { data: updated, error } = await service
    .from("proposals")
    .update({
      status: "executed",
      execution_tx: executionProofUrl || null,
      execution_notes: notes || null,
      executed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  after(async () => {
    await sendExecutionEmail(updated as Proposal).catch(console.error);
  });

  return NextResponse.json({ proposal: updated });
}
