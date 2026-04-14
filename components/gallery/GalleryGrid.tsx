"use client";

import useSWRInfinite from "swr/infinite";
import { useCallback } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCard } from "./ImageCard";
import { GeneratedImage, TaskWithImages } from "@/types";

interface GalleryPage {
  items: TaskWithImages[];
  page: number;
  limit: number;
}

const PAGE_LIMIT = 24;

const getKey = (pageIndex: number, previousPageData: GalleryPage | null) => {
  if (previousPageData && previousPageData.items.length < PAGE_LIMIT)
    return null;
  return `/api/gallery?page=${pageIndex + 1}&limit=${PAGE_LIMIT}`;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GalleryGrid() {
  const { data, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<GalleryPage>(getKey, fetcher, {
      revalidateFirstPage: true,
    });

  const allItems = data ? data.flatMap((p) => p.items) : [];
  const isLoadingMore = isValidating && size > (data?.length ?? 0);
  const isEmpty = !isLoading && allItems.length === 0;
  const isReachingEnd =
    data && data[data.length - 1]?.items.length < PAGE_LIMIT;

  // Flatten all images with their parent task
  const flatImages: { task: TaskWithImages; image: GeneratedImage }[] =
    allItems.flatMap((task) => task.images.map((image) => ({ task, image })));

  const handleDelete = useCallback(() => {
    mutate();
  }, [mutate]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <ImageOff className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-muted-foreground font-medium">No images yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Generate your first image to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {flatImages.map(({ task, image }) => (
          <ImageCard
            key={image.id}
            task={task}
            image={image}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {!isReachingEnd && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setSize(size + 1)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
