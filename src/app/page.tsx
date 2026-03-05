"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Download, Plus, X, Loader2, Sparkles, AlertCircle } from "lucide-react";
import PromptInput from "@/components/PromptInput";
import StylePresets from "@/components/StylePresets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Quality = "basic" | "high";
type ImageCount = 1 | 2 | 4;

interface GeneratedImage {
  id: string;
  src: string;
}

/** A reference image slot: preview is shown immediately; url is set after upload */
interface RefImage {
  /** Local blob URL for thumbnail preview — revoked on removal */
  preview: string;
  /** Public URL returned by /api/upload — null while uploading */
  url: string | null;
  uploading: boolean;
  error: string | null;
}

const MAX_REFERENCE_IMAGES = 14;

export default function HomePage() {
  // Text-to-image state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("basic");
  const [stylePreset, setStylePreset] = useState("photorealistic");
  const [imageCount, setImageCount] = useState<ImageCount>(1);

  // Image edit state
  const [editPrompt, setEditPrompt] = useState("");
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const [editAspectRatio, setEditAspectRatio] = useState<AspectRatio>("1:1");
  const [editQuality, setEditQuality] = useState<Quality>("basic");
  const [keepPose, setKeepPose] = useState(false);
  const [keepLighting, setKeepLighting] = useState(false);
  const [keepColors, setKeepColors] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [activeTab, setActiveTab] = useState("text-to-image");

  const anyUploading = refImages.some((r) => r.uploading);
  const readyUrls = refImages.filter((r) => r.url).map((r) => r.url!);

  // Revoke all blob preview URLs when the component unmounts to avoid memory leaks
  useEffect(() => {
    return () => {
      refImages.forEach((r) => URL.revokeObjectURL(r.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (activeTab === "text-to-image" && !prompt.trim()) return;
    if (activeTab === "image-edit" && !editPrompt.trim()) return;

    setLoading(true);
    setGeneratedImages([]);
    setStatusMessage("Submitting request...");

    let es: EventSource | null = null;

    try {
      let taskId: string | null = null;

      if (activeTab === "text-to-image") {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            negativePrompt,
            aspectRatio,
            quality,
            style: stylePreset,
            count: imageCount,
          }),
        });
        const data = await res.json();
        if (data.taskId) {
          taskId = data.taskId as string;
        } else if (data.images) {
          setGeneratedImages(
            (data.images as { id: string; url: string }[]).map((img) => ({
              id: img.id,
              src: img.url,
            }))
          );
          return;
        } else {
          setStatusMessage("Failed to submit request. Please try again.");
          return;
        }
      } else {
        const res = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: editPrompt,
            imageUrls: readyUrls,
            keepPose,
            keepLighting,
            keepColors,
            aspectRatio: editAspectRatio,
            quality: editQuality,
          }),
        });
        const data = await res.json();
        if (data.taskId) {
          taskId = data.taskId as string;
        } else if (data.image) {
          setGeneratedImages([{ id: data.image.id, src: data.image.url }]);
          return;
        } else {
          setStatusMessage("Failed to submit edit request. Please try again.");
          return;
        }
      }

      if (!taskId) return;

      setStatusMessage("Checking status...");
      let resolved = false;

      if (typeof window !== "undefined" && "EventSource" in window) {
        es = new EventSource(`/api/sse?taskId=${encodeURIComponent(taskId)}`);
        es.onmessage = (e) => {
          if (resolved) return;
          const result = JSON.parse(e.data as string) as {
            state: string;
            resultUrls?: string[];
            failMsg?: string;
          };
          if (!["success", "fail", "timeout"].includes(result.state)) return;
          resolved = true;
          es?.close();
          if (result.state === "success") {
            setGeneratedImages(
              (result.resultUrls ?? []).map((url, i) => ({
                id: `gen-${Date.now()}-${i}`,
                src: url,
              }))
            );
          } else if (result.state === "fail") {
            setStatusMessage(`Generation failed: ${result.failMsg ?? "unknown error"}`);
          } else {
            setStatusMessage("Request timed out. Please try again.");
          }
          setLoading(false);
        };
        es.onerror = () => es?.close();
      }

      const maxAttempts = 45;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 4000));
        if (resolved) break;

        try {
          const statusRes = await fetch(
            `/api/status?taskId=${encodeURIComponent(taskId)}`
          );
          const statusData = (await statusRes.json()) as {
            state?: string;
            resultUrls?: string[];
            failMsg?: string;
          };

          if (statusData.state === "success" && !resolved) {
            resolved = true;
            es?.close();
            setGeneratedImages(
              (statusData.resultUrls ?? []).map((url, i) => ({
                id: `gen-${Date.now()}-${i}`,
                src: url,
              }))
            );
            return;
          }

          if (statusData.state === "fail" && !resolved) {
            resolved = true;
            es?.close();
            setStatusMessage(
              `Generation failed: ${statusData.failMsg ?? "unknown error"}`
            );
            return;
          }

          if (!resolved) {
            setStatusMessage(
              statusData.state === "queuing"
                ? "Queued, waiting..."
                : statusData.state === "waiting"
                ? "Waiting..."
                : "Generating..."
            );
          }
        } catch {
          // ignore transient poll errors
        }
      }

      if (!resolved) {
        setStatusMessage("Request timed out. Please try again.");
      }
    } finally {
      es?.close();
      setLoading(false);
    }
  };

  /** Upload files to /api/upload immediately; show spinner until done */
  const handleFilesChange = useCallback(
    async (files: File[]) => {
      const remaining = MAX_REFERENCE_IMAGES - refImages.length;
      const toProcess = files.slice(0, remaining);
      if (toProcess.length === 0) return;

      // Capture the start index before any state update to avoid race conditions
      const startIndex = refImages.length;

      // Create placeholder slots with blob preview URLs right away
      const slots: RefImage[] = toProcess.map((file) => ({
        preview: URL.createObjectURL(file),
        url: null,
        uploading: true,
        error: null,
      }));

      setRefImages((prev) => [...prev, ...slots]);

      // Upload each file and update its slot
      await Promise.all(
        toProcess.map(async (file, i) => {
          const slotIndex = startIndex + i;
          try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: form });
            const data = (await res.json()) as { success: boolean; url?: string; error?: string };

            setRefImages((prev) => {
              const next = [...prev];
              if (next[slotIndex]) {
                next[slotIndex] = {
                  ...next[slotIndex],
                  url: data.success && data.url ? data.url : null,
                  uploading: false,
                  error: data.success ? null : (data.error ?? "Upload failed"),
                };
              }
              return next;
            });
          } catch (err) {
            console.error("[upload] file upload failed:", err);
            setRefImages((prev) => {
              const next = [...prev];
              if (next[slotIndex]) {
                next[slotIndex] = {
                  ...next[slotIndex],
                  uploading: false,
                  error: "Upload failed",
                };
              }
              return next;
            });
          }
        })
      );
    },
    [refImages.length]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      handleFilesChange(files);
    },
    [handleFilesChange]
  );

  const removeRefImage = (idx: number) => {
    setRefImages((prev) => {
      const slot = prev[idx];
      if (slot) URL.revokeObjectURL(slot.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  const qualities: { value: Quality; label: string }[] = [
    { value: "basic", label: "Basic (2K)" },
    { value: "high", label: "High (4K)" },
  ];
  const imageCounts: { value: ImageCount; label: string }[] = [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 4, label: "4" },
  ];

  const canGenerate =
    activeTab === "text-to-image"
      ? !!prompt.trim()
      : !!editPrompt.trim() && !anyUploading;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
          AI Image Studio
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Transform your imagination into stunning visuals with the power of AI. Generate, edit, and explore endless creative possibilities.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="bg-muted/40 border border-border">
            <TabsTrigger
              value="text-to-image"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Text to Image
            </TabsTrigger>
            <TabsTrigger
              value="image-edit"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Image Edit
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Panel — Controls */}
          <Card className="border-border bg-card">
            <CardContent className="space-y-5 p-6">
              {/* TEXT-TO-IMAGE TAB */}
              <TabsContent value="text-to-image" className="mt-0 space-y-5">
                <PromptInput
                  value={prompt}
                  onChange={setPrompt}
                  label="Prompt"
                  placeholder="A futuristic city at sunset with neon lights reflecting on wet streets..."
                />

                <PromptInput
                  value={negativePrompt}
                  onChange={setNegativePrompt}
                  label="Negative Prompt (optional)"
                  placeholder="blurry, low quality, distorted..."
                  rows={2}
                  maxLength={300}
                />

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <ToggleGroup
                    type="single"
                    value={aspectRatio}
                    onValueChange={(v) => v && setAspectRatio(v as AspectRatio)}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    {aspectRatios.map((r) => (
                      <ToggleGroupItem key={r} value={r} variant="outline" size="sm">
                        {r}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* Quality */}
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <ToggleGroup
                    type="single"
                    value={quality}
                    onValueChange={(v) => v && setQuality(v as Quality)}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    {qualities.map((q) => (
                      <ToggleGroupItem key={q.value} value={q.value} variant="outline" size="sm">
                        {q.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <StylePresets selected={stylePreset} onSelect={setStylePreset} />

                {/* Number of Images */}
                <div className="space-y-2">
                  <Label>Number of Images</Label>
                  <ToggleGroup
                    type="single"
                    value={String(imageCount)}
                    onValueChange={(v) => v && setImageCount(Number(v) as ImageCount)}
                    className="flex gap-2 justify-start"
                  >
                    {imageCounts.map((n) => (
                      <ToggleGroupItem key={n.value} value={String(n.value)} variant="outline" size="sm">
                        {n.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </TabsContent>

              {/* IMAGE-EDIT TAB */}
              <TabsContent value="image-edit" className="mt-0 space-y-5">
                {/* Multi-image upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Reference Images</Label>
                    <span className="text-xs text-muted-foreground">
                      {readyUrls.length}/{MAX_REFERENCE_IMAGES} ready
                      {anyUploading && (
                        <span className="ml-1 text-amber-400">· uploading…</span>
                      )}
                    </span>
                  </div>

                  {refImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {refImages.map((ref, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square overflow-hidden rounded-lg border border-border"
                        >
                          {/* Use plain <img> for blob/local preview URLs */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ref.preview}
                            alt={`Reference ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />

                          {/* Uploading overlay */}
                          {ref.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Loader2 className="size-5 animate-spin text-white" />
                            </div>
                          )}

                          {/* Error overlay */}
                          {ref.error && !ref.uploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-1 text-center">
                              <AlertCircle className="size-4 text-red-400" />
                              <span className="text-[10px] leading-tight text-red-300">
                                {ref.error}
                              </span>
                            </div>
                          )}

                          {/* Remove button */}
                          {!ref.uploading && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRefImage(idx)}
                              className="absolute right-0.5 top-0.5 size-5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                            >
                              <X className="size-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {refImages.length < MAX_REFERENCE_IMAGES && (
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("file-upload")?.click()}
                          className="aspect-square h-auto border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Plus className="size-5" />
                        </Button>
                      )}
                    </div>
                  )}

                  {refImages.length === 0 && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("file-upload")?.click()}
                      className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all ${
                        dragOver
                          ? "border-primary bg-primary/10"
                          : "border-border bg-input/10 hover:border-primary/50"
                      }`}
                    >
                      <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Drag &amp; drop or click to upload</p>
                        <p className="mt-1 text-xs text-muted-foreground/60">PNG, JPG, WebP up to 10MB · up to {MAX_REFERENCE_IMAGES} images</p>
                      </div>
                    </div>
                  )}

                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && handleFilesChange(Array.from(e.target.files))
                    }
                  />
                </div>

                <PromptInput
                  value={editPrompt}
                  onChange={setEditPrompt}
                  label="Edit Instructions"
                  placeholder="Change the background to a magical forest, make it look like sunset..."
                />

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <ToggleGroup
                    type="single"
                    value={editAspectRatio}
                    onValueChange={(v) => v && setEditAspectRatio(v as AspectRatio)}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    {aspectRatios.map((r) => (
                      <ToggleGroupItem key={r} value={r} variant="outline" size="sm">
                        {r}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* Quality */}
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <ToggleGroup
                    type="single"
                    value={editQuality}
                    onValueChange={(v) => v && setEditQuality(v as Quality)}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    {qualities.map((q) => (
                      <ToggleGroupItem key={q.value} value={q.value} variant="outline" size="sm">
                        {q.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                {/* Preserve options */}
                <div className="space-y-2">
                  <Label>Preserve</Label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: "pose", label: "Keep Pose", checked: keepPose, onChange: setKeepPose },
                      { id: "lighting", label: "Keep Lighting", checked: keepLighting, onChange: setKeepLighting },
                      { id: "colors", label: "Keep Colors", checked: keepColors, onChange: setKeepColors },
                    ].map(({ id, label, checked, onChange }) => (
                      <div
                        key={id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-input/20 px-3 py-2 hover:border-primary/40 transition-colors"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(v) => onChange(v === true)}
                        />
                        <Label htmlFor={id} className="cursor-pointer text-sm text-foreground">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Generate button — always visible */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !canGenerate}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-blue-500 hover:shadow-violet-500/40 disabled:opacity-50 border-0 h-11 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    {statusMessage || "Generating..."}
                  </>
                ) : anyUploading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Uploading images…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    Generate Image{activeTab === "text-to-image" && imageCount > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Right Panel — Results */}
          <Card className="border-border bg-card flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {generatedImages.length > 0 ? "Generated Images" : "Preview"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6 pt-0">
              {loading ? (
                <>
                  <p className="mb-3 text-center text-sm text-muted-foreground">
                    {statusMessage || "Generating..."}
                  </p>
                  <div
                    className={`grid gap-3 ${
                      imageCount >= 4
                        ? "grid-cols-2"
                        : imageCount === 2
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {Array.from({
                      length: activeTab === "text-to-image" ? imageCount : 1,
                    }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                </>
              ) : generatedImages.length > 0 ? (
                <div
                  className={`grid gap-3 ${
                    generatedImages.length >= 4
                      ? "grid-cols-2"
                      : generatedImages.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {generatedImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-xl"
                    >
                      <Image
                        src={img.src}
                        alt="Generated"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          asChild
                          variant="secondary"
                          size="icon"
                          className="size-8 bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 border-0"
                        >
                          <a href={img.src} download>
                            <Download className="size-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : statusMessage && !loading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="rounded-full bg-destructive/10 p-6">
                    <svg className="h-12 w-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-destructive">{statusMessage}</p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Your generated images will appear here</p>
                    <p className="mt-1 text-sm text-muted-foreground">Enter a prompt and click Generate to start</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 opacity-20">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-20 w-20 rounded-lg bg-muted" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}

