import { ModelConfig } from "@/types";

export const MODELS: ModelConfig[] = [
  {
    id: "seedream/4.5-edit",
    name: "SeeDream 4.5 Edit",
    description:
      "Advanced image editing model. Edit and transform existing images with AI-powered precision. Outputs 2K (basic) or 4K (high) images.",
    provider: "KIE.ai",
    tags: ["image-editing", "edit", "high-quality"],
    parameters: [
      {
        key: "image_urls",
        label: "Image to Edit",
        type: "image-upload",
        required: true,
        description:
          "Upload the image you want to edit. Supported formats: JPEG, PNG, WebP (max 10MB). You can upload up to 5 images.",
        maxFiles: 5,
      },
      {
        key: "prompt",
        label: "Edit Instructions",
        type: "textarea",
        required: true,
        description:
          "Describe the changes you want to make to the image (max 3000 chars).",
      },
      {
        key: "aspect_ratio",
        label: "Aspect Ratio",
        type: "aspect-ratio",
        required: true,
        description: "Choose the dimensions of your output image.",
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
        label: "Content Safety Filter",
        type: "boolean",
        required: false,
        description: "Enable content safety filter.",
        default: false,
      },
    ],
  },
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
        default: false,
      },
    ],
  },
  {
    id: "wan/2-7-image",
    name: "Wan 2.7 Image",
    description:
      "Versatile image generation and transformation model. Supports text-to-image and image editing with gallery mode, thinking mode, and resolutions up to 2K.",
    provider: "KIE.ai",
    tags: ["text-to-image", "image-editing", "multi-output"],
    parameters: [
      {
        key: "prompt",
        label: "Prompt",
        type: "textarea",
        required: true,
        description:
          "Text prompt for image generation. Supports Chinese and English (max 5000 chars).",
      },
      {
        key: "input_urls",
        label: "Input Images",
        type: "image-upload",
        required: false,
        description:
          "Upload reference images for image-to-image transformation. Supported formats: JPEG, PNG, WebP, JPG (max 10MB each).",
        maxFiles: 5,
      },
      {
        key: "aspect_ratio",
        label: "Aspect Ratio",
        type: "aspect-ratio",
        required: false,
        description: "Aspect ratio of the generated image.",
        options: [
          { label: "1:1 (Square)", value: "1:1" },
          { label: "4:3 (Landscape)", value: "4:3" },
          { label: "3:4 (Portrait)", value: "3:4" },
          { label: "16:9 (Widescreen)", value: "16:9" },
          { label: "9:16 (Stories)", value: "9:16" },
          { label: "1:8", value: "1:8" },
          { label: "8:1", value: "8:1" },
          { label: "21:9 (Ultrawide)", value: "21:9" },
        ],
        default: "1:1",
      },
      {
        key: "resolution",
        label: "Resolution",
        type: "select",
        required: false,
        description:
          "Resolution of the generated image. Higher resolutions take longer to generate.",
        options: [
          { label: "1K", value: "1K" },
          { label: "2K", value: "2K" },
        ],
        default: "2K",
      },
      {
        key: "n",
        label: "Number of Images",
        type: "number",
        required: false,
        description:
          "Number of images to generate (1-4). In gallery mode, this is the maximum (1-12).",
        min: 1,
        max: 12,
        step: 1,
        default: 1,
      },
      {
        key: "enable_sequential",
        label: "Gallery Mode",
        type: "boolean",
        required: false,
        description:
          "Enable gallery mode to generate a sequence of related images.",
        default: false,
      },
      {
        key: "thinking_mode",
        label: "Thinking Mode",
        type: "boolean",
        required: false,
        description:
          "Enhances reasoning for higher-quality outputs. Only available when gallery mode is off and no images are uploaded.",
        default: false,
      },
      {
        key: "seed",
        label: "Seed",
        type: "number",
        required: false,
        description:
          "Set a seed for reproducible results. Using the same seed and prompt produces consistent outputs.",
        min: 0,
        step: 1,
        default: 0,
      },
      {
        key: "watermark",
        label: "Watermark",
        type: "boolean",
        required: false,
        description: "Add a watermark identifier to the generated image.",
        default: false,
      },
      {
        key: "nsfw_checker",
        label: "Content Safety Filter",
        type: "boolean",
        required: false,
        description: "Enable content safety filter.",
        default: false,
      },
    ],
  },
  {
    id: "grok-imagine/image-to-image",
    name: "Grok Imagine",
    description:
      "Advanced image-to-image generation model. Transform and enhance images using AI. Reference uploaded images with @image(n) in your prompt.",
    provider: "KIE.ai",
    tags: ["image-to-image", "image-transformation", "edit"],
    parameters: [
      {
        key: "image_urls",
        label: "Reference Images",
        type: "image-upload",
        required: true,
        description:
          "Upload reference images to transform. Supported formats: JPEG, PNG, WebP (max 10MB). Reference in prompt as @image1, @image2, etc.",
        maxFiles: 5,
      },
      {
        key: "prompt",
        label: "Transformation Prompt",
        type: "textarea",
        required: false,
        description:
          "Describe how you want to transform the image. Reference images in your prompt using @image(n) format (e.g., '@image(1) in a sunset over the ocean'). Max 390000 chars.",
      },
      {
        key: "nsfw_checker",
        label: "Content Safety Filter",
        type: "boolean",
        required: false,
        description: "Enable content safety filter.",
        default: false,
      },
    ],
  },
];

export function getModelById(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export const DEFAULT_MODEL_ID = MODELS[0].id;
