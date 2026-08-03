"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { VideoModal } from "@/components/VideoModal";

// Native pixel dimensions of public/campus-map.png — the SVG overlay's
// viewBox matches this exactly so zone polygons stay aligned regardless
// of how large the image is rendered/panned.
const IMAGE_WIDTH = 3264;
const IMAGE_HEIGHT = 1312;

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

// Coordinates are in campus-map.png pixel space (3264x1312). Estimated from
// the illustration's building footprints — tune here after visual review
// (append ?debug=zones to the URL to see outlines + raw points on-screen).
const ZONES: Zone[] = [
  {
    id: "dorm-builders",
    label: "Dorm Builders",
    sublabel: "Web3 Development",
    points: "1072,1019 1072,961 1115,893 1139,896 1142,892 1205,898 1231,890 1273,895 1299,910 1344,914 1347,922 1383,926 1383,983 1349,1051 1265,1043 1259,1046 1234,1042 1234,1039 1195,1033 1190,1037 1187,1034 1184,1037 1162,1034 1160,1030",
    action: "external",
    href: "https://x.com/Dorm_DAO",
    color: "#2196F3",
  },
  {
    id: "dorm-catalyst",
    label: "Dorm Catalyst",
    sublabel: "Accelerator",
    points: "2583,748 2550,745 2550,762 2537,759 2520,751 2508,741 2504,738 2504,735 2478,730 2478,735 2472,735 2472,730 2412,723 2412,727 2406,727 2406,722 2387,720 2376,727 2354,739 2339,738 2339,724 2305,722 2296,704 2297,686 2294,679 2296,649 2303,628 2317,613 2333,601 2353,592 2376,578 2405,568 2427,562 2451,560 2478,559 2505,562 2529,568 2555,575 2577,584 2592,593 2607,605 2613,610 2627,619 2634,631 2639,643 2640,683 2639,694 2636,698 2636,710 2633,715 2633,716 2628,719 2624,724 2624,725 2621,726 2616,731 2610,734 2606,737 2606,739 2601,741 2598,740 2594,744 2593,744 2586,749 2583,748",
    action: "coming-soon",
    color: "#9C27B0",
    description: "Accelerating the next generation of crypto founders",
  },
  {
    id: "dorm-summit",
    label: "Dorm Summit",
    sublabel: "Annual Summit",
    points: "1669,956 1669,889 1708,874 1744,811 1896,829 1896,857 2016,877 2016,952 2021,953 2021,958 2019,962 2019,988 2014,992 1999,995 1971,1043 1816,1016 1767,1037 1693,994 1678,994 1675,988 1675,967 1669,964 1668,959",
    action: "coming-soon",
    color: "#FF9800",
    description: "The DormDAO annual summit and events",
  },
  {
    id: "dorm-capital",
    label: "Dorm Capital",
    sublabel: "Investment Portfolio",
    points: "1150,652 1150,568 1146,563 1146,559 1142,549 1205,463 1215,463 1218,458 1263,462 1283,477 1303,467 1328,460 1359,457 1384,460 1414,467 1447,482 1465,497 1475,483 1526,488 1539,501 1560,502 1560,596 1501,687 1412,680 1402,659 1386,647 1366,639 1334,632 1308,632 1280,637 1255,645 1228,664",
    action: "navigate",
    href: "/leaderboard",
    color: "#4CAF50",
  },
  {
    id: "autzen",
    label: "Autzen Stadium",
    sublabel: "🦆 Go Ducks!",
    points: "2124,250 2130,253 2130,275 2140,271 2155,268 2170,265 2193,262 2223,258 2246,257 2268,255 2292,257 2317,257 2339,258 2340,253 2339,248 2340,243 2326,242 2326,238 2352,230 2488,243 2488,266 2498,267 2498,278 2521,283 2539,290 2556,298 2571,308 2579,321 2579,344 2572,386 2547,401 2523,412 2491,420 2460,424 2412,430 2375,430 2332,427 2101,384 2082,372 2077,364 2077,338 2074,328 2076,306 2087,295 2102,286 2102,260",
    action: "video",
    videoUrl: "https://www.youtube.com/watch?v=SYt2GDh9PgU",
    color: "#FFD700",
    isEasterEgg: true,
  },
  {
    id: "animal-house",
    label: "Animal House",
    sublabel: "🎉 toga! toga!",
    points: "946,396 952,392 955,393 955,408 967,399 1037,407 1057,416 1057,407 1063,402 1066,404 1066,414 1072,419 1072,467 1058,481 1055,483 1048,492 1013,486 1010,483 968,476 965,478 935,474 935,426 934,425 946,414",
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
  const panLayerRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [showMkaEgg, setShowMkaEgg] = useState(false);
  const [comingSoonZone, setComingSoonZone] = useState<Zone | null>(null);
  const [videoZone, setVideoZone] = useState<Zone | null>(null);
  const [debugZones, setDebugZones] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDebugZones(new URLSearchParams(window.location.search).get("debug") === "zones");
  }, []);

  useEffect(() => {
    function updateViewport() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const aspect = IMAGE_WIDTH / IMAGE_HEIGHT;
  const displayWidth = Math.max(viewport.w * 1.08, viewport.h * 1.08 * aspect);
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
    if (debugZones && panLayerRef.current) {
      const rect = panLayerRef.current.getBoundingClientRect();
      const imgX = Math.round(((e.clientX - rect.left) / rect.width) * IMAGE_WIDTH);
      const imgY = Math.round(((e.clientY - rect.top) / rect.height) * IMAGE_HEIGHT);
      setLiveCoords({ x: imgX, y: imgY });
    }
  }, [debugZones]);

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
            className="text-xs text-gray-700 dark:text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Pannable image + zones */}
        <div
          ref={panLayerRef}
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
                  fill={isHovered ? `rgba(${rgb}, 0.2)` : debugZones ? `rgba(${rgb}, 0.1)` : "transparent"}
                  stroke={isHovered || debugZones ? zone.color : "none"}
                  strokeWidth={isHovered ? 2 : debugZones ? 1.5 : 0}
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

          {/* Debug: always-on zone labels with coordinates (?debug=zones) */}
          {debugZones && ZONES.map((zone) => {
            const c = centroid(zone.points);
            return (
              <div
                key={zone.id}
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ left: `${(c.x / IMAGE_WIDTH) * 100}%`, top: `${(c.y / IMAGE_HEIGHT) * 100}%` }}
              >
                <div className="px-2 py-1 rounded bg-black/80 text-[10px] font-mono whitespace-nowrap" style={{ color: zone.color }}>
                  {zone.label}
                </div>
              </div>
            );
          })}

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

        {/* Debug: coordinate tooltip that follows the cursor */}
        {debugZones && liveCoords && (
          <div
            className="fixed z-40 pointer-events-none px-2 py-1 rounded bg-black/90 border border-white/30 text-white font-mono text-xs"
            style={{ left: mouseRef.current.x + 14, top: mouseRef.current.y + 14 }}
          >
            {liveCoords.x},{liveCoords.y}
          </div>
        )}
      </div>

      {/* Mobile fallback */}
      <div className="md:hidden flex flex-col items-center justify-center w-screen h-screen bg-[#0a0a0a] px-6 text-center gap-3">
        <span className="text-6xl">🍜</span>
        <h1 className="font-sans text-xl font-bold text-white mt-2">Campus Map</h1>
        <p className="text-sm text-gray-700 dark:text-gray-400">Best experienced on desktop</p>
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
              className="absolute top-3 right-3 text-gray-700 dark:text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2
              className="font-sans text-xl font-bold"
              style={{ color: "#FFD700" }}
            >
              {comingSoonZone.label}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">Coming soon to DormDAO</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">{comingSoonZone.description}</p>
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
