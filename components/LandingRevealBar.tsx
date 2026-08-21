"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// The bottom bar and the reveal panel occupy the same fixed bottom-0 slot but
// are mutually exclusive — the bar disappears entirely once open so it can
// never sit on top of (and look like it's cropping) the image. The panel
// itself is capped at the viewport height and scrolls internally instead of
// ever clipping the artwork on unusually wide/short windows. Closing happens
// via a separate top-right button instead of the (now-hidden) bar.
export function LandingRevealBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 bg-black overflow-y-auto transition-[max-height] duration-500 ease-in-out",
          open ? "max-h-[100dvh]" : "max-h-0"
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

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="fixed top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-black text-white shadow-lg transition-colors"
        >
          <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
    </>
  );
}
