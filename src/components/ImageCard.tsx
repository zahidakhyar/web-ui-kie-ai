"use client";

import Image from "next/image";

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
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10">
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
            <a
              href={image.src}
              download
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-violet-600/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-violet-600/80">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-gen
            </button>
          </div>
        </div>
      </div>

      <div className="p-3">
        <span
          className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            image.type === "text-to-image"
              ? "bg-violet-500/20 text-violet-300"
              : "bg-blue-500/20 text-blue-300"
          }`}
        >
          {image.type === "text-to-image" ? "Text to Image" : "Image Edit"}
        </span>
        <p className="line-clamp-2 text-sm text-gray-300">{image.prompt}</p>
        <p className="mt-1 text-xs text-gray-500">{image.date}</p>
      </div>
    </div>
  );
}
