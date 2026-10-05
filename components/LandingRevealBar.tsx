"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Partners / Members / Schools used to be one flat image (landing-reveal.png)
// — simple, but it meant a fixed amount of empty black space on either side
// on any viewport wider than the image's own 1840px, and the close button
// (placed over whichever corner had room) had nowhere safe to sit once the
// image got short. Now each group is its own image
// (landing-reveal-{partners,members,schools}.png, cropped at the original's
// divider lines), laid out in a flex row with a flex-1 spacer on each side
// of the two divider lines. The images are flex-shrink-0 at their native
// pixel size — never smaller than the original composite — so on a wide
// viewport the extra width goes entirely into those spacers (growing
// symmetrically, keeping each divider exactly centered between its two
// neighbors) instead of sitting unused outside a centered, fixed-size image.
const GROUPS = [
  { src: "/landing-reveal-partners.png", width: 284, height: 317, alt: "Partners" },
  { src: "/landing-reveal-members.png", width: 628, height: 317, alt: "Members" },
  { src: "/landing-reveal-schools.png", width: 925, height: 317, alt: "Schools" },
];

function Divider() {
  return (
    <div className="flex-1 flex justify-center self-stretch">
      <div className="w-px my-6 sm:my-8 bg-white/25" />
    </div>
  );
}

export function LandingRevealBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 bg-black overflow-hidden transition-[max-height] duration-500 ease-in-out",
          open ? "max-h-[100dvh]" : "max-h-0"
        )}
      >
        <div className="relative overflow-x-auto">
          <div className="flex items-center w-full px-5 sm:px-8">
            {GROUPS.map((g, i) => (
              <div key={g.alt} className="flex items-center">
                {i > 0 && <Divider />}
                <Image
                  src={g.src}
                  alt={g.alt}
                  width={g.width}
                  height={g.height}
                  className="shrink-0 block"
                />
              </div>
            ))}
          </div>
          {open && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-black text-white shadow-lg transition-colors"
            >
              <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
      </div>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="See our partners, schools, and members"
          className="fixed inset-x-0 bottom-0 z-20 bg-black flex items-center justify-between w-full px-5 sm:px-8 py-4 sm:py-5 text-left"
        >
          <p className="font-sans text-sm sm:text-base text-white">
            See our <span style={{ color: "#EC7A71" }}>partners</span>,{" "}
            <span style={{ color: "#BCDF6A" }}>schools</span>, and{" "}
            <span style={{ color: "#CC9EED" }}>members</span>.
          </p>
          <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
        </button>
      )}
    </>
  );
}
