"use client";
import Link from "next/link";
import { setMusicEnabled } from "@/lib/mapMusic";

// Split out from the splash page (a server component) so the "start music
// on click" handler has somewhere to live — the click also flips on the
// shared preference that BackgroundMusicPlayer (mounted in the root
// layout) picks up immediately and keeps playing through the /map navigation.
export function EnterMapButton() {
  return (
    <Link
      href="/map"
      onClick={() => setMusicEnabled(true)}
      className="flex items-center justify-center rounded-xl bg-white px-8 py-3.5 sm:px-10 sm:py-4 font-sans font-semibold text-black text-sm sm:text-lg shadow-xl transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
    >
      enter
    </Link>
  );
}
