"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { AvatarPicker } from "@/components/AvatarPicker";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { LogOut, Save, User, Pencil, X, Wallet, Lock, Eye, EyeOff, ExternalLink } from "lucide-react";

const SCHOOL_OK_COOKIE = "ddo-school-ok";
const ONE_YEAR = 60 * 60 * 24 * 365;

function stampSchoolCookie() {
  try {
    document.cookie = `${SCHOOL_OK_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {}
}

const VISIBILITY_FIELDS = [
  { key: "display_name",    label: "Full name" },
  { key: "school",          label: "School" },
  { key: "bio",             label: "Bio" },
  { key: "graduation_year", label: "Graduation Year" },
  { key: "major",           label: "Major" },
  { key: "twitter",         label: "Twitter / X" },
  { key: "linkedin",        label: "LinkedIn" },
  { key: "telegram",        label: "Telegram" },
];

interface Props {
  userId: string;
  email: string;
  avatarUrl: string | null;
  initialDisplayName: string;
  initialSchool: string;
  initialBio: string;
  initialGraduationYear: number | null;
  initialMajor: string;
  initialTwitter: string;
  initialLinkedin: string;
  initialTelegram: string;
  initialDiscord: string;
  initialWalletAddress: string;
  initialIsPublic: boolean;
  initialPublicFields: string[];
  isSetup: boolean;
}

function parseIdentity(email: string) {
  const m = email.match(/^wallet-(0x[a-f0-9]+)@wallet\.dormdao\.io$/i);
  if (m) {
    const addr = m[1];
    return { method: "metamask" as const, label: `${addr.slice(0, 6)}…${addr.slice(-4)}`, walletAddress: addr };
  }
  return { method: "google" as const, label: email, walletAddress: null as string | null };
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
  const [school] = useState(initialSchool);
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
                <span className="text-sm text-white font-medium">{schoolDisplayName(school)}</span>
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
  initialTwitter,
  initialLinkedin,
  initialTelegram,
  initialDiscord,
  initialWalletAddress,
  initialIsPublic,
  initialPublicFields,
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
      avatarUrl={initialAvatarUrl}
      initialDisplayName={initialDisplayName}
      initialSchool={initialSchool}
      initialBio={initialBio}
      initialGraduationYear={initialGraduationYear}
      initialMajor={initialMajor}
      initialTwitter={initialTwitter}
      initialLinkedin={initialLinkedin}
      initialTelegram={initialTelegram}
      initialDiscord={initialDiscord}
      initialWalletAddress={initialWalletAddress}
      initialIsPublic={initialIsPublic}
      initialPublicFields={initialPublicFields}
    />
  );
}

function NormalProfile({
  userId,
  email,
  avatarUrl: initialAvatarUrl,
  initialDisplayName,
  initialSchool,
  initialBio,
  initialGraduationYear,
  initialMajor,
  initialTwitter,
  initialLinkedin,
  initialTelegram,
  initialDiscord,
  initialWalletAddress,
  initialIsPublic,
  initialPublicFields,
}: Omit<Props, "isSetup">) {
  const router = useRouter();
  const identity = parseIdentity(email);

  const [editing, setEditing]               = useState(false);
  const [displayName, setDisplayName]       = useState(initialDisplayName);
  const [school]                            = useState(initialSchool);
  const [bio, setBio]                       = useState(initialBio);
  const [graduationYear, setGraduationYear] = useState(initialGraduationYear ? String(initialGraduationYear) : "");
  const [major, setMajor]                   = useState(initialMajor);
  const [avatarUrl, setAvatarUrl]           = useState<string | null>(initialAvatarUrl);
  const [twitter, setTwitter]               = useState(initialTwitter.replace(/^@+/, ""));
  const [linkedin, setLinkedin]             = useState(initialLinkedin);
  const [telegram, setTelegram]             = useState(initialTelegram.replace(/^@+/, ""));
  const [discord, setDiscord]               = useState(initialDiscord);
  const [walletAddress, setWalletAddress]   = useState(initialWalletAddress);
  const [isPublic, setIsPublic]             = useState(initialIsPublic);
  const DEFAULT_PUBLIC_FIELDS = ["display_name", "school", "graduation_year", "major", "twitter", "linkedin"];
  const [publicFields, setPublicFields]     = useState<string[]>(initialPublicFields.length > 0 ? initialPublicFields : DEFAULT_PUBLIC_FIELDS);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const effectiveWallet = identity.walletAddress ?? walletAddress;

  function togglePublicField(key: string) {
    setPublicFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

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
      twitter: twitter.replace(/^@/, "").trim() || null,
      linkedin: linkedin.trim() || null,
      telegram: telegram.replace(/^@/, "").trim() || null,
      discord: discord.trim() || null,
      wallet_address: effectiveWallet || null,
      is_public: isPublic,
      public_fields: publicFields,
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
    setBio(initialBio);
    setGraduationYear(initialGraduationYear ? String(initialGraduationYear) : "");
    setMajor(initialMajor);
    setAvatarUrl(initialAvatarUrl);
    setTwitter(initialTwitter.replace(/^@+/, ""));
    setLinkedin(initialLinkedin);
    setTelegram(initialTelegram.replace(/^@+/, ""));
    setDiscord(initialDiscord);
    setWalletAddress(initialWalletAddress);
    setIsPublic(initialIsPublic);
    setPublicFields(initialPublicFields);
    setError(null);
    setEditing(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const inputCls = "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary/50";
  const labelCls = "text-xs text-gray-400 font-medium uppercase tracking-wider";

  // ── View mode ──────────────────────────────────────────────────
  if (!editing) {
    const hasSocial = twitter || linkedin || telegram;
    return (
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
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{schoolDisplayName(school)}</span>
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

        {hasSocial && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-5 py-4 flex flex-wrap gap-4">
            {twitter && (
              <a href={`https://twitter.com/${twitter}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                @{twitter}
              </a>
            )}
            {linkedin && (
              <a href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {telegram && (
              <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                @{telegram}
              </a>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600 px-1">
          {isPublic
            ? <><Eye className="w-3.5 h-3.5" /> Profile visible in members directory</>
            : <><EyeOff className="w-3.5 h-3.5" /> Profile hidden from members directory</>}
        </div>

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
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      {/* Avatar + identity */}
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

      {/* Basic info */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Info</p>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Display name <span className="text-red-400">*</span></label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name" maxLength={60} className={inputCls} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>School</label>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5">
            {school ? (
              <><SchoolLogo name={school} size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{schoolDisplayName(school)}</span></>
            ) : (
              <span className="text-sm text-gray-400 italic">No school assigned</span>
            )}
            <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 ml-auto shrink-0" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Assigned by admin</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community a bit about yourself…" maxLength={280} rows={3}
            className={`${inputCls} resize-none`} />
          <div className="text-xs text-gray-400 dark:text-gray-600 text-right">{bio.length}/280</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Graduation Year</label>
            <input type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="2026" min={2020} max={2035} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Major</label>
            <input value={major} onChange={(e) => setMajor(e.target.value)}
              placeholder="Computer Science" maxLength={80} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Social & Contact */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Social &amp; Contact</p>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Twitter / X</label>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-1 focus-within:border-primary/50">
            <span className="text-sm text-gray-400 dark:text-gray-500 select-none">@</span>
            <input value={twitter} onChange={(e) => setTwitter(e.target.value.replace(/^@+/, ""))}
              placeholder="yourhandle" maxLength={60}
              className="flex-1 min-w-0 bg-transparent py-2.5 px-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>LinkedIn</label>
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
            placeholder="linkedin.com/in/yourname" maxLength={120} className={inputCls} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Telegram</label>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-3 pr-1 focus-within:border-primary/50">
            <span className="text-sm text-gray-400 dark:text-gray-500 select-none">@</span>
            <input value={telegram} onChange={(e) => setTelegram(e.target.value.replace(/^@+/, ""))}
              placeholder="yourhandle" maxLength={60}
              className="flex-1 min-w-0 bg-transparent py-2.5 px-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Discord</label>
          <input value={discord} onChange={(e) => setDiscord(e.target.value)}
            placeholder="username" maxLength={60} className={inputCls} />
          <p className="text-xs text-gray-400 dark:text-gray-600">Discord is never shown publicly.</p>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Privacy Settings</p>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Show my profile in the members directory</p>
            <p className="text-xs text-gray-500 mt-0.5">When on, other DormDAO members can find your profile</p>
          </div>
          <button type="button" role="switch" aria-checked={isPublic} onClick={() => setIsPublic((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${isPublic ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400 font-medium">Show publicly on your profile:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {VISIBILITY_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={publicFields.includes(key)}
                  onChange={() => togglePublicField(key)} className="w-3.5 h-3.5 accent-primary" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          Fields marked public are visible to anyone who views your profile at{" "}
          <span className="font-mono text-gray-500">dormdao-dashboard.vercel.app/users/[your-id]</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-600">
          Wallet addresses are never shown publicly regardless of settings.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors text-sm font-medium disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="button" onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm ml-auto">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </form>
  );
}
