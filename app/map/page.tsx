"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

// ── Zone config — edit points here to reposition building outlines ───────────
// All coordinates are in 1920×1080 SVG space (viewBox="0 0 1920 1080")
// Mapping to screen: screen_x = SVG_x × scale − x_crop; screen_y = SVG_y × scale
// (scale/crop depend on viewport; buildings stay aligned because SVG uses same transform as img object-cover)
interface Zone {
  id: string;
  label: string;
  points: string;
  action: "navigate" | "modal";
  href?: string;
  description: string;
}

const ZONES: Zone[] = [
  {
    id: "dorm-capital",
    label: "Dorm Capital",
    // Lillis: user-measured corners
    points: "132,314 311,218 311,150 442,83 509,117 648,43 790,116 790,260 262,519 132,442",
    action: "navigate",
    href: "/analytics",
    description: "The DormDAO investment portfolio dashboard",
  },
  {
    id: "dorm-builders",
    label: "Dorm Builders",
    // Knight Library: lower-left classical columns building (~x 3–25%, y 52–83%)
    points: "46,556 474,556 506,592 506,852 450,894 46,894 20,848 20,572",
    action: "modal",
    description: "Tools and resources for building in web3",
  },
  {
    id: "dorm-summit",
    label: "Dorm Summit",
    // EMU: center glass dome building (~x 47–57%, y 30–47%) — moved right from prior estimate
    points: "958,338 1178,320 1198,360 1194,492 1124,512 964,520 918,474 918,352",
    action: "modal",
    description: "The DormDAO annual summit and events",
  },
  {
    id: "dorm-catalyst",
    label: "Dorm Catalyst",
    // Matthew Knight Arena: upper-right dome with Oregon O (~x 52–100%, y 2–46%)
    points: "988,20 1824,20 1904,82 1904,498 1824,516 1000,494 950,442 950,80",
    action: "modal",
    description: "Accelerating the next generation of crypto founders",
  },
];

const PARTICLES = [
  { id: 0, cx: 154,  cy: 130, delay: "0s",   dur: "4.2s" },
  { id: 1, cx: 422,  cy: 334, delay: "1.1s", dur: "5.3s" },
  { id: 2, cx: 1114, cy: 580, delay: "0.5s", dur: "3.9s" },
  { id: 3, cx: 1306, cy: 720, delay: "1.8s", dur: "4.7s" },
  { id: 4, cx: 384,  cy: 194, delay: "0.3s", dur: "5.8s" },
  { id: 5, cx: 672,  cy: 874, delay: "2.2s", dur: "4.1s" },
  { id: 6, cx: 1690, cy: 440, delay: "0.9s", dur: "5.0s" },
  { id: 7, cx: 288,  cy: 978, delay: "1.5s", dur: "3.7s" },
];

function getPolygonCenter(points: string): { x: number; y: number } {
  const coords = points.trim().split(/\s+/).map((p) => {
    const [x, y] = p.split(",").map(Number);
    return { x, y };
  });
  const cx = coords.reduce((sum, p) => sum + p.x, 0) / coords.length;
  const cy = coords.reduce((sum, p) => sum + p.y, 0) / coords.length;
  return { x: cx, y: cy };
}

