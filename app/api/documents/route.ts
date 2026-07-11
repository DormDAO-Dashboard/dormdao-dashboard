import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDefaultVisibility, type DocumentVisibility } from "@/lib/documents";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  const school = searchParams.get("school");
  const all = searchParams.get("all") === "true";

  const service = createServiceClient();

  let query = service
    .from("token_documents")
    .select("*")
    .order("document_date", { ascending: false });

  if (all) {
    // no filter
  } else if (school) {
    query = query.ilike("school", school);
  } else if (ticker) {
    query = query.ilike("token_ticker", ticker);
  } else {
    return NextResponse.json({ error: "ticker, school, or all required" }, { status: 400 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Determine caller's access level
  let isAuthenticated = false;
  let userSchool: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isAuthenticated = true;
      const { data: profile } = await service
        .from("profiles")
        .select("school")
        .eq("id", user.id)
        .single();
      userSchool = profile?.school ?? null;
    }
  } catch {
    // unauthenticated — serve public-only
  }

  const docs = (data ?? []).map((doc) => {
    const visibility: DocumentVisibility =
      (doc.visibility as DocumentVisibility) ?? getDefaultVisibility(doc.document_type);

    const canAccess =
      visibility === "public" ||
      (visibility === "members" && isAuthenticated) ||
      (visibility === "school" &&
        userSchool != null &&
        doc.school?.toLowerCase() === userSchool.toLowerCase());

    if (!canAccess) {
      // Never expose file_url for locked documents
      return { ...doc, file_url: null, visibility, locked: true };
    }
    return { ...doc, visibility, locked: false };
  });

  return NextResponse.json({ documents: docs });
}
