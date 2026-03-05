"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import PromptInput from "@/components/PromptInput";
import StylePresets from "@/components/StylePresets";

type Tab = "text-to-image" | "image-edit";
type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Quality = "basic" | "high";
type ImageCount = 1 | 2 | 4;

interface GeneratedImage {
  id: string;
  src: string;
}

const MAX_REFERENCE_IMAGES = 14;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("text-to-image");

  // Text-to-image state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("basic");
  const [stylePreset, setStylePreset] = useState("photorealistic");
  const [imageCount, setImageCount] = useState<ImageCount>(1);

  // Image edit state
  const [editPrompt, setEditPrompt] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
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
          // Mock immediate response (no API key configured)
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
            imageUrls: uploadedImages,
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
          // Mock immediate response
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

      // Connect SSE for realtime callback-driven updates (/api/sse → /api/callback)
      if (typeof window !== "undefined" && "EventSource" in window) {
        es = new EventSource(`/api/sse?taskId=${encodeURIComponent(taskId)}`);
        es.onmessage = (e) => {
          if (resolved) return;
          const result = JSON.parse(e.data as string) as {
            state: string;
            resultUrls?: string[];
            failMsg?: string;
          };
          // Ignore keepalive or intermediate events
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

      // Poll /api/status every 4 s for live status text + backup result delivery
      const maxAttempts = 45; // ~3 minutes
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

  const handleFilesChange = useCallback((files: File[]) => {
    const remaining = MAX_REFERENCE_IMAGES - uploadedImages.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setUploadedImages((prev) =>
          prev.length < MAX_REFERENCE_IMAGES
            ? [...prev, e.target?.result as string]
            : prev
        );
      reader.readAsDataURL(file);
    });
  }, [uploadedImages.length]);

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

  const removeUploadedImage = (idx: number) =>
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));

  const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  const qualities: { value: Quality; label: string }[] = [
    { value: "basic", label: "Basic (2K)" },
    { value: "high", label: "High (4K)" },
  ];
  const imageCounts: ImageCount[] = [1, 2, 4];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
          AI Image Studio
        </h1>
        <p className="mx-auto max-w-xl text-lg text-gray-400">
          Transform your imagination into stunning visuals with the power of AI. Generate, edit, and explore endless creative possibilities.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:mx-auto sm:max-w-xs">
        {(["text-to-image", "image-edit"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab === "text-to-image" ? "Text to Image" : "Image Edit"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Panel — Controls */}
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
          {activeTab === "text-to-image" ? (
            <>
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
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {aspectRatios.map((r) => (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        aspectRatio === r
                          ? "border-violet-500 bg-violet-600/30 text-violet-300"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Quality</label>
                <div className="flex flex-wrap gap-2">
                  {qualities.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => setQuality(q.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        quality === q.value
                          ? "border-violet-500 bg-violet-600/30 text-violet-300"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <StylePresets selected={stylePreset} onSelect={setStylePreset} />

              {/* Number of Images */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Number of Images</label>
                <div className="flex gap-2">
                  {imageCounts.map((n) => (
                    <button
                      key={n}
                      onClick={() => setImageCount(n)}
                      className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all ${
                        imageCount === n
                          ? "border-violet-500 bg-violet-600/30 text-violet-300"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Multi-image upload */}
              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
                  <span>Reference Images</span>
                  <span className="text-xs text-gray-500">
                    {uploadedImages.length}/{MAX_REFERENCE_IMAGES} images
                  </span>
                </label>

                {/* Thumbnail grid */}
                {uploadedImages.length > 0 && (
                  <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {uploadedImages.map((src, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-white/10"
                      >
                        <Image
                          src={src}
                          alt={`Reference ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => removeUploadedImage(idx)}
                          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {uploadedImages.length < MAX_REFERENCE_IMAGES && (
                      <button
                        onClick={() => document.getElementById("file-upload")?.click()}
                        className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-gray-500 transition-all hover:border-violet-500/50 hover:text-violet-400"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Drop zone */}
                {uploadedImages.length === 0 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all ${
                      dragOver
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/20 bg-white/5 hover:border-violet-500/50"
                    }`}
                  >
                    <svg className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Drag & drop or click to upload</p>
                      <p className="mt-1 text-xs text-gray-600">PNG, JPG, WebP up to 10MB · up to {MAX_REFERENCE_IMAGES} images</p>
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
                    e.target.files &&
                    handleFilesChange(Array.from(e.target.files))
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
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {aspectRatios.map((r) => (
                    <button
                      key={r}
                      onClick={() => setEditAspectRatio(r)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        editAspectRatio === r
                          ? "border-violet-500 bg-violet-600/30 text-violet-300"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Quality</label>
                <div className="flex flex-wrap gap-2">
                  {qualities.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => setEditQuality(q.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        editQuality === q.value
                          ? "border-violet-500 bg-violet-600/30 text-violet-300"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keep options */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Preserve</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "pose", label: "Keep Pose", checked: keepPose, set: setKeepPose },
                    { key: "lighting", label: "Keep Lighting", checked: keepLighting, set: setKeepLighting },
                    { key: "colors", label: "Keep Colors", checked: keepColors, set: setKeepColors },
                  ].map(({ key, label, checked, set }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:border-violet-500/40">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => set(e.target.checked)}
                        className="h-4 w-4 rounded accent-violet-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (activeTab === "text-to-image" ? !prompt.trim() : !editPrompt.trim())}
            className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-blue-500 hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {statusMessage || "Generating..."}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ✨ Generate Image{activeTab === "text-to-image" && imageCount > 1 ? "s" : ""}
              </span>
            )}
          </button>
        </div>

        {/* Right Panel — Results */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            {generatedImages.length > 0 ? "Generated Images" : "Preview"}
          </h2>

          {loading ? (
            <>
              <p className="mb-3 text-center text-sm text-gray-400">{statusMessage || "Generating..."}</p>
              <div className={`grid gap-3 ${imageCount >= 4 ? "grid-cols-2" : imageCount === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {Array.from({ length: activeTab === "text-to-image" ? imageCount : 1 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/10" />
                ))}
              </div>
            </>
          ) : generatedImages.length > 0 ? (
            <div className={`grid gap-3 ${generatedImages.length >= 4 ? "grid-cols-2" : generatedImages.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {generatedImages.map((img) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl">
                  <Image src={img.src} alt="Generated" fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                  <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={img.src}
                      download
                      className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm hover:bg-white/40"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : statusMessage && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-full bg-red-500/10 p-6">
                <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-sm text-red-400">{statusMessage}</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-full bg-violet-500/10 p-6">
                <svg className="h-12 w-12 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-300">Your generated images will appear here</p>
                <p className="mt-1 text-sm text-gray-500">Enter a prompt and click Generate to start</p>
              </div>
              {/* Placeholder grid */}
              <div className="grid grid-cols-2 gap-2 opacity-20">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 w-20 rounded-lg bg-white/20" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
