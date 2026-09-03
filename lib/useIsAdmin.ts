"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

// Client-side admin check backed by the session cookie (/api/admin/check),
// not a client-visible secret — see lib/admin.ts removal: a
// NEXT_PUBLIC_ var was previously doubling as a bearer credential accepted
// by several server routes, which meant setting it equal to CRON_SECRET
// (a real, server-only credential) would leak that secret into the client
// bundle. Every admin-only affordance should gate on this instead.
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/check")
      .then((res) => res.json())
      .then((data: { isAdmin?: boolean }) => {
        if (!cancelled) setIsAdmin(data.isAdmin === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
