'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GeneratedImage, TaskWithImages } from '@/types';
import { CheckSquare, ImageOff, Loader2, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import useSWRInfinite from 'swr/infinite';
import { ImageCard } from './ImageCard';

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

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [batchDeleting, setBatchDeleting] = useState(false);

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

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTaskIds) }),
      });
      if (!res.ok) throw new Error('Batch delete failed');
      toast.success(
        `Deleted ${selectedTaskIds.size} image${selectedTaskIds.size !== 1 ? 's' : ''}`,
      );
      handleExitSelection();
      mutate();
    } catch {
      toast.error('Failed to delete selected images');
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedTaskIds, handleExitSelection, mutate]);

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
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {flatImages.length} image{flatImages.length !== 1 ? 's' : ''}
        </p>
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setSelectionMode(true)}
          >
            <CheckSquare className="size-3.5" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedTaskIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleExitSelection}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {flatImages.map(({ task, image }) => (
          <ImageCard
            key={image.id}
            task={task}
            image={image}
            onDelete={handleDelete}
            selectionMode={selectionMode}
            isSelected={selectedTaskIds.has(task.taskId)}
            onToggleSelect={handleToggleSelect}
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
              'Load more'
            )}
          </Button>
        </div>
      )}

      {/* Floating batch-delete action bar */}
      {selectionMode && selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-background border border-border shadow-lg px-4 py-2">
          <span className="text-sm font-medium">
            {selectedTaskIds.size} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-full gap-1.5"
            onClick={handleBatchDelete}
            disabled={batchDeleting}
          >
            {batchDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
