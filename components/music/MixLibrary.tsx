'use client';

import { DiscAlbum } from 'lucide-react';
import useSWR from 'swr';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { AudioButton } from './AudioButton';

export interface MixDto {
  id: number;
  mixId: string;
  targetSeconds: number;
  actualSeconds: number | null;
  status: 'pending' | 'running' | 'success' | 'fail';
  r2Url: string | null;
  errorMsg: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function MixLibrary() {
  const { data, isLoading } = useSWR<{ mixes: MixDto[] }>('/api/music/mixes', fetcher);

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const mixes = data?.mixes ?? [];

  if (mixes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DiscAlbum />
          </EmptyMedia>
          <EmptyTitle>No mixes yet</EmptyTitle>
          <EmptyDescription>
            Pick some loops above and build one. A 1-hour mix takes about a minute.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {mixes.map((mix) => (
        <li key={mix.id} className="flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">
              {formatLength(mix.actualSeconds ?? mix.targetSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">
              {mix.status === 'success'
                ? 'ready'
                : mix.status === 'fail'
                  ? (mix.errorMsg ?? 'failed')
                  : 'building…'}
            </span>
          </div>
          {mix.r2Url && (
            <>
              <AudioButton
                src={mix.r2Url}
                label={`${formatLength(mix.actualSeconds ?? mix.targetSeconds)} mix`}
              />
              <a
                href={mix.r2Url}
                download
                className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Download MP3
              </a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
