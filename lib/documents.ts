export type DocumentVisibility = "public" | "members" | "school";

export interface TokenDocument {
  id: string;
  token_ticker: string;
  title: string;
  school: string | null;
  document_date: string | null;
  file_url: string | null;
  document_type: string;
  visibility: DocumentVisibility;
  created_at: string;
  locked: boolean;
}

export function getDefaultVisibility(type: string): DocumentVisibility {
  if (type === "report") return "members";
  if (type === "video") return "school";
  return "public";
}

export function getLockReason(visibility: DocumentVisibility, school: string | null): string {
  if (visibility === "members") return "Sign in to view";
  if (visibility === "school") return school ? `${school} members only` : "School members only";
  return "";
}
