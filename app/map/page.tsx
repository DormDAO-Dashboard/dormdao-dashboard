"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { VideoModal } from "@/components/VideoModal";
import campusMapSrc from "@/public/campus-map.png";
import { SHOWCASE_COLORS } from "@/lib/showcaseColors";
import { isMusicEnabled, setMusicEnabled, onMusicChange } from "@/lib/mapMusic";

// Native pixel dimensions of public/campus-map.png — the SVG overlay's
// viewBox matches this exactly so zone polygons stay aligned regardless
// of how large the image is rendered/panned.
const IMAGE_WIDTH = 3264;
const IMAGE_HEIGHT = 1312;

const PAN_ZONE = 80;   // px from screen edge that triggers panning
const PAN_SPEED = 3;   // px per frame

const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const DRAG_THRESHOLD = 5; // px of mouse movement before a mousedown counts as a drag, not a click

// Vertex-average centroids sit slightly left of these buildings' visual
// center (irregular footprints skew the average) — nudge banners right.
const BANNER_X_OFFSET = 112; // image-space px

// Per-zone fine-tuning on top of BANNER_X_OFFSET — the uniform offset gets
// most zones close, but each polygon's shape skews the vertex-average
// centroid differently, so a few need an extra nudge.
const BANNER_X_OVERRIDE: Partial<Record<string, number>> = {
  "dorm-capital": 32,
  "dorm-catalyst": -34,
  "dorm-builders": 10,
};

// Extra screen-space nudge on top of the above (fixed px, unaffected by
// zoom) — applied uniformly to every banner, up and to the left.
const BANNER_EXTRA_UP_PX = 20;
const BANNER_EXTRA_LEFT_PX = 20;

// Per-zone extra upward nudge on top of BANNER_EXTRA_UP_PX.
const BANNER_Y_OVERRIDE: Partial<Record<string, number>> = {
  "dorm-catalyst": 8,
};

// Puddles easter egg — hover trigger zone, centered over the single pine
// tree left of Dorm Capital he hides behind. Image-space coords (fraction of
// IMAGE_WIDTH/IMAGE_HEIGHT), like everything else positioned over the map art.
const PUDDLES_ZONE_X = 1087;
const PUDDLES_ZONE_Y = 593;
const PUDDLES_ZONE_SIZE = 40; // px (screen-space, scales with map zoom since it's a child of the transformed pan layer)

// Puddles himself, in the same image-space coords as everything else. At
// rest a clip-path collapses him to zero width (see the JSX below) — no
// occlusion image needed, he's just not visible. On hover he leans out to
// PUDDLES_REVEAL_X/Y with a right-to-left clip-path wipe.
const PUDDLES_WIDTH_UNITS = 23; // 18 * 1.25 — 25% bigger, still duck-sized against the map's buildings
const PUDDLES_HIDE_X = 1084;
const PUDDLES_HIDE_Y = 595;
const PUDDLES_REVEAL_X = 1075;
const PUDDLES_REVEAL_Y = 610;

// Small leaf-scatter burst that plays once per reveal (see PUDDLES_REVEAL_KEY
// remount trick below). Each leaf gets its own outward direction/distance/
// spin/delay via CSS custom properties consumed by .animate-leaf-scatter.
const PUDDLES_LEAVES = [
  { dx: -14, dy: -10, rot: -70, delay: 0 },
  { dx: -6, dy: -16, rot: 40, delay: 40 },
  { dx: 4, dy: -18, rot: -30, delay: 80 },
  { dx: 12, dy: -8, rot: 80, delay: 30 },
  { dx: -10, dy: -4, rot: -50, delay: 110 },
];

