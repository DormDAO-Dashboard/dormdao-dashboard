"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, ChevronRight } from "lucide-react";

interface MemberRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  graduation_year: number | null;
  major: string | null;
  twitter: string | null;
  is_public: boolean;
  public_fields: string[] | null;
  created_at: string;
}

function fieldVisible(member: MemberRow, field: string, isSameSchool: boolean): boolean {
  if (isSameSchool) return true;
  return Array.isArray(member.public_fields) && member.public_fields.includes(field);
}

export function SchoolMembers({ schoolName }: { schoolName: string }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
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
        .select("id, display_name, avatar_url, bio, graduation_year, major, twitter, is_public, public_fields, created_at")
        .eq("school", schoolName)
        .not("display_name", "is", null)
        .order("created_at", { ascending: true });

      if (!viewerIsSameSchool) {
        query.eq("is_public", true);
      }

      const { data } = await query;
      setMembers((data as MemberRow[]) ?? []);
      setLoading(false);
    }

    load();
  }, [schoolName]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 py-16 text-center text-gray-500 text-sm">
        No public members yet.
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-600">
          Members can make their profile public from their profile settings.
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((m) => (
        <Link key={m.id} href={`/users/${m.id}`}
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 flex gap-3 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
          {m.avatar_url ? (
            <Image src={m.avatar_url} width={44} height={44} alt={m.display_name}
              className="rounded-lg shrink-0 object-cover" unoptimized />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{m.display_name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 ml-auto shrink-0 transition-colors" />
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {fieldVisible(m, "graduation_year", isSameSchool) && m.graduation_year && (
                <span className="text-xs text-gray-400 dark:text-gray-500">&apos;{String(m.graduation_year).slice(-2)}</span>
              )}
              {fieldVisible(m, "major", isSameSchool) && m.major && (
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.major}</span>
              )}
            </div>
            {fieldVisible(m, "bio", isSameSchool) && m.bio ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{m.bio}</p>
            ) : fieldVisible(m, "twitter", isSameSchool) && m.twitter ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">@{m.twitter}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
