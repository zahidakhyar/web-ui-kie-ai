'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getModelById } from '@/lib/models';
import { cn } from '@/lib/utils';
import { GeneratedImage, TaskWithImages } from '@/types';
import { Check, Download, MoreVertical, Trash2, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

interface ImageCardProps {
  task: TaskWithImages;
  image: GeneratedImage;
  onDelete?: () => void;
  /** When set, the card is in batch-select mode */
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

export function ImageCard({
  task,
  image,
  onDelete,
  selectionMode,
  isSelected,
  onToggleSelect,
}: ImageCardProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const model = getModelById(task.model);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.taskId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Image deleted');
      onDelete?.();
    } catch {
      toast.error('Failed to delete image');
    } finally {
      setDeleting(false);
    }
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = image.r2Url;
    a.download = `${task.taskId}_${image.id}.webp`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  function handleCardClick() {
    if (selectionMode) {
      onToggleSelect?.(task.taskId);
    }
  }

  return (
    <>
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
        onClick={handleCardClick}
        onKeyDown={
          selectionMode
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleSelect?.(task.taskId);
                }
              }
            : undefined
        }
      >
        {/* Image */}
        <div className="aspect-square overflow-hidden relative">
          <Image
            src={image.r2Url}
            alt={task.prompt}
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
            {/* Top: model badge */}
            <div className="flex justify-between items-start">
              <Badge
                variant="secondary"
                className="text-[10px] bg-black/60 text-white border-0 font-mono tracking-wider uppercase"
              >
                {model?.name ?? task.model}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-lg text-white hover:bg-white/20 transition-colors focus:outline-none">
                  <MoreVertical className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-border/60 min-w-[140px]">
                  <DropdownMenuItem onClick={() => setOpen(true)} className="rounded-lg text-xs">
                    <ZoomIn className="size-4 mr-2" /> View full size
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload} className="rounded-lg text-xs">
                    <Download className="size-4 mr-2" /> Download
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive rounded-lg text-xs"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="size-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bottom: prompt & actions */}
            <div className="space-y-2.5">
              <p className="text-white text-xs line-clamp-2 leading-relaxed">
                {task.prompt}
              </p>
              <div className="flex gap-1.5 w-full">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-7 text-xs rounded-lg bg-white/20 hover:bg-white/30 hover:scale-[1.02] text-white border-0 transition-all duration-200"
                  onClick={() => setOpen(true)}
                >
                  <ZoomIn className="size-3.5 mr-1" /> View
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-7 text-xs rounded-lg bg-white/20 hover:bg-white/30 hover:scale-[1.02] text-white border-0 transition-all duration-200"
                  onClick={handleDownload}
                >
                  <Download className="size-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-size dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border border-border/60 bg-black/95 backdrop-blur-xl">
          <DialogTitle className="sr-only">{task.prompt}</DialogTitle>
          <div className="relative flex flex-col items-center">
            <div className="relative w-full aspect-square md:aspect-[4/3] max-h-[70vh]">
              <Image
                src={image.r2Url}
                alt={task.prompt}
                fill
                className="object-contain p-2 rounded-2xl"
                priority
              />
            </div>
            <div className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-6 text-white">
              <p className="text-sm font-medium leading-relaxed max-w-2xl">{task.prompt}</p>
              <div className="flex items-center justify-between gap-3 mt-4 border-t border-white/10 pt-4 font-mono text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wider">Model:</span>
                  <Badge
                    variant="secondary"
                    className="bg-primary/20 text-primary border border-primary/20 text-[10px]"
                  >
                    {model?.name ?? task.model}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 transition-colors"
                  onClick={handleDownload}
                >
                  <Download className="size-3.5 mr-1.5" /> Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
