import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getDocumentAccessContext, applyDocumentVisibility } from "@/lib/document-access";

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

  const ctx = await getDocumentAccessContext();
  const docs = applyDocumentVisibility(data ?? [], ctx);

  return NextResponse.json({ documents: docs });
}
