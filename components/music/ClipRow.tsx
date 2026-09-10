'use client';

import { useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ClipDto } from './VideoBuilder';

/**
 * The frame the browser paints before anything plays. A `#t=` fragment makes it
 * seek there on load, which is why these previews need no poster image, no
 * extra column and no second ffmpeg pass — the clip in R2 is the thumbnail.
 */
const PREVIEW_SECOND = 0.5;

function play(video: HTMLVideoElement | null) {
  if (!video) return;
  // Hover-to-play is motion the user did not ask for; the still frame stands in.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  video.play().catch(() => {
    // Interrupted by a quick pointer-out, or autoplay refused. The frame remains.
  });
}

function rewind(video: HTMLVideoElement | null) {
  if (!video) return;
  video.pause();
  video.currentTime = PREVIEW_SECOND;
}

export function ClipRow({
  clip,
  order,
  disabled,
  onToggle,
}: {
  clip: ClipDto;
  /** Position in the chain, or -1 when this clip is not picked. */
  order: number;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);

  return (
    <li
      className="flex items-center gap-3"
      onMouseEnter={() => play(video.current)}
      onMouseLeave={() => rewind(video.current)}
      // focus/blur bubble, so tabbing to the checkbox previews the clip too.
      onFocus={() => play(video.current)}
      onBlur={() => rewind(video.current)}
    >
      <Checkbox
        id={`clip-${clip.clipId}`}
        checked={order !== -1}
        disabled={disabled}
        onCheckedChange={(next) => onToggle(next === true)}
      />
      {clip.r2Url && (
        <video
          ref={video}
          src={`${clip.r2Url}#t=${PREVIEW_SECOND}`}
          preload="metadata"
          muted
          loop
          playsInline
          tabIndex={-1}
          aria-hidden="true"
          className="aspect-video w-28 shrink-0 rounded bg-muted object-cover"
        />
      )}
      <Label
        htmlFor={`clip-${clip.clipId}`}
        className="truncate font-normal text-muted-foreground data-[picked=true]:text-foreground"
        data-picked={order !== -1}
      >
        {order !== -1 && <span className="tabular-nums">{order + 1}.</span>}
        {clip.prompt.slice(0, 60)}
      </Label>
    </li>
  );
}
