'use client';

import { MusicIcon } from 'lucide-react';
import useSWR from 'swr';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackPlayer, type MusicTrackDto } from './TrackPlayer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TrackLibrary() {
  const { data, isLoading } = useSWR<{ tracks: MusicTrackDto[] }>(
    '/api/music/library',
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const tracks = data?.tracks ?? [];

  if (tracks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MusicIcon />
          </EmptyMedia>
          <EmptyTitle>No loops yet</EmptyTitle>
          <EmptyDescription>
            Generate one above. Each run returns two variations to pick from.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {tracks.map((track) => (
        <TrackPlayer key={track.id} track={track} />
      ))}
    </ul>
  );
}
