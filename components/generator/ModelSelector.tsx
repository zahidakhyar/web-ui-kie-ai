'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MODELS } from '@/lib/models';
import { ChevronsUpDown } from 'lucide-react';

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
  const [open, setOpen] = React.useState(false);
  const selected = MODELS.find((m) => m.id === value);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between rounded-xl border-border/60 text-left font-normal! hover:bg-transparent"
              disabled={disabled}
            >
              {selected ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {selected.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {selected.provider}
                  </span>
                </span>
              ) : (
                'Select a model...'
              )}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[var(--popover-anchor-width)] p-0 rounded-xl border-border/60">
          <Command>
            <CommandInput placeholder="Search model..." />
            <CommandList>
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandGroup>
                {MODELS.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.name}
                    onSelect={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                    data-checked={model.id === value}
                    className="rounded-lg! py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {model.provider}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
