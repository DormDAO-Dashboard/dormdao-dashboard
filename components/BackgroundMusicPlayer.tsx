"use client";
import { useEffect, useRef } from "react";
import { MAP_MUSIC_VIDEO_ID, MAP_MUSIC_VOLUME, isMusicEnabled, onMusicChange } from "@/lib/mapMusic";

function sendCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

// Mounted once in the root layout (not per-page) so this iframe — and its
// playback position — survives client-side navigation between "/" and
// "/map" instead of being torn down and restarted. Streams directly from
// YouTube; no audio file is downloaded or hosted here.
export function BackgroundMusicPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function apply(enabled: boolean) {
      const iframe = iframeRef.current;
      sendCommand(iframe, "setVolume", [MAP_MUSIC_VOLUME]);
      sendCommand(iframe, enabled ? "unMute" : "mute");
      sendCommand(iframe, enabled ? "playVideo" : "pauseVideo");
    }
    apply(isMusicEnabled());
    return onMusicChange(apply);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`https://www.youtube-nocookie.com/embed/${MAP_MUSIC_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${MAP_MUSIC_VIDEO_ID}&controls=0&enablejsapi=1&modestbranding=1&rel=0`}
      allow="autoplay"
      style={{ position: "fixed", top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
