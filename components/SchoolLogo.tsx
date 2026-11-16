"use client";
import { useState } from "react";
import { schoolNameFromSlug } from "@/lib/schoolData";
import { slugify } from "@/lib/utils";

const PALETTE = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#0ea5e9",
];

function schoolColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

interface SchoolLogoProps {
  name: string;
  size?: number;
  // Image to show instead of looking it up — the school page passes its
  // uploaded photo so a new upload shows right after saving.
  src?: string | null;
}

// Loads through app/api/schools/[slug]/photo, which redirects to the
// school's uploaded profile photo or its built-in logo, and 404s when there
// is neither — shown as initials.
export function SchoolLogo({ name, size = 32, src }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const known = schoolNameFromSlug(slugify(name ?? "")) != null;
  const imgSrc = src || (known ? `/api/schools/${slugify(name)}/photo` : null);

  const style: React.CSSProperties = { width: size, height: size, minWidth: size, minHeight: size };

  if (!imgSrc || failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
        style={{ ...style, backgroundColor: schoolColor(name), fontSize: Math.round(size * 0.35) }}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <div className="rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center" style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ objectFit: src ? "cover" : "contain", width: size, height: size }}
      />
    </div>
  );
}
