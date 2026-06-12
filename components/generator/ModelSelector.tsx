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
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model..." />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
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
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selected.description}
            </p>
            {selected.tags && selected.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {selected.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-1.5 py-0"
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
