import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ threads: [], documents: [] });
  }

  const supabase = createServiceClient();

  const [threadsRes, docsRes] = await Promise.all([
    supabase
      .from("forum_threads")
      .select("id, title, category, school")
      .ilike("title", `%${q}%`)
      .limit(3),
    supabase
      .from("token_documents")
      .select("id, title, token_ticker, file_url, document_type")
      .ilike("title", `%${q}%`)
      .limit(3),
  ]);

  return NextResponse.json({
    threads: threadsRes.data ?? [],
    documents: docsRes.data ?? [],
  });
}
