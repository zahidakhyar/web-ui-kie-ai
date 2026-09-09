'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_PROMPT =
  'lofi hip hop, warm vinyl crackle, mellow rhodes piano, soft boom-bap drums, rainy night';

export function MusicForm({
  onTaskCreated,
  disabled,
}: {
  onTaskCreated: (taskId: string) => void;
  disabled: boolean;
}) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [tempo, setTempo] = useState('75');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          source: 'sounds',
          instrumental: true,
          tempo: tempo ? Number(tempo) : undefined,
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
        <p className="text-xs text-muted-foreground">
          Max 500 characters. Instrumental loop, roughly 21 seconds.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="music-tempo">Tempo (BPM)</Label>
        <Input
          id="music-tempo"
          type="number"
          value={tempo}
          onChange={(e) => setTempo(e.target.value)}
          min={1}
          max={300}
        />
      </div>

      <Button type="submit" disabled={busy} className="self-start">
        {submitting && <Spinner data-icon="inline-start" />}
        {busy ? 'Generating…' : 'Generate loop'}
      </Button>
    </form>
  );
}
