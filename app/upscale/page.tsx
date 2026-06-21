'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/layout/PageHeader';
import { Reveal } from '@/components/motion/Reveal';
import { GalleryPicker } from '@/components/upscale/GalleryPicker';
import { UpscaleProgress } from '@/components/upscale/UpscaleProgress';
import { cn } from '@/lib/utils';
import { GeneratedImage } from '@/types';
import { Loader2, Maximize2, Sparkles, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

interface ActiveTask {
  taskId: string;
  done: boolean;
  images: GeneratedImage[];
}

export default function UpscalePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nsfwChecker, setNsfwChecker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskCreated = useCallback((taskId: string) => {
    setActiveTasks((prev) => [{ taskId, done: false, images: [] }, ...prev]);
    setIsGenerating(false);
    setSelectedImage(null); // Clear selected image after starting
  }, []);

  const handleComplete = useCallback(
    (taskId: string, images: GeneratedImage[]) => {
      setActiveTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId ? { ...t, done: true, images } : t,
        ),
      );
      toast.success('Image upscaled successfully!');
      mutate('/api/credits');
    },
    [],
  );

  const handleError = useCallback((taskId: string, msg: string) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, done: true } : t)),
    );
    toast.error(msg);
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setActiveTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  }, []);

  // Handle local file upload
  async function handleFileUpload(file: File) {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('files', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to upload image.');
      }

      const uploadedUrl = data.urls?.[0];
      if (uploadedUrl) {
        setSelectedImage(uploadedUrl);
        toast.success('Image uploaded successfully.');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload image.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function handleUpscaleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!selectedImage) {
      toast.error('Please select or upload an image first.');
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: 'recraft/crisp-upscale',
          params: {
            image: selectedImage,
            nsfw_checker: nsfwChecker,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to start upscale.');
      }

      handleTaskCreated(data.taskId);
      toast.success('Upscale task started!');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to start upscale.',
      );
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <PageHeader
        icon={Maximize2}
        title="Crisp Upscale"
        subtitle="Enhance resolution and detail in one click."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* Left side: Upload & Options */}
        <div className="lg:sticky lg:top-20 space-y-6">
          <Card className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Control Panel
              </CardTitle>
              <CardDescription className="text-xs">
                Upload or select an image to enhance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Input Container */}
              <div className="space-y-3">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Input Image
                </Label>

                {selectedImage ? (
                  // Preview state
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border/60 bg-muted group shadow-inner">
                    <Image
                      src={selectedImage}
                      alt="Selected preview"
                      fill
                      sizes="350px"
                      className="object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-300">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="rounded-full size-9 shadow-lg hover:scale-110 transition-transform"
                        onClick={() => setSelectedImage(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Empty state: drag-and-drop zone
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed transition-all rounded-2xl aspect-square flex flex-col items-center justify-center text-center p-6 cursor-pointer select-none active:scale-[0.99]',
                      isDragging
                        ? 'border-primary bg-primary/5 scale-[0.99]'
                        : 'border-border/60 hover:border-primary/45 hover:bg-primary/5',
                      isUploading && 'pointer-events-none opacity-60',
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground font-medium">
                          Uploading image...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="size-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <Upload className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Drag & drop or click to upload
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                            PNG, JPG, WebP up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Choose from Gallery button */}
                {!selectedImage && !isUploading && (
                  <div className="pt-1">
                    <GalleryPicker onSelect={(url) => setSelectedImage(url)} />
                  </div>
                )}
              </div>

              {/* Parameters / Options */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Configuration
                </Label>

                <div className="flex items-center justify-between rounded-xl border border-border/40 bg-primary/5 p-3.5">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="nsfw-filter"
                      className="text-xs font-semibold cursor-pointer text-foreground"
                    >
                      NSFW Filter
                    </Label>
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      Filter inappropriate content.
                    </p>
                  </div>
                  <Switch
                    id="nsfw-filter"
                    checked={nsfwChecker}
                    onCheckedChange={setNsfwChecker}
                    disabled={isGenerating}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleUpscaleSubmit}
                disabled={!selectedImage || isGenerating || isUploading}
                className="w-full h-11 gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-primary-foreground font-medium hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/10"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-primary-foreground" />
                    Starting Upscale...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Upscale Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Tasks Queue & Results */}
        <div className="space-y-6">
          {activeTasks.length === 0 ? (
            <Reveal className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/45 backdrop-blur-sm">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl size-12 animate-pulse" />
                <div className="relative size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25">
                  <Sparkles className="size-5 text-primary" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  No active upscale tasks
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select an image, configure filters, and click &quot;Upscale Image&quot; to enhance details.
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="space-y-4">
              <div className="sticky top-[4.5rem] z-30 flex items-center justify-between py-2.5 bg-background/80 backdrop-blur-md border-b border-border/40 rounded-xl px-3 mb-2">
                <p className="text-xs font-mono text-muted-foreground tracking-wider">
                  TASKS ({activeTasks.length})
                </p>
                {activeTasks.some((t) => t.done) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-primary hover:text-primary/85 hover:bg-primary/5 rounded-lg px-2.5 transition-colors"
                    onClick={() =>
                      setActiveTasks((prev) => prev.filter((t) => !t.done))
                    }
                  >
                    Clear completed
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {activeTasks.map((task, index) => (
                  <Reveal key={task.taskId} delay={index * 0.08}>
                    <UpscaleProgress
                      taskId={task.taskId}
                      onComplete={(images) => handleComplete(task.taskId, images)}
                      onError={(msg) => handleError(task.taskId, msg)}
                      onDelete={() => handleDelete(task.taskId)}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
