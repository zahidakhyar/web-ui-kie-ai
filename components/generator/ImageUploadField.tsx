"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  X,
  Loader2,
  ImagePlus,
  AlertCircle,
  FolderOpen,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

interface UploadRecord {
  id: number;
  r2Url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
}

interface GalleryPickerImage {
  imageId: number;
  r2Url: string;
  prompt: string;
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

function matchesPlaceholder(
  placeholders: UploadedImage[],
  item: UploadedImage,
): boolean {
  return placeholders.some((p) => p.preview === item.preview);
}

function getLibraryItemBorderClass(
  isAdded: boolean,
  isSelected: boolean,
): string {
  if (isAdded) return "opacity-40 cursor-not-allowed border-border";
  if (isSelected) return "border-primary ring-2 ring-primary/30";
  return "border-transparent hover:border-primary/50";
}

function LibraryContent({
  loading,
  library,
  addedUrls,
  selected,
  onToggle,
}: {
  loading: boolean;
  library: UploadRecord[];
  addedUrls: Set<string>;
  selected: Set<string>;
  onToggle: (url: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Upload className="size-8 mb-3 opacity-40" />
        <p className="text-sm">No images uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-1">
      {library.map((record) => {
        const isAdded = addedUrls.has(record.r2Url);
        const isSelected = selected.has(record.r2Url);
        return (
          <button
            key={record.id}
            type="button"
            disabled={isAdded}
            onClick={() => !isAdded && onToggle(record.r2Url)}
            className={cn(
              "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
              getLibraryItemBorderClass(isAdded, isSelected),
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.r2Url}
              alt={record.fileName}
              className="w-full h-full object-cover"
            />
            {isSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="size-3.5 text-primary-foreground" />
                </div>
              </div>
            )}
            {isAdded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                  <Check className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function GalleryPickerContent({
  loading,
  images,
  addedUrls,
  selected,
  onToggle,
}: {
  loading: boolean;
  images: GalleryPickerImage[];
  addedUrls: Set<string>;
  selected: Set<string>;
  onToggle: (url: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Upload className="size-8 mb-3 opacity-40" />
        <p className="text-sm">No generated images yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-1">
      {images.map((img) => {
        const isAdded = addedUrls.has(img.r2Url);
        const isSelected = selected.has(img.r2Url);
        return (
          <button
            key={img.imageId}
            type="button"
            disabled={isAdded}
            onClick={() => !isAdded && onToggle(img.r2Url)}
            className={cn(
              "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
              getLibraryItemBorderClass(isAdded, isSelected),
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.r2Url}
              alt={img.prompt}
              className="w-full h-full object-cover"
            />
            {isSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="size-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="size-3.5 text-primary-foreground" />
                </div>
              </div>
            )}
            {isAdded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                  <Check className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

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

  // Library picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activePickerTab, setActivePickerTab] = useState<"uploads" | "gallery">(
    "uploads",
  );
  const [library, setLibrary] = useState<UploadRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryPickerImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

      const placeholders: UploadedImage[] = toUpload.map((f) => ({
        preview: URL.createObjectURL(f),
        url: null,
        status: "uploading",
        fileName: f.name,
      }));

      setItems((prev) => [...prev, ...placeholders]);

      const formData = new FormData();
      toUpload.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setItems((prev) =>
            prev.map((item) =>
              matchesPlaceholder(placeholders, item)
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
          for (let i = 0; i < placeholders.length; i++) {
            const idx = updated.findIndex(
              (u) => u.preview === placeholders[i].preview,
            );
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], url: urls[i], status: "done" };
            }
          }
          const doneUrls = updated
            .filter((item) => item.status === "done" && item.url)
            .map((item) => item.url as string);
          onChange(doneUrls);
          return updated;
        });
      } catch {
        setItems((prev) =>
          prev.map((item) =>
            matchesPlaceholder(placeholders, item)
              ? { ...item, status: "error", errorMsg: "Network error" }
              : item,
          ),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, maxFiles, onChange],
  );

  function removeItem(preview: string) {
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
      e.target.value = "";
    }
  }

  async function openPicker() {
    setPickerOpen(true);
    setSelected(new Set());
    setActivePickerTab("uploads");
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/uploads?limit=100");
      const data = (await res.json()) as { uploads: UploadRecord[] };
      setLibrary(data.uploads ?? []);
    } catch {
      setLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  }

  async function loadGallery() {
    if (galleryImages.length > 0) return; // already loaded
    setGalleryLoading(true);
    try {
      const res = await fetch("/api/gallery?page=1&limit=50");
      const data = (await res.json()) as {
        items?: Array<{
          taskId: string;
          prompt: string;
          images: Array<{ id: number; r2Url: string }>;
        }>;
      };
      const flat: GalleryPickerImage[] = (data.items ?? []).flatMap((task) =>
        task.images.map((img) => ({
          imageId: img.id,
          r2Url: img.r2Url,
          prompt: task.prompt,
        })),
      );
      setGalleryImages(flat);
    } catch {
      setGalleryImages([]);
    } finally {
      setGalleryLoading(false);
    }
  }

  function handlePickerTabChange(tab: string) {
    setActivePickerTab(tab as "uploads" | "gallery");
    if (tab === "gallery") {
      loadGallery();
    }
  }

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }

  function confirmPicker() {
    const doneCount = items.filter((i) => i.status === "done").length;
    const remaining = maxFiles - doneCount;
    const toAdd = Array.from(selected).slice(0, remaining);

    if (!toAdd.length) {
      setPickerOpen(false);
      return;
    }

    const newItems: UploadedImage[] = toAdd.map((url) => {
      const uploadRecord = library.find((r) => r.r2Url === url);
      const galleryRecord = galleryImages.find((g) => g.r2Url === url);
      return {
        preview: url,
        url,
        status: "done",
        fileName:
          uploadRecord?.fileName ??
          galleryRecord?.prompt.slice(0, 40) ??
          "image",
      };
    });

    setItems((prev) => {
      const updated = [...prev, ...newItems];
      const doneUrls = updated
        .filter((i) => i.status === "done" && i.url)
        .map((i) => i.url as string);
      onChange(doneUrls);
      return updated;
    });

    setPickerOpen(false);
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const canAddMore = doneCount < maxFiles && !disabled;
  const hasItems = items.length > 0;
  const addedUrls = new Set(
    items.map((i) => i.url).filter(Boolean) as string[],
  );

  return (
    <div className="space-y-3">
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

      {canAddMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={openPicker}
          disabled={disabled}
        >
          <FolderOpen className="size-4 mr-2" />
          Select from previous uploads
        </Button>
      )}

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
              {item.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 text-white animate-spin" />
                </div>
              )}
              {item.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/50 p-1">
                  <AlertCircle className="size-4 text-white" />
                  <p className="text-white text-[10px] text-center mt-1 leading-tight line-clamp-2">
                    {item.errorMsg}
                  </p>
                </div>
              )}
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activePickerTab}
            onValueChange={handlePickerTabChange}
            className="flex flex-col flex-1 min-h-0"
          >
            <TabsList className="w-full">
              <TabsTrigger value="uploads" className="flex-1">
                Previous Uploads
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex-1">
                Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="uploads"
              className="flex-1 overflow-y-auto min-h-0 mt-2"
            >
              <LibraryContent
                loading={libraryLoading}
                library={library}
                addedUrls={addedUrls}
                selected={selected}
                onToggle={toggleSelect}
              />
            </TabsContent>

            <TabsContent
              value="gallery"
              className="flex-1 overflow-y-auto min-h-0 mt-2"
            >
              <GalleryPickerContent
                loading={galleryLoading}
                images={galleryImages}
                addedUrls={addedUrls}
                selected={selected}
                onToggle={toggleSelect}
              />
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} selected`
                : "Click images to select"}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={selected.size === 0}
                onClick={confirmPicker}
              >
                Add ({selected.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
