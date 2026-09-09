'use client';

import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The three stages are sequential. Showing that in the layout replaces the
 * sentence that used to explain it, and disabling a stage until its input
 * exists prevents the dead-end where a form cannot be submitted.
 */
export function Stage({
  index,
  title,
  hint,
  locked,
  done,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  locked?: boolean;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`stage-${index}`}
      className={cn('flex flex-col gap-4', locked && 'opacity-55')}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium tabular-nums',
            done && 'border-primary bg-primary text-primary-foreground',
            locked && 'border-border text-muted-foreground',
            !done && !locked && 'border-foreground text-foreground',
          )}
        >
          {done ? <Check className="size-4" /> : locked ? <Lock className="size-3" /> : index}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id={`stage-${index}`} className="text-lg font-medium leading-tight">
            {title}
          </h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}
