'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ModelParameter } from '@/types';
import { ImageUploadField } from './ImageUploadField';

interface ParameterFieldProps {
  param: ModelParameter;
  value: string | number | boolean | string[];
  onChange: (key: string, value: string | number | boolean | string[]) => void;
  disabled?: boolean;
}

const ASPECT_RATIO_VISUALS: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '2:3': 'aspect-[2/3]',
  '3:2': 'aspect-[3/2]',
  '21:9': 'aspect-[21/9]',
};

export function ParameterField({
  param,
  value,
  onChange,
  disabled,
}: ParameterFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={param.key} className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1">
        {param.label}
        {param.required && (
          <span className="text-destructive font-bold text-xs" aria-hidden>
            *
          </span>
        )}
      </Label>

      {param.description && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-1">{param.description}</p>
      )}

      {param.type === 'textarea' && (
        <Textarea
          id={param.key}
          value={value as string}
          onChange={(e) => onChange(param.key, e.target.value)}
          placeholder={`Enter ${param.label.toLowerCase()}...`}
          rows={4}
          disabled={disabled}
          maxLength={param.key === 'prompt' ? 3000 : undefined}
          className="resize-none max-h-40 overflow-y-auto rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
        />
      )}

      {param.type === 'text' && (
        <Input
          id={param.key}
          type="text"
          value={value as string}
          onChange={(e) => onChange(param.key, e.target.value)}
          placeholder={`Enter ${param.label.toLowerCase()}...`}
          disabled={disabled}
          className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
        />
      )}

      {param.type === 'number' && (
        <Input
          id={param.key}
          type="number"
          value={value as number}
          onChange={(e) => onChange(param.key, parseFloat(e.target.value))}
          min={param.min}
          max={param.max}
          step={param.step}
          disabled={disabled}
          className="rounded-xl border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 font-mono"
        />
      )}

      {param.type === 'select' && param.options && (
        <Select
          value={value as string}
          onValueChange={(v) => v !== null && onChange(param.key, v)}
          disabled={disabled}
        >
          <SelectTrigger id={param.key} className="rounded-xl border-border/60 focus:ring-2 focus:ring-primary/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60">
            {param.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {param.type === 'aspect-ratio' && param.options && (
        <div className="grid grid-cols-4 gap-2">
          {param.options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(param.key, opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs transition-all duration-200 active:scale-95',
                  isSelected
                    ? 'border-primary/35 bg-primary/5 text-primary shadow-sm shadow-primary/5 font-semibold'
                    : 'border-border/60 hover:border-primary/40 hover:bg-muted/30 text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'border rounded-[3px] transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/20'
                      : 'border-muted-foreground/30 bg-muted/10',
                    ASPECT_RATIO_VISUALS[opt.value] ?? 'aspect-square',
                    'w-6',
                  )}
                />
                <span className="leading-none text-[10px] text-center font-mono">{opt.value}</span>
              </button>
            );
          })}
        </div>
      )}

      {param.type === 'boolean' && (
        <div className="flex items-center gap-2 px-1 py-0.5">
          <Switch
            id={param.key}
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(param.key, checked)}
            disabled={disabled}
            className="data-[state=checked]:bg-primary"
          />
          <Label
            htmlFor={param.key}
            className="text-xs text-muted-foreground cursor-pointer select-none font-mono"
          >
            {value ? 'ENABLED' : 'DISABLED'}
          </Label>
        </div>
      )}

      {param.type === 'image-upload' && (
        <ImageUploadField
          id={param.key}
          value={Array.isArray(value) ? value : []}
          onChange={(urls) => onChange(param.key, urls)}
          maxFiles={param.maxFiles ?? 5}
          disabled={disabled}
        />
      )}
    </div>
  );
}
