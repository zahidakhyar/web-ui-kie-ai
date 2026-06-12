"use client";

import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Images, Upload, Loader2, ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskWithImages } from "@/types";

interface UploadRecord {
  id: number;
  r2Url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
}

interface GalleryPickerProps {
  onSelect: (url: string) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GalleryPicker({ onSelect }: GalleryPickerProps) {
  const [open, setOpen] = useState(false);

  // Fetch generated images (limit to 50 for quick picking)
  const { data: galleryData, isLoading: galleryLoading } = useSWR<{
    items: TaskWithImages[];
  }>("/api/gallery?page=1&limit=50", fetcher, { revalidateOnFocus: false });

  // Fetch uploaded images
  const { data: uploadsData, isLoading: uploadsLoading } = useSWR<{
    uploads: UploadRecord[];
  }>("/api/uploads?limit=50", fetcher, { revalidateOnFocus: false });

  const generatedImages = galleryData?.items.flatMap((task) =>
    task.images.map((img) => ({
      id: img.id.toString(),
      url: img.r2Url,
      prompt: task.prompt,
    }))
  ) ?? [];

  const uploadedImages = uploadsData?.uploads.map((up) => ({
    id: up.id.toString(),
    url: up.r2Url,
    prompt: up.fileName,
  })) ?? [];

  function handleSelect(url: string) {
    onSelect(url);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="w-full flex items-center justify-center gap-2 text-sm h-10 px-4 border border-border/50 bg-background hover:bg-muted/50 transition-colors rounded-md font-medium text-muted-foreground">
            <Images className="size-4" />
            Choose from Gallery
          </button>
        }
      />
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-6 gap-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Select an Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generated" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
            <TabsTrigger value="generated" className="gap-1.5 text-xs">
              <Images className="size-3.5" />
              Generated Images
            </TabsTrigger>
            <TabsTrigger value="uploads" className="gap-1.5 text-xs">
              <Upload className="size-3.5" />
              Uploaded History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generated" className="flex-1 overflow-hidden outline-none">
            {galleryLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground/60" />
              </div>
            ) : generatedImages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg">
                <ImageOff className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No generated images</p>
                <p className="text-xs text-muted-foreground/60">Images you generate will appear here.</p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-6">
                  {generatedImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleSelect(img.url)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border/40 hover:border-primary/50 transition-all bg-muted cursor-pointer"
                    >
                      <Image
                        src={img.url}
                        alt={img.prompt || "Generated image"}
                        fill
                        sizes="(max-width: 768px) 33vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-[10px] text-white line-clamp-2 leading-snug">
                          {img.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="uploads" className="flex-1 overflow-hidden outline-none">
            {uploadsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground/60" />
              </div>
            ) : uploadedImages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg">
                <ImageOff className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No uploaded images</p>
                <p className="text-xs text-muted-foreground/60">Images you upload will appear here.</p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-6">
                  {uploadedImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleSelect(img.url)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border/40 hover:border-primary/50 transition-all bg-muted cursor-pointer"
                    >
                      <Image
                        src={img.url}
                        alt={img.prompt}
                        fill
                        sizes="(max-width: 768px) 33vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-[10px] text-white truncate w-full">
                          {img.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
