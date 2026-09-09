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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { GENRE_PRESETS, getPreset } from '@/lib/music/presets';
import { cn } from '@/lib/utils';

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

const VOCAL_GENDERS = [
  { value: 'any', label: 'Any' },
  { value: 'f', label: 'Female' },
  { value: 'm', label: 'Male' },
];

export function MusicForm({
  onTaskCreated,
  disabled,
}: {
  onTaskCreated: (taskId: string) => void;
  disabled: boolean;
}) {
  const [presetId, setPresetId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [instrumental, setInstrumental] = useState(true);
  const [lyrics, setLyrics] = useState('');
  const [vocalGender, setVocalGender] = useState('any');
  const [tempo, setTempo] = useState('');
  const [musicalKey, setMusicalKey] = useState('');
  const [length, setLength] = useState('loop');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ prompt?: string; lyrics?: string }>({});

  const isLoop = length === 'loop';

  /** Vocals only exist on /generate; the loop endpoint has no vocal fields. */
  function toggleInstrumental(next: boolean) {
    setInstrumental(next);
    if (!next && length === 'loop') setLength('120');
  }

  /** A genre is a shortcut, never a requirement. Tapping the active one clears it. */
  function toggleGenre(id: string) {
    if (presetId === id) {
      setPresetId(null);
      return;
    }
    const preset = getPreset(id);
    if (!preset) return;
    setPresetId(id);
    setPrompt(preset.prompt);
    setTempo(String(preset.tempo));
    setMusicalKey(preset.musicalKey ?? '');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const next: typeof errors = {};
    if (!prompt.trim()) next.prompt = 'Describe the style you want.';
    if (!instrumental && !lyrics.trim()) next.lyrics = 'Vocal tracks need lyrics to sing.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          instrumental,
          ...(instrumental
            ? {}
            : {
                lyrics,
                ...(vocalGender === 'any' ? {} : { vocalGender }),
              }),
          ...(isLoop
            ? {
                source: 'sounds',
                tempo: tempo ? Number(tempo) : undefined,
                musicalKey: musicalKey || undefined,
              }
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Genre</legend>
        <div className="flex flex-wrap gap-2">
          {GENRE_PRESETS.map((preset) => {
            const active = presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleGenre(preset.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition active:scale-[0.97]',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Optional. Picking one fills the fields below; tap it again to clear.
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="music-prompt">Style</Label>
        <Textarea
          id="music-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          maxLength={500}
          // The base Textarea sets field-sizing-content, so it grows with the
          // text and pushes the page. A fixed height overrides that; long text
          // scrolls inside the box instead.
          className="h-24 resize-none overflow-y-auto"
          aria-invalid={!!errors.prompt}
          aria-describedby={errors.prompt ? 'music-prompt-error' : 'music-prompt-help'}
        />
        {errors.prompt ? (
          <p id="music-prompt-error" className="text-xs text-destructive">
            {errors.prompt}
          </p>
        ) : (
          <p id="music-prompt-help" className="text-xs text-muted-foreground">
            Genre, instruments, mood and tempo. Max 500 characters.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="music-instrumental" className="font-normal">
            Instrumental
          </Label>
          <p className="text-xs text-muted-foreground">
            {instrumental
              ? 'No vocals.'
              : 'Suno sings your lyrics exactly as written.'}
          </p>
        </div>
        <Switch
          id="music-instrumental"
          checked={instrumental}
          onCheckedChange={toggleInstrumental}
        />
      </div>

      {!instrumental && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="music-lyrics">Lyrics</Label>
            <Textarea
              id="music-lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={6}
              className="h-56 resize-none overflow-y-auto"
              aria-invalid={!!errors.lyrics}
              aria-describedby={errors.lyrics ? 'music-lyrics-error' : 'music-lyrics-help'}
            />
            {errors.lyrics ? (
              <p id="music-lyrics-error" className="text-xs text-destructive">
                {errors.lyrics}
              </p>
            ) : (
              <p id="music-lyrics-help" className="text-xs text-muted-foreground">
                Sung verbatim. Use blank lines between sections.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="music-vocal">Vocal</Label>
            <Select
              value={vocalGender}
              onValueChange={(v) => v !== null && setVocalGender(v)}
            >
              <SelectTrigger id="music-vocal" className="w-40">
                {/* Base UI renders the raw value by default. */}
                <SelectValue>
                  {(value: string) =>
                    VOCAL_GENDERS.find((g) => g.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VOCAL_GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Suno treats this as a preference, not a guarantee.
            </p>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="music-length">Length</Label>
          <Select value={length} onValueChange={(v) => v !== null && setLength(v)}>
            <SelectTrigger id="music-length" className="w-52">
              <SelectValue>
                {(value: string) => LENGTHS.find((l) => l.value === value)?.label ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LENGTHS.map((l) => (
                <SelectItem key={l.value} value={l.value} disabled={!instrumental && l.value === 'loop'}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tempo and key only exist on the loop endpoint; /generate reads BPM from the style. */}
        {isLoop && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="music-tempo">Tempo (BPM)</Label>
              <Input
                id="music-tempo"
                type="number"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                min={1}
                max={300}
                className="w-28"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="music-key">Key</Label>
              <Input
                id="music-key"
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
                className="w-24"
              />
            </div>
          </>
        )}

        <Button type="submit" disabled={busy}>
          {submitting && <Spinner data-icon="inline-start" />}
          {busy ? 'Generating…' : 'Generate'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {instrumental
          ? LENGTHS.find((l) => l.value === length)?.note ??
            'Two takes per run, roughly 90 seconds.'
          : 'Vocals need the full-track endpoint, so 21-second loops are unavailable.'}
      </p>
    </form>
  );
}
