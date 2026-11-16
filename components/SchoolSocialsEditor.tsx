"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2, Upload } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { SchoolLogo } from "@/components/SchoolLogo";
import type { SchoolColors } from "@/lib/schoolColors";

interface SocialFields {
  website: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  discord: string;
  github: string;
  telegram: string;
}

interface Props {
  schoolSlug: string;
  // Internal school name (for the logo) and the club's display name.
  schoolKey: string;
  schoolName: string;
  colors: SchoolColors;
  initialSocials: Partial<SocialFields>;
  photoUrl: string | null;
}

const FIELDS: { key: keyof SocialFields; label: string; placeholder: string }[] = [
  { key: "website",   label: "Website",   placeholder: "https://…" },
  { key: "twitter",   label: "Twitter",   placeholder: "https://x.com/…" },
  { key: "linkedin",  label: "LinkedIn",  placeholder: "https://www.linkedin.com/company/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/…" },
  { key: "discord",   label: "Discord",   placeholder: "https://discord.gg/…" },
  { key: "github",    label: "GitHub",    placeholder: "https://github.com/…" },
  { key: "telegram",  label: "Telegram",  placeholder: "https://t.me/…" },
];

const EMPTY: SocialFields = { website: "", twitter: "", linkedin: "", instagram: "", discord: "", github: "", telegram: "" };

// Center-crops an image to a square PNG (512px max) so it fills the round
// logo everywhere it shows.
async function squareCrop(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(512, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Pencil icon that opens a modal to edit a school's profile photo and
// links — visible to DormDAO admins and the school's own Directors and
// Presidents (lib/school-profile-access.ts, checked again server-side).
// Saving PATCHes app/api/schools/[slug]/socials and then router.refresh()es
// so the server-rendered SocialLinks pills below (in app/schools/[slug]/page.tsx)
// pick up the change immediately without a full navigation.
export function SchoolSocialsEditor({ schoolSlug, schoolKey, schoolName, colors, initialSocials, photoUrl }: Props) {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState<SocialFields>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/schools/${schoolSlug}/socials`)
      .then((res) => res.json())
      .then((data: { canEdit?: boolean }) => { if (!cancelled) setCanEdit(data.canEdit === true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [schoolSlug]);

  if (!canEdit) return null;

  function openModal() {
    // Reset to the last-known-saved values every time the modal opens, so a
    // cancelled edit never leaves stale unsaved text behind for next time.
    setFields(Object.fromEntries(
      (Object.keys(EMPTY) as (keyof SocialFields)[]).map((k) => [k, initialSocials[k] ?? ""])
    ) as unknown as SocialFields);
    setError(null);
    setPhotoError(null);
    setShowModal(true);
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      if (!file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("Choose a PNG, JPG, WebP or GIF image");
      const form = new FormData();
      form.append("file", await squareCrop(file), "photo.png");
      const res = await fetch(`/api/schools/${schoolSlug}/photo`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      router.refresh();
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const res = await apiFetch(`/api/schools/${schoolSlug}/photo`, { method: "DELETE" });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't remove the photo");
      router.refresh();
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
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
        title="Edit school profile"
        className="shrink-0 p-1.5 rounded-lg text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="h-1 w-full" style={{ backgroundColor: colors.primary }} />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit {schoolName} Profile</h2>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="text-gray-700 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-5 flex items-center gap-4">
              <SchoolLogo name={schoolKey} size={56} src={photoUrl} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-1.5">Profile photo</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={photoBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {photoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {photoUrl ? "Change photo" : "Upload photo"}
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      disabled={photoBusy}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-700 dark:text-gray-500 mt-1">Square images work best; others are cropped to the center. Under 2 MB.</p>
                {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
              </div>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-3">
              <p className="text-[11px] text-gray-700 dark:text-gray-500">Leave a link blank to remove it.</p>
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
