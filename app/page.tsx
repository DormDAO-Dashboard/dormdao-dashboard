import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "DormDAO" };

const PARTICLES = [
  { left: "8%",  delay: "0s",   duration: "6s", drift: "6px",   opacity: 0.35 },
  { left: "18%", delay: "1.2s", duration: "7s", drift: "-8px",  opacity: 0.3 },
  { left: "30%", delay: "2.4s", duration: "5.5s", drift: "4px", opacity: 0.4 },
  { left: "45%", delay: "0.6s", duration: "8s", drift: "-6px",  opacity: 0.3 },
  { left: "58%", delay: "3.1s", duration: "6.5s", drift: "8px", opacity: 0.35 },
  { left: "70%", delay: "1.8s", duration: "7.5s", drift: "-4px", opacity: 0.3 },
  { left: "82%", delay: "2.9s", duration: "6s", drift: "6px",   opacity: 0.4 },
  { left: "92%", delay: "0.3s", duration: "8.5s", drift: "-8px", opacity: 0.3 },
] as const;

export default function SplashPage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Background map, slow zoom */}
      <div className="absolute inset-0 animate-map-zoom">
        <Image
          src="/campus-map.png"
          alt=""
          fill
          priority
          className="object-cover object-[center_top]"
          style={{ filter: "brightness(0.65)" }}
        />
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)" }}
      />

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
              "--particle-opacity": p.opacity,
            }}
          />
        ))}
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4 text-center">
        <span className="text-6xl sm:text-7xl animate-gold-pulse select-none">🍜</span>

        <h1
          className="mt-4 font-sans font-extrabold tracking-wider text-7xl sm:text-8xl md:text-9xl"
          style={{
            backgroundImage: "linear-gradient(180deg, #FFD700 0%, #C8A84B 50%, #8B6914 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 0 40px rgba(200,168,75,0.5)",
          }}
        >
          DormDAO
        </h1>

        <p className="mt-2 text-sm text-gray-300 tracking-widest uppercase">
          The World&apos;s First Multi-University Crypto Investment DAO
        </p>

        <Link
          href="/map"
          className="group mt-10 inline-flex items-center gap-3 rounded-full px-16 py-4 font-sans font-semibold text-white text-xl tracking-wide transition-all duration-200 hover:brightness-110 hover:scale-[1.02] cursor-pointer"
          style={{
            backgroundImage: "linear-gradient(180deg, #4CAF50 0%, #2d8a30 100%)",
            border: "2px solid #FFD700",
            boxShadow: "0 0 20px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <span className="text-[#FFD700]">❮</span>
          Enter
          <span className="text-[#FFD700]">❯</span>
        </Link>
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600 select-none">
        © DormDAO 2026
      </p>
    </div>
  );
}
