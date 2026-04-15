"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModelSelector } from "./ModelSelector";
import { ParameterField } from "./ParameterField";
import { getModelById, DEFAULT_MODEL_ID } from "@/lib/models";
import { ModelParameter } from "@/types";

function buildDefaultValues(
  params: ModelParameter[],
): Record<string, string | number | boolean | string[]> {
  return Object.fromEntries(
    params.map((p) => [
      p.key,
      p.type === "image-upload"
        ? []
        : (p.default ?? (p.type === "boolean" ? false : "")),
    ]),
  );
}

interface GeneratorFormProps {
  onTaskCreated: (taskId: string) => void;
  disabled?: boolean;
}

export function GeneratorForm({ onTaskCreated, disabled }: GeneratorFormProps) {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [values, setValues] = useState<
    Record<string, string | number | boolean | string[]>
  >(() => buildDefaultValues(getModelById(DEFAULT_MODEL_ID)!.parameters));
  const [loading, setLoading] = useState(false);

  function handleModelChange(id: string) {
    setModelId(id);
    const model = getModelById(id);
    if (model) {
      setValues(buildDefaultValues(model.parameters));
    }
  }

  function handleValueChange(
    key: string,
    value: string | number | boolean | string[],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const model = getModelById(modelId);
    if (!model) return;

    // Validate required
    for (const param of model.parameters) {
      const v = values[param.key];
      if (param.required) {
        if (param.type === "image-upload") {
          if (!Array.isArray(v) || v.length === 0) {
            toast.error(`"${param.label}" requires at least one image.`);
            return;
          }
        } else if (!v && v !== 0) {
          toast.error(`"${param.label}" is required.`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, params: values }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start generation.");
        return;
      }

      onTaskCreated(data.taskId as string);
      toast.success("Generation started!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const model = getModelById(modelId);
  const isDisabled = disabled || loading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-18rem)] py-2 pr-1">
        <div className="space-y-2">
          <p className="text-sm font-medium">Model</p>
          <ModelSelector
            value={modelId}
            onChange={handleModelChange}
            disabled={isDisabled}
          />
        </div>

        <Separator />

        <div className="space-y-5">
          {model?.parameters.map((param) => (
            <ParameterField
              key={param.key}
              param={param}
              value={
                values[param.key] ??
                (param.type === "image-upload" ? [] : (param.default ?? ""))
              }
              onChange={handleValueChange}
              disabled={isDisabled}
            />
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={isDisabled}
        size="lg"
      >
        <Wand2 className="size-4" />
        {loading ? "Starting..." : "Generate"}
      </Button>
    </form>
  );
}
