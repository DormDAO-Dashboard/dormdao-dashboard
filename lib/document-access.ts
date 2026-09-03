import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDefaultVisibility, type DocumentVisibility } from "@/lib/documents";

export interface DocumentAccessContext {
  isAuthenticated: boolean;
  userSchool: string | null;
}

// Resolves the caller's document-visibility tier once per request. Every
// route that returns token_documents rows must run its results through
// applyDocumentVisibility() below with this context — previously only
// /api/documents did, so /api/search and /api/proposals leaked file_url for
// members-only/school-only documents to anyone, authenticated or not.
export async function getDocumentAccessContext(): Promise<DocumentAccessContext> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isAuthenticated: false, userSchool: null };

    const service = createServiceClient();
    const { data: profile } = await service.from("profiles").select("school").eq("id", user.id).single();
    return { isAuthenticated: true, userSchool: profile?.school ?? null };
  } catch {
    return { isAuthenticated: false, userSchool: null };
  }
}

export function canAccessDocument(
  visibility: DocumentVisibility,
  docSchool: string | null | undefined,
  ctx: DocumentAccessContext,
): boolean {
  return (
    visibility === "public" ||
    (visibility === "members" && ctx.isAuthenticated) ||
    (visibility === "school" &&
      ctx.userSchool != null &&
      (docSchool ?? "").toLowerCase() === ctx.userSchool.toLowerCase())
  );
}

interface VisibilityGatedDoc {
  visibility?: DocumentVisibility | null;
  document_type: string;
  school?: string | null;
  file_url: string | null;
}

// Redacts file_url on any document the caller can't access, stamping
// visibility/locked so the client can render a locked state consistently.
export function applyDocumentVisibility<T extends VisibilityGatedDoc>(
  docs: T[],
  ctx: DocumentAccessContext,
): Array<T & { visibility: DocumentVisibility; locked: boolean }> {
  return docs.map((doc) => {
    const visibility: DocumentVisibility = doc.visibility ?? getDefaultVisibility(doc.document_type);
    if (!canAccessDocument(visibility, doc.school, ctx)) {
      return { ...doc, file_url: null, visibility, locked: true };
    }
    return { ...doc, visibility, locked: false };
  });
}
