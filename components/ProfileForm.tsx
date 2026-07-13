"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { AvatarPicker } from "@/components/AvatarPicker";
import { SchoolLogo } from "@/components/SchoolLogo";
import { LogOut, Save, User, Pencil, X, Wallet, Lock } from "lucide-react";

const SCHOOL_OK_COOKIE = "ddo-school-ok";
const ONE_YEAR = 60 * 60 * 24 * 365;

function stampSchoolCookie() {
  try {
    document.cookie = `${SCHOOL_OK_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {}
}

interface Props {
  userId: string;
  email: string;
  avatarUrl: string | null;
  initialDisplayName: string;
  initialSchool: string;
  initialBio: string;
  initialGraduationYear: number | null;
  initialMajor: string;
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

// ── Setup (onboarding) card ────────────────────────────────────────────────────

function SetupCard({
  userId,
  initialDisplayName,
  initialSchool,
  initialAvatarUrl,
}: {
  userId: string;
  initialDisplayName: string;
  initialSchool: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [school, setSchool] = useState(initialSchool);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError("Display name is required."); return; }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName.trim(),
      school,
      avatar_url: avatarUrl,
    });

    setSaving(false);
    if (upsertError) { setError(upsertError.message); return; }

    stampSchoolCookie();
    router.push(`/schools/${slugify(school)}/vote`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-lg">
        <div className="rounded-xl border border-gray-800 bg-[#111] shadow-2xl p-8">
          <div className="text-center mb-8">
            <Image src="/logo.jpg" width={48} height={48} alt="DormDAO" className="rounded-xl mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">Welcome to DormDAO 🎉</h1>
            <p className="text-gray-400 text-sm mt-2">Let&apos;s set up your profile before you get started</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {school && (
              <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5">
                <SchoolLogo name={school} size={18} />
                <span className="text-sm text-white font-medium">{school}</span>
                <Lock className="w-3.5 h-3.5 text-gray-500 ml-auto shrink-0" />
                <span className="text-xs text-gray-500">Assigned by DormDAO admin</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Step 1 — What should we call you? <span className="text-red-400">*</span>
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                required
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Step 2 — Pick an avatar <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <Image src={avatarUrl} width={48} height={48} alt="avatar"
                    className="rounded-xl border border-gray-700 object-cover shrink-0" unoptimized />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <AvatarPicker current={avatarUrl} onSelect={setAvatarUrl} />
                  {avatarUrl && (
                    <button type="button" onClick={() => setAvatarUrl(null)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-left">
                      Skip — use default
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="w-full py-3 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Setting up…" : "Get Started"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Normal profile mode ────────────────────────────────────────────────────────

export function ProfileForm({
  userId,
  email,
  avatarUrl: initialAvatarUrl,
  initialDisplayName,
  initialSchool,
  initialBio,
  initialGraduationYear,
  initialMajor,
  isSetup,
}: Props) {
  if (isSetup) {
    return (
      <SetupCard
        userId={userId}
        initialDisplayName={initialDisplayName}
        initialSchool={initialSchool}
        initialAvatarUrl={initialAvatarUrl}
      />
    );
  }

  return (
    <NormalProfile
      userId={userId}
      email={email}
      initialAvatarUrl={initialAvatarUrl}
      initialDisplayName={initialDisplayName}
      initialSchool={initialSchool}
      initialBio={initialBio}
      initialGraduationYear={initialGraduationYear}
      initialMajor={initialMajor}
    />
  );
}

function NormalProfile({
  userId,
  email,
  initialAvatarUrl,
  initialDisplayName,
  initialSchool,
  initialBio,
  initialGraduationYear,
  initialMajor,
}: {
  userId: string;
  email: string;
  initialAvatarUrl: string | null;
  initialDisplayName: string;
  initialSchool: string;
  initialBio: string;
  initialGraduationYear: number | null;
  initialMajor: string;
}) {
  const router = useRouter();
  const identity = parseIdentity(email);

  const [editing, setEditing]                   = useState(false);
  const [displayName, setDisplayName]           = useState(initialDisplayName);
  const [school, setSchool]                     = useState(initialSchool);
  const [bio, setBio]                           = useState(initialBio);
  const [graduationYear, setGraduationYear]     = useState(
    initialGraduationYear ? String(initialGraduationYear) : ""
  );
  const [major, setMajor]                       = useState(initialMajor);
  const [avatarUrl, setAvatarUrl]               = useState<string | null>(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

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
      graduation_year: graduationYear ? parseInt(graduationYear, 10) : null,
      major: major.trim() || null,
    });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      if (school) stampSchoolCookie();
      setEditing(false);
      router.refresh();
    }
  }

  function handleCancel() {
    setDisplayName(initialDisplayName);
    setSchool(initialSchool);
    setBio(initialBio);
    setGraduationYear(initialGraduationYear ? String(initialGraduationYear) : "");
    setMajor(initialMajor);
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
      <>
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 flex items-center gap-4">
            {avatarUrl ? (
              <Image src={avatarUrl} width={56} height={56} alt="avatar"
                className="rounded-xl shrink-0 object-cover" unoptimized />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {displayName || <span className="text-gray-400 italic">No display name set</span>}
              </div>
              {school && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-0.5">
                    <SchoolLogo name={school} size={14} />
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{school}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                {identity.method === "metamask" ? (
                  <Wallet className="w-3 h-3 text-gray-400 shrink-0" />
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

          {bio && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-5 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{bio}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-sm font-medium">
              <Pencil className="w-4 h-4" />
              Edit profile
            </button>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm ml-auto">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            Profile visibility controls coming soon — for now your name and school are visible to other DormDAO members.
          </p>
        </div>
      </>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────
  return (
    <>
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 flex items-center gap-4">
          {avatarUrl ? (
            <Image src={avatarUrl} width={56} height={56} alt="avatar"
              className="rounded-xl shrink-0 object-cover" unoptimized />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <div className="flex flex-col">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {identity.method === "metamask" ? "Connected via MetaMask" : "Signed in with Google"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{identity.label}</div>
            <AvatarPicker current={avatarUrl} onSelect={setAvatarUrl} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Display name <span className="text-red-400">*</span>
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">School</label>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5">
              {school ? (
                <>
                  <SchoolLogo name={school} size={16} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{school}</span>
                </>
              ) : (
                <span className="text-sm text-gray-400 italic">No school assigned</span>
              )}
              <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 ml-auto shrink-0" />
              <span className="text-xs text-gray-400 dark:text-gray-500">Assigned by admin</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community a bit about yourself…"
              maxLength={280}
              rows={3}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none"
            />
            <div className="text-xs text-gray-500 dark:text-gray-600 text-right">{bio.length}/280</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Graduation Year</label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2026"
                min={2020}
                max={2035}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Major</label>
              <input
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Computer Science"
                maxLength={80}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button type="button" onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm ml-auto">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          Profile visibility controls coming soon — for now your name and school are visible to other DormDAO members.
        </p>
      </form>
    </>
  );
}
