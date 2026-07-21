"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { VideoModal } from "@/components/VideoModal";

// Native pixel dimensions of public/campus-map.png — the SVG overlay's
// viewBox matches this exactly so zone polygons stay aligned regardless
// of how large the image is rendered/panned.
const IMAGE_WIDTH = 2172;
const IMAGE_HEIGHT = 724;

const PAN_ZONE = 80;   // px from screen edge that triggers panning
const PAN_SPEED = 3;   // px per frame

type ZoneAction = "navigate" | "external" | "coming-soon" | "video";

interface Zone {
  id: string;
  label: string;
  sublabel: string;
  points: string;
  action: ZoneAction;
  href?: string;
  videoUrl?: string;
  color: string;
  isEasterEgg?: boolean;
  description?: string;
}

// Coordinates are in campus-map.png pixel space (2172x724). Estimated from
// the illustration's building footprints — tune here after visual review.
const ZONES: Zone[] = [
  {
    id: "dorm-builders",
    label: "Dorm Builders",
    sublabel: "Web3 Development",
    points: "22,240 250,230 420,270 420,436 320,450 40,450 10,410 10,280",
    action: "external",
    href: "https://x.com/Dorm_DAO",
    color: "#2196F3",
  },
  {
    id: "dorm-catalyst",
    label: "Dorm Catalyst",
    sublabel: "Accelerator",
    points: "1880,215 2172,205 2172,420 2050,432 1900,420 1858,350 1858,260",
    action: "coming-soon",
    color: "#9C27B0",
    description: "Accelerating the next generation of crypto founders",
  },
  {
    id: "dorm-summit",
    label: "Dorm Summit",
    sublabel: "Annual Summit",
    points: "1090,230 1360,220 1480,270 1480,430 1400,450 1120,450 1080,400 1080,280",
    action: "coming-soon",
    color: "#FF9800",
    description: "The DormDAO annual summit and events",
  },
  {
    id: "dorm-capital",
    label: "Dorm Capital",
    sublabel: "Investment Portfolio",
    points: "630,500 800,480 850,530 850,610 800,655 640,655 595,610 595,540",
    action: "navigate",
    href: "/leaderboard",
    color: "#4CAF50",
  },
  {
    id: "autzen",
    label: "Autzen Stadium",
    sublabel: "🦆 Go Ducks!",
    points: "640,10 1350,5 1480,60 1480,175 1400,200 650,195 580,150 580,60",
    action: "video",
    videoUrl: "https://www.youtube.com/watch?v=SYt2GDh9PgU",
    color: "#FFD700",
    isEasterEgg: true,
  },
  {
    id: "animal-house",
    label: "Animal House",
    sublabel: "🎉 toga! toga!",
    points: "10,600 260,590 290,630 290,700 250,720 30,720 0,680 0,630",
    action: "video",
    videoUrl: "https://www.youtube.com/watch?v=vtFw3tADh3c",
    color: "#FF5722",
    isEasterEgg: true,
  },
];

function centroid(points: string): { x: number; y: number } {
  const pairs = points.trim().split(/\s+/).map((p) => p.split(",").map(Number));
  const x = pairs.reduce((s, [px]) => s + px, 0) / pairs.length;
  const y = pairs.reduce((s, [, py]) => s + py, 0) / pairs.length;
  return { x, y };
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// Short rising tone in lieu of a real "SCO!" audio clip.
function playScoTone() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio unavailable — silently skip
  }
}

const PARTICLES = [
  { left: "5%",  delay: "0s",   duration: "6s", drift: "6px" },
  { left: "16%", delay: "1.1s", duration: "7s", drift: "-8px" },
  { left: "28%", delay: "2.2s", duration: "5.5s", drift: "4px" },
  { left: "42%", delay: "0.5s", duration: "8s", drift: "-6px" },
  { left: "60%", delay: "3s",   duration: "6.5s", drift: "8px" },
  { left: "74%", delay: "1.6s", duration: "7.5s", drift: "-4px" },
  { left: "86%", delay: "2.6s", duration: "6s", drift: "6px" },
  { left: "95%", delay: "0.2s", duration: "8.5s", drift: "-8px" },
] as const;

