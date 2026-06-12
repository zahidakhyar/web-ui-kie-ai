'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getModelById } from '@/lib/models';
import { cn, formatRelativeTime } from '@/lib/utils';
import { GeneratedImage, TaskWithImages } from '@/types';
import { Check, Download, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ImageCardProps {
  task: TaskWithImages;
  image: GeneratedImage;
  onViewDetail?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  onDelete?: any;
}

export function ImageCard({
  task,
  image,
  onViewDetail,
  selectionMode,
  isSelected,
  onToggleSelect,
  onDelete,
}: ImageCardProps) {
  const model = getModelById(task.model);

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
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
    } else {
      onViewDetail?.();
    }
  }

  return (
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
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Image Container */}
      <div className="aspect-square overflow-hidden relative">
        <Image
          src={image.r2Url}
          alt={task.prompt}
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
          {/* Top Info */}
          <div className="flex justify-between items-start gap-1">
            <Badge
              variant="secondary"
              className="text-[9px] bg-black/60 hover:bg-black/60 text-zinc-100 border-0 font-mono tracking-wider uppercase px-1.5 py-0.5"
            >
              {model?.name ?? task.model}
            </Badge>

            {image.width && image.height && (
              <Badge
                variant="secondary"
                className="text-[9px] bg-black/60 hover:bg-black/60 text-zinc-300 border-0 font-mono px-1.5 py-0.5"
              >
                {image.width}x{image.height}
              </Badge>
            )}
          </div>

          {/* Bottom Info */}
          <div className="space-y-2.5">
            <p className="text-white text-xs line-clamp-2 leading-relaxed">
              {task.prompt}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-400 font-mono">
                {formatRelativeTime(image.createdAt)}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail?.();
                  }}
                  title="View details"
                >
                  <ZoomIn className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 rounded-lg bg-white/20 hover:bg-white/35 text-white border-0 transition-all cursor-pointer"
                  onClick={handleDownload}
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
  );
}
