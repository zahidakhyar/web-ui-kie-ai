'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  FolderOpen,
  ImagePlus,
  Images,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

interface UploadedImage {
  /** Local object URL for preview */
  preview: string;
  /** R2 public URL after upload */
  url: string | null;
  /** Upload state */
  status: 'uploading' | 'done' | 'error';
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
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
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
  if (isAdded) return 'opacity-40 cursor-not-allowed border-border/30';
  if (isSelected) return 'border-primary ring-4 ring-primary/10 scale-[0.98]';
  return 'border-border/40 hover:border-primary/50 hover:ring-4 hover:ring-primary/10 transition-all duration-300';
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-muted/10">
        <Upload className="size-8 mb-3 opacity-40 text-muted-foreground/60" />
        <p className="text-sm font-medium">No uploaded images yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Upload files on the generator dashboard</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1 pb-6">
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
                'group relative w-full aspect-square rounded-xl overflow-hidden border bg-muted transition-all duration-300 active:scale-[0.97] cursor-pointer',
                getLibraryItemBorderClass(isAdded, isSelected),
              )}
            >
              <Image
                src={record.r2Url}
                alt={record.fileName}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 backdrop-blur-[1px] transition-all duration-300 flex flex-col justify-end p-3">
                <p className="text-[11px] font-medium leading-normal text-zinc-100 line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 duration-300">
                  {record.fileName}
                </p>
              </div>
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center backdrop-blur-[0.5px]">
                  <div className="size-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                    <Check className="size-3.5 text-primary-foreground stroke-[3]" />
                  </div>
                </div>
              )}
              {isAdded && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[0.5px]">
                  <div className="size-6 rounded-full bg-muted border border-border/60 flex items-center justify-center">
                    <Check className="size-3.5 text-muted-foreground" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-muted/10">
        <Upload className="size-8 mb-3 opacity-40 text-muted-foreground/60" />
        <p className="text-sm font-medium">No generated images yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Images you generate will appear here</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1 pb-6">
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
                'group relative w-full aspect-square rounded-xl overflow-hidden border bg-muted transition-all duration-300 active:scale-[0.97] cursor-pointer',
                getLibraryItemBorderClass(isAdded, isSelected),
              )}
            >
              <Image
                src={img.r2Url}
                alt={img.prompt}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 backdrop-blur-[1px] transition-all duration-300 flex flex-col justify-end p-3">
                <p className="text-[11px] font-medium leading-normal text-zinc-100 line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 duration-300">
                  {img.prompt}
                </p>
              </div>
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center backdrop-blur-[0.5px]">
                  <div className="size-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                    <Check className="size-3.5 text-primary-foreground stroke-[3]" />
                  </div>
                </div>
              )}
              {isAdded && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[0.5px]">
                  <div className="size-6 rounded-full bg-muted border border-border/60 flex items-center justify-center">
                    <Check className="size-3.5 text-muted-foreground" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function ImageUploadField({
  id,
  onChange,
  maxFiles = 5,
  disabled,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Library picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activePickerTab, setActivePickerTab] = useState<'uploads' | 'gallery'>(
    'uploads',
  );
  const [library, setLibrary] = useState<UploadRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryPickerImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const currentCount = items.filter((i) => i.status === 'done').length;
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
        status: 'uploading',
        fileName: f.name,
      }));

      setItems((prev) => [...prev, ...placeholders]);

      const formData = new FormData();
      toUpload.forEach((f) => formData.append('files', f));

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
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
                    status: 'error',
                    errorMsg: data.error ?? 'Upload failed',
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
              updated[idx] = { ...updated[idx], url: urls[i], status: 'done' };
            }
          }
          const doneUrls = updated
            .filter((item) => item.status === 'done' && item.url)
            .map((item) => item.url as string);
          onChange(doneUrls);
          return updated;
        });
      } catch {
        setItems((prev) =>
          prev.map((item) =>
            matchesPlaceholder(placeholders, item)
              ? { ...item, status: 'error', errorMsg: 'Network error' }
              : item,
          ),
        );
      }
    },
    [items, maxFiles, onChange],
  );

  function removeItem(preview: string) {
    setItems((prev) => {
      const updated = prev.filter((i) => i.preview !== preview);
      const doneUrls = updated
        .filter((i) => i.status === 'done' && i.url)
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
      e.target.value = '';
    }
  }

  async function openPicker() {
    setPickerOpen(true);
    setSelected(new Set());
    setActivePickerTab('uploads');
    setLibraryLoading(true);
    try {
      const res = await fetch('/api/uploads?limit=100');
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
      const res = await fetch('/api/gallery?page=1&limit=50');
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
    setActivePickerTab(tab as 'uploads' | 'gallery');
    if (tab === 'gallery') {
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
    const doneCount = items.filter((i) => i.status === 'done').length;
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
        status: 'done',
        fileName:
          uploadRecord?.fileName ??
          galleryRecord?.prompt.slice(0, 40) ??
          'image',
      };
    });

    setItems((prev) => {
      const updated = [...prev, ...newItems];
      const doneUrls = updated
        .filter((i) => i.status === 'done' && i.url)
        .map((i) => i.url as string);
      onChange(doneUrls);
      return updated;
    });

    setPickerOpen(false);
  }

  const doneCount = items.filter((i) => i.status === 'done').length;
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
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 cursor-pointer transition-all duration-200 select-none active:scale-[0.99]',
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-border/60 hover:border-primary/45 hover:bg-primary/5',
          )}
        >
          <div className="size-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
            <ImagePlus className="size-4 text-primary" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-semibold tracking-tight">
              {hasItems ? 'Add more images' : 'Upload reference images'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Drag & drop or click · JPG, PNG, WebP, GIF, AVIF · max 10 MB ·{' '}
              {maxFiles - doneCount} remaining
            </p>
          </div>
          <input
            id={id}
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
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
          className="w-full rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary transition-colors duration-200"
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
              className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border/50 hover:ring-2 hover:ring-primary/40 transition-all duration-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={item.fileName}
                className={cn(
                  'w-full h-full object-cover transition-opacity duration-300',
                  item.status !== 'done' && 'opacity-50',
                )}
              />
              {item.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 text-white animate-spin" />
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/50 p-1">
                  <AlertCircle className="size-4 text-white animate-bounce" />
                  <p className="text-white text-[10px] text-center mt-1 leading-tight line-clamp-2">
                    {item.errorMsg}
                  </p>
                </div>
              )}
              {(item.status === 'done' || item.status === 'error') && (
                <button
                  type="button"
                  onClick={() => removeItem(item.preview)}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/80 hover:scale-110"
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
        <DialogContent className="max-w-5xl sm:max-w-5xl h-[85vh] flex flex-col p-6 gap-6 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Select Image</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Select reference images from your uploads or generated gallery
            </p>
          </DialogHeader>

          <Tabs
            value={activePickerTab}
            onValueChange={handlePickerTabChange}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="uploads" className="gap-1.5 text-xs rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200">
                <Upload className="size-3.5" />
                Previous Uploads
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-1.5 text-xs rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200">
                <Images className="size-3.5" />
                Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="uploads"
              className="flex-1 overflow-hidden min-h-0 mt-1 outline-none"
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
              className="flex-1 overflow-hidden min-h-0 mt-1 outline-none"
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

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} selected`
                : 'Click images to select'}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-border/60 hover:bg-muted/40 transition-colors"
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 font-semibold active:scale-[0.98]"
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
