"use client";

import { ModelParameter } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "./ImageUploadField";
import { cn } from "@/lib/utils";

interface ParameterFieldProps {
  param: ModelParameter;
  value: string | number | boolean | string[];
  onChange: (key: string, value: string | number | boolean | string[]) => void;
  disabled?: boolean;
}

const ASPECT_RATIO_VISUALS: Record<string, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4]",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "2:3": "aspect-[2/3]",
  "3:2": "aspect-[3/2]",
  "21:9": "aspect-[21/9]",
};

export function ParameterField({
  param,
  value,
  onChange,
  disabled,
}: ParameterFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={param.key} className="text-sm font-medium">
        {param.label}
        {param.required && (
          <span className="text-destructive ml-1" aria-hidden>
            *
          </span>
        )}
      </Label>

      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}

      {param.type === "textarea" && (
        <Textarea
          id={param.key}
          value={value as string}
          onChange={(e) => onChange(param.key, e.target.value)}
          placeholder={`Enter ${param.label.toLowerCase()}...`}
          rows={4}
          disabled={disabled}
          maxLength={param.key === "prompt" ? 3000 : undefined}
          className="resize-none"
        />
      )}

      {param.type === "text" && (
        <Input
          id={param.key}
          type="text"
          value={value as string}
          onChange={(e) => onChange(param.key, e.target.value)}
          placeholder={`Enter ${param.label.toLowerCase()}...`}
          disabled={disabled}
        />
      )}

      {param.type === "number" && (
        <Input
          id={param.key}
          type="number"
          value={value as number}
          onChange={(e) => onChange(param.key, parseFloat(e.target.value))}
          min={param.min}
          max={param.max}
          step={param.step}
          disabled={disabled}
        />
      )}

      {param.type === "select" && param.options && (
        <Select
          value={value as string}
          onValueChange={(v) => v !== null && onChange(param.key, v)}
          disabled={disabled}
        >
          <SelectTrigger id={param.key}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {param.type === "aspect-ratio" && param.options && (
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
                  "flex flex-col items-center gap-1.5 p-2 rounded-md border text-xs transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "border-2 rounded-sm",
                    isSelected
                      ? "border-primary"
                      : "border-muted-foreground/50",
                    ASPECT_RATIO_VISUALS[opt.value] ?? "aspect-square",
                    "w-6",
                  )}
                />
                <span className="leading-none text-center">{opt.value}</span>
              </button>
            );
          })}
        </div>
      )}

      {param.type === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch
            id={param.key}
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(param.key, checked)}
            disabled={disabled}
          />
          <Label
            htmlFor={param.key}
            className="text-sm text-muted-foreground cursor-pointer"
          >
            {value ? "Enabled" : "Disabled"}
          </Label>
        </div>
      )}

      {param.type === "image-upload" && (
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