export default function MapPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1, y: -1 });

  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [showMkaEgg, setShowMkaEgg] = useState(false);
  const [comingSoonZone, setComingSoonZone] = useState<Zone | null>(null);
  const [videoZone, setVideoZone] = useState<Zone | null>(null);

  useEffect(() => {
    function updateViewport() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const aspect = IMAGE_WIDTH / IMAGE_HEIGHT;
  const displayWidth = Math.max(viewport.w * 1.5, viewport.h * 1.5 * aspect);
  const displayHeight = displayWidth / aspect;
  const minX = viewport.w - displayWidth;
  const minY = viewport.h - displayHeight;

  // Center the pan on mount / viewport change (main campus quad sits near
  // the image's vertical middle, so a true center start reads as "on campus").
  useEffect(() => {
    setOffset({ x: minX / 2, y: minY / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.w, viewport.h]);

  // Cursor-edge panning via a persistent rAF loop reading the latest mouse
  // position from a ref (avoids restarting the loop on every mouse move).
  useEffect(() => {
    let animFrame: number;
    function pan() {
      const { x: mouseX, y: mouseY } = mouseRef.current;
      if (mouseX >= 0) {
        setOffset((prev) => {
          let { x, y } = prev;
          if (mouseX < PAN_ZONE) x = Math.min(x + PAN_SPEED, 0);
          if (mouseX > viewport.w - PAN_ZONE) x = Math.max(x - PAN_SPEED, minX);
          if (mouseY < PAN_ZONE) y = Math.min(y + PAN_SPEED, 0);
          if (mouseY > viewport.h - PAN_ZONE) y = Math.max(y - PAN_SPEED, minY);
          return { x, y };
        });
      }
      animFrame = requestAnimationFrame(pan);
    }
    animFrame = requestAnimationFrame(pan);
    return () => cancelAnimationFrame(animFrame);
  }, [viewport.w, viewport.h, minX, minY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  function handleZoneEnter(zone: Zone) {
    setHoveredZone(zone);
    if (zone.id === "dorm-catalyst") {
      setShowMkaEgg(true);
      playScoTone();
    }
  }

  function handleZoneLeave(zone: Zone) {
    setHoveredZone((cur) => (cur?.id === zone.id ? null : cur));
    if (zone.id === "dorm-catalyst") setShowMkaEgg(false);
  }

  function handleZoneClick(zone: Zone) {
    if (zone.action === "navigate" && zone.href) router.push(zone.href);
    else if (zone.action === "external" && zone.href) window.open(zone.href, "_blank", "noopener,noreferrer");
    else if (zone.action === "coming-soon") setComingSoonZone(zone);
    else if (zone.action === "video" && zone.videoUrl) setVideoZone(zone);
  }

  // Escape closes whichever modal is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setComingSoonZone(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mkaZone = ZONES.find((z) => z.id === "dorm-catalyst")!;
  const mkaCentroid = centroid(mkaZone.points);

  return (
    <>
      {/* Desktop interactive map */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="hidden md:block relative w-screen h-screen overflow-hidden bg-[#0a0a0a]"
      >
        {/* Top bar */}
        <div
          className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 border-b border-white/10 backdrop-blur-sm"
          style={{ height: 44, backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🍜</span>
            <span className="font-sans text-sm text-white">Campus Map</span>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Pannable image + zones */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: displayWidth,
            height: displayHeight,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/campus-map.png"
            alt="DormDAO campus map"
            width={displayWidth}
            height={displayHeight}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />

          <svg
            viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full"
          >
            {ZONES.map((zone) => {
              const isHovered = hoveredZone?.id === zone.id;
              const rgb = hexToRgb(zone.color);
              return (
                <polygon
                  key={zone.id}
                  points={zone.points}
                  fill={isHovered ? `rgba(${rgb}, 0.2)` : "transparent"}
                  stroke={isHovered ? zone.color : "none"}
                  strokeWidth={2}
                  style={{
                    cursor: zone.isEasterEgg ? "crosshair" : "pointer",
                    transition: "all 150ms ease",
                    filter: isHovered ? `drop-shadow(0 0 8px rgba(${rgb}, 0.6))` : "none",
                  }}
                  onMouseEnter={() => handleZoneEnter(zone)}
                  onMouseLeave={() => handleZoneLeave(zone)}
                  onClick={() => handleZoneClick(zone)}
                />
              );
            })}
          </svg>

          {/* Label banner for non-easter-egg hovers */}
          {hoveredZone && !hoveredZone.isEasterEgg && (() => {
            const c = centroid(hoveredZone.points);
            return (
              <div
                className="absolute z-20 pointer-events-none animate-banner-fade-in animate-banner-bob"
                style={{ left: `${(c.x / IMAGE_WIDTH) * 100}%`, top: `${(c.y / IMAGE_HEIGHT) * 100}%` }}
              >
                <div
                  className="flex flex-col items-center gap-0.5 rounded-full px-5 py-2 -translate-x-1/2 -translate-y-full"
                  style={{
                    background: "linear-gradient(135deg, #0d1f0d, #1a2e1a)",
                    border: `1px solid ${hoveredZone.color}`,
                    boxShadow: `0 0 16px rgba(${hexToRgb(hoveredZone.color)}, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
                  }}
                >
                  <span className="font-sans text-sm font-bold text-white flex items-center gap-1.5">
                    <span style={{ color: hoveredZone.color }}>◆</span>
                    {hoveredZone.label}
                  </span>
                  <span className="text-xs text-gray-400">{hoveredZone.sublabel}</span>
                </div>
              </div>
            );
          })()}

          {/* Matthew Knight Arena — Oregon O levitation easter egg */}
          {showMkaEgg && (
            <div
              className="absolute z-20 pointer-events-none animate-o-levitate"
              style={{
                left: `${(mkaCentroid.x / IMAGE_WIDTH) * 100}%`,
                top: `${(mkaCentroid.y / IMAGE_HEIGHT) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <svg width={72} height={72} viewBox="0 0 72 72">
                <circle cx={36} cy={36} r={32} fill="#154733" stroke="#FEE123" strokeWidth={4} />
                <text x={36} y={48} textAnchor="middle" fontSize={40} fontWeight={800} fill="#FEE123" fontFamily="sans-serif">O</text>
              </svg>
            </div>
          )}

          {/* Ambient particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="absolute bottom-0 w-1 h-1 rounded-full bg-[#FFD700] animate-particle-float"
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  // @ts-expect-error -- CSS custom properties
                  "--particle-duration": p.duration,
                  "--particle-drift": p.drift,
                  "--particle-opacity": 0.35,
                }}
              />
            ))}
          </div>
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)" }}
        />
      </div>

      {/* Mobile fallback */}
      <div className="md:hidden flex flex-col items-center justify-center w-screen h-screen bg-[#0a0a0a] px-6 text-center gap-3">
        <span className="text-6xl">🍜</span>
        <h1 className="font-sans text-xl font-bold text-white mt-2">Campus Map</h1>
        <p className="text-sm text-gray-400">Best experienced on desktop</p>
        <Link
          href="/leaderboard"
          className="mt-4 px-6 py-2.5 rounded-full font-sans font-semibold text-white text-sm"
          style={{ backgroundImage: "linear-gradient(180deg, #4CAF50 0%, #2d8a30 100%)" }}
        >
          Enter Dashboard
        </Link>
      </div>

      {/* Coming Soon modal */}
      {comingSoonZone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => setComingSoonZone(null)}
        >
          <div
            className="relative max-w-sm w-full mx-4 rounded-2xl p-6 bg-[#0f1f0f]"
            style={{ border: `1px solid rgba(${hexToRgb(comingSoonZone.color)}, 0.3)` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setComingSoonZone(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2
              className="font-sans text-xl font-bold"
              style={{ color: "#FFD700" }}
            >
              {comingSoonZone.label}
            </h2>
            <p className="text-sm text-gray-400 mt-1">Coming soon to DormDAO</p>
            <p className="text-sm text-gray-300 mt-4">{comingSoonZone.description}</p>
            <Link
              href="/leaderboard"
              className="mt-6 inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg font-sans font-semibold text-white text-sm"
              style={{ backgroundImage: "linear-gradient(180deg, #4CAF50 0%, #2d8a30 100%)" }}
            >
              Enter Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Video modal */}
      {videoZone?.videoUrl && (
        <VideoModal
          url={videoZone.videoUrl}
          title={videoZone.label}
          autoPlay
          onClose={() => setVideoZone(null)}
        />
      )}
    </>
  );
}
