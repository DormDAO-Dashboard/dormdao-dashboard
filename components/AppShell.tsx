"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Trophy, GraduationCap, BarChart2, DollarSign, Activity,
  Newspaper, MessagesSquare, BookOpen, Info, Sun, Moon, User,
  ChevronRight, MoreHorizontal, X,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BellButton } from "@/components/BellButton";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/",          label: "Leaderboard", icon: Trophy },
  { href: "/schools",   label: "Schools",     icon: GraduationCap },
  { href: "/analytics", label: "Analytics",   icon: BarChart2 },
  { href: "/tokens",    label: "Tokens",      icon: DollarSign },
  { href: "/activity",  label: "Activity",    icon: Activity },
  { href: "/news",      label: "News",        icon: Newspaper },
  { href: "/forum",     label: "Forum",       icon: MessagesSquare },
  { href: "/research",  label: "DormDocs",    icon: BookOpen },
  { href: "/about",     label: "About",       icon: Info },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/":          "Leaderboard",
  "/schools":   "Schools",
  "/analytics": "Analytics",
  "/tokens":    "Tokens",
  "/activity":  "Activity",
  "/news":      "DAO Headlines",
  "/forum":     "Forum",
  "/research":  "DormDocs",
  "/about":     "About",
  "/profile":   "Profile",
  "/login":     "Sign In",
};

function deriveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/schools/")) return "School";
  if (pathname.startsWith("/tokens/"))  return "Token";
  if (pathname.startsWith("/forum/"))   return "Thread";
  if (pathname.startsWith("/users/"))   return "Profile";
  return "DormDAO";
}

