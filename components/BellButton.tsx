"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { usePush } from "@/components/PushNotificationManager";
import { cn } from "@/lib/utils";

const DEFAULT_PREFS = { trades: true, forum: true, news: false };
type Prefs = typeof DEFAULT_PREFS;

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("push-prefs") ?? "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: Prefs) {
  try { localStorage.setItem("push-prefs", JSON.stringify(prefs)); } catch {}
}

export function BellButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePush();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function togglePref(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    savePrefs(next);
  }

  if (!isLoggedIn) {
    return (
      <div className="relative group">
        <button
          disabled
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 dark:text-gray-700 cursor-not-allowed"
        >
          <Bell className="w-4 h-4" />
        </button>
        <div className="absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg bg-gray-900 text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
          Sign in to enable notifications
        </div>
      </div>
    );
  }

  if (!isSupported || isLoading) {
    return (
      <button disabled className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 dark:text-gray-600">
        <Bell className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
          isSubscribed
            ? "text-primary hover:bg-primary/10"
            : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
        )}
      >
        <Bell className={cn("w-4 h-4", isSubscribed && "fill-current")} />
      </button>

      {open && !isSubscribed && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-50 p-4">
          <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Stay in the loop</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            Get notified when schools make trades or post new forum threads
          </p>
          <button
            onClick={async () => { await subscribe(); setOpen(false); }}
            className="w-full py-2 px-4 bg-primary text-black text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {open && isSubscribed && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications enabled</p>
          </div>
          <div className="space-y-2.5 mb-4">
            {(
              [
                { key: "trades" as const, label: "New trades (buys & sells)" },
                { key: "forum"  as const, label: "New forum threads" },
                { key: "news"   as const, label: "New news posts" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => togglePref(key)}
                className="flex items-center gap-2.5 w-full text-left"
              >
                <div className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  prefs[key] ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"
                )}>
                  {prefs[key] && <Check className="w-2.5 h-2.5 text-black" />}
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={async () => { await unsubscribe(); setOpen(false); }}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Disable Notifications
          </button>
        </div>
      )}
    </div>
  );
}
