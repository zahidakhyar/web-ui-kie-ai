'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { MixDto } from './MixLibrary';

/** Measured: a 1-hour 1080p30 export from a still image is ~235 MB. */
const MEGABYTES_PER_HOUR = 235;
const HOUR_SECONDS = 3600;

interface GalleryItem {
  taskId: string;
  prompt: string;
  images?: { r2Url: string }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function VideoBuilder({
  onRenderStarted,
}: {
  onRenderStarted: (renderId: string) => void;
}) {
  const { data: mixData } = useSWR<{ mixes: MixDto[] }>('/api/music/mixes', fetcher);
  const { data: galleryData } = useSWR<{ items: GalleryItem[] }>(
    '/api/gallery?limit=50',
    fetcher,
  );

  const [mixId, setMixId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mixes = (mixData?.mixes ?? []).filter((m) => m.status === 'success');
  const images = (galleryData?.items ?? []).flatMap((item) =>
    (item.images ?? []).map((img) => ({ url: img.r2Url, label: item.prompt })),
  );

  const chosenMix = mixes.find((m) => m.mixId === mixId);
  const seconds = chosenMix?.actualSeconds ?? chosenMix?.targetSeconds ?? 0;
  const megabytes = Math.round((MEGABYTES_PER_HOUR * seconds) / HOUR_SECONDS);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/music/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mixId, imageUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Render failed to start');
      onRenderStarted(json.renderId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Render failed to start');
    } finally {
      setSubmitting(false);
    }
  }

  if (mixes.length === 0 || images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Needs at least one finished mix and one image in the gallery.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="video-mix">Mix</Label>
        <Select value={mixId} onValueChange={(v) => v !== null && setMixId(v)}>
          <SelectTrigger id="video-mix">
            <SelectValue placeholder="Pick a mix" />
          </SelectTrigger>
          <SelectContent>
            {mixes.map((m) => (
              <SelectItem key={m.mixId} value={m.mixId}>
                {Math.round((m.actualSeconds ?? m.targetSeconds) / 60)} minutes
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="video-image">Background image</Label>
        <Select value={imageUrl} onValueChange={(v) => v !== null && setImageUrl(v)}>
          <SelectTrigger id="video-image">
            <SelectValue placeholder="Pick an image" />
          </SelectTrigger>
          <SelectContent>
            {images.map((img) => (
              <SelectItem key={img.url} value={img.url}>
                {img.label.slice(0, 60)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {imageUrl && (
          // Plain <img>: next/image only whitelists one remote host in next.config.ts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mt-1 w-48 rounded object-cover" />
        )}
      </div>

      {chosenMix && (
        <p className="text-xs text-muted-foreground">
          1920x1080 at 30 fps, roughly {megabytes} MB.
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting || !mixId || !imageUrl}
        className="self-start"
      >
        {submitting && <Spinner data-icon="inline-start" />}
        Render video
      </Button>
    </form>
  );
}
