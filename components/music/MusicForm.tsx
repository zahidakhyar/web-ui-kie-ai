'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_PROMPT =
  'lofi hip hop, warm vinyl crackle, mellow rhodes piano, soft boom-bap drums, rainy night';

/**
 * One control picks both the endpoint and the length, so there is no invalid
 * combination to guard against. `sounds` has no duration parameter at all and
 * always returns ~21s; `generate` accepts 10-360s on V5_5.
 *
 * Credit cost measured live: sounds 2.5, generate 12 (both return two takes).
 */
const LENGTHS = [
  { value: 'loop', label: '21 seconds (loop)', note: 'Cheapest. Best for long mixes.' },
  { value: '60', label: '1 minute' },
  { value: '120', label: '2 minutes' },
  { value: '240', label: '4 minutes' },
  { value: '360', label: '6 minutes', note: 'Longest a single generation allows.' },
];

export function MusicForm({
  onTaskCreated,
  disabled,
}: {
  onTaskCreated: (taskId: string) => void;
  disabled: boolean;
}) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [tempo, setTempo] = useState('75');
  const [length, setLength] = useState('loop');
  const [submitting, setSubmitting] = useState(false);

  const isLoop = length === 'loop';
  const note = LENGTHS.find((l) => l.value === length)?.note;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          instrumental: true,
          ...(isLoop
            ? { source: 'sounds', tempo: tempo ? Number(tempo) : undefined }
            : { source: 'generate', targetSeconds: Number(length) }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Generation failed');
      onTaskCreated(json.taskId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || disabled;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="music-prompt">Prompt</Label>
        <Textarea
          id="music-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={500}
          required
        />
        <p className="text-xs text-muted-foreground">Max 500 characters. Instrumental.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="music-length">Length</Label>
          <Select value={length} onValueChange={(v) => v !== null && setLength(v)}>
            <SelectTrigger id="music-length" className="w-52">
              {/* Base UI renders the raw value by default. */}
              <SelectValue>
                {(value: string) =>
                  LENGTHS.find((l) => l.value === value)?.label ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LENGTHS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tempo and key only exist on the loop endpoint. */}
        {isLoop && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="music-tempo">Tempo (BPM)</Label>
            <Input
              id="music-tempo"
              type="number"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              min={1}
              max={300}
              className="w-32"
            />
          </div>
        )}

        <Button type="submit" disabled={busy}>
          {submitting && <Spinner data-icon="inline-start" />}
          {busy ? 'Generating…' : 'Generate'}
        </Button>
      </div>

      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </form>
  );
}