function matchesRoute(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const PRIMARY_HREFS = new Set(["/", "/schools", "/analytics", "/activity", "/forum"]);
const PRIMARY_LINKS = NAV_LINKS.filter(l => PRIMARY_HREFS.has(l.href));
const MORE_LINKS    = NAV_LINKS.filter(l => !PRIMARY_HREFS.has(l.href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname          = usePathname();
  const { theme, toggle } = useTheme();

  const [user, setUser]           = useState<SupabaseUser | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [pinned, setPinned]       = useState(false);
  const [hovered, setHovered]     = useState(false);
  const [showMore, setShowMore]   = useState(false);

  useEffect(() => {
    try { setPinned(localStorage.getItem("sidebar-pinned") === "true"); } catch {}
  }, []);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        const { data: p } = await supabase
          .from("profiles").select("avatar_url").eq("id", u.id).single();
        setAvatarSrc(
          p?.avatar_url ?? (u.user_metadata?.avatar_url as string | undefined) ?? null
        );
      }
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setAvatarSrc(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    try { localStorage.setItem("sidebar-pinned", String(next)); } catch {}
  }

  const expanded  = pinned || hovered;
  const sidebarPx = expanded ? 200 : 64;

  function AvatarImg({ size }: { size: number }) {
    if (avatarSrc) {
      return (
        <Image src={avatarSrc} width={size} height={size} alt="avatar"
          className="rounded-lg border border-gray-300 dark:border-gray-700 object-cover hover:border-primary/60 transition-colors"
          unoptimized />
      );
    }
    return (
      <div style={{ width: size, height: size }}
        className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
        <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  // Shared class fragments
  const sidebarItem = "flex items-center gap-3 w-full px-2 py-2.5 rounded-lg transition-colors text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.06]";
  const labelFade   = cn("text-sm whitespace-nowrap transition-all duration-150", expanded ? "opacity-100" : "opacity-0 pointer-events-none");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">

      {/* ── Left Sidebar (desktop only) ────────────────────────── */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: sidebarPx }}
        className="hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-white dark:bg-[#0f0f0f] border-r border-gray-200 dark:border-white/[0.08] overflow-hidden transition-all duration-200"
      >
        {/* Logo */}
        <div className="flex items-center h-[52px] px-4 shrink-0 border-b border-gray-100 dark:border-white/[0.05] overflow-hidden">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image src="/logo.jpg" width={28} height={28} alt="DormDAO" className="rounded-md shrink-0" />
            <span className={cn(
              "font-semibold text-gray-900 dark:text-white text-sm whitespace-nowrap transition-all duration-150",
              expanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
              DormDAO
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = matchesRoute(href, pathname);
            return (
              <Link key={href} href={href} className={cn(
                "relative flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              )}>
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                <span className={cn(
                  "text-sm font-medium whitespace-nowrap transition-all duration-150",
                  expanded ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="shrink-0 border-t border-gray-100 dark:border-white/[0.05] p-2 space-y-0.5">
          <button onClick={toggle} className={sidebarItem}>
            {theme === "dark"
              ? <Sun className="w-5 h-5 shrink-0" />
              : <Moon className="w-5 h-5 shrink-0" />}
            <span className={labelFade}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <button onClick={togglePin} className={sidebarItem}>
            <ChevronRight className={cn(
              "w-5 h-5 shrink-0 transition-transform duration-200",
              pinned ? "rotate-180" : ""
            )} />
            <span className={labelFade}>
              {pinned ? "Collapse" : "Pin open"}
            </span>
          </button>

          <Link href={user ? "/profile" : "/login"} className={cn(sidebarItem, "w-auto")}>
            {avatarSrc
              ? <Image src={avatarSrc} width={20} height={20} alt="avatar"
                  className="rounded-md border border-gray-300 dark:border-gray-700 object-cover shrink-0" unoptimized />
              : <User className="w-5 h-5 shrink-0" />}
            <span className={labelFade}>
              {user ? "Profile" : "Sign in"}
            </span>
          </Link>
        </div>
      </aside>

      {/* ── Top Bar (desktop only) ──────────────────────────────── */}
      <header
        style={{ left: pinned ? 200 : 64 }}
        className="hidden md:flex fixed top-0 right-0 z-30 h-[52px] items-center gap-4 px-5 border-b border-gray-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur transition-all duration-200"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-200 shrink-0">
          {deriveTitle(pathname)}
        </span>
        <div className="absolute left-1/2 -translate-x-1/2 w-[440px] max-w-[calc(100%-240px)]">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <BellButton isLoggedIn={!!user} />
          <button onClick={toggle} aria-label="Toggle theme"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <Link href={user ? "/profile" : "/login"} className="ml-1">
            <AvatarImg size={28} />
          </Link>
        </div>
      </header>

      {/* ── Content area ───────────────────────────────────────── */}
      <div className={cn(
        "w-full overflow-x-hidden transition-all duration-200 md:pt-[52px] pb-20 md:pb-0",
        pinned ? "md:ml-[200px]" : "md:ml-16"
      )}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#0f0f0f] border-t border-gray-200 dark:border-white/[0.08] flex items-center justify-around h-16">
        {PRIMARY_LINKS.map(({ href, icon: Icon }) => {
          const active = matchesRoute(href, pathname);
          return (
            <Link key={href} href={href} className={cn(
              "flex items-center justify-center min-w-[48px] min-h-[48px] rounded-xl transition-colors",
              active ? "text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}>
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <button onClick={() => setShowMore(true)}
          className="flex items-center justify-center min-w-[48px] min-h-[48px] rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </nav>

      {/* Mobile "More" bottom sheet */}
      {showMore && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#111] border-t border-gray-200 dark:border-gray-800 rounded-t-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">More</span>
              <button onClick={() => setShowMore(false)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-3">
              {MORE_LINKS.map(({ href, label, icon: Icon }) => {
                const active = matchesRoute(href, pathname);
                return (
                  <Link key={href} href={href} onClick={() => setShowMore(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors",
                      active
                        ? "text-primary bg-primary/10"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"
                    )}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                );
              })}
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Theme</span>
                <button onClick={toggle}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
