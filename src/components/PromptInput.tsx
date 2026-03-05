"use client";

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
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <span className={`text-xs ${value.length > maxLength * 0.9 ? "text-amber-400" : "text-gray-500"}`}>
          {value.length} / {maxLength}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
      />
    </div>
  );
}
