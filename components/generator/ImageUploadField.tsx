"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, ImagePlus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadedImage {
  /** Local object URL for preview */
  preview: string;
  /** R2 public URL after upload */
  url: string | null;
  /** Upload state */
  status: "uploading" | "done" | "error";
  errorMsg?: string;
  fileName: string;
}

interface ImageUploadFieldProps {
  id: string;
  value: string[]; // list of uploaded R2 URLs
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function ImageUploadField({
  id,
  value,
  onChange,
  maxFiles = 5,
  disabled,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const currentCount = items.filter((i) => i.status === "done").length;
      const remaining = maxFiles - currentCount;

      const toUpload = fileArray.slice(0, remaining).filter((f) => {
        if (!ALLOWED_TYPES.includes(f.type)) return false;
        if (f.size > MAX_FILE_SIZE) return false;
        return true;
      });

      if (!toUpload.length) return;

      // Add placeholders immediately for instant preview
      const placeholders: UploadedImage[] = toUpload.map((f) => ({
        preview: URL.createObjectURL(f),
        url: null,
        status: "uploading",
        fileName: f.name,
      }));

      setItems((prev) => [...prev, ...placeholders]);

      // Upload all at once
      const formData = new FormData();
      toUpload.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setItems((prev) =>
            prev.map((item) =>
              placeholders.find((p) => p.preview === item.preview)
                ? {
                    ...item,
                    status: "error",
                    errorMsg: data.error ?? "Upload failed",
                  }
                : item,
            ),
          );
          return;
        }

        const { urls } = (await res.json()) as { urls: string[] };

        setItems((prev) => {
          const updated = [...prev];
          let urlIdx = 0;
          for (let i = 0; i < updated.length; i++) {
            if (placeholders.find((p) => p.preview === updated[i].preview)) {
              updated[i] = {
                ...updated[i],
                url: urls[urlIdx++] ?? null,
                status: "done",
              };
            }
          }
          return updated;
        });

        // Notify parent with all done URLs
        setItems((current) => {
          const doneUrls = current
            .filter((i) => i.status === "done" && i.url)
            .map((i) => i.url as string);
          onChange(doneUrls);
          return current;
        });
      } catch {
        setItems((prev) =>
          prev.map((item) =>
            placeholders.find((p) => p.preview === item.preview)
              ? { ...item, status: "error", errorMsg: "Network error" }
              : item,
          ),
        );
      }
    },
    [items, maxFiles, onChange],
  );

  function removeItem(preview: string) {
    URL.revokeObjectURL(preview);
    setItems((prev) => {
      const updated = prev.filter((i) => i.preview !== preview);
      const doneUrls = updated
        .filter((i) => i.status === "done" && i.url)
        .map((i) => i.url as string);
      onChange(doneUrls);
      return updated;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    uploadFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      uploadFiles(e.target.files);
      // Reset so same file can be re-added
      e.target.value = "";
    }
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const canAddMore = doneCount < maxFiles && !disabled;
  const hasItems = items.length > 0;

  return (
    <div className="space-y-3">
      {/* Drop zone / add button */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload reference images"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 cursor-pointer transition-colors select-none",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <div className="size-9 rounded-full bg-muted flex items-center justify-center">
            <ImagePlus className="size-4 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {hasItems ? "Add more images" : "Upload reference images"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop or click · JPG, PNG, WebP, GIF, AVIF · max 10 MB ·{" "}
              {maxFiles - doneCount} remaining
            </p>
          </div>
          <input
            id={id}
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            className="sr-only"
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Thumbnails grid */}
      {hasItems && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item) => (
            <div
              key={item.preview}
              className="relative group aspect-square rounded-md overflow-hidden bg-muted border border-border/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={item.fileName}
                className={cn(
                  "w-full h-full object-cover transition-opacity",
                  item.status !== "done" && "opacity-50",
                )}
              />

              {/* Loading overlay */}
              {item.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 text-white animate-spin" />
                </div>
              )}

              {/* Error overlay */}
              {item.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/50 p-1">
                  <AlertCircle className="size-4 text-white" />
                  <p className="text-white text-[10px] text-center mt-1 leading-tight line-clamp-2">
                    {item.errorMsg}
                  </p>
                </div>
              )}

              {/* Remove button */}
              {(item.status === "done" || item.status === "error") && (
                <button
                  type="button"
                  onClick={() => removeItem(item.preview)}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  aria-label="Remove image"
                >
                  <X className="size-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
