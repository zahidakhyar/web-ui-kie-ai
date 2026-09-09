'use client';

import { Music } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackCard, type MusicTrackDto } from './TrackCard';

/** Position of a track among the takes returned by the same Suno task. */
function takeIndexes(tracks: MusicTrackDto[]): Map<number, number> {
  const seen = new Map<string, number>();
  const out = new Map<number, number>();
  for (const track of [...tracks].reverse()) {
    const n = seen.get(track.taskId) ?? 0;
    out.set(track.id, n);
    seen.set(track.taskId, n + 1);
  }
  return out;
}

export function TrackList({
  tracks,
  isLoading,
  selected,
  onToggle,
}: {
  tracks: MusicTrackDto[];
  isLoading?: boolean;
  selected?: number[];
  onToggle?: (id: number, next: boolean) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Music />
          </EmptyMedia>
          <EmptyTitle>No loops yet</EmptyTitle>
          <EmptyDescription>
            Generate one above. Each run returns two takes to choose between.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const takes = takeIndexes(tracks);

  return (
    <ul className="flex flex-col gap-3">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          indexInTask={takes.get(track.id) ?? 0}
          selected={selected?.includes(track.id)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}
