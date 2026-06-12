"use client";

import { useState, useCallback, useRef } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { Sparkles, Maximize2, Upload, Loader2, X } from "lucide-react";
import { GalleryPicker } from "@/components/upscale/GalleryPicker";
import { UpscaleProgress } from "@/components/upscale/UpscaleProgress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GeneratedImage } from "@/types";

interface ActiveTask {
  taskId: string;
  done: boolean;
  images: GeneratedImage[];
}

export default function UpscalePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nsfwChecker, setNsfwChecker] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskCreated = useCallback((taskId: string) => {
    setActiveTasks((prev) => [{ taskId, done: false, images: [] }, ...prev]);
    setIsGenerating(false);
    setSelectedImage(null); // Clear selected image after starting
  }, []);

  const handleComplete = useCallback((taskId: string, images: GeneratedImage[]) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, done: true, images } : t))
    );
    toast.success("Image upscaled successfully!");
    mutate("/api/credits");
  }, []);

  const handleError = useCallback((taskId: string, msg: string) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, done: true } : t))
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
    formData.append("files", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to upload image.");
      }

      const uploadedUrl = data.urls?.[0];
      if (uploadedUrl) {
        setSelectedImage(uploadedUrl);
        toast.success("Image uploaded successfully.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
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
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function handleUpscaleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!selectedImage) {
      toast.error("Please select or upload an image first.");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: "recraft/crisp-upscale",
          params: {
            image: selectedImage,
            nsfw_checker: nsfwChecker,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start upscale.");
      }

      handleTaskCreated(data.taskId);
      toast.success("Upscale task started!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start upscale.");
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
          <Maximize2 className="size-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Crisp Upscale</h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            Enhance image resolution and details instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* Left side: Upload & Options */}
        <div className="lg:sticky lg:top-[4.5rem] space-y-6">
          <Card className="border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Control Panel</CardTitle>
              <CardDescription className="text-xs">
                Upload or select an image to enhance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Input Container */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Input Image
                </Label>

                {selectedImage ? (
                  // Preview state
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-border/60 bg-muted group shadow-inner">
                    <Image
                      src={selectedImage}
                      alt="Selected preview"
                      fill
                      sizes="350px"
                      className="object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="rounded-full size-9 shadow-lg"
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
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed border-border/60 hover:border-primary/50 transition-all rounded-xl aspect-square flex flex-col items-center justify-center text-center p-6 cursor-pointer bg-muted/10 hover:bg-muted/30 group",
                      isUploading && "pointer-events-none opacity-60"
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
                        <p className="text-xs text-muted-foreground font-medium">Uploading image...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Upload className="size-5 text-muted-foreground/75" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            Drag & drop or click to upload
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
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
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Configuration
                </Label>

                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="nsfw-filter" className="text-xs font-medium cursor-pointer">
                      NSFW Filter
                    </Label>
                    <p className="text-[10px] text-muted-foreground/80">
                      Filter inappropriate content.
                    </p>
                  </div>
                  <Switch
                    id="nsfw-filter"
                    checked={nsfwChecker}
                    onCheckedChange={setNsfwChecker}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleUpscaleSubmit}
                disabled={!selectedImage || isGenerating || isUploading}
                className="w-full gap-2 h-10 text-xs font-medium"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Starting Upscale...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
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
            <div className="flex flex-col items-center justify-center py-28 text-center space-y-4 rounded-xl border border-dashed border-border/60 bg-muted/5">
              <div className="size-11 rounded-full bg-muted/60 flex items-center justify-center">
                <Sparkles className="size-5 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">No active upscale tasks</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed">
                  Select an image, configure filters, and click "Upscale Image" to enhance details.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  Tasks ({activeTasks.length})
                </p>
                {activeTasks.some((t) => t.done) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveTasks((prev) => prev.filter((t) => !t.done))}
                  >
                    Clear completed
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {activeTasks.map((task) => (
                  <UpscaleProgress
                    key={task.taskId}
                    taskId={task.taskId}
                    onComplete={(images) => handleComplete(task.taskId, images)}
                    onError={(msg) => handleError(task.taskId, msg)}
                    onDelete={() => handleDelete(task.taskId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
