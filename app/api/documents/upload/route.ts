import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDefaultVisibility } from "@/lib/documents";
import { isAdminUser } from "@/lib/admin-config";

export async function POST(req: NextRequest) {
  // Auth: must be signed in with a school matching the uploaded document's school
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload documents" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("school")
    .eq("id", user.id)
    .single();

  const isAdmin = isAdminUser(user.email, user.user_metadata?.wallet_address as string | undefined);

  if (!isAdmin && !profile?.school) {
    return NextResponse.json({ error: "Set your school on your profile to upload documents" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ticker = (formData.get("ticker") as string | null)?.toUpperCase() || "SCHOOL";
    const title = formData.get("title") as string | null;
    const school = formData.get("school") as string | null;
    const documentDate = formData.get("document_date") as string | null;
    const documentType = (formData.get("document_type") as string | null) ?? "report";

    // Verify the school being uploaded to matches the user's school
    if (!isAdmin && (!school || school.trim().toLowerCase() !== profile?.school?.trim().toLowerCase())) {
      return NextResponse.json({ error: "You can only upload documents for your own school" }, { status: 403 });
    }

    // Video type: store URL directly, no Storage upload
    if (documentType === "video") {
      const videoUrl = formData.get("video_url") as string | null;
      if (!videoUrl || !title) {
        return NextResponse.json({ error: "video_url and title are required" }, { status: 400 });
      }
      const { data, error: dbError } = await service
        .from("token_documents")
        .insert({
          token_ticker: ticker,
          title: title.trim(),
          school: school?.trim() || null,
          document_date: documentDate || null,
          file_url: videoUrl.trim(),
          document_type: "video",
          visibility: "school",
        })
        .select()
        .single();
      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ document: data }, { status: 201 });
    }

    if (!file || !title) {
      return NextResponse.json({ error: "file and title are required" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const storagePath = `${ticker}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await service.storage
      .from("token-documents")
      .upload(storagePath, bytes, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = service.storage
      .from("token-documents")
      .getPublicUrl(storagePath);

    // Insert metadata row
    const { data, error: dbError } = await service
      .from("token_documents")
      .insert({
        token_ticker: ticker,
        title: title.trim(),
        school: school?.trim() || null,
        document_date: documentDate || null,
        file_url: urlData.publicUrl,
        document_type: documentType,
        visibility: getDefaultVisibility(documentType),
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
