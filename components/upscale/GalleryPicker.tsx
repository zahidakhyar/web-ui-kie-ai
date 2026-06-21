'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskWithImages } from '@/types';
import { ImageOff, Images, Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import useSWR from 'swr';

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
  }>('/api/gallery?page=1&limit=50', fetcher, { revalidateOnFocus: false });

  // Fetch uploaded images
  const { data: uploadsData, isLoading: uploadsLoading } = useSWR<{
    uploads: UploadRecord[];
  }>('/api/uploads?limit=50', fetcher, { revalidateOnFocus: false });

  const generatedImages =
    galleryData?.items.flatMap((task) =>
      task.images.map((img) => ({
        id: img.id.toString(),
        url: img.r2Url,
        prompt: task.prompt,
      })),
    ) ?? [];

  const uploadedImages =
    uploadsData?.uploads.map((up) => ({
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
          <button className="w-full flex items-center justify-center gap-2 text-xs h-11 px-4 border border-border/60 bg-background hover:bg-primary/5 hover:text-primary transition-all duration-200 rounded-xl font-semibold text-muted-foreground active:scale-[0.99]">
            <Images className="size-4" />
            Choose from Gallery
          </button>
        }
      />
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[85vh] flex flex-col p-6 gap-6 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Select an Image
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Choose from your previously generated designs or uploaded history
          </p>
        </DialogHeader>

        <Tabs
          defaultValue="generated"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="generated" className="gap-1.5 text-xs rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200">
              <Images className="size-3.5" />
              Generated Images
            </TabsTrigger>
            <TabsTrigger value="uploads" className="gap-1.5 text-xs rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200">
              <Upload className="size-3.5" />
              Uploaded History
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="generated"
            className="flex-1 overflow-hidden outline-none mt-1"
          >
            {galleryLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : generatedImages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 border border-dashed border-border/60 rounded-xl bg-muted/20">
                <ImageOff className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  No generated images
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Images you generate will appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-6">
                  {generatedImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleSelect(img.url)}
                      className="group relative w-full aspect-square overflow-hidden rounded-xl border border-border/40 hover:border-primary/50 hover:ring-4 hover:ring-primary/10 transition-all duration-300 bg-muted cursor-pointer active:scale-[0.97]"
                    >
                      <Image
                        src={img.url}
                        alt={img.prompt || 'Generated image'}
                        fill
                        sizes="(max-width: 768px) 50vw, 20vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 backdrop-blur-[1px] transition-all duration-300 flex flex-col justify-end p-3">
                        <p className="text-[11px] font-medium leading-normal text-zinc-100 line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 duration-300">
                          {img.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent
            value="uploads"
            className="flex-1 overflow-hidden outline-none mt-1"
          >
            {uploadsLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : uploadedImages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 border border-dashed border-border/60 rounded-xl bg-muted/20">
                <ImageOff className="size-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  No uploaded images
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Images you upload will appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-6">
                  {uploadedImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleSelect(img.url)}
                      className="group relative w-full aspect-square overflow-hidden rounded-xl border border-border/40 hover:border-primary/50 hover:ring-4 hover:ring-primary/10 transition-all duration-300 bg-muted cursor-pointer active:scale-[0.97]"
                    >
                      <Image
                        src={img.url}
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
