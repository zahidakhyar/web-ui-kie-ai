'use client';

import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  CheckSquare,
  Check,
  Download,
  ImageOff,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

interface UploadRecord {
  id: number;
  r2Url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsGrid() {
  const { data, isLoading, mutate } = useSWR<{ uploads: UploadRecord[] }>(
    '/api/uploads?limit=100',
    fetcher,
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const uploads = data?.uploads ?? [];

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
        toast.success('Upload deleted');
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
      toast.success(
        `Deleted ${selectedIds.size} upload${selectedIds.size !== 1 ? 's' : ''}`,
      );
      handleExitSelection();
      mutate();
    } catch {
      toast.error('Failed to delete selected uploads');
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedIds, handleExitSelection, mutate]);

  function handleDownload(record: UploadRecord) {
    const a = document.createElement('a');
    a.href = record.r2Url;
    a.download = record.fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl bg-card-foreground/5" />
        ))}
      </div>
    );
  }

  if (uploads.length === 0) {
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
            No uploads yet
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Upload reference images in the studio to start building your uploads collection.
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
          {uploads.length} {uploads.length === 1 ? 'UPLOAD' : 'UPLOADS'}
        </p>
        {!selectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary transition-colors duration-200"
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
              className="h-8 text-xs gap-1.5 rounded-xl text-primary hover:bg-primary/5 transition-colors"
              onClick={handleExitSelection}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {uploads.map((record, index) => {
          const isSelected = selectedIds.has(record.id);
          const isDeletingSingle = deleting.has(record.id);
          return (
            <Reveal key={record.id} delay={index * 0.03}>
              <div
                role={selectionMode ? 'button' : undefined}
                tabIndex={selectionMode ? 0 : undefined}
                className={cn(
                  'group relative overflow-hidden rounded-2xl bg-muted border transition-all duration-300 hover:-translate-y-0.5 shadow-sm',
                  selectionMode
                    ? 'cursor-pointer'
                    : 'border-border/50 hover:border-primary/40 hover:shadow-primary/5',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/35'
                    : 'border-border/50',
                )}
                onClick={() => selectionMode && handleToggleSelect(record.id)}
                onKeyDown={
                  selectionMode
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleSelect(record.id);
                        }
                      }
                    : undefined
                }
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

                {/* Selection overlay */}
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

                {/* Hover overlay (only when not in selection mode) */}
                {!selectionMode && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(record.id);
                        }}
                        disabled={isDeletingSingle}
                        className="size-7 flex items-center justify-center rounded-lg text-white hover:bg-destructive/20 hover:text-destructive transition-colors disabled:opacity-50"
                        aria-label="Delete upload"
                      >
                        {isDeletingSingle ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-white text-xs line-clamp-2 leading-relaxed font-mono">
                        {record.fileName}
                      </p>
                      <p className="text-zinc-400 text-[10px] font-mono">
                        {formatBytes(record.fileSize)}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full h-7 text-xs rounded-lg bg-white/20 hover:bg-white/30 hover:scale-[1.02] text-white border-0 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(record);
                        }}
                      >
                        <Download className="size-3.5 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Floating batch-delete action bar with motion entry */}
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
              className="rounded-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
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
