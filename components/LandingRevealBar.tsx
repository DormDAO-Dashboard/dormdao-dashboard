"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Bottom bar doubles as the trigger for a bottom-sheet-style reveal: the
// black bar is bottom-anchored, so growing the image wrapper's max-height
// makes the bar's top edge rise up the screen — a pure-CSS "slide up to
// reveal" with no transform/JS measurement needed. max-h target matches the
// image's true rendered height at full viewport width (16:9 -> 56.25vw) so
// the reveal finishes exactly when the image is fully visible, capped so an
// unusually wide/short window can't make the panel taller than the viewport.
export function LandingRevealBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-black">
      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-500 ease-in-out",
          open ? "max-h-[min(56.25vw,90vh)]" : "max-h-0"
        )}
      >
        <Image
          src="/landing-reveal.png"
          alt="DormDAO partners, members, and schools"
          width={3840}
          height={2160}
          className="w-full h-auto block"
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full px-5 sm:px-8 py-4 sm:py-5 text-left"
      >
        <p className="font-sans text-sm sm:text-base text-white">
          See our <span style={{ color: "#EC7A71" }}>partners</span>,{" "}
          <span style={{ color: "#BCDF6A" }}>schools</span>, and{" "}
          <span style={{ color: "#CC9EED" }}>members</span>.
        </p>
        <ArrowUp
          className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0 transition-transform duration-500",
            open && "rotate-180"
          )}
        />
      </button>
    </div>
  );
}
