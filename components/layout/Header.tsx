'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Coins, Images, Moon, Sparkles, Sun, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';

const NAV = [
  { href: '/', label: 'Generate', icon: Wand2 },
  { href: '/upscale', label: 'Upscale', icon: Sparkles },
  { href: '/gallery', label: 'Gallery', icon: Images },
];

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .catch(() => null);

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data } = useSWR<{ credits?: number }>('/api/credits', fetcher, {
    revalidateOnFocus: false,
  });
  const credits = data?.credits ?? null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] flex items-center justify-center shadow-sm">
            <Wand2 className="size-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:block text-sm font-semibold tracking-tight text-foreground">
            KIE Image Gen
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 relative">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="relative px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 flex items-center gap-1.5 transition-colors duration-200',
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {credits !== null && (
            <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground">
              <Coins className="size-3.5 text-primary" />
              <span className="font-mono">{credits.toLocaleString()}</span>
              <span className="text-muted-foreground">credits</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
