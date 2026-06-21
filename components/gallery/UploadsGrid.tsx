'use client';

import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import {
  CheckSquare,
  Check,
  Download,
  ImageOff,
  Loader2,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { ImageDetailModal } from './ImageDetailModal';

interface UploadRecord {
  id: number;
  r2Url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
}

interface UploadsGridProps {
  search?: string;
  sort?: string;
  gridDensity?: 'compact' | 'comfortable';
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function UploadsGrid({
  search = '',
  sort = 'newest',
  gridDensity = 'compact',
}: UploadsGridProps = {}) {
  const params = new URLSearchParams({ limit: '100' });
  if (search) params.append('search', search);
  params.append('sort', sort);

  const { data, isLoading, mutate } = useSWR<{ uploads: UploadRecord[]; total: number }>(
    `/api/uploads?${params.toString()}`,
    fetcher,
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  
  // Modal state pointer
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const uploads = data?.uploads ?? [];
  const totalCount = data?.total ?? uploads.length;
  const isEmpty = !isLoading && uploads.length === 0;

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      setDeleting((prev) => new Set(prev).add(id));
      try {
        const res = await fetch('/api/uploads', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: id }),
        });
        if (!res.ok) throw new Error('Failed to delete');
        mutate();
      } catch {
        toast.error('Failed to delete upload');
      } finally {
        setDeleting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [mutate],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Batch delete failed');
      toast.success(`Deleted ${selectedIds.size} upload(s)`);
      handleExitSelection();
      mutate();
    } catch {
      toast.error('Failed to delete selected uploads');
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedIds, handleExitSelection, mutate]);

  function handleDownload(record: UploadRecord, e?: React.MouseEvent) {
    e?.stopPropagation();
    const a = document.createElement('a');
    a.href = record.r2Url;
    a.download = record.fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  const handleCardClick = (index: number) => {
    if (selectionMode) {
      handleToggleSelect(uploads[index].id);
    } else {
      setActiveIndex(index);
    }
  };

  const hasActiveFilters = search !== '' || sort !== 'newest';

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
            No uploads found
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {hasActiveFilters
              ? 'Try adjusting or clearing your search filters to find what you are looking for.'
              : 'Upload reference images in the studio to start building your uploads collection.'}
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
          {totalCount} {totalCount === 1 ? 'UPLOAD' : 'UPLOADS'} MATCHED
        </p>
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary transition-colors duration-200 cursor-pointer"
            onClick={() => setSelectionMode(true)}
          >
            <CheckSquare className="size-3.5" />
            Select
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {selectedIds.size} SELECTED
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
        {uploads.map((record, index) => {
          const isSelected = selectedIds.has(record.id);
          return (
            <Reveal key={record.id} delay={index * 0.02}>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  'group relative overflow-hidden rounded-2xl bg-muted border transition-all duration-300 hover:-translate-y-0.5 shadow-sm focus:outline-none cursor-pointer',
                  selectionMode
                    ? 'ring-offset-background'
                    : 'border-border/50 hover:border-primary/40 hover:shadow-primary/5',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/35'
                    : 'border-border/50',
                )}
                onClick={() => handleCardClick(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(index);
                  }
                }}
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden relative">
                  <Image
                    src={record.r2Url}
                    alt={record.fileName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Selection Circle */}
                {selectionMode && (
                  <div
                    className={cn(
                      'absolute inset-0 transition-colors duration-300',
                      isSelected ? 'bg-primary/15' : 'bg-transparent',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-2 right-2 size-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                        isSelected
                          ? 'bg-primary border-primary scale-110'
                          : 'bg-black/40 border-white/70',
                      )}
                    >
                      {isSelected && (
                        <Check className="size-3.5 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                )}

                {/* Hover overlay (hidden in selectionMode) */}
                {!selectionMode && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                    <div className="flex justify-end" />
                    <div className="space-y-2.5">
                      <p className="text-white text-xs line-clamp-2 leading-relaxed font-mono">
                        {record.fileName}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {formatRelativeTime(record.createdAt)}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveIndex(index);
                            }}
                            title="View details"
                          >
                            <ZoomIn className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                            onClick={(e) => handleDownload(record, e)}
                            title="Download"
                          >
                            <Download className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Modal Detail for Uploads */}
      {activeIndex !== null && activeIndex >= 0 && activeIndex < uploads.length && (
        <ImageDetailModal
          isOpen={activeIndex !== null}
          onClose={() => setActiveIndex(null)}
          upload={uploads[activeIndex]}
          onPrev={activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : undefined}
          onNext={activeIndex < uploads.length - 1 ? () => setActiveIndex(activeIndex + 1) : undefined}
          onDelete={() => handleDelete(uploads[activeIndex].id)}
        />
      )}

      {/* Floating batch-delete bar */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 50, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 50, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-full bg-card/95 border border-primary/20 backdrop-blur-md shadow-xl px-5 py-2.5"
          >
            <span className="text-xs font-mono text-muted-foreground tracking-wider">
              {selectedIds.size} SELECTED
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
