"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, BarChart2, BookOpen, GraduationCap, Coins } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Overview", icon: BarChart2 },
  { href: "/schools", label: "Schools", icon: GraduationCap },
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/research", label: "Research", icon: BookOpen },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <nav className="border-b border-gray-800 bg-[#0f1117]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              DD
            </div>
            <span className="font-semibold text-white hidden sm:block">DormDAO</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary/20 text-primary"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </div>

          <button
            onClick={toggle}
            className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
