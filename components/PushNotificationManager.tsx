"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PushContextValue {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextValue>({
  isSupported: false,
  isSubscribed: false,
  isLoading: true,
  subscribe: async () => {},
  unsubscribe: async () => {},
});

export function usePush() {
  return useContext(PushContext);
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export function PushNotificationManager({ children }: { children: React.ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
    if (!supported) { setIsLoading(false); return; }

    navigator.serviceWorker.register("/sw.js").catch(console.error);

    checkSubscription().finally(() => setIsLoading(false));
  }, []);

  async function checkSubscription() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsSubscribed(false); return; }
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      setIsSubscribed((data?.length ?? 0) > 0);
    } catch {
      setIsSubscribed(false);
    }
  }

  const subscribe = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        }),
      });
      if (res.ok) setIsSubscribed(true);
    } catch (err) {
      console.error("[push] subscribe error:", err);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setIsSubscribed(false);
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
    }
  }, []);

  return (
    <PushContext.Provider value={{ isSupported, isSubscribed, isLoading, subscribe, unsubscribe }}>
      {children}
    </PushContext.Provider>
  );
}
