"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const PRESETS = [
  { id: "photorealistic", label: "Photorealistic", emoji: "📷" },
  { id: "watercolor", label: "Watercolor", emoji: "🎨" },
  { id: "cg-style", label: "CG Style", emoji: "🖥️" },
  { id: "anime", label: "Anime", emoji: "✏️" },
  { id: "oil-painting", label: "Oil Painting", emoji: "🖌️" },
  { id: "sketch", label: "Sketch", emoji: "✍️" },
];

interface StylePresetsProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function StylePresets({ selected, onSelect }: StylePresetsProps) {
  return (
    <div className="space-y-2">
      <Label>Style Preset</Label>
      <ToggleGroup
        type="single"
        value={selected}
        onValueChange={(v) => { if (v) onSelect(v); }}
        className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {PRESETS.map((preset) => (
          <ToggleGroupItem
            key={preset.id}
            value={preset.id}
            variant="outline"
            className="flex h-auto flex-col items-center gap-1 py-3 px-2 text-xs font-medium"
          >
            <span className="text-xl">{preset.emoji}</span>
            <span>{preset.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
