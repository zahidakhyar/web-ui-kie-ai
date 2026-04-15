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
import { GeneratedImage, GenerationTask, TaskState } from "@/types";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
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

function StatusIcon({ state }: { state: TaskState }) {
  switch (state) {
    case "success":
      return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;
    case "fail":
      return <XCircle className="size-4 text-destructive shrink-0" />;
    case "waiting":
      return <Loader2 className="size-4 animate-spin text-primary shrink-0" />;
    default:
      return <Clock className="size-4 text-muted-foreground shrink-0" />;
  }
}

function statusLabel(state: TaskState) {
  switch (state) {
    case "success":
      return "Complete";
    case "fail":
      return "Failed";
    case "waiting":
      return "Generating…";
    default:
      return "Queued";
  }
}

function IndeterminateBar({ active }: { active: boolean }) {
  return (
    <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
      {active ? (
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-primary animate-[slide_1.4s_ease-in-out_infinite]" />
      ) : null}
    </div>
  );
}

function DeterminateBar({
  value,
  variant,
}: {
  value: number;
  variant?: "success" | "fail";
}) {
  return (
    <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          variant === "fail" ? "bg-destructive" : "bg-emerald-500",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function GenerationProgress({
  taskId,
  onComplete,
  onError,
  onDelete,
}: GenerationProgressProps) {
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
          onError?.(msg.task.errorMsg ?? "Generation failed.");
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

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        state === "fail" && "border-destructive/40",
        state === "success" && "border-emerald-500/30",
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon state={state} />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none">
                {statusLabel(state)}
              </p>
              {task?.prompt && (
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                  {task.prompt}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={state === "fail" ? "destructive" : "secondary"}
              className="text-xs font-mono"
            >
              {taskId.slice(0, 8)}
            </Badge>
            {isDone && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                title="Dismiss"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          {isInProgress ? (
            <IndeterminateBar active={state === "waiting"} />
          ) : (
            <DeterminateBar
              value={100}
              variant={state === "fail" ? "fail" : "success"}
            />
          )}
        </div>

        {/* Body */}
        {state === "fail" && task?.errorMsg && (
          <div className="mx-4 mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-xs text-destructive">{task.errorMsg}</p>
          </div>
        )}

        {state === "waiting" && (
          <div className="mx-4 mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" />
            <span>This may take 15–60 seconds…</span>
          </div>
        )}

        {state === "pending" && (
          <p className="mx-4 mb-4 text-xs text-muted-foreground">
            Waiting in queue…
          </p>
        )}

        {state === "success" && taskImages.length > 0 && (
          <div
            className={cn(
              "grid gap-2 px-4 pb-4",
              taskImages.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {taskImages.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-lg overflow-hidden bg-muted aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.r2Url}
                  alt="Generated"
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end justify-end p-2">
                  <a
                    href={img.r2Url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8 shadow-lg"
                      title="Download"
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
