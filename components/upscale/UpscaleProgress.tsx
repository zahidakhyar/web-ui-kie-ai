"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Download,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageCompare } from "./ImageCompare";
import { GeneratedImage, GenerationTask, TaskState } from "@/types";
import { cn } from "@/lib/utils";

interface UpscaleProgressProps {
  taskId: string;
  onComplete?: (images: GeneratedImage[]) => void;
  onError?: (msg: string) => void;
  onDelete?: () => void;
}

interface SSEUpdate {
  type: "update";
  task: GenerationTask | null;
  images: GeneratedImage[];
}

interface SSETimeout {
  type: "timeout";
}

type SSEMessage = SSEUpdate | SSETimeout;

export function UpscaleProgress({
  taskId,
  onComplete,
  onError,
  onDelete,
}: UpscaleProgressProps) {
  const completedRef = useRef(false);
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [taskImages, setTaskImages] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/task/${taskId}/stream`);

    es.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as SSEMessage;
      if (msg.type === "update") {
        setTask(msg.task);
        setTaskImages(msg.images);

        if (completedRef.current) return;

        if (msg.task?.status === "success") {
          completedRef.current = true;
          onComplete?.(msg.images);
          es.close();
        } else if (msg.task?.status === "fail") {
          completedRef.current = true;
          onError?.(msg.task.errorMsg ?? "Upscale failed.");
          es.close();
        }
      } else if (msg.type === "timeout") {
        es.close();
        if (!completedRef.current) {
          onError?.("Request timed out. Please try again.");
        }
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [taskId, onComplete, onError]);

  const state: TaskState = (task?.status as TaskState) ?? "pending";
  const isInProgress = state === "pending" || state === "waiting";
  const isDone = state === "success" || state === "fail";

  // Extract the original input image URL from task parameters
  let beforeUrl = "";
  if (task?.params) {
    try {
      const parsed = JSON.parse(task.params) as { image?: string };
      beforeUrl = parsed.image ?? "";
    } catch {
      // ignore
    }
  }

  const afterUrl = taskImages[0]?.r2Url ?? "";

  function handleDownload() {
    if (!afterUrl) return;
    const a = document.createElement("a");
    a.href = afterUrl;
    a.download = `upscaled_${taskId}.webp`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all border bg-card/40 backdrop-blur-sm",
        state === "fail" && "border-destructive/30",
        state === "success" && "border-emerald-500/20",
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            {state === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            ) : state === "fail" ? (
              <XCircle className="size-4 text-destructive shrink-0" />
            ) : state === "waiting" ? (
              <Loader2 className="size-4 animate-spin text-primary shrink-0" />
            ) : (
              <Clock className="size-4 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                {state === "success"
                  ? "Upscale Complete"
                  : state === "fail"
                    ? "Upscale Failed"
                    : state === "waiting"
                      ? "Upscaling..."
                      : "Queued"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px] font-mono border-border/60">
              ID: {taskId.slice(0, 8)}
            </Badge>
            {isDone && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={onDelete}
                title="Dismiss"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {isInProgress && (
            <div className="space-y-3 py-6 flex flex-col items-center justify-center text-center">
              <Loader2 className="size-8 animate-spin text-primary/70" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Enhancing details...</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {state === "waiting"
                    ? "Processing your image with recraft/crisp-upscale. This takes 15-45 seconds."
                    : "Waiting for other generations to complete."}
                </p>
              </div>
            </div>
          )}

          {state === "fail" && task?.errorMsg && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/15 p-3.5 text-xs text-destructive leading-relaxed">
              {task.errorMsg}
            </div>
          )}

          {state === "success" && beforeUrl && afterUrl && (
            <div className="space-y-4">
              <ImageCompare beforeUrl={beforeUrl} afterUrl={afterUrl} />

              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  className="flex-1 gap-2 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  <Download className="size-3.5" />
                  Download Upscaled Image
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
