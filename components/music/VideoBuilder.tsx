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
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MAX_CLIPS, loopSecondsFor } from '@/lib/video/loop';
import type { MixDto } from './MixLibrary';

/**
 * Measured on real renders: a still pan encodes to ~235 MB per hour, an AI clip
 * to ~800 MB, because the frame keeps changing.
 */
const MEGABYTES_PER_HOUR = { image: 235, clip: 800 };
const HOUR_SECONDS = 3600;

export interface ClipDto {
  clipId: string;
  prompt: string;
  status: 'pending' | 'running' | 'success' | 'fail';
  stage: string | null;
  sourceSeconds: number | null;
  errorMsg: string | null;
}

interface GalleryItem {
  taskId: string;
  prompt: string;
  images?: { r2Url: string }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function VideoBuilder({
  onRenderStarted,
  onClipStarted,
}: {
  onRenderStarted: (renderId: string) => void;
  onClipStarted: (clipId: string) => void;
}) {
  const { data: mixData } = useSWR<{ mixes: MixDto[] }>('/api/music/mixes', fetcher);
  const { data: galleryData } = useSWR<{ items: GalleryItem[] }>(
    '/api/gallery?limit=50',
    fetcher,
  );
  const { data: clipData } = useSWR<{ clips: ClipDto[] }>('/api/music/clips', fetcher);

  const [source, setSource] = useState<'image' | 'clip'>('image');
  const [mixId, setMixId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [clipIds, setClipIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const mixes = (mixData?.mixes ?? []).filter((m) => m.status === 'success');
  const images = (galleryData?.items ?? []).flatMap((item) =>
    (item.images ?? []).map((img) => ({ url: img.r2Url, label: item.prompt })),
  );
  const clips = (clipData?.clips ?? []).filter((c) => c.status === 'success');

  const chosenMix = mixes.find((m) => m.mixId === mixId);
  const seconds = chosenMix?.actualSeconds ?? chosenMix?.targetSeconds ?? 0;
  const megabytes = Math.round((MEGABYTES_PER_HOUR[source] * seconds) / HOUR_SECONDS);
  const chosenSource = source === 'image' ? Boolean(imageUrl) : clipIds.length > 0;

  /**
   * Order matters: the clips are chained in the order they were picked, so a
   * re-tick sends a clip to the end of the sequence rather than back to its
   * old position.
   */
  function toggleClip(id: string, next: boolean) {
    setClipIds((prev) =>
      next ? [...prev, id] : prev.filter((existing) => existing !== id),
    );
  }

  const picked = clipIds.flatMap((id) => {
    const clip = clips.find((c) => c.clipId === id);
    return clip?.sourceSeconds ? [{ path: id, seconds: clip.sourceSeconds }] : [];
  });
  const loopSeconds = picked.length > 0 ? loopSecondsFor(picked) : 0;

  async function handleGenerateClip() {
    setGenerating(true);
    try {
      const res = await fetch('/api/music/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Clip failed to start');
      onClipStarted(json.clipId);
      setPrompt('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clip failed to start');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/music/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          source === 'image' ? { mixId, imageUrl } : { mixId, clipIds },
        ),
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

  if (mixes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Needs at least one finished mix.</p>
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

      <Tabs
        value={source}
        onValueChange={(v) => v !== null && setSource(v as 'image' | 'clip')}
      >
        <TabsList>
          <TabsTrigger value="image">Still image</TabsTrigger>
          <TabsTrigger value="clip">AI clip</TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="flex flex-col gap-1.5 pt-3">
          <Label htmlFor="video-image">Background image</Label>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No images in the gallery yet.
            </p>
          ) : (
            <>
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
            </>
          )}
        </TabsContent>

        <TabsContent value="clip" className="flex flex-col gap-4 pt-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clip-prompt">Describe a new clip</Label>
            <Textarea
              id="clip-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="Slow drifting neon clouds over a night skyline, static camera, no people"
            />
            <p className="text-xs text-muted-foreground">
              Veo 3.1 Lite, 8 seconds at 1080p, about 35 credits. Roughly a minute
              and a half, and the clip is reusable across mixes.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={generating || prompt.trim().length === 0}
              onClick={handleGenerateClip}
            >
              {generating && <Spinner data-icon="inline-start" />}
              Generate clip
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Background clips</Label>
            {clips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No finished clips yet.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {clips.map((c) => {
                    const order = clipIds.indexOf(c.clipId);
                    const atLimit = order === -1 && clipIds.length >= MAX_CLIPS;
                    return (
                      <li key={c.clipId} className="flex items-center gap-2">
                        <Checkbox
                          id={`clip-${c.clipId}`}
                          checked={order !== -1}
                          disabled={atLimit}
                          onCheckedChange={(next) => toggleClip(c.clipId, next === true)}
                        />
                        <Label
                          htmlFor={`clip-${c.clipId}`}
                          className="truncate font-normal text-muted-foreground data-[picked=true]:text-foreground"
                          data-picked={order !== -1}
                        >
                          {order !== -1 && (
                            <span className="tabular-nums">{order + 1}.</span>
                          )}
                          {c.prompt.slice(0, 60)}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {clipIds.length > 0
                    ? `Chained in the order ticked, ${loopSeconds}s before it repeats.`
                    : `Tick up to ${MAX_CLIPS}. More clips means longer before the video repeats.`}
                </p>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {chosenMix && (
        <p className="text-xs text-muted-foreground">
          1920x1080, roughly {megabytes} MB.
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting || !mixId || !chosenSource}
        className="self-start"
      >
        {submitting && <Spinner data-icon="inline-start" />}
        Render video
      </Button>
    </form>
  );
}
