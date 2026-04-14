import { ModelConfig } from "@/types";

export const MODELS: ModelConfig[] = [
  {
    id: "seedream/4.5-text-to-image",
    name: "SeeDream 4.5",
    description:
      "High-quality text-to-image generation. Outputs 2K (basic) or 4K (high) images.",
    provider: "KIE.ai",
    tags: ["text-to-image", "high-quality"],
    parameters: [
      {
        key: "prompt",
        label: "Prompt",
        type: "textarea",
        required: true,
        description:
          "Describe the image you want to generate (max 3000 chars).",
        default: "",
      },
      {
        key: "aspect_ratio",
        label: "Aspect Ratio",
        type: "aspect-ratio",
        required: true,
        description: "Choose the dimensions of your image.",
        options: [
          { label: "1:1 (Square)", value: "1:1" },
          { label: "4:3 (Landscape)", value: "4:3" },
          { label: "3:4 (Portrait)", value: "3:4" },
          { label: "16:9 (Widescreen)", value: "16:9" },
          { label: "9:16 (Stories)", value: "9:16" },
          { label: "2:3", value: "2:3" },
          { label: "3:2", value: "3:2" },
          { label: "21:9 (Ultrawide)", value: "21:9" },
        ],
        default: "1:1",
      },
      {
        key: "quality",
        label: "Quality",
        type: "select",
        required: true,
        description: "Basic outputs 2K images, High outputs 4K images.",
        options: [
          { label: "Basic (2K)", value: "basic" },
          { label: "High (4K)", value: "high" },
        ],
        default: "basic",
      },
      {
        key: "nsfw_checker",
        label: "NSFW Filter",
        type: "boolean",
        required: false,
        description: "Enable content safety filter.",
        default: true,
      },
    ],
  },
];

export function getModelById(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export const DEFAULT_MODEL_ID = MODELS[0].id;
