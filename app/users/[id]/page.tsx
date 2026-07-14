import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ArrowLeft, User, Pencil, Eye, EyeOff, ExternalLink } from "lucide-react";
import { NoteCard } from "@/components/notes/NoteCard";
import { ResearchNote } from "@/lib/types";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const serviceClient = createServiceClient();
  const userClient = await createClient();

  const { data: { user: viewer } } = await userClient.auth.getUser();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, display_name, avatar_url, bio, school, graduation_year, major, twitter, linkedin, telegram, is_public, public_fields, created_at")
    .eq("id", id)
    .single();

  if (!profile || !profile.display_name) notFound();

  const isOwner = viewer?.id === id;

  let viewerSchool: string | null = null;
  if (viewer && !isOwner) {
    const { data: vp } = await serviceClient
      .from("profiles")
      .select("school")
      .eq("id", viewer.id)
      .single();
    viewerSchool = vp?.school ?? null;
  }

  const isSameSchool = Boolean(!isOwner && viewerSchool && profile.school && viewerSchool === profile.school);
  const canViewAll = isOwner || isSameSchool;
  const publicFields: string[] = Array.isArray(profile.public_fields) ? (profile.public_fields as string[]) : [];

  function canShow(field: string): boolean {
    if (canViewAll) return true;
    return publicFields.includes(field);
  }

  if (!profile.is_public && !canViewAll) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/schools"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Schools
        </Link>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 py-20 text-center">
          <EyeOff className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">This profile is private.</p>
          {!viewer && (
            <Link href="/login" className="mt-4 inline-flex text-xs text-primary hover:underline">
              Sign in to see if you know this member
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { data: notes } = await serviceClient
    .from("research_notes")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const memberSince = profile.created_at
    ? formatDistanceToNow(new Date(profile.created_at as string), { addSuffix: true })
    : null;

  const hasSocial =
    (canShow("twitter") && profile.twitter) ||
    (canShow("linkedin") && profile.linkedin) ||
    (canShow("telegram") && profile.telegram);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <Link href="/schools"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Schools
        </Link>
        {isOwner && (
          <Link href="/profile"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit profile
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6 mb-6">
        <div className="flex items-start gap-5">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url as string} width={72} height={72}
              alt={profile.display_name as string}
              className="rounded-xl shrink-0 object-cover border border-gray-200 dark:border-gray-700"
              unoptimized />
          ) : (
            <div className="w-[72px] h-[72px] rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-gray-400 dark:text-gray-500" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {canShow("display_name") ? profile.display_name : "DormDAO Member"}
            </h1>

            {canShow("school") && profile.school && (
              <Link href={`/schools/${slugify(profile.school as string)}`}
                className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-fit">
                <SchoolLogo name={profile.school as string} size={14} />
                {schoolDisplayName(profile.school as string)}
              </Link>
            )}

            <div className="flex flex-wrap gap-3 mt-1.5">
              {canShow("graduation_year") && profile.graduation_year && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Class of {profile.graduation_year as number}
                </span>
              )}
              {canShow("major") && profile.major && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{profile.major}</span>
              )}
            </div>

            {memberSince && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Joined {memberSince}</p>
            )}

            {canShow("bio") && profile.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        {hasSocial && (
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            {canShow("twitter") && profile.twitter && (
              <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                @{profile.twitter}
              </a>
            )}
            {canShow("linkedin") && profile.linkedin && (
              <a href={(profile.linkedin as string).startsWith("http") ? profile.linkedin as string : `https://${profile.linkedin}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {canShow("telegram") && profile.telegram && (
              <a href={`https://t.me/${profile.telegram}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                @{profile.telegram}
              </a>
            )}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600 px-1 mb-6">
          {profile.is_public
            ? <><Eye className="w-3.5 h-3.5" /> Your profile is visible in the members directory</>
            : <><EyeOff className="w-3.5 h-3.5" /> Your profile is hidden from the members directory</>}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-4">
          Research Notes ({notes?.length ?? 0})
        </h2>
        {notes && notes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {(notes as ResearchNote[]).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            No research notes posted yet.
          </div>
        )}
      </section>
    </div>
  );
}
