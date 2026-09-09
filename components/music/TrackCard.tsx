'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioButton } from './AudioButton';

export interface MusicTrackDto {
  id: number;
  taskId: string;
  audioId: string;
  title: string;
  durationSec: number;
  audioR2Url: string;
  coverR2Url: string | null;
}

/** Two variations from one task share a title, so show which is which. */
function variantLabel(track: MusicTrackDto, indexInTask: number): string {
  return `Take ${indexInTask + 1}`;
}

export function TrackCard({
  track,
  indexInTask,
  selected,
  onToggle,
}: {
  track: MusicTrackDto;
  indexInTask: number;
  selected?: boolean;
  onToggle?: (id: number, next: boolean) => void;
}) {
  const selectable = typeof onToggle === 'function';

  return (
    <li
      className={cn(
        'flex items-center gap-4 rounded-xl border p-3 transition',
        selected ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      {selectable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={!!selected}
          aria-label={`Use ${track.title} ${variantLabel(track, indexInTask)} in the mix`}
          onClick={() => onToggle(track.id, !selected)}
          className="relative size-16 shrink-0 overflow-hidden rounded-lg transition active:scale-[0.97]"
        >
          <Cover track={track} />
          <span
            className={cn(
              'absolute inset-0 grid place-items-center transition',
              selected ? 'bg-primary/70 opacity-100' : 'bg-background/60 opacity-0 hover:opacity-100',
            )}
          >
            <Check
              className={cn(
                'size-6',
                selected ? 'text-primary-foreground' : 'text-foreground',
              )}
            />
          </span>
        </button>
      ) : (
        <div className="size-16 shrink-0 overflow-hidden rounded-lg">
          <Cover track={track} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{track.title}</p>
          <p className="text-xs text-muted-foreground">
            {variantLabel(track, indexInTask)} · {track.durationSec.toFixed(1)}s · loops
          </p>
        </div>
        <AudioButton src={track.audioR2Url} label={track.title} />
      </div>
    </li>
  );
}

function Cover({ track }: { track: MusicTrackDto }) {
  if (!track.coverR2Url) return <div className="size-full bg-muted" />;
  return (
    // Plain <img>: next/image only whitelists one remote host in next.config.ts.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={track.coverR2Url} alt="" className="size-full object-cover" />
  );
}
