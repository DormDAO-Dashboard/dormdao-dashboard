"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink } from "lucide-react";
import { SchoolLogo } from "@/components/SchoolLogo";

interface MemberRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  school: string | null;
  graduation_year: number | null;
  major: string | null;
  twitter: string | null;
  linkedin: string | null;
  telegram: string | null;
  is_public: boolean;
  public_fields: string[] | null;
  created_at: string;
}

interface FilteredMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  school: string | null;
  graduation_year: number | null;
  major: string | null;
  twitter: string | null;
  linkedin: string | null;
  telegram: string | null;
}

function filterMemberFields(member: MemberRow, isSameSchool: boolean): FilteredMember {
  if (isSameSchool) {
    return {
      id: member.id,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      bio: member.bio,
      school: member.school,
      graduation_year: member.graduation_year,
      major: member.major,
      twitter: member.twitter,
      linkedin: member.linkedin,
      telegram: member.telegram,
    };
  }
  const pf = Array.isArray(member.public_fields) ? member.public_fields : [];
  return {
    id: member.id,
    display_name: member.display_name,
    avatar_url: member.avatar_url,
    bio: pf.includes("bio") ? member.bio : null,
    school: pf.includes("school") ? member.school : null,
    graduation_year: pf.includes("graduation_year") ? member.graduation_year : null,
    major: pf.includes("major") ? member.major : null,
    twitter: pf.includes("twitter") ? member.twitter : null,
    linkedin: pf.includes("linkedin") ? member.linkedin : null,
    telegram: pf.includes("telegram") ? member.telegram : null,
  };
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500", "bg-cyan-500",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function MemberCard({ m, schoolName }: { m: FilteredMember; schoolName: string }) {
  const initials = m.display_name.charAt(0).toUpperCase();
  const hasSocial = m.twitter || m.linkedin || m.telegram;

  return (
    <Link href={`/users/${m.id}`}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 flex flex-col gap-3 h-full hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        {m.avatar_url ? (
          <Image src={m.avatar_url} width={40} height={40} alt={m.display_name}
            className="rounded-lg shrink-0 object-cover" unoptimized />
        ) : (
          <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-semibold ${avatarColor(m.id)}`}>
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.display_name}</p>
          {m.school && (
            <div className="flex items-center gap-1 mt-0.5">
              <SchoolLogo name={m.school} size={12} />
              <span className="text-xs text-gray-500 truncate">{m.school}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grad year + major */}
      {(m.graduation_year || m.major) && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {[m.graduation_year ? `Class of ${m.graduation_year}` : null, m.major].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Bio */}
      {m.bio && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{m.bio}</p>
      )}

      {/* Social links */}
      {hasSocial && (
        <div className="flex items-center gap-3 mt-auto pt-1">
          {m.twitter && (
            <span onClick={(e) => e.preventDefault()}
              className="contents">
              <a href={`https://twitter.com/${m.twitter}`} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                @{m.twitter}
              </a>
            </span>
          )}
          {m.linkedin && (
            <a href={m.linkedin.startsWith("http") ? m.linkedin : `https://${m.linkedin}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {m.telegram && (
            <a href={`https://t.me/${m.telegram}`} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              @{m.telegram}
            </a>
          )}
        </div>
      )}
    </Link>
  );
}

export function SchoolMembers({
  schoolName,
  onCountLoad,
}: {
  schoolName: string;
  onCountLoad?: (n: number) => void;
}) {
  const [members, setMembers] = useState<FilteredMember[]>([]);
  const [isSameSchool, setIsSameSchool] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      let viewerIsSameSchool = false;
      if (user) {
        const { data: vp } = await supabase
          .from("profiles")
          .select("school")
          .eq("id", user.id)
          .single();
        viewerIsSameSchool = vp?.school === schoolName;
      }

      setIsSameSchool(viewerIsSameSchool);

      const query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, school, graduation_year, major, twitter, linkedin, telegram, is_public, public_fields, created_at")
        .eq("school", schoolName)
        .not("display_name", "is", null)
        .order("created_at", { ascending: true });

      if (!viewerIsSameSchool) {
        query.eq("is_public", true);
      }

      const { data } = await query;
      const rows = (data as MemberRow[]) ?? [];
      const filtered = rows.map((m) => filterMemberFields(m, viewerIsSameSchool));
      setMembers(filtered);
      onCountLoad?.(filtered.length);
      setLoading(false);
    }

    load();
  }, [schoolName, onCountLoad]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 py-16 text-center text-gray-500 text-sm">
        {isSameSchool
          ? <>No members have joined yet.<div className="mt-2 text-xs text-gray-400 dark:text-gray-600">Members set their school on their profile page.</div></>
          : <>No public members yet.<div className="mt-2 text-xs text-gray-400 dark:text-gray-600">Members can make their profile public from their profile settings.</div></>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400 dark:text-gray-500">{members.length} member{members.length !== 1 ? "s" : ""}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <MemberCard key={m.id} m={m} schoolName={schoolName} />
        ))}
      </div>
    </div>
  );
}
