'use client';

export interface MusicTrackDto {
  id: number;
  taskId: string;
  audioId: string;
  title: string;
  durationSec: number;
  audioR2Url: string;
  coverR2Url: string | null;
}

export function TrackPlayer({ track }: { track: MusicTrackDto }) {
  return (
    <li className="flex items-center gap-4 rounded-lg border p-3">
      {track.coverR2Url ? (
        // Plain <img>: next/image only whitelists one remote host in next.config.ts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.coverR2Url} alt="" className="size-16 shrink-0 rounded object-cover" />
      ) : (
        <div className="size-16 shrink-0 rounded bg-muted" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-sm font-medium">{track.title}</p>
          <p className="text-xs text-muted-foreground">
            {track.durationSec.toFixed(1)}s · loops seamlessly
          </p>
        </div>
        <audio src={track.audioR2Url} controls loop className="w-full" />
      </div>
    </li>
  );
}
