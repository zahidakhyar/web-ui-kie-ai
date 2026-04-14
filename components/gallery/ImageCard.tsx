"use client";

import { useState } from "react";
import { Download, ZoomIn, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GeneratedImage, TaskWithImages } from "@/types";
import { getModelById } from "@/lib/models";

interface ImageCardProps {
  task: TaskWithImages;
  image: GeneratedImage;
  onDelete?: () => void;
}

export function ImageCard({ task, image, onDelete }: ImageCardProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const model = getModelById(task.model);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.taskId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Image deleted");
      onDelete?.();
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setDeleting(false);
    }
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = image.r2Url;
    a.download = `${task.taskId}_${image.id}.webp`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-lg bg-muted border border-border/50 hover:border-primary/30 transition-all">
        {/* Image */}
        <div className="aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.r2Url}
            alt={task.prompt}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
          {/* Top: model badge */}
          <div className="flex justify-between items-start">
            <Badge
              variant="secondary"
              className="text-xs bg-black/50 text-white border-0"
            >
              {model?.name ?? task.model}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors">
                <MoreVertical className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpen(true)}>
                  <ZoomIn className="size-4 mr-2" /> View full size
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="size-4 mr-2" /> Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="size-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom: prompt & actions */}
          <div className="space-y-2">
            <p className="text-white text-xs line-clamp-2 leading-relaxed">
              {task.prompt}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => setOpen(true)}
              >
                <ZoomIn className="size-3 mr-1" /> View
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={handleDownload}
              >
                <Download className="size-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-size dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">{task.prompt}</DialogTitle>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.r2Url}
              alt={task.prompt}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white text-sm line-clamp-3">{task.prompt}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-0 text-xs"
                >
                  {model?.name ?? task.model}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0 ml-auto"
                  onClick={handleDownload}
                >
                  <Download className="size-3 mr-1" /> Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
