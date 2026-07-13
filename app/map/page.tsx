"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X, ArrowRight } from "lucide-react";

// ── Zone config — tweak percentages here to reposition zones ────────────────
const ZONES = [
  {
    id: "dorm-capital",
    name: "Dorm Capital",
    description: "Live portfolio analytics for university crypto clubs",
    top: "5%", left: "3%", width: "22%", height: "35%",
    href: "/analytics",
    comingSoon: false,
  },
  {
    id: "dorm-builders",
    name: "Dorm Builders",
    description: "Tools and resources for building in web3",
    top: "52%", left: "2%", width: "20%", height: "35%",
    href: null,
    comingSoon: true,
  },
  {
    id: "dorm-summit",
    name: "Dorm Summit",
    description: "The DormDAO annual summit and events",
    top: "25%", left: "38%", width: "18%", height: "25%",
    href: null,
    comingSoon: true,
  },
  {
    id: "dorm-catalyst",
    name: "Dorm Catalyst",
    description: "Accelerating the next generation of crypto founders",
    top: "2%", left: "58%", width: "38%", height: "45%",
    href: null,
    comingSoon: true,
  },
] as const;

type Zone = (typeof ZONES)[number];

const PARTICLES = [
  { id: 0, top: "15%", left: "10%", delay: "0s",   dur: "4.2s" },
  { id: 1, top: "28%", left: "25%", delay: "0.8s", dur: "5.1s" },
  { id: 2, top: "45%", left: "55%", delay: "1.4s", dur: "3.8s" },
  { id: 3, top: "62%", left: "70%", delay: "0.3s", dur: "4.7s" },
  { id: 4, top: "75%", left: "15%", delay: "2.0s", dur: "5.5s" },
  { id: 5, top: "18%", left: "80%", delay: "1.1s", dur: "4.0s" },
  { id: 6, top: "88%", left: "45%", delay: "0.6s", dur: "4.9s" },
];

function ComingSoonModal({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-gray-950 border border-yellow-600/40 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-4xl mb-4">🍜</div>
        <h2 className="text-2xl font-bold text-white mb-1">{zone.name}</h2>
        <p className="text-yellow-500 text-sm font-medium mb-3">Coming soon to DormDAO</p>
        <p className="text-gray-400 text-sm mb-6">{zone.description}</p>
        <Link
          href="/leaderboard"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Enter Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function MapPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [modal, setModal] = useState<Zone | null>(null);

  const handleClick = useCallback((zone: Zone) => {
    if (zone.comingSoon) {
      setModal(zone);
    } else if (zone.href) {
      router.push(zone.href);
    }
  }, [router]);

  return (
    <>
      <style>{`
        @keyframes map-bob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-3px); }
        }
        @keyframes map-particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.35; }
          50%       { transform: translateY(-18px) scale(1.3); opacity: 0.65; }
        }
        @keyframes map-label-in {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes map-glow {
          0%, 100% { box-shadow: 0 0 16px rgba(200,168,75,0.2), inset 0 0 24px rgba(200,168,75,0.04); }
          50%       { box-shadow: 0 0 28px rgba(200,168,75,0.38), inset 0 0 32px rgba(200,168,75,0.08); }
        }
      `}</style>

      {/* ── Mobile fallback ────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 md:hidden flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-6">
        <div className="text-5xl mb-4">🗺️</div>
        <h1 className="text-xl font-bold text-white mb-2">Campus Map</h1>
        <p className="text-gray-400 text-sm mb-6">
          Visit on desktop for the full campus map experience.
        </p>
        <Link
          href="/leaderboard"
          className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Enter Dashboard
        </Link>
      </div>

      {/* ── Desktop full-screen ────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 hidden md:flex flex-col bg-[#0a0a0a]">

        {/* Header */}
        <header className="flex items-center justify-between px-5 h-[52px] shrink-0 border-b border-white/[0.08] bg-[#0f0f0f]">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.jpg" width={24} height={24} alt="DormDAO" className="rounded-md" />
            <span className="text-white font-semibold text-sm">DormDAO</span>
            <span className="text-gray-600 text-sm">·</span>
            <span className="text-gray-400 text-sm">Campus Map</span>
          </div>
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            Enter Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </header>

        {/* Map area */}
        <div className="relative flex-1 overflow-hidden">

          {/* Campus image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/campus-map.png"
            alt="DormDAO Campus"
            className="w-full h-full object-cover object-center select-none"
            draggable={false}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.35) 100%)",
            }}
          />

          {/* Ambient particles */}
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                top: p.top, left: p.left,
                width: 6, height: 6,
                background: "#C8A84B",
                animation: `map-particle ${p.dur} ${p.delay} infinite ease-in-out`,
              }}
            />
          ))}

          {/* Clickable building zones */}
          {ZONES.map((zone) => {
            const isHovered = hovered === zone.id;
            return (
              <div
                key={zone.id}
                role="button"
                aria-label={zone.name}
                className="absolute cursor-pointer rounded-sm"
                style={{
                  top: zone.top, left: zone.left,
                  width: zone.width, height: zone.height,
                  outline: isHovered
                    ? "2px solid rgba(200,168,75,0.7)"
                    : "2px solid transparent",
                  outlineOffset: "2px",
                  animation: isHovered ? "map-glow 1.5s infinite ease-in-out" : "none",
                  transition: "outline 120ms",
                }}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleClick(zone)}
              >
                {/* Hover label — floats above zone */}
                {isHovered && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      bottom: "calc(100% + 10px)",
                      left: "50%",
                      animation: "map-bob 2s infinite ease-in-out",
                      zIndex: 10,
                    }}
                  >
                    <div
                      className="whitespace-nowrap px-4 py-1.5 rounded-full text-white text-sm font-semibold"
                      style={{
                        display: "inline-block",
                        transform: "translateX(-50%)",
                        background: "#1a2e1a",
                        border: "1px solid #C8A84B",
                        boxShadow: "0 0 14px rgba(200,168,75,0.45)",
                        animation: "map-label-in 150ms ease-out forwards",
                        fontFamily: "'Antikor Text', sans-serif",
                        letterSpacing: "0.025em",
                      }}
                    >
                      {zone.name}
                    </div>
                    {/* Arrow caret */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: -5,
                        left: "50%",
                        transform: "translateX(-50%) rotate(45deg)",
                        width: 8, height: 8,
                        background: "#1a2e1a",
                        borderRight: "1px solid #C8A84B",
                        borderBottom: "1px solid #C8A84B",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Modal */}
      {modal && <ComingSoonModal zone={modal} onClose={() => setModal(null)} />}
    </>
  );
}
