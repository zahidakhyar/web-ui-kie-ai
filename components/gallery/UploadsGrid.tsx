'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  CheckSquare,
  Download,
  ImageOff,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
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
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <ImageOff className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-muted-foreground font-medium">No uploads yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Upload reference images to see them here.
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
          {uploads.length} upload{uploads.length !== 1 ? 's' : ''}
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
              {selectedIds.size} selected
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
        {uploads.map((record) => {
          const isSelected = selectedIds.has(record.id);
          const isDeletingSingle = deleting.has(record.id);
          return (
            <div
              key={record.id}
              role={selectionMode ? 'button' : undefined}
              tabIndex={selectionMode ? 0 : undefined}
              className={cn(
                'group relative overflow-hidden rounded-lg bg-muted border transition-colors',
                selectionMode
                  ? 'cursor-pointer'
                  : 'border-border/50 hover:border-primary/30',
                isSelected
                  ? 'border-primary ring-2 ring-primary/40'
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
                  className="object-cover"
                />
              </div>

              {/* Selection overlay */}
              {selectionMode && (
                <div
                  className={cn(
                    'absolute inset-0 transition-colors',
                    isSelected ? 'bg-primary/20' : 'bg-transparent',
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-2 right-2 size-6 rounded-full border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-black/40 border-white/70',
                    )}
                  >
                    {isSelected && (
                      <X className="size-3 text-primary-foreground rotate-45" />
                    )}
                  </div>
                </div>
              )}

              {/* Hover overlay (only when not in selection mode) */}
              {!selectionMode && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(record.id)}
                      disabled={isDeletingSingle}
                      className="size-7 flex items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                      aria-label="Delete upload"
                    >
                      {isDeletingSingle ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-white text-xs line-clamp-2 leading-relaxed">
                      {record.fileName}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {formatBytes(record.fileSize)}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => handleDownload(record)}
                    >
                      <Download className="size-3 mr-1" /> Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating batch-delete action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-background border border-border shadow-lg px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
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
