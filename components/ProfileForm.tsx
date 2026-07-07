"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SCHOOL_NAMES } from "@/lib/schoolData";
import { AvatarPicker } from "@/components/AvatarPicker";
import { LogOut, Save, User, Pencil, X, Wallet } from "lucide-react";

interface Props {
  userId: string;
  email: string;
  avatarUrl: string | null;
  initialDisplayName: string;
  initialSchool: string;
  initialBio: string;
  isSetup: boolean;
}

function parseIdentity(email: string) {
  const m = email.match(/^wallet-(0x[a-f0-9]+)@wallet\.dormdao\.io$/i);
  if (m) {
    const addr = m[1];
    return { method: "metamask" as const, label: `${addr.slice(0, 6)}…${addr.slice(-4)}` };
  }
  return { method: "google" as const, label: email };
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
  const identity = parseIdentity(email);

  // Start in edit mode only during first-time setup
  const [editing, setEditing]     = useState(isSetup);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [school, setSchool]           = useState(initialSchool);
  const [bio, setBio]                 = useState(initialBio);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(initialAvatarUrl);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError("Display name is required."); return; }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("profiles").upsert({
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
      setEditing(false);
      if (isSetup) router.push("/");
      else router.refresh();
    }
  }

  function handleCancel() {
    setDisplayName(initialDisplayName);
    setSchool(initialSchool);
    setBio(initialBio);
    setAvatarUrl(initialAvatarUrl);
    setError(null);
    setEditing(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // ── View mode ──────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="flex flex-col gap-5">
        {/* Identity card */}
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
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white truncate">
              {displayName || <span className="text-gray-500 italic">No display name set</span>}
            </div>
            {school && (
              <div className="text-sm text-gray-400 mt-0.5">{school}</div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              {identity.method === "metamask" ? (
                <Wallet className="w-3 h-3 text-gray-500 shrink-0" />
              ) : (
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="text-xs text-gray-500">{identity.label}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-5 py-4">
            <p className="text-sm text-gray-300 leading-relaxed">{bio}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-sm font-medium"
          >
            <Pencil className="w-4 h-4" />
            Edit profile
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm ml-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      {/* Identity */}
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
          <div className="text-sm font-medium text-white">
            {identity.method === "metamask" ? "Connected via MetaMask" : "Signed in with Google"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{identity.label}</div>
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
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">School</label>
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
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Bio</label>
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
          {saving ? "Saving…" : isSetup ? "Save & continue" : "Save changes"}
        </button>

        {!isSetup && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}

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