const COLLABCURRENCY_URL = "https://collabcurrency.com";

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

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
    action: "navigate",
    href: "/dorm-builders",
    color: SHOWCASE_COLORS.dormBuilders,
  },
  {
    id: "dorm-catalyst",
    label: "Dorm Catalyst",
    sublabel: "Accelerator",
    points: "2583,748 2550,745 2550,762 2537,759 2520,751 2508,741 2504,738 2504,735 2478,730 2478,735 2472,735 2472,730 2412,723 2412,727 2406,727 2406,722 2387,720 2376,727 2354,739 2339,738 2339,724 2305,722 2296,704 2297,686 2294,679 2296,649 2303,628 2317,613 2333,601 2353,592 2376,578 2405,568 2427,562 2451,560 2478,559 2505,562 2529,568 2555,575 2577,584 2592,593 2607,605 2613,610 2627,619 2634,631 2639,643 2640,683 2639,694 2636,698 2636,710 2633,715 2633,716 2628,719 2624,724 2624,725 2621,726 2616,731 2610,734 2606,737 2606,739 2601,741 2598,740 2594,744 2593,744 2586,749 2583,748",
    action: "navigate",
    href: "/dorm-catalyst",
    color: SHOWCASE_COLORS.dormCatalyst,
    description: "Accelerating the next generation of crypto founders",
  },
  {
    id: "dorm-summit",
    label: "Dorm Summit",
    sublabel: "Annual Summit",
    points: "1669,956 1669,889 1708,874 1744,811 1896,829 1896,857 2016,877 2016,952 2021,953 2021,958 2019,962 2019,988 2014,992 1999,995 1971,1043 1816,1016 1767,1037 1693,994 1678,994 1675,988 1675,967 1669,964 1668,959",
    action: "navigate",
    href: "/dorm-summit",
    color: SHOWCASE_COLORS.dormSummit,
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
    videoUrl: "https://www.youtube.com/watch?v=5K3w7CKkeOQ",
    color: "#FFD700",
    isEasterEgg: true,
  },
  {
    id: "animal-house",
    label: "Animal House",
    sublabel: "🎉 toga! toga!",
    points: "946,396 952,392 955,393 955,408 967,399 1037,407 1057,416 1057,407 1063,402 1066,404 1066,414 1072,419 1072,467 1058,481 1055,483 1048,492 1013,486 1010,483 968,476 965,478 935,474 935,426 934,425 946,414",
    action: "video",
    videoUrl: "https://www.youtube.com/watch?v=MG7KCOO76Wc",
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

const AUTZEN_ZONE = ZONES.find((z) => z.id === "autzen")!;
const AUTZEN_CENTROID = centroid(AUTZEN_ZONE.points);

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
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [comingSoonZone, setComingSoonZone] = useState<Zone | null>(null);
  const [videoZone, setVideoZone] = useState<Zone | null>(null);
  const [debugZones, setDebugZones] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomingActive, setIsZoomingActive] = useState(false);
  const [autzenOKey, setAutzenOKey] = useState<number | null>(null);
  const [puddlesHovered, setPuddlesHovered] = useState(false);
  // Bumped on every reveal so the leaf-scatter burst below remounts (and its
  // CSS animation restarts) each time he jumps out, not just the first.
  const [puddlesRevealKey, setPuddlesRevealKey] = useState(0);
  // Mirrors the shared preference from lib/mapMusic (the actual player lives
  // in BackgroundMusicPlayer, mounted once in the root layout) — this is
  // just local UI state for the toggle button's icon/color.
  const [musicOn, setMusicOn] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartViewRef = useRef({ x: 0, y: 0 });
  const draggedRef = useRef(false);
  const zoomIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDebugZones(new URLSearchParams(window.location.search).get("debug") === "zones");
  }, []);

  // Music: keep the toggle button's icon in sync with the shared preference,
  // fall back to auto-starting it if the user landed here directly (not via
  // the splash page's Enter button), and stop it on the way out so it's
  // scoped to the map experience rather than following you to /leaderboard.
  useEffect(() => {
    if (!isMusicEnabled()) setMusicEnabled(true);
    setMusicOn(isMusicEnabled());
    const unsubscribe = onMusicChange(setMusicOn);
    return () => {
      unsubscribe();
      setMusicEnabled(false);
    };
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
  // Furthest zoom-out allowed: the point where the image's top/bottom edges
  // exactly reach the viewport edges (the image is much wider than it is
  // tall relative to the screen, so height is always the binding constraint).
  const minZoom = Math.min(1, viewport.h / displayHeight);

  // Pan bounds at a given zoom level. Below 1:1 viewport coverage, the image
  // is centered (can't fill the viewport) instead of pinned to an edge.
  function getBounds(zoom: number) {
    const w = displayWidth * zoom;
    const h = displayHeight * zoom;
    const minX = w <= viewport.w ? (viewport.w - w) / 2 : viewport.w - w;
    const maxX = w <= viewport.w ? (viewport.w - w) / 2 : 0;
    const minY = h <= viewport.h ? (viewport.h - h) / 2 : viewport.h - h;
    const maxY = h <= viewport.h ? (viewport.h - h) / 2 : 0;
    return { minX, maxX, minY, maxY };
  }

  // Center the pan on mount / viewport change (main campus quad sits near
  // the image's vertical middle, so a true center start reads as "on campus").
  useEffect(() => {
    setView({ x: (viewport.w - displayWidth) / 2, y: (viewport.h - displayHeight) / 2, zoom: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.w, viewport.h]);

  // Cursor-edge panning via a persistent rAF loop reading the latest mouse
  // position from a ref (avoids restarting the loop on every mouse move).
  // Disabled while click-drag panning is active so the two never fight.
  useEffect(() => {
    let animFrame: number;
    function pan() {
      const { x: mouseX, y: mouseY } = mouseRef.current;
      if (mouseX >= 0 && !isDraggingRef.current) {
        setView((prev) => {
          const { minX, maxX, minY, maxY } = getBounds(prev.zoom);
          let { x, y } = prev;
          if (mouseX < PAN_ZONE) x = Math.min(x + PAN_SPEED, maxX);
          if (mouseX > viewport.w - PAN_ZONE) x = Math.max(x - PAN_SPEED, minX);
          if (mouseY < PAN_ZONE) y = Math.min(y + PAN_SPEED, maxY);
          if (mouseY > viewport.h - PAN_ZONE) y = Math.max(y - PAN_SPEED, minY);
          return { ...prev, x, y };
        });
      }
      animFrame = requestAnimationFrame(pan);
    }
    animFrame = requestAnimationFrame(pan);
    return () => cancelAnimationFrame(animFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.w, viewport.h, displayWidth, displayHeight]);

  // Scroll-to-zoom toward the cursor position. Attached as a native listener
  // (not React's onWheel) so preventDefault reliably blocks page scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const cursorX = e.clientX;
      const cursorY = e.clientY;

      setIsZoomingActive(true);
      if (zoomIdleTimeoutRef.current) clearTimeout(zoomIdleTimeoutRef.current);
      zoomIdleTimeoutRef.current = setTimeout(() => setIsZoomingActive(false), 150);

      setView((prev) => {
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        const newZoom = clamp(Math.round((prev.zoom + delta) * 10) / 10, minZoom, MAX_ZOOM);
        if (newZoom === prev.zoom) return prev;
        const localX = (cursorX - prev.x) / prev.zoom;
        const localY = (cursorY - prev.y) / prev.zoom;
        const { minX, maxX, minY, maxY } = getBounds(newZoom);
        return {
          zoom: newZoom,
          x: clamp(cursorX - localX * newZoom, minX, maxX),
          y: clamp(cursorY - localY * newZoom, minY, maxY),
        };
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.w, viewport.h, displayWidth, displayHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) draggedRef.current = true;
      setView((prev) => {
        const { minX, maxX, minY, maxY } = getBounds(prev.zoom);
        return {
          ...prev,
          x: clamp(dragStartViewRef.current.x + dx, minX, maxX),
          y: clamp(dragStartViewRef.current.y + dy, minY, maxY),
        };
      });
    }

    if (debugZones && panLayerRef.current) {
      const rect = panLayerRef.current.getBoundingClientRect();
      const imgX = Math.round(((e.clientX - rect.left) / rect.width) * IMAGE_WIDTH);
      const imgY = Math.round(((e.clientY - rect.top) / rect.height) * IMAGE_HEIGHT);
      setLiveCoords({ x: imgX, y: imgY });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugZones, viewport.w, viewport.h, displayWidth, displayHeight]);

  function handleMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    setIsDragging(true);
    draggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartViewRef.current = { x: view.x, y: view.y };
  }

  function stopDragging() {
    isDraggingRef.current = false;
    setIsDragging(false);
  }

  function toggleMusic() {
    setMusicEnabled(!musicOn);
  }

  function handleZoneEnter(zone: Zone) {
    setHoveredZone(zone);
    if (zone.id === "autzen") setAutzenOKey((k) => (k ?? 0) + 1);
  }

  function handleZoneLeave(zone: Zone) {
    setHoveredZone((cur) => (cur?.id === zone.id ? null : cur));
  }

  function handleZoneClick(zone: Zone) {
    if (draggedRef.current) return; // suppress click-through after a real drag
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

  return (
    <>
      {/* Desktop interactive map */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className="hidden md:block relative w-screen h-screen overflow-hidden bg-[#0a0a0a]"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        {/* No top bar — floating controls instead so the map is fully
            unobstructed. Music itself plays via BackgroundMusicPlayer,
            mounted once in the root layout (persists across navigation);
            this button just flips the shared on/off preference. */}
        <button
          onClick={toggleMusic}
          className="fixed top-4 right-4 z-50 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", color: musicOn ? "#4ade80" : "#ffffff" }}
          title={musicOn ? "Mute music" : "Play music"}
        >
          {musicOn ? "🔊" : "🔇"}
        </button>

        {/* Pannable + zoomable image and zones */}
        <div
          ref={panLayerRef}
          className="absolute top-0 left-0"
          style={{
            width: displayWidth,
            height: displayHeight,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: "0 0",
            transition: isDragging || isZoomingActive ? "none" : "transform 100ms ease",
          }}
        >
          <Image
            src={campusMapSrc}
            alt="DormDAO campus map"
            fill
            priority
            quality={90}
            placeholder="blur"
            sizes="100vw"
            className="object-cover pointer-events-none select-none"
            onDragStart={(e) => e.preventDefault()}
          />

          <svg
            viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full"
          >
            {ZONES.map((zone) => {
              const isHovered = hoveredZone?.id === zone.id;
              const rgb = hexToRgb(zone.color);
              const isAnimalHouse = zone.id === "animal-house";
              return (
                <polygon
                  key={zone.id}
                  points={zone.points}
                  fill={isHovered ? `rgba(${rgb}, ${isAnimalHouse ? 0.04 : 0.2})` : debugZones ? `rgba(${rgb}, 0.1)` : "transparent"}
                  stroke={isHovered ? `rgba(${rgb}, ${isAnimalHouse ? 0.15 : 1})` : debugZones ? zone.color : "none"}
                  strokeWidth={isHovered ? (isAnimalHouse ? 1 : 2) : debugZones ? 1.5 : 0}
                  style={{
                    cursor: zone.isEasterEgg ? "crosshair" : "pointer",
                    transition: "all 150ms ease",
                    filter: isHovered && !isAnimalHouse ? `drop-shadow(0 0 8px rgba(${rgb}, 0.6))` : "none",
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

          {/* Floating zone title banners — always visible, slow constant bob */}
          {ZONES.filter((zone) => !zone.isEasterEgg).map((zone) => {
            const c = centroid(zone.points);
            // Approximate on-screen Y of the anchor point, to flip the banner
            // below the polygon instead of above when too close to the top edge.
            const screenY = view.y + (c.y / IMAGE_HEIGHT) * displayHeight * view.zoom;
            const showBelow = screenY < 100;
            return (
              <div
                key={zone.id}
                className="absolute z-20 pointer-events-none animate-banner-fade-in animate-banner-bob-slow"
                style={{
                  left: `${((c.x + BANNER_X_OFFSET + (BANNER_X_OVERRIDE[zone.id] ?? 0)) / IMAGE_WIDTH) * 100}%`,
                  top: `${(c.y / IMAGE_HEIGHT) * 100}%`,
                }}
              >
                <div
                  className="flex flex-col items-center"
                  style={{
                    transform: (() => {
                      const up = BANNER_EXTRA_UP_PX + (BANNER_Y_OVERRIDE[zone.id] ?? 0);
                      return showBelow
                        ? `translate(calc(-50% - ${BANNER_EXTRA_LEFT_PX}px), ${14 - up}px)`
                        : `translate(calc(-50% - ${BANNER_EXTRA_LEFT_PX}px), calc(-100% - ${14 + up}px))`;
                    })(),
                  }}
                >
                  {showBelow && (
                    <div style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))" }}>
                      <div style={{ width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderBottom: "22px solid #8a5a30" }} />
                      <div style={{ width: 0, height: 0, marginTop: -20, marginLeft: 5, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderBottom: "16px solid #e6cd9a" }} />
                    </div>
                  )}
                  <div
                    className="flex flex-col items-center gap-0.5 rounded-lg px-5 py-2"
                    style={{
                      background: "linear-gradient(180deg, #f5e6c8, #e6cd9a)",
                      border: "3px solid #8a5a30",
                      boxShadow: "0 3px 10px rgba(0,0,0,0.45)",
                    }}
                  >
                    <span
                      className="font-sans text-base font-bold tracking-wide"
                      style={{ color: "#4a2f16" }}
                    >
                      {zone.label}
                    </span>
                    <span className="text-sm" style={{ color: "#7a5a34" }}>{zone.sublabel}</span>
                  </div>
                  {!showBelow && (
                    <div style={{ marginTop: -3, filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))" }}>
                      <div style={{ width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: "22px solid #8a5a30" }} />
                      <div style={{ width: 0, height: 0, marginTop: -22, marginLeft: 5, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: "16px solid #e6cd9a" }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Oregon O — Autzen only, floats up and fades on every hover entry */}
          {autzenOKey !== null && (
            <div
              key={autzenOKey}
              className="absolute z-20 pointer-events-none"
              style={{
                left: `${(AUTZEN_CENTROID.x / IMAGE_WIDTH) * 100}%`,
                top: `${(AUTZEN_CENTROID.y / IMAGE_HEIGHT) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="animate-autzen-o-float">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/oregon-o.png" alt="" width={80} height={68} draggable={false} />
              </div>
            </div>
          )}

          {/* Puddles easter egg — hidden hover zone over a tree cluster, silent (no label) */}
          <div
            className="absolute z-20"
            style={{
              left: `${(PUDDLES_ZONE_X / IMAGE_WIDTH) * 100}%`,
              top: `${(PUDDLES_ZONE_Y / IMAGE_HEIGHT) * 100}%`,
              width: PUDDLES_ZONE_SIZE,
              height: PUDDLES_ZONE_SIZE,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => {
              setPuddlesHovered(true);
              setPuddlesRevealKey((k) => k + 1);
            }}
            onMouseLeave={() => setPuddlesHovered(false)}
          />

          {/* Leaf-scatter burst — plays once per reveal, keyed so it remounts
              (and its CSS animation restarts) every time he jumps out. */}
          {puddlesHovered && (
            <div
              key={puddlesRevealKey}
              className="absolute z-[23] pointer-events-none"
              style={{
                left: `${(PUDDLES_HIDE_X / IMAGE_WIDTH) * 100}%`,
                top: `${(PUDDLES_HIDE_Y / IMAGE_HEIGHT) * 100}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              {PUDDLES_LEAVES.map((leaf, i) => (
                <span
                  key={i}
                  className="absolute animate-leaf-scatter"
                  style={{
                    fontSize: 7,
                    left: 0,
                    top: 0,
                    ["--leaf-dx" as string]: `${leaf.dx}px`,
                    ["--leaf-dy" as string]: `${leaf.dy}px`,
                    ["--leaf-rot" as string]: `${leaf.rot}deg`,
                    animationDelay: `${leaf.delay}ms`,
                  }}
                >
                  🍃
                </span>
              ))}
            </div>
          )}

          {/* Puddles himself — no occlusion trick needed. At rest the inner
              clip-path collapses him to zero width (fully invisible on his
              own, nothing to hide him behind), and on hover it wipes open
              right-to-left while he leans out to PUDDLES_REVEAL_X/Y. */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${((puddlesHovered ? PUDDLES_REVEAL_X : PUDDLES_HIDE_X) / IMAGE_WIDTH) * 100}%`,
              top: `${((puddlesHovered ? PUDDLES_REVEAL_Y : PUDDLES_HIDE_Y) / IMAGE_HEIGHT) * 100}%`,
              width: `${(PUDDLES_WIDTH_UNITS / IMAGE_WIDTH) * 100}%`,
              transform: "translate(-50%, -100%)",
              transition: "left 700ms ease, top 700ms ease",
            }}
          >
            <div
              style={{
                clipPath: puddlesHovered ? "inset(0 0 0 0%)" : "inset(0 0 0 100%)",
                transition: "clip-path 700ms ease",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/puddles.png"
                alt=""
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  filter: "blur(0.15px)",
                }}
                draggable={false}
              />
            </div>
          </div>

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

        {/* Collabcurrency partner badge — fixed overlay, unaffected by pan/zoom */}
        <a
          href={COLLABCURRENCY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-[filter]"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collabcurrency-logo.jpeg" alt="" className="w-4 h-4 rounded-full" />
          <span className="text-xs" style={{ color: "#9ca3af" }}>Powered by</span>
          <span className="text-xs font-semibold" style={{ color: "#ffffff" }}>Collab+Currency</span>
        </a>

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
      <div className="md:hidden flex flex-col items-center justify-center w-screen h-screen bg-black px-6 text-center gap-3">
        <span className="text-6xl">🍜</span>
        <h1 className="font-sans text-xl font-bold mt-2" style={{ color: "#ffffff" }}>Campus Map</h1>
        <p className="text-sm" style={{ color: "#9ca3af" }}>Best experienced on desktop</p>
        <Link
          href="/leaderboard"
          className="mt-4 px-6 py-2.5 rounded-full font-sans font-semibold text-[#fff] text-sm"
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
              className="absolute top-3 right-3 transition-colors"
              style={{ color: "#9ca3af" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
            >
              <X className="w-5 h-5" />
            </button>
            <h2
              className="font-sans text-xl font-bold"
              style={{ color: "#FFD700" }}
            >
              {comingSoonZone.label}
            </h2>
            <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Coming soon to DormDAO</p>
            <p className="text-sm mt-4" style={{ color: "#d1d5db" }}>{comingSoonZone.description}</p>
            <Link
              href="/leaderboard"
              className="mt-6 inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg font-sans font-semibold text-[#fff] text-sm"
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
