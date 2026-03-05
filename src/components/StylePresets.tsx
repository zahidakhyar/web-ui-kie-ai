"use client";

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
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-200">Style Preset</label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs font-medium transition-all ${
              selected === preset.id
                ? "border-violet-500 bg-violet-600/30 text-violet-300"
                : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40 hover:bg-violet-600/10 hover:text-gray-200"
            }`}
          >
            <span className="text-xl">{preset.emoji}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
