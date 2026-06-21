import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 mb-8 border-b border-border/40">
      <div className="flex flex-col items-start text-left max-w-2xl">
        {/* Eyebrow & Icon row */}
        <div className="flex items-center gap-2 mb-2">
          {Icon && (
            <div className="flex items-center justify-center p-1.5 rounded-lg bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-primary-foreground shadow-sm">
              <Icon className="w-4 h-4" />
            </div>
          )}
          {eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {eyebrow}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action / Children slot */}
      {children && (
        <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
          {children}
        </div>
      )}
    </div>
  );
}