function ComingSoonModal({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full mx-4 rounded-2xl p-8"
        style={{
          background: "#0f1f0f",
          border: "1px solid rgba(200,168,75,0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.8), 0 0 60px rgba(200,168,75,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-5xl mb-5 text-center">🍜</div>
        <h2
          className="text-2xl font-bold text-center mb-1"
          style={{ color: "#C8A84B", fontFamily: "'Antikor Text', sans-serif" }}
        >
          {zone.label}
        </h2>
        <p className="text-gray-400 text-sm text-center mb-3">Coming soon to DormDAO</p>
        <p className="text-gray-500 text-sm text-center mb-6">{zone.description}</p>
        <Link
          href="/leaderboard"
          className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Enter Dashboard
        </Link>
      </div>
    </div>
  );
}

// Set true to show polygon outlines + live SVG cursor coords for calibration
const DEBUG = true;

export default function MapPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [modal, setModal] = useState<Zone | null>(null);
  const [debugCoords, setDebugCoords] = useState<{ x: number; y: number } | null>(null);

  const handleClick = useCallback((zone: Zone) => {
    if (zone.action === "navigate" && zone.href) {
      router.push(zone.href);
    } else {
      setModal(zone);
    }
  }, [router]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!DEBUG) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (1920 / rect.width));
    const y = Math.round((e.clientY - rect.top) * (1080 / rect.height));
    setDebugCoords({ x, y });
  }, []);

  return (
    <>
      <style>{`
        @keyframes map-bob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes map-particle {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%       { opacity: 0.6; transform: translateY(-20px); }
        }
        @keyframes map-label-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Mobile fallback ────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-[100] md:hidden flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-6">
        <div className="text-6xl mb-4">🍜</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Campus Map</h1>
        <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">
          Visit on desktop for the full interactive campus experience.
        </p>
        <Link
          href="/leaderboard"
          className="bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Enter Dashboard
        </Link>
      </div>

      {/* ── Desktop: true full-screen, no header bar ───────────────────────── */}
      <div className="fixed inset-0 z-[100] hidden md:block bg-[#0a0a0a]">

        {/* Campus image — fills entire viewport */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/campus-map.png"
          alt="DormDAO Campus"
          className="absolute inset-0 w-full h-full object-cover object-center select-none"
          draggable={false}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        {/* SVG overlay — identical scale/crop as image via xMidYMid slice */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setDebugCoords(null)}
        >
          {/* Ambient particles */}
          {PARTICLES.map((p) => (
            <circle
              key={p.id}
              cx={p.cx}
              cy={p.cy}
              r={3}
              fill="#C8A84B"
              style={{
                animation: `map-particle ${p.dur} ${p.delay} infinite ease-in-out`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Building zones */}
          {ZONES.map((zone) => {
            const isHovered = hovered === zone.id;
            const center = getPolygonCenter(zone.points);

            return (
              <g key={zone.id}>
                <polygon
                  points={zone.points}
                  fill={isHovered ? "rgba(200,168,75,0.15)" : "rgba(0,0,0,0)"}
                  stroke={isHovered ? "#C8A84B" : DEBUG ? "rgba(255,80,80,0.7)" : "none"}
                  strokeWidth={isHovered ? 2 : DEBUG ? 1.5 : 0}
                  style={{
                    filter: isHovered
                      ? "drop-shadow(0 0 8px rgba(200,168,75,0.5))"
                      : "none",
                    cursor: "pointer",
                    transition: "fill 200ms ease",
                  }}
                  onMouseEnter={() => setHovered(zone.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(zone)}
                />

                {isHovered && (
                  <foreignObject
                    x={center.x - 160}
                    y={center.y - 130}
                    width={320}
                    height={80}
                    style={{ overflow: "visible", pointerEvents: "none" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        animation: "map-bob 2s ease-in-out infinite",
                      }}
                    >
                      <div
                        style={{
                          background: "linear-gradient(135deg, #1a2e1a, #0d1f0d)",
                          border: "1px solid #C8A84B",
                          borderRadius: "9999px",
                          padding: "6px 18px",
                          fontFamily: "'Antikor Text', sans-serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "white",
                          whiteSpace: "nowrap",
                          boxShadow: "0 0 16px rgba(200,168,75,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                          animation: "map-label-in 150ms ease-out forwards",
                          letterSpacing: "0.025em",
                        }}
                      >
                        ◆ {zone.label}
                      </div>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {/* Debug coordinate HUD */}
        {DEBUG && debugCoords && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 text-white font-mono text-xs px-3 py-1.5 rounded-full pointer-events-none select-none">
            SVG {debugCoords.x}, {debugCoords.y}
          </div>
        )}

        {/* Bottom-left ramen logo */}
        <Link
          href="/leaderboard"
          className="absolute bottom-5 left-5 z-10 flex items-center gap-2 group"
          title="Enter Dashboard"
        >
          <span className="text-2xl opacity-75 group-hover:opacity-100 transition-opacity drop-shadow-lg">🍜</span>
          <span
            className="text-xs font-semibold text-white/50 group-hover:text-white/80 transition-colors"
            style={{ fontFamily: "'Antikor Text', sans-serif" }}
          >
            DormDAO
          </span>
        </Link>
      </div>

      {modal && <ComingSoonModal zone={modal} onClose={() => setModal(null)} />}
    </>
  );
}
