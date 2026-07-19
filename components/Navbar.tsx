"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Trophy, GraduationCap, BarChart2, Info, Activity, Sun, Moon, User, Newspaper, MessagesSquare, BookOpen, MoreHorizontal, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/", label: "Leaderboard", icon: Trophy },
  { href: "/schools", label: "Portfolios", icon: GraduationCap },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/forum", label: "Forum", icon: MessagesSquare },
  { href: "/research", label: "DormDocs", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
];

const PRIMARY_HREFS = new Set(["/", "/schools", "/analytics", "/activity", "/forum"]);
const PRIMARY_LINKS = NAV_LINKS.filter((l) => PRIMARY_HREFS.has(l.href));
const MORE_LINKS = NAV_LINKS.filter((l) => !PRIMARY_HREFS.has(l.href));

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", u.id)
          .single();
        setProfileAvatar(profile?.avatar_url ?? null);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfileAvatar(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <nav className="border-b border-gray-800 bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.jpg" width={28} height={28} alt="DormDAO" className="rounded-md" />
              <span className="font-semibold text-gray-900 dark:text-white text-sm hidden sm:block tracking-tight">DormDAO</span>
            </Link>

            {/* Desktop nav — text links with underline indicator */}
            <div className="hidden md:flex items-stretch h-14">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center px-4 text-sm transition-colors border-b-2 -mb-px",
                      isActive
                        ? "text-gray-900 dark:text-white font-medium border-primary"
                        : "text-gray-500 hover:text-gray-200 border-transparent font-normal"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile nav — 5 primary icons + More */}
            <div className="flex md:hidden items-center flex-1 justify-around mx-2">
              {PRIMARY_LINKS.map(({ href, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md transition-colors",
                      isActive ? "text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })}
              <button
                onClick={() => setShowMore(true)}
                aria-label="More navigation options"
                className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className={cn(
                  "hidden md:flex items-center justify-center w-8 h-8 rounded-md border transition-colors duration-200",
                  theme === "dark"
                    ? "border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-100"
                )}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {user ? (
                <Link href="/profile" aria-label="Your profile">
                  {(profileAvatar ?? user.user_metadata?.avatar_url) ? (
                    <Image
                      src={(profileAvatar ?? user.user_metadata?.avatar_url) as string}
                      width={30}
                      height={30}
                      alt="avatar"
                      className="rounded-lg border border-gray-700 hover:border-primary/60 transition-colors object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center hover:bg-primary/30 transition-colors">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-md border transition-colors",
                    theme === "dark"
                      ? "border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600"
                      : "border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400"
                  )}
                >
                  Sign in
                </Link>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile "More" bottom sheet */}
      {showMore && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-gray-800 rounded-t-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <span className="text-sm font-semibold text-gray-300">More</span>
              <button
                onClick={() => setShowMore(false)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-3">
              {MORE_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors",
                      isActive ? "text-primary bg-primary/10" : "text-gray-300 hover:bg-gray-800/60"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                );
              })}
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-gray-300 font-medium">Theme</span>
                <button
                  onClick={toggle}
                  aria-label="Toggle theme"
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg border transition-colors",
                    theme === "dark"
                      ? "border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-600"
                      : "border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400"
                  )}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
