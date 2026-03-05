"use client";

import Image from "next/image";
import { Download, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export interface ImageCardData {
  id: string;
  src: string;
  prompt: string;
  date: string;
  type: "text-to-image" | "image-edit";
}

interface ImageCardProps {
  image: ImageCardData;
}

export default function ImageCard({ image }: ImageCardProps) {
  return (
    <Card className="group overflow-hidden border-border bg-card hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 transition-all">
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={image.src}
          alt={image.prompt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Overlay actions */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform group-hover:translate-y-0">
          <div className="flex gap-2">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
            >
              <a href={image.src} download>
                <Download className="size-3.5" />
                Download
              </a>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 bg-violet-600/60 backdrop-blur-sm hover:bg-violet-600/80 text-white border-0"
            >
              <RefreshCw className="size-3.5" />
              Re-gen
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <Badge
          variant="secondary"
          className={cn(
            "mb-2",
            image.type === "text-to-image"
              ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
              : "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
          )}
        >
          {image.type === "text-to-image" ? "Text to Image" : "Image Edit"}
        </Badge>
        <p className="line-clamp-2 text-sm text-foreground">{image.prompt}</p>
        <p className="mt-1 text-xs text-muted-foreground">{image.date}</p>
      </CardContent>
    </Card>
  );
}
