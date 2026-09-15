"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2 } from "lucide-react";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { apiFetch } from "@/lib/apiFetch";
import type { SchoolColors } from "@/lib/schoolColors";

interface SocialFields {
  website: string;
  twitter: string;
  linkedin: string;
  instagram: string;
}

interface Props {
  schoolSlug: string;
  schoolName: string;
  colors: SchoolColors;
  initialSocials: Partial<SocialFields>;
}

const FIELDS: { key: keyof SocialFields; label: string; placeholder: string }[] = [
  { key: "website",   label: "Website",   placeholder: "https://…" },
  { key: "twitter",   label: "Twitter",   placeholder: "https://x.com/…" },
  { key: "linkedin",  label: "LinkedIn",  placeholder: "https://www.linkedin.com/company/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/…" },
];

// Pencil icon that opens a modal to add/edit a school's Website/Twitter/
// LinkedIn/Instagram links — visible only to true DormDAO admins (the same
// gate as /admin/* pages), NOT club leadership, per the explicit ask.
// Saving PATCHes app/api/schools/[slug]/socials and then router.refresh()es
// so the server-rendered SocialLinks pills below (in app/schools/[slug]/page.tsx)
// pick up the change immediately without a full navigation.
export function SchoolSocialsEditor({ schoolSlug, schoolName, colors, initialSocials }: Props) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState<SocialFields>({
    website: initialSocials.website ?? "",
    twitter: initialSocials.twitter ?? "",
    linkedin: initialSocials.linkedin ?? "",
    instagram: initialSocials.instagram ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) return null;

  function openModal() {
    // Reset to the last-known-saved values every time the modal opens, so a
    // cancelled edit never leaves stale unsaved text behind for next time.
    setFields({
      website: initialSocials.website ?? "",
      twitter: initialSocials.twitter ?? "",
      linkedin: initialSocials.linkedin ?? "",
      instagram: initialSocials.instagram ?? "",
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/schools/${schoolSlug}/socials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      setShowModal(false);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <>
      <button
        onClick={openModal}
        title="Edit social links"
        className="shrink-0 p-1.5 rounded-lg text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ backgroundColor: colors.primary }} />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit {schoolName} Links</h2>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="text-gray-700 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-3">
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5">
                    {label}
                  </label>
                  <input
                    type="url"
                    value={fields[key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}

              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: colors.primary, color: colors.text }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
