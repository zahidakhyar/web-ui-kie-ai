"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GeneratedImage, TaskState, TaskWithImages } from "@/types";

interface GenerationProgressProps {
  taskId: string;
  onComplete?: (images: GeneratedImage[]) => void;
  onError?: (msg: string) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_POLL_INTERVAL: Record<TaskState, number> = {
  pending: 2000,
  waiting: 3000,
  success: 0,
  fail: 0,
};

function statusIcon(state: TaskState) {
  switch (state) {
    case "success":
      return <CheckCircle2 className="size-4 text-green-500" />;
    case "fail":
      return <XCircle className="size-4 text-destructive" />;
    case "waiting":
      return <Loader2 className="size-4 animate-spin text-primary" />;
    default:
      return <Clock className="size-4 text-muted-foreground" />;
  }
}

function statusLabel(state: TaskState) {
  switch (state) {
    case "success":
      return "Complete";
    case "fail":
      return "Failed";
    case "waiting":
      return "Generating...";
    default:
      return "Queued";
  }
}

function progressValue(state: TaskState) {
  switch (state) {
    case "success":
      return 100;
    case "fail":
      return 100;
    case "waiting":
      return 60;
    default:
      return 20;
  }
}

export function GenerationProgress({
  taskId,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const completedRef = useRef(false);

  const { data } = useSWR<{ task: TaskWithImages; images: GeneratedImage[] }>(
    `/api/task/${taskId}`,
    fetcher,
    {
      refreshInterval: (data) => {
        if (!data?.task) return 2000;
        return STATUS_POLL_INTERVAL[data.task.status as TaskState] ?? 0;
      },
      revalidateOnFocus: false,
    },
  );

  const task = data?.task;
  const taskImages = data?.images ?? [];

  useEffect(() => {
    if (completedRef.current || !task) return;

    if (task.status === "success") {
      completedRef.current = true;
      onComplete?.(taskImages);
    } else if (task.status === "fail") {
      completedRef.current = true;
      onError?.(task.errorMsg ?? "Generation failed.");
    }
  }, [task, taskImages, onComplete, onError]);

  const state: TaskState = (task?.status as TaskState) ?? "pending";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {statusIcon(state)}
            <span className="text-sm font-medium">{statusLabel(state)}</span>
          </div>
          <Badge
            variant={state === "fail" ? "destructive" : "secondary"}
            className="text-xs font-mono"
          >
            {taskId.slice(0, 8)}…
          </Badge>
        </div>

        <Progress
          value={progressValue(state)}
          className={
            state === "fail" ? "bg-destructive/20 [&>div]:bg-destructive" : ""
          }
        />

        {state === "fail" && task?.errorMsg && (
          <p className="text-xs text-destructive">{task.errorMsg}</p>
        )}

        {state === "waiting" && (
          <p className="text-xs text-muted-foreground">
            This may take 15–60 seconds. The page will update automatically.
          </p>
        )}

        {state === "success" && taskImages.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {taskImages.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-md overflow-hidden bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.r2Url}
                  alt="Generated image"
                  className="object-cover w-full h-full"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
