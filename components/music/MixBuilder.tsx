'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { MusicTrackDto } from './TrackPlayer';

const PRESETS = [
  { value: '300', label: '5 minutes' },
  { value: '900', label: '15 minutes' },
  { value: '1800', label: '30 minutes' },
  { value: '3600', label: '1 hour' },
];

/**
 * Measured on an M1: a 192-stage chain (one hour) took 69s and produced 83 MB.
 * Render time grows superlinearly with chain length, so scale from that point.
 */
const HOUR_SECONDS = 3600;
const HOUR_RENDER_SECONDS = 70;
const HOUR_MEGABYTES = 83;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function estimate(targetSeconds: number) {
  const ratio = targetSeconds / HOUR_SECONDS;
  return {
    megabytes: Math.round(HOUR_MEGABYTES * ratio),
    seconds: Math.max(5, Math.round(HOUR_RENDER_SECONDS * ratio)),
  };
}

export function MixBuilder({ onMixStarted }: { onMixStarted: (mixId: string) => void }) {
  const { data } = useSWR<{ tracks: MusicTrackDto[] }>('/api/music/library', fetcher);
  const [selected, setSelected] = useState<number[]>([]);
  const [target, setTarget] = useState('300');
  const [submitting, setSubmitting] = useState(false);

  const tracks = data?.tracks ?? [];
  const { megabytes, seconds } = estimate(Number(target));

  function toggle(id: number, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/music/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds: selected, targetSeconds: Number(target) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Mix failed to start');
      onMixStarted(json.mixId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mix failed to start');
    } finally {
      setSubmitting(false);
    }
  }

  if (tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Generate at least one loop before building a mix.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          Loops to include ({selected.length} selected)
        </legend>
        {tracks.map((track) => (
          <Label
            key={track.id}
            htmlFor={`track-${track.id}`}
            className="flex items-center gap-3 rounded-lg border p-2 font-normal"
          >
            <Checkbox
              id={`track-${track.id}`}
              checked={selected.includes(track.id)}
              onCheckedChange={(checked) => toggle(track.id, checked === true)}
            />
            <span className="truncate text-sm">{track.title}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {track.durationSec.toFixed(1)}s
            </span>
          </Label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mix-length">Length</Label>
        <Select value={target} onValueChange={(v) => v !== null && setTarget(v)}>
          <SelectTrigger id="mix-length" className="w-48">
            {/* Base UI renders the raw value by default; the value here is seconds. */}
            <SelectValue>
              {(value: string) => PRESETS.find((p) => p.value === value)?.label ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Roughly {megabytes} MB, about {seconds}s to render.
        </p>
      </div>

      <Button
        type="submit"
        disabled={submitting || selected.length === 0}
        className="self-start"
      >
        {submitting && <Spinner data-icon="inline-start" />}
        Build mix
      </Button>
    </form>
  );
}
