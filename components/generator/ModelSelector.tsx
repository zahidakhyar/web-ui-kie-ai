'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODELS } from '@/lib/models';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  disabled,
}: ModelSelectorProps) {
  const selected = MODELS.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onValueChange={(v) => v !== null && onChange(v)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full rounded-xl border-border/60 focus:ring-2 focus:ring-primary/30">
          <SelectValue placeholder="Select a model..." />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/60">
          {MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id} className="rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium">{model.name}</span>
                <span className="text-muted-foreground text-xs">
                  {model.provider}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <Card className="rounded-xl border border-primary/10 bg-primary/5 shadow-sm shadow-primary/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selected.description}
            </p>
            {selected.tags && selected.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {selected.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] font-mono tracking-wider uppercase bg-primary/10 text-primary border border-primary/10 px-1.5 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
