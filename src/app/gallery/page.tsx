"use client";

import { useState } from "react";
import ImageCard, { ImageCardData } from "@/components/ImageCard";

type FilterType = "all" | "text-to-image" | "image-edit";
type SortType = "newest" | "oldest";

const MOCK_IMAGES: ImageCardData[] = [
  { id: "1", src: "https://picsum.photos/seed/101/400/400", prompt: "A futuristic city at sunset with neon lights reflecting on wet streets", date: "Jan 15, 2025", type: "text-to-image" },
  { id: "2", src: "https://picsum.photos/seed/202/400/400", prompt: "Serene mountain landscape with snow-capped peaks and a crystal-clear lake", date: "Jan 14, 2025", type: "text-to-image" },
  { id: "3", src: "https://picsum.photos/seed/303/400/400", prompt: "Abstract watercolor painting with vivid blues and purples", date: "Jan 13, 2025", type: "image-edit" },
  { id: "4", src: "https://picsum.photos/seed/404/400/400", prompt: "Portrait of a young woman in traditional Japanese attire surrounded by cherry blossoms", date: "Jan 12, 2025", type: "text-to-image" },
  { id: "5", src: "https://picsum.photos/seed/505/400/400", prompt: "Cyberpunk alley with glowing signs and holographic advertisements", date: "Jan 11, 2025", type: "text-to-image" },
  { id: "6", src: "https://picsum.photos/seed/606/400/400", prompt: "Magical forest with bioluminescent plants and floating particles", date: "Jan 10, 2025", type: "image-edit" },
  { id: "7", src: "https://picsum.photos/seed/707/400/400", prompt: "Ocean waves crashing against dramatic rocky coastline at golden hour", date: "Jan 9, 2025", type: "text-to-image" },
  { id: "8", src: "https://picsum.photos/seed/808/400/400", prompt: "Anime-style illustration of a space explorer on an alien planet", date: "Jan 8, 2025", type: "text-to-image" },
  { id: "9", src: "https://picsum.photos/seed/909/400/400", prompt: "Renaissance painting style portrait of a modern-day scientist in a lab", date: "Jan 7, 2025", type: "image-edit" },
  { id: "10", src: "https://picsum.photos/seed/1010/400/400", prompt: "Ancient temple ruins overgrown with jungle vines in misty morning light", date: "Jan 6, 2025", type: "text-to-image" },
  { id: "11", src: "https://picsum.photos/seed/1111/400/400", prompt: "Geometric abstract art with vibrant colors and mathematical patterns", date: "Jan 5, 2025", type: "text-to-image" },
  { id: "12", src: "https://picsum.photos/seed/1212/400/400", prompt: "Cozy cabin in the woods with warm light spilling through the windows on a snowy evening", date: "Jan 4, 2025", type: "image-edit" },
];

export default function GalleryPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("newest");

  const filtered = MOCK_IMAGES.filter((img) => filter === "all" || img.type === filter);
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return sort === "newest" ? db - da : da - db;
  });

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "text-to-image", label: "Text to Image" },
    { value: "image-edit", label: "Image Edit" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">Gallery</h1>
        <p className="text-gray-400">Browse your generated image history</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                filter === f.value
                  ? "border-violet-500 bg-violet-600/30 text-violet-300"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40 hover:text-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Sort by:</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-1.5 text-sm text-gray-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="rounded-full bg-violet-500/10 p-6">
            <svg className="h-12 w-12 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400">No images found for this filter</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">{sorted.length} images</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
