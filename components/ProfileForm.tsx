"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SCHOOL_NAMES } from "@/lib/schoolData";
import { AvatarPicker } from "@/components/AvatarPicker";
import { LogOut, Save, User } from "lucide-react";

interface Props {
  userId: string;
  email: string;
  avatarUrl: string | null;
  initialDisplayName: string;
  initialSchool: string;
  initialBio: string;
  isSetup: boolean;
}

export function ProfileForm({
  userId,
  email,
  avatarUrl: initialAvatarUrl,
  initialDisplayName,
  initialSchool,
  initialBio,
  isSetup,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [school, setSchool] = useState(initialSchool);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError("Display name is required."); return; }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        display_name: displayName.trim(),
        school: school || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (isSetup) router.push("/");
      else router.refresh();
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      {/* Avatar */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            width={56}
            height={56}
            alt="avatar"
            className="rounded-xl shrink-0 object-cover"
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-gray-500" />
          </div>
        )}
        <div className="flex flex-col">
          <div className="text-sm font-medium text-white">{email}</div>
          <div className="text-xs text-gray-500 mt-0.5">Signed in with Google</div>
          <AvatarPicker current={avatarUrl} onSelect={setAvatarUrl} />
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Display name <span className="text-danger">*</span>
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            School
          </label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
          >
            <option value="">— Select your school —</option>
            {SCHOOL_NAMES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community a bit about yourself…"
            maxLength={280}
            rows={3}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none"
          />
          <div className="text-xs text-gray-600 text-right">{bio.length}/280</div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : saved ? "Saved!" : isSetup ? "Save & continue" : "Save changes"}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm ml-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </form>
  );
}
