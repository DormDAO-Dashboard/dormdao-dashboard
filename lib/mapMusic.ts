// Background music preference, shared between the splash page's Enter
// button and the campus map. The actual player is a single YouTube iframe
// mounted once in app/layout.tsx (see components/BackgroundMusicPlayer.tsx)
// so it survives client-side navigation between "/" and "/map" instead of
// restarting — sessionStorage + a custom event is how other mounted
// components (map's toggle button) stay in sync with that shared state.
const STORAGE_KEY = "dormdao-music-enabled";
const CHANGE_EVENT = "dormdao-music-change";

export const MAP_MUSIC_VIDEO_ID = "YR7ESYHCEok";
export const MAP_MUSIC_VOLUME = 25; // 0-100 — subtle background level, not foreground audio

export function isMusicEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function setMusicEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: enabled }));
}

export function onMusicChange(handler: (enabled: boolean) => void): () => void {
  function listener(e: Event) {
    handler((e as CustomEvent<boolean>).detail);
  }
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
