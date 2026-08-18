import Image from "next/image";
import { EnterMapButton } from "@/components/EnterMapButton";

// A fresh random background per visit — this route must not be statically
// cached at build time, or every visitor would get the same fixed image.
export const dynamic = "force-dynamic";

export const metadata = { title: "DormDAO" };

const LANDING_IMAGES = Array.from({ length: 7 }, (_, i) => `/landing/landing-${i + 1}.jpg`);

export default function SplashPage() {
  const bg = LANDING_IMAGES[Math.floor(Math.random() * LANDING_IMAGES.length)];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Background, randomly picked per visit, slow zoom. Darkened via a
          filter on the image itself (not a separate overlay div) — an
          overlapping sibling scrim div reliably painted solid black on first
          load in testing here, a compositing quirk with the animated layer
          that only cleared after a forced repaint. */}
      <div className="absolute inset-0 animate-map-zoom">
        <Image
          src={bg}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ filter: "brightness(0.55)" }}
        />
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-4 text-center gap-7">
        <div className="flex items-center gap-3">
          <h1
            className="font-sans font-extrabold lowercase text-[#fff] text-5xl sm:text-7xl md:text-8xl"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}
          >
            dorm dao
          </h1>
          <span
            className="text-5xl sm:text-7xl md:text-8xl select-none"
            style={{ filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.45))" }}
          >
            🍜
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 max-w-[92vw]">
          <div className="flex items-center justify-center rounded-xl bg-black px-6 py-3.5 sm:px-8 sm:py-4 shadow-xl">
            <span className="font-sans font-semibold text-[#fff] text-sm sm:text-lg">
              supporting student investment groups
            </span>
          </div>
          <EnterMapButton />
        </div>
      </div>
    </div>
  );
}
