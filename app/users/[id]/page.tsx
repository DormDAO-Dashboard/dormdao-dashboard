import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/server";
import { ArrowLeft, User, FileText, Download } from "lucide-react";
import { NoteCard } from "@/components/notes/NoteCard";
import { ResearchNote } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pitch_deck: { label: "Pitch Deck",         className: "bg-blue-600 border-blue-700" },
    report:     { label: "Fund Report",         className: "bg-emerald-600 border-emerald-700" },
    thesis:     { label: "Investment Thesis",   className: "bg-purple-600 border-purple-700" },
  };
  const { label, className } = map[type] ?? { label: "Document", className: "bg-gray-500 border-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white border ${className}`}>
      {label}
    </span>
  );
}

function formatDocDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, school, role, created_at")
    .eq("id", id)
    .single();

  if (!profile || !profile.display_name) notFound();

  // Fetch their research notes
  const { data: notes } = await supabase
    .from("research_notes")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  // Fetch school documents (attributed to this school since per-user tracking isn't stored)
  const { data: docs } = profile.school
    ? await supabase
        .from("token_documents")
        .select("*")
        .eq("school", profile.school)
        .order("created_at", { ascending: false })
    : { data: [] };

  const memberSince = profile.created_at
    ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/schools" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Schools
      </Link>

      {/* Profile header */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 mb-6">
        <div className="flex items-start gap-5">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              width={72}
              height={72}
              alt={profile.display_name}
              className="rounded-xl shrink-0 object-cover border border-gray-700"
              unoptimized
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-semibold text-white">{profile.display_name}</h1>
              {profile.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-medium">
                  Admin
                </span>
              )}
            </div>
            {profile.school && (
              <Link
                href={`/schools/${profile.school.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {profile.school}
              </Link>
            )}
            {memberSince && (
              <p className="text-xs text-gray-600 mt-0.5">Joined {memberSince}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-300 mt-3 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Research Notes */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">
          Research Notes ({notes?.length ?? 0})
        </h2>
        {notes && notes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {(notes as ResearchNote[]).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 py-10 text-center text-sm text-gray-500">
            No research notes posted yet.
          </div>
        )}
      </section>

      {/* School Documents */}
      {profile.school && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            {profile.school} Documents ({docs?.length ?? 0})
          </h2>
          {docs && docs.length > 0 ? (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
              <ul className="divide-y divide-gray-800/60">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{doc.title}</div>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        <TypeBadge type={doc.document_type} />
                        {doc.document_date && (
                          <span className="text-xs text-gray-500">{formatDocDate(doc.document_date)}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 py-10 text-center text-sm text-gray-500">
              No documents uploaded yet.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
