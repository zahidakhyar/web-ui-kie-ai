'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/models';
import { ModelParameter } from '@/types';
import { Loader2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ModelSelector } from './ModelSelector';
import { ParameterField } from './ParameterField';

function buildDefaultValues(
  params: ModelParameter[],
): Record<string, string | number | boolean | string[]> {
  return Object.fromEntries(
    params.map((p) => [
      p.key,
      p.type === 'image-upload'
        ? []
        : (p.default ?? (p.type === 'boolean' ? false : '')),
    ]),
  );
}

interface GeneratorFormProps {
  onTaskCreated: (taskId: string) => void;
  disabled?: boolean;
}

export function GeneratorForm({ onTaskCreated, disabled }: GeneratorFormProps) {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [values, setValues] = useState<
    Record<string, string | number | boolean | string[]>
  >(() => buildDefaultValues(getModelById(DEFAULT_MODEL_ID)!.parameters));
  const [loading, setLoading] = useState(false);

  function handleModelChange(id: string) {
    setModelId(id);
    const model = getModelById(id);
    if (model) {
      setValues(buildDefaultValues(model.parameters));
    }
  }

  function handleValueChange(
    key: string,
    value: string | number | boolean | string[],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const model = getModelById(modelId);
    if (!model) return;

    // Validate required
    for (const param of model.parameters) {
      const v = values[param.key];
      if (param.required) {
        if (param.type === 'image-upload') {
          if (!Array.isArray(v) || v.length === 0) {
            toast.error(`"${param.label}" requires at least one image.`);
            return;
          }
        } else if (!v && v !== 0) {
          toast.error(`"${param.label}" is required.`);
          return;
        }
      }
    }

    // Auto-randomize seed if model has a seed parameter
    const submitParams = { ...values };
    const seedParam = model.parameters.find((p) => p.key === 'seed');
    if (seedParam) {
      const randomSeed = Math.floor(Math.random() * 2147483647) + 1;
      submitParams.seed = randomSeed;
      setValues((prev) => ({ ...prev, seed: randomSeed }));
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, params: submitParams }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to start generation.');
        return;
      }

      onTaskCreated(data.taskId as string);
      toast.success('Generation started!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const model = getModelById(modelId);
  const isDisabled = disabled || loading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-19rem)] py-2 pr-1 scrollbar-thin">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Model
          </p>
          <ModelSelector
            value={modelId}
            onChange={handleModelChange}
            disabled={isDisabled}
          />
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          {model?.parameters.map((param) => (
            <ParameterField
              key={param.key}
              param={param}
              value={
                values[param.key] ??
                (param.type === 'image-upload' ? [] : (param.default ?? ''))
              }
              onChange={handleValueChange}
              disabled={isDisabled}
            />
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-primary-foreground font-medium hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/10"
        disabled={isDisabled}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-primary-foreground" />
        ) : (
          <Wand2 className="size-4" />
        )}
        {loading ? 'Starting...' : 'Generate'}
      </Button>
    </form>
  );
}
