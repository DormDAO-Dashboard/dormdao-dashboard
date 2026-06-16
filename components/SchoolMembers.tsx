"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, ChevronRight } from "lucide-react";

interface Member {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
}

export function SchoolMembers({ schoolName }: { schoolName: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, role, created_at")
      .eq("school", schoolName)
      .not("display_name", "is", null)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMembers((data as Member[]) ?? []);
        setLoading(false);
      });
  }, [schoolName]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/30 p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 py-16 text-center text-gray-500 text-sm">
        No members have joined {schoolName} yet.
        <div className="mt-2 text-xs text-gray-600">Members set their school on their profile page.</div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((m) => (
        <Link
          key={m.id}
          href={`/users/${m.id}`}
          className="rounded-lg border border-gray-800 bg-gray-900/30 p-4 flex gap-3 hover:border-gray-600 hover:bg-gray-800/40 transition-colors group"
        >
          {m.avatar_url ? (
            <Image
              src={m.avatar_url}
              width={44}
              height={44}
              alt={m.display_name}
              className="rounded-lg shrink-0 object-cover"
              unoptimized
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-white truncate">{m.display_name}</span>
              {m.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-medium">
                  Admin
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 ml-auto shrink-0 transition-colors" />
            </div>
            {m.bio ? (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.bio}</p>
            ) : (
              <p className="text-xs text-gray-600 mt-1 italic">No bio yet</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
