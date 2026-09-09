'use client';

import { Clapperboard } from 'lucide-react';
import useSWR from 'swr';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export interface VideoDto {
  id: number;
  renderId: string;
  mixId: string;
  status: 'pending' | 'running' | 'success' | 'fail';
  r2Url: string | null;
  durationSeconds: number | null;
  errorMsg: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function VideoLibrary() {
  const { data, isLoading } = useSWR<{ videos: VideoDto[] }>(
    '/api/music/videos',
    fetcher,
  );

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const videos = data?.videos ?? [];

  if (videos.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clapperboard />
          </EmptyMedia>
          <EmptyTitle>No videos yet</EmptyTitle>
          <EmptyDescription>
            Pair a mix with an image above. A 1-hour export is roughly 235 MB.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {videos.map((video) => (
        <li key={video.id} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">
              {video.durationSeconds ? formatLength(video.durationSeconds) : 'pending'}
            </span>
            <span className="text-xs text-muted-foreground">
              {video.status === 'success'
                ? '1920x1080'
                : video.status === 'fail'
                  ? (video.errorMsg ?? 'failed')
                  : 'rendering…'}
            </span>
          </div>
          {video.r2Url && (
            <>
              <video src={video.r2Url} controls className="w-full rounded" />
              <a
                href={video.r2Url}
                download
                className="self-start text-xs text-muted-foreground underline"
              >
                Download MP4
              </a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
