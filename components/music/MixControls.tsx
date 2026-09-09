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

function estimate(targetSeconds: number) {
  const ratio = targetSeconds / HOUR_SECONDS;
  return {
    megabytes: Math.round(HOUR_MEGABYTES * ratio),
    seconds: Math.max(5, Math.round(HOUR_RENDER_SECONDS * ratio)),
  };
}

export function MixControls({
  selected,
  onMixStarted,
}: {
  selected: number[];
  onMixStarted: (mixId: string) => void;
}) {
  const [target, setTarget] = useState('300');
  const [submitting, setSubmitting] = useState(false);
  const { megabytes, seconds } = estimate(Number(target));

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
          ? 'Select at least one loop above.'
          : `${selected.length} selected · roughly ${megabytes} MB, about ${seconds}s to render.`}
      </p>
    </form>
  );
}
