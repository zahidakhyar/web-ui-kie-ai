'use client';

import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GeneratedImage, TaskWithImages } from '@/types';
import { CheckSquare, ImageOff, Loader2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import useSWRInfinite from 'swr/infinite';
import { ImageCard } from './ImageCard';
import { ImageDetailModal } from './ImageDetailModal';

interface GalleryPage {
  items: TaskWithImages[];
  page: number;
  limit: number;
  total: number;
}

interface GalleryGridProps {
  search?: string;
  model?: string;
  sort?: string;
  gridDensity?: 'compact' | 'comfortable';
}

const PAGE_LIMIT = 24;

export function GalleryGrid({
  search = '',
  model = 'all',
  sort = 'newest',
  gridDensity = 'compact',
}: GalleryGridProps = {}) {
  const getKey = (pageIndex: number, previousPageData: GalleryPage | null) => {
    if (previousPageData && previousPageData.items.length < PAGE_LIMIT) return null;
    
    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      limit: String(PAGE_LIMIT),
      sort,
    });
    if (search) params.append('search', search);
    if (model && model !== 'all') params.append('model', model);
    
    return `/api/gallery?${params.toString()}`;
  };

  const fetcher = (url: string) => fetch(url).then((r) => r.json());

  const { data, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<GalleryPage>(getKey, fetcher, {
      revalidateFirstPage: true,
    });

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  
  // Detail modal index pointer
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const allItems = data ? data.flatMap((p) => p.items) : [];
  const isLoadingMore = isValidating && size > (data?.length ?? 0);
  const isEmpty = !isLoading && allItems.length === 0;
  
  const totalItemsCount = data?.[0]?.total ?? 0;
  const isReachingEnd = isLoading || (data && data[data.length - 1]?.items.length < PAGE_LIMIT);

  // Flatten all images with their parent task
  const flatImages: { task: TaskWithImages; image: GeneratedImage }[] =
    allItems.flatMap((task) => task.images.map((image) => ({ task, image })));

  // Infinite Scroll IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isReachingEnd || isLoadingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSize((s) => s + 1);
        }
      },
      { rootMargin: '250px' }
    );
    
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [isReachingEnd, isLoadingMore, setSize]);

  const handleDelete = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleSingleDelete = async (taskId: string) => {
    const res = await fetch('/api/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) throw new Error('Delete failed');
    mutate();
  };

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
      toast.success(`Deleted ${selectedTaskIds.size} image(s)`);
      handleExitSelection();
      mutate();
    } catch {
      toast.error('Failed to delete selected images');
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedTaskIds, handleExitSelection, mutate]);

  const hasActiveFilters = search !== '' || (model && model !== 'all') || sort !== 'newest';

  if (isLoading) {
    return (
      <div className={`grid gap-3 ${gridDensity === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl bg-card-foreground/5" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <Reveal className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-dashed border-border/60 bg-card/45 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl size-12 animate-pulse" />
          <div className="relative size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25">
            <ImageOff className="size-5 text-primary" />
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            No images found
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasActiveFilters
              ? 'Try adjusting or clearing your search filters to find what you are looking for.'
              : 'Generate your first image in the studio to start building your gallery.'}
          </p>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          {totalItemsCount} {totalItemsCount === 1 ? 'IMAGE' : 'IMAGES'} MATCHED
        </p>
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
            onClick={() => setSelectionMode(true)}
          >
            <CheckSquare className="size-3.5" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {selectedTaskIds.size} SELECTED
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-xl text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={handleExitSelection}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className={`grid gap-3 ${gridDensity === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {flatImages.map(({ task, image }, index) => (
          <Reveal key={image.id} delay={index * 0.02}>
            <ImageCard
              task={task}
              image={image}
              onViewDetail={() => setActiveIndex(index)}
              selectionMode={selectionMode}
              isSelected={selectedTaskIds.has(task.taskId)}
              onToggleSelect={handleToggleSelect}
            />
          </Reveal>
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center">
        {isLoadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Detail Lightbox Modal */}
      {activeIndex !== null && activeIndex >= 0 && activeIndex < flatImages.length && (
        <ImageDetailModal
          isOpen={activeIndex !== null}
          onClose={() => setActiveIndex(null)}
          task={flatImages[activeIndex].task}
          image={flatImages[activeIndex].image}
          onPrev={activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : undefined}
          onNext={activeIndex < flatImages.length - 1 ? () => setActiveIndex(activeIndex + 1) : undefined}
          onDelete={() => handleSingleDelete(flatImages[activeIndex].task.taskId)}
        />
      )}

      {/* Floating batch-delete bar */}
      <AnimatePresence>
        {selectionMode && selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ y: 50, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 50, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-full bg-card/95 border border-primary/20 backdrop-blur-md shadow-xl px-5 py-2.5"
          >
            <span className="text-xs font-mono text-muted-foreground tracking-wider">
              {selectedTaskIds.size} SELECTED
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
