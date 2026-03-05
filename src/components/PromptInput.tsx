"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  maxLength?: number;
  rows?: number;
}

export default function PromptInput({
  value,
  onChange,
  placeholder = "Describe what you want to create...",
  label = "Prompt",
  maxLength = 500,
  rows = 4,
}: PromptInputProps) {
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`prompt-${label}`}>{label}</Label>
        <span className={cn("text-xs", value.length > maxLength * 0.9 ? "text-amber-400" : "text-muted-foreground")}>
          {value.length} / {maxLength}
        </span>
      </div>
      <Textarea
        id={`prompt-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        className="bg-input/30 border-border focus-visible:ring-ring"
      />
    </div>
  );
}
