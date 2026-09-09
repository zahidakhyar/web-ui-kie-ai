'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { planMix } from '@/lib/audio/plan';

const PRESETS = [
  { value: '300', label: '5 minutes' },
  { value: '900', label: '15 minutes' },
  { value: '1800', label: '30 minutes' },
  { value: '3600', label: '1 hour' },
];

/** 192 kbps MP3 is 24 KB per second, so size depends only on length. */
const KB_PER_SECOND = 24;

/**
 * Render time depends on chain length, not output length: measured 12.8s at 60
 * acrossfade stages and 69.2s at 192, which fits t = 12.8 * (n/60)^1.45.
 * Six-minute tracks need ~10 stages for an hour where 21s loops need ~192, so
 * the estimate has to come from the selected durations, not the target alone.
 */
const REF_STAGES = 60;
const REF_SECONDS = 12.8;
const GROWTH = 1.45;

function estimate(targetSeconds: number, durations: number[]) {
  const megabytes = Math.round((targetSeconds * KB_PER_SECOND) / 1024);
  if (durations.length === 0) return { megabytes, seconds: 0, crossfades: 0 };

  // Same arithmetic the renderer uses, so the estimate cannot drift from it.
  const inputs = planMix(
    durations.map((_, i) => String(i)),
    durations,
    targetSeconds,
  ).inputs.length;

  // A chain of n inputs has n-1 seams; one input needs no crossfade at all.
  const crossfades = Math.max(0, inputs - 1);
  const seconds = Math.max(
    3,
    Math.round(REF_SECONDS * (inputs / REF_STAGES) ** GROWTH),
  );
  return { megabytes, seconds, crossfades };
}

export function MixControls({
  selected,
  selectedDurations,
  onMixStarted,
}: {
  selected: number[];
  selectedDurations: number[];
  onMixStarted: (mixId: string) => void;
}) {
  const [target, setTarget] = useState('300');
  const [submitting, setSubmitting] = useState(false);
  const { megabytes, seconds, crossfades } = estimate(Number(target), selectedDurations);

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mix-length">Length</Label>
        <Select value={target} onValueChange={(v) => v !== null && setTarget(v)}>
          <SelectTrigger id="mix-length" className="w-44">
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
      </div>

      <Button type="submit" disabled={submitting || selected.length === 0}>
        {submitting && <Spinner data-icon="inline-start" />}
        Build mix
      </Button>

      <p className="text-xs text-muted-foreground">
        {selected.length === 0
          ? 'Select at least one track above.'
          : `${selected.length} selected · ${crossfades} crossfade${crossfades === 1 ? '' : 's'} · roughly ${megabytes} MB, about ${seconds}s to render.`}
      </p>
    </form>
  );
}
