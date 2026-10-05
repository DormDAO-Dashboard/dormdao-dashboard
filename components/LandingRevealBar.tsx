"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// The bottom bar and the reveal panel occupy the same fixed bottom-0 slot but
// are mutually exclusive — the bar disappears entirely once open so it can
// never sit on top of (and look like it's cropping) the image.
//
// The image is constrained by BOTH max-width and max-height (with width/height
// left auto), so on a short/"condensed" window it shrinks to fit the
// available height instead of overflowing and getting silently scrolled out
// of view — the whole image is always fully visible, never cropped.
//
// The close button used to sit absolutely positioned over the image's own
// top-right corner — fine when the image was tall (3840x2160) and that
// corner was empty space, but the current, much shorter image (1840x317)
// has real content (the Schools column) running edge to edge, so an overlay
// button there covered logos. It now lives in its own dedicated bar below
// the image instead, mirroring the open-trigger bar's layout exactly
// (full-width flex row, arrow pinned to the right edge, vertically centered
// in its own space) so it never overlaps the artwork.
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
        <div className="flex justify-center">
          <Image
            src="/landing-reveal.png"
            alt="Dorm™ partners, members, and schools"
            width={1840}
            height={317}
            className="w-auto h-auto max-w-full max-h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-72px)] block"
          />
        </div>
        {/* In-flow bar below the image (not fixed — it needs to stack after
            the image within this same panel, not compete with it for the
            viewport's bottom edge), laid out exactly like the open-trigger
            bar below so the close arrow lands in the same visual slot.
            Gated on `open` same as before, so it isn't a hidden-but-focusable
            button while the panel is collapsed to max-h-0. */}
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex items-center justify-end w-full px-5 sm:px-8 py-4 sm:py-5 bg-black"
          >
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
          </button>
        )}
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
