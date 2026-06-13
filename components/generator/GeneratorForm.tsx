'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getModelById } from '@/lib/models';
import { Loader2, Wand2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ModelSelector } from './ModelSelector';
import { ParameterField } from './ParameterField';
import { useGeneratorForm } from '@/hooks/useGeneratorForm';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GeneratorFormProps {
  onTaskCreated: (taskId: string) => void;
  disabled?: boolean;
}

export function GeneratorForm({ onTaskCreated, disabled }: GeneratorFormProps) {
  const {
    modelId,
    values,
    setModel,
    setValue,
    reset,
    carriedKeys,
    setCarriedKeys,
    hydrated,
  } = useGeneratorForm();

  const [loading, setLoading] = useState(false);

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
      setValue('seed', randomSeed);
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
  const isDisabled = disabled || loading || !hydrated;

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const primaryParams =
    model?.parameters.filter((p) => {
      if (p.advanced) return false;
      const isPrimary =
        p.required ||
        p.key === 'prompt' ||
        p.type === 'image-upload' ||
        p.type === 'aspect-ratio';
      return isPrimary;
    }) || [];

  const advancedParams =
    model?.parameters.filter((p) => {
      if (p.advanced) return true;
      const isPrimary =
        p.required ||
        p.key === 'prompt' ||
        p.type === 'image-upload' ||
        p.type === 'aspect-ratio';
      return !isPrimary;
    }) || [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-19rem)] py-2 pr-1 scrollbar-thin">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Model
          </p>
          <ModelSelector
            value={modelId}
            onChange={setModel}
            disabled={isDisabled}
          />
        </div>

        {carriedKeys.length > 0 && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-primary/15 bg-primary/5 text-xs text-primary transition-all animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <span>{carriedKeys.join(', ')} dipertahankan.</span>
            </div>
            <button
              type="button"
              onClick={() => setCarriedKeys([])}
              className="text-primary hover:opacity-80 transition-opacity font-bold px-1.5"
            >
              ×
            </button>
          </div>
        )}

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <div className="space-y-4">
            {primaryParams.map((param) => (
              <ParameterField
                key={param.key}
                param={param}
                value={
                  values[param.key] ??
                  (param.type === 'image-upload' ? [] : (param.default ?? ''))
                }
                onChange={setValue}
                disabled={isDisabled}
              />
            ))}
          </div>

          {advancedParams.length > 0 && (
            <Collapsible className="space-y-2">
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  >
                    <span>Advanced Settings</span>
                    <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[open]/button:rotate-180" />
                  </Button>
                }
              />
              <CollapsibleContent className="space-y-4 pt-1 transition-all">
                {advancedParams.map((param) => (
                  <ParameterField
                    key={param.key}
                    param={param}
                    value={
                      values[param.key] ??
                      (param.type === 'image-upload'
                        ? []
                        : (param.default ?? ''))
                    }
                    onChange={setValue}
                    disabled={isDisabled}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      <div className="flex gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          className="h-11 rounded-xl px-4 text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all"
          disabled={isDisabled}
        >
          Reset
        </Button>
        <Button
          type="submit"
          className="flex-1 h-11 gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-primary-foreground font-medium hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/10"
          disabled={isDisabled}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-primary-foreground" />
          ) : (
            <Wand2 className="size-4" />
          )}
          {loading ? 'Starting...' : 'Generate'}
        </Button>
      </div>
    </form>
  );
}
