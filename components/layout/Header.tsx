"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, Wand2, Images, Coins } from "lucide-react";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Generate", icon: Wand2 },
  { href: "/gallery", label: "Gallery", icon: Images },
];

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .catch(() => null);

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data } = useSWR<{ credits?: number }>("/api/credits", fetcher, {
    revalidateOnFocus: false,
  });
  const credits = data?.credits ?? null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="size-7 rounded-md bg-primary flex items-center justify-center">
            <Wand2 className="size-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:block text-sm">KIE Image Gen</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-8",
                  pathname === href && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {credits !== null && (
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium">
              <Coins className="size-3.5 text-yellow-500" />
              <span>{credits.toLocaleString()} credits</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
}
