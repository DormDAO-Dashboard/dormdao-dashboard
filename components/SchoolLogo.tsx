"use client";
import { useState } from "react";
import { SCHOOL_DOMAINS } from "@/lib/schoolData";

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
}

const LOCAL_LOGOS: Record<string, string> = {
  "Villanova": "/logos/villanova.png",
};

export function SchoolLogo({ name, size = 32 }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const localSrc = LOCAL_LOGOS[name];
  const domain = SCHOOL_DOMAINS[name];

  const style: React.CSSProperties = { width: size, height: size, minWidth: size, minHeight: size };

  if (localSrc) {
    return (
      <div className="rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={localSrc} alt={name} width={size} height={size} style={{ objectFit: "contain" }} />
      </div>
    );
  }

  if (!domain || failed) {
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
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
